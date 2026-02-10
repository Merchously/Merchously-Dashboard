import { NextRequest, NextResponse } from "next/server";
import { projects, agents, agentTriggers, projectNotes } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { AGENT_DISPLAY_NAMES } from "@/lib/constants";

/**
 * POST /api/projects/:id/trigger-agent
 * Trigger an agent for a project. If the agent has a webhook_url, fires a POST to it.
 * Otherwise, logs the trigger as "pending" for manual pickup.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const project = projects.getById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { agent_key, payload } = body;

    if (!agent_key) {
      return NextResponse.json(
        { success: false, error: "Missing required field: agent_key" },
        { status: 400 }
      );
    }

    const agent = agents.getByKey(agent_key);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    const triggerPayload = JSON.stringify({
      project_id: project.id,
      client_email: project.client_email,
      client_name: project.client_name,
      tier: project.tier,
      stage: project.stage,
      ...((payload && typeof payload === "object") ? payload : {}),
    });

    // Create the trigger record
    const trigger = agentTriggers.create({
      project_id: id,
      agent_key,
      trigger_payload: triggerPayload,
      triggered_by: "Admin",
    });

    const agentName = AGENT_DISPLAY_NAMES[agent_key] || agent_key;

    // If agent has webhook_url, fire the request
    if (agent.webhook_url) {
      try {
        const res = await fetch(agent.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: triggerPayload,
        });

        agentTriggers.update(trigger.id, {
          status: res.ok ? "sent" : "failed",
          response_status: res.status,
          error_message: res.ok ? null : `HTTP ${res.status}`,
        });
      } catch (err) {
        agentTriggers.update(trigger.id, {
          status: "failed",
          error_message: err instanceof Error ? err.message : "Request failed",
        });
      }
    }

    // Create a system note
    projectNotes.create({
      project_id: id,
      author: "System",
      content: `Agent "${agentName}" triggered${agent.webhook_url ? " (webhook sent)" : " (data prepared)"}`,
      note_type: "agent_trigger",
    });

    broadcast({
      type: "agent.triggered",
      data: {
        project_id: id,
        agent_key,
        trigger_id: trigger.id,
      },
    });

    broadcast({
      type: "project.note_added",
      data: { project_id: id },
    });

    const updated = agentTriggers.getById(trigger.id);

    return NextResponse.json({
      success: true,
      trigger: updated,
      message: agent.webhook_url
        ? `Triggered ${agentName} via webhook`
        : `Trigger data prepared for ${agentName} (no webhook URL configured)`,
    });
  } catch (error) {
    console.error("Error triggering agent:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to trigger agent",
      },
      { status: 500 }
    );
  }
}
