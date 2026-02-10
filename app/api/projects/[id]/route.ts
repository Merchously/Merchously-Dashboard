import { NextRequest, NextResponse } from "next/server";
import { projects, approvals, escalations, projectNotes, agentTriggers } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

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
    await requireAuth();

    const { id } = await params;
    const body = await request.json();

    const existing = projects.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const { stage, status, sop_step_key, blockers_json, client_name, icp_level } = body;

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
        content: `Stage changed from ${existing.stage.replace(/_/g, " ")} to ${stage.replace(/_/g, " ")}`,
        note_type: "stage_change",
      });
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
