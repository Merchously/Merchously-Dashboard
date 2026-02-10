import { NextRequest, NextResponse } from "next/server";
import { approvals, projects, escalations, policyAudit, projectNotes } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { enforceApprovalPolicy } from "@/lib/policy";
import { STAGE_ACTIONS } from "@/lib/constants";

/**
 * GET /api/approvals/:id
 * Get a single approval by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { id } = await params;

    const approval = approvals.getById(id);

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedApproval = {
      ...approval,
      agent_payload: safeJSONParse(approval.agent_payload),
      agent_response: safeJSONParse(approval.agent_response),
      edited_response: approval.edited_response
        ? safeJSONParse(approval.edited_response)
        : null,
    };

    return NextResponse.json({
      success: true,
      approval: parsedApproval,
    });
  } catch (error) {
    console.error("Error fetching approval:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch approval",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/approvals/:id
 * Update an approval (approve, reject, edit)
 * Body:
 *   - status: 'approved' | 'rejected' | 'edited'
 *   - admin_comments: string (optional)
 *   - edited_response: object (optional, for edited status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication + role check
    const user = await requireAuth();
    requireRole(user, "FOUNDER", "SALES_LEAD", "DELIVERY_LEAD");

    const { id } = await params;
    const body = await request.json();

    const { status, admin_comments, edited_response, mark_sent } = body;

    // M4: Mark proposal as sent (separate from approval status changes)
    if (mark_sent) {
      const existing = approvals.getById(id);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Approval not found" },
          { status: 404 }
        );
      }
      const updated = approvals.update(id, {
        sent_at: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        approval: updated,
        message: "Proposal marked as sent",
      });
    }

    // Validate status
    if (!status || !["approved", "rejected", "edited"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get existing approval
    const existingApproval = approvals.getById(id);
    if (!existingApproval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 }
      );
    }

    // Enforce approval policy
    const policyResult = enforceApprovalPolicy(existingApproval, {
      action: status,
      admin_comments,
      edited_response,
    });

    if (!policyResult.allowed) {
      policyAudit.create({
        approval_id: id,
        policy_action: "blocked",
        reason: policyResult.reason!,
      });

      broadcast({
        type: "approval.policy_blocked",
        data: { approval_id: id, reason: policyResult.reason },
      });

      return NextResponse.json(
        {
          success: false,
          error: policyResult.reason,
          policy_blocked: true,
        },
        { status: 422 }
      );
    }

    // If policy triggered auto-escalation, create the escalation
    if (policyResult.auto_escalation) {
      const clientProjects = projects.getByEmail(
        existingApproval.client_email
      );
      if (clientProjects.length > 0) {
        const project = clientProjects[0];
        const escalation = escalations.create({
          project_id: project.id,
          level: policyResult.auto_escalation.level,
          category: policyResult.auto_escalation.category,
          title: policyResult.auto_escalation.title,
          description: policyResult.auto_escalation.description,
        });

        policyAudit.create({
          approval_id: id,
          escalation_id: escalation.id,
          policy_action: "auto_escalated",
          reason: policyResult.auto_escalation.description,
        });

        // L3 auto-pause
        if (policyResult.auto_escalation.level === "L3") {
          projects.update(project.id, { status: "PAUSED" });

          broadcast({
            type: "project.updated",
            data: {
              id: project.id,
              status: "PAUSED",
              reason: "L3 escalation auto-pause",
            },
          });
        }

        broadcast({
          type: "escalation.created",
          data: {
            id: escalation.id,
            project_id: escalation.project_id,
            level: escalation.level,
            category: escalation.category,
            title: escalation.title,
          },
        });
      }
    }

    // Update approval
    const updatedApproval = approvals.update(id, {
      status,
      reviewed_by: user.username || "admin",
      reviewed_at: new Date().toISOString(),
      admin_comments: admin_comments || null,
      edited_response: edited_response
        ? JSON.stringify(edited_response)
        : null,
    });

    if (!updatedApproval) {
      return NextResponse.json(
        { success: false, error: "Failed to update approval" },
        { status: 500 }
      );
    }

    // When approved, advance the linked project's stage (human-gated stage advancement)
    if (status === "approved" && existingApproval.recommended_stage) {
      const clientProjects = projects.getByEmail(existingApproval.client_email);
      if (clientProjects.length > 0) {
        const project = clientProjects[0];
        const stageAction = STAGE_ACTIONS[project.stage];

        // Only advance if the project is at the stage before the recommended stage
        if (stageAction && stageAction.nextStage === existingApproval.recommended_stage) {
          projects.update(project.id, { stage: stageAction.nextStage as any });

          projectNotes.create({
            project_id: project.id,
            author: user.username || "admin",
            content: `Stage advanced from ${project.stage} to ${stageAction.nextStage} (approval ${existingApproval.checkpoint_type} approved)`,
            note_type: "stage_change",
          });

          broadcast({
            type: "project.updated",
            data: {
              id: project.id,
              client_email: project.client_email,
              stage: stageAction.nextStage,
              status: project.status,
              reason: `Approval approved: ${existingApproval.stage_name}`,
            },
          });
        }
      }
    }

    // TODO: Call n8n workflow to execute approved action (Phase 4)

    // Parse JSON fields for response
    const parsedApproval = {
      ...updatedApproval,
      agent_payload: safeJSONParse(updatedApproval.agent_payload),
      agent_response: safeJSONParse(updatedApproval.agent_response),
      edited_response: updatedApproval.edited_response
        ? safeJSONParse(updatedApproval.edited_response)
        : null,
    };

    return NextResponse.json({
      success: true,
      approval: parsedApproval,
      message: `Approval ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update approval",
      },
      { status: 500 }
    );
  }
}

// Helper function to safely parse JSON
function safeJSONParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}
