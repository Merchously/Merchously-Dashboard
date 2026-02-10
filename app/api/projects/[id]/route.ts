import { NextRequest, NextResponse } from "next/server";
import { projects, approvals, escalations, projectNotes, agentTriggers } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { isValidTransition, getStageName, type PipelineStage } from "@/lib/constants";

function safeJSONParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}

function parseProject(project: any) {
  return {
    ...project,
    blockers_json: safeJSONParse(project.blockers_json),
  };
}

/**
 * GET /api/projects/:id
 * Get a single project with linked approvals and escalations
 */
export async function GET(
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

    // Fetch linked approvals and escalations
    const linkedApprovals = approvals
      .getByEmail(project.client_email)
      .map((a) => ({
        ...a,
        agent_payload: safeJSONParse(a.agent_payload),
        agent_response: safeJSONParse(a.agent_response),
        edited_response: a.edited_response
          ? safeJSONParse(a.edited_response)
          : null,
      }));

    const linkedEscalations = escalations.getByProject(project.id);
    const notes = projectNotes.getByProject(project.id);
    const triggers = agentTriggers.getByProject(project.id);

    return NextResponse.json({
      success: true,
      project: parseProject(project),
      approvals: linkedApprovals,
      escalations: linkedEscalations,
      notes,
      triggers,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch project",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/:id
 * Update project fields (stage, status, sop_step_key, blockers_json)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    // Stage changes require FOUNDER, SALES_LEAD, or DELIVERY_LEAD
    requireRole(user, "FOUNDER", "SALES_LEAD", "DELIVERY_LEAD");

    const { id } = await params;
    const body = await request.json();

    const existing = projects.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const { stage, status, sop_step_key, blockers_json, client_name, icp_level, override_stage_skip, fit_decision_notes, decision_maker, trust_score, assigned_sales_lead, assigned_delivery_lead } = body;

    // Validate stage transition: no skipping without escalation
    if (stage !== undefined && stage !== existing.stage) {
      const isValid = isValidTransition(existing.stage as PipelineStage, stage as PipelineStage);
      if (!isValid) {
        if (override_stage_skip) {
          // Allow the skip but auto-create an L2/SCOPE escalation documenting it
          escalations.create({
            project_id: id,
            level: "L2",
            category: "SCOPE",
            title: `Stage skip: ${existing.stage} → ${stage}`,
            description: `Stage was skipped from ${existing.stage} to ${stage} with override. This requires review.`,
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid stage transition: ${existing.stage} → ${stage}. Stages cannot be skipped without escalation. Set override_stage_skip: true to force with an auto-escalation.`,
            },
            { status: 422 }
          );
        }
      }

      // C3: FIT_DECISION → PROPOSAL requires fit decision notes
      if (existing.stage === "FIT_DECISION" && stage === "PROPOSAL" && !fit_decision_notes) {
        return NextResponse.json(
          {
            success: false,
            error: "Fit decision notes are required to advance from Internal Review to Proposal. This is a required human decision checkpoint.",
          },
          { status: 422 }
        );
      }
    }

    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (status !== undefined) updateData.status = status;
    if (sop_step_key !== undefined) updateData.sop_step_key = sop_step_key;
    if (blockers_json !== undefined) {
      updateData.blockers_json =
        typeof blockers_json === "string"
          ? blockers_json
          : JSON.stringify(blockers_json);
    }
    if (client_name !== undefined) updateData.client_name = client_name;
    if (icp_level !== undefined) updateData.icp_level = icp_level;
    if (decision_maker !== undefined) updateData.decision_maker = decision_maker;
    if (trust_score !== undefined) updateData.trust_score = trust_score;
    if (assigned_sales_lead !== undefined) updateData.assigned_sales_lead = assigned_sales_lead;
    if (assigned_delivery_lead !== undefined) updateData.assigned_delivery_lead = assigned_delivery_lead;

    const updated = projects.update(id, updateData);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update project" },
        { status: 500 }
      );
    }

    // Auto-create system notes for stage/status changes
    if (stage !== undefined && stage !== existing.stage) {
      projectNotes.create({
        project_id: id,
        author: "System",
        content: `Stage changed from ${getStageName(existing.stage)} to ${getStageName(stage)}`,
        note_type: "stage_change",
      });

      // Record fit decision rationale
      if (existing.stage === "FIT_DECISION" && stage === "PROPOSAL" && fit_decision_notes) {
        projectNotes.create({
          project_id: id,
          author: "System",
          content: `Fit Decision: ${fit_decision_notes}`,
          note_type: "instruction",
        });
      }

      // M3: Auto-trigger onboarding agent when deal is closed
      if (stage === "CLOSED") {
        agentTriggers.create({
          project_id: id,
          agent_key: "onboarding",
          trigger_payload: JSON.stringify({
            client_email: updated.client_email,
            client_name: updated.client_name,
            tier: updated.tier,
            auto_triggered: true,
            reason: "Deal closed — onboarding auto-triggered",
          }),
          triggered_by: "system",
        });

        projectNotes.create({
          project_id: id,
          author: "System",
          content: "Onboarding agent auto-triggered on deal close",
          note_type: "agent_trigger",
        });

        broadcast({
          type: "agent.triggered",
          data: { project_id: id, agent_key: "onboarding", auto: true },
        });
      }
    }
    if (status !== undefined && status !== existing.status) {
      projectNotes.create({
        project_id: id,
        author: "System",
        content: `Status changed from ${existing.status} to ${status}`,
        note_type: "status_change",
      });
    }

    broadcast({
      type: "project.updated",
      data: {
        id: updated.id,
        client_email: updated.client_email,
        stage: updated.stage,
        status: updated.status,
      },
    });

    return NextResponse.json({
      success: true,
      project: parseProject(updated),
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 }
    );
  }
}
