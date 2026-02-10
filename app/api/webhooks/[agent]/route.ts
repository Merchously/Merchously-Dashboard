import { NextRequest, NextResponse } from "next/server";
import { approvals, webhookEvents, projects, agents } from "@/lib/db";
import { broadcast } from "@/lib/sse";
import { suggestStageForAgent, mapTierString } from "@/lib/policy";

// Agent key mapping for validation
const validAgentKeys = [
  "leadIntake",
  "discovery",
  "proposal",
  "onboarding",
  "tierExecution",
  "customerSupport",
  "qualityCompliance",
];

const agentDisplayNames: Record<string, string> = {
  leadIntake: "Lead Intake & Qualification",
  discovery: "Discovery Support",
  proposal: "Proposal Drafting",
  onboarding: "Client Onboarding",
  tierExecution: "Tier Execution Support",
  customerSupport: "Customer Support & Escalation",
  qualityCompliance: "Quality & Compliance",
};

type CheckpointType = "proposal_review" | "discovery_summary" | "tier_execution" | "quality_check";

const checkpointTypes: Record<string, CheckpointType> = {
  leadIntake: "discovery_summary",
  discovery: "discovery_summary",
  proposal: "proposal_review",
  onboarding: "discovery_summary",
  tierExecution: "tier_execution",
  customerSupport: "discovery_summary",
  qualityCompliance: "quality_check",
};

/**
 * POST /api/webhooks/:agent
 * Receive webhook from n8n agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent } = await params;

    // Validate agent key
    if (!validAgentKeys.includes(agent)) {
      return NextResponse.json(
        { success: false, error: "Invalid agent key" },
        { status: 400 }
      );
    }

    // Validate webhook secret (optional)
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get("X-Webhook-Secret");
      if (providedSecret !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook secret" },
          { status: 401 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { email, payload, response } = body;

    if (!email || !response) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, response" },
        { status: 400 }
      );
    }

    // Log webhook event
    webhookEvents.create({
      agent_key: agent,
      client_email: email,
      payload: JSON.stringify(body),
      response_status: 200,
    });

    // Create approval record with recommended stage (human must approve to advance)
    const recommendedStage = suggestStageForAgent(agent);
    const approval = approvals.create({
      client_email: email,
      agent_key: agent,
      stage_name: agentDisplayNames[agent] || agent,
      checkpoint_type: checkpointTypes[agent] || "discovery_summary",
      agent_payload: JSON.stringify(payload || {}),
      agent_response: JSON.stringify(response),
      recommended_stage: recommendedStage,
    });

    // Broadcast to all connected SSE clients
    broadcast({
      type: "new_approval",
      data: {
        id: approval.id,
        client_email: approval.client_email,
        agent_key: approval.agent_key,
        stage_name: approval.stage_name,
        checkpoint_type: approval.checkpoint_type,
        status: approval.status,
        created_at: approval.created_at,
      },
    });

    // Check if a project already exists for this client+tier
    const tier = mapTierString(
      body.tier || response?.tier || response?.recommended_tier || "Launch"
    );

    const existingProjects = projects.getByEmail(email)
      .filter((p) => p.tier === tier);

    let project = existingProjects[0] || null;

    if (project) {
      // Update existing project fields (but NOT stage — that's human-gated)
      project = projects.update(project.id, {
        client_name: body.name || body.client_name || project.client_name || null,
        icp_level: response?.icp_level || project.icp_level || null,
        sop_step_key: body.sop_step_key || project.sop_step_key || null,
      })!;

      broadcast({
        type: "project.updated",
        data: {
          id: project.id,
          client_email: project.client_email,
          stage: project.stage,
          tier: project.tier,
          status: project.status,
        },
      });
    } else {
      // No project exists — DO NOT auto-create. Signal that human must create it.
      broadcast({
        type: "project.creation_pending",
        data: {
          approval_id: approval.id,
          client_email: email,
          tier,
          agent_key: agent,
          recommended_stage: recommendedStage,
          client_name: body.name || body.client_name || null,
        },
      });
    }

    // Update agent event count
    agents.incrementEventCount(agent);

    broadcast({
      type: "agent.event",
      data: {
        agent_key: agent,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      approval_id: approval.id,
      project_id: project?.id || null,
      project_creation_pending: !project,
      message: project
        ? "Approval created successfully"
        : "Approval created — project creation requires human authorization",
    });
  } catch (error) {
    console.error("Webhook error:", error);

    // Log failed webhook
    try {
      const { agent } = await params;
      webhookEvents.create({
        agent_key: agent,
        client_email: null,
        payload: await request.text(),
        response_status: 500,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
