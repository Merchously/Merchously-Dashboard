import { NextRequest, NextResponse } from "next/server";
import { webhookEvents, agentTriggers, policyAudit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/activity-log
 * Unified chronological AI activity feed merging webhook_events, agent_triggers,
 * and approval_policy_audit. Read-only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const agent = searchParams.get("agent");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Fetch from all three sources
    const webhooks = agent
      ? webhookEvents.getByAgent(agent, limit)
      : webhookEvents.getAll(limit, 0);

    const triggers = agentTriggers.getAll(limit, 0);

    const audits = policyAudit.getAll(limit, 0);

    // Build unified feed
    type ActivityItem = {
      id: string;
      event_type: "webhook_received" | "agent_triggered" | "policy_action";
      agent_key: string;
      client_email?: string | null;
      summary: string;
      timestamp: string;
      details?: any;
    };

    const items: ActivityItem[] = [];

    for (const wh of webhooks) {
      items.push({
        id: `wh-${wh.id}`,
        event_type: "webhook_received",
        agent_key: wh.agent_key,
        client_email: wh.client_email,
        summary: `Webhook received from ${wh.agent_key}${wh.client_email ? ` for ${wh.client_email}` : ""}`,
        timestamp: wh.created_at,
        details: { response_status: wh.response_status, error: wh.error_message },
      });
    }

    for (const trigger of triggers) {
      items.push({
        id: `trigger-${trigger.id}`,
        event_type: "agent_triggered",
        agent_key: trigger.agent_key,
        summary: `Agent ${trigger.agent_key} triggered (${trigger.status})${trigger.error_message ? ` — ${trigger.error_message}` : ""}`,
        timestamp: trigger.created_at,
        details: { project_id: trigger.project_id, status: trigger.status, triggered_by: trigger.triggered_by },
      });
    }

    for (const audit of audits) {
      items.push({
        id: `audit-${audit.id}`,
        event_type: "policy_action",
        agent_key: "policy",
        summary: `Policy ${audit.policy_action}: ${audit.reason}`,
        timestamp: audit.created_at,
        details: { approval_id: audit.approval_id, escalation_id: audit.escalation_id },
      });
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      activity: items.slice(0, limit),
    });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}
