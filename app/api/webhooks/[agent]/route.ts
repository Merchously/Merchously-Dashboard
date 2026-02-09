import { NextRequest, NextResponse } from "next/server";
import { approvals, webhookEvents } from "@/lib/db";
import { broadcast } from "@/lib/sse";

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

    // Create approval record
    const approval = approvals.create({
      client_email: email,
      agent_key: agent,
      stage_name: agentDisplayNames[agent] || agent,
      checkpoint_type: checkpointTypes[agent] || "discovery_summary",
      agent_payload: JSON.stringify(payload || {}),
      agent_response: JSON.stringify(response),
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

    return NextResponse.json({
      success: true,
      approval_id: approval.id,
      message: "Approval created successfully",
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
