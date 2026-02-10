import { NextRequest, NextResponse } from "next/server";
import { projects, sopProgress, sopDefinitions, clientResponsiveness } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

/**
 * GET /api/projects/:id/sop
 * Get SOP progress for a specific project. Auto-initializes if not yet set up.
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

    // Auto-initialize SOP progress if none exists
    let progress = sopProgress.getByProject(id);
    if (progress.length === 0) {
      progress = sopProgress.initForProject(id, project.tier);
    }

    const responsiveness = clientResponsiveness.getByProject(id);
    const avgResponseHours = clientResponsiveness.getAverageResponseTime(id);
    const pendingRequests = clientResponsiveness.getPending(id);

    return NextResponse.json({
      success: true,
      progress,
      responsiveness: {
        items: responsiveness,
        avgResponseHours: avgResponseHours ? Math.round(avgResponseHours * 10) / 10 : null,
        pendingCount: pendingRequests.length,
      },
    });
  } catch (error) {
    console.error("Error fetching SOP progress:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch SOP progress" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/:id/sop
 * Update a specific SOP step's status, blockers, or notes.
 * Body: { step_key, status?, blockers?, missing_inputs?, notes? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, "FOUNDER", "DELIVERY_LEAD");

    const { id } = await params;
    const project = projects.getById(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { step_key, status, blockers, missing_inputs, notes } = body;

    if (!step_key) {
      return NextResponse.json(
        { success: false, error: "step_key is required" },
        { status: 400 }
      );
    }

    const existing = sopProgress.getByProjectAndStep(id, step_key);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "SOP step not found for this project" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;

      // Auto-set timestamps
      if (status === "in_progress" && !existing.started_at) {
        updateData.started_at = new Date().toISOString();
        // Calculate expected completion
        const def = sopDefinitions.getByStepKey(step_key);
        if (def) {
          const expected = new Date();
          expected.setHours(expected.getHours() + def.expected_duration_hours);
          updateData.expected_completion_at = expected.toISOString();
        }
      }
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (blockers !== undefined) {
      updateData.blockers = typeof blockers === "string" ? blockers : JSON.stringify(blockers);
    }
    if (missing_inputs !== undefined) {
      updateData.missing_inputs = typeof missing_inputs === "string" ? missing_inputs : JSON.stringify(missing_inputs);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = sopProgress.update(existing.id, updateData);

    // Also update the project's sop_step_key to the current in-progress step
    if (status === "in_progress") {
      projects.update(id, { sop_step_key: step_key });
    }

    broadcast({
      type: "sop.updated",
      data: {
        project_id: id,
        step_key,
        status: updated?.status,
      },
    });

    return NextResponse.json({
      success: true,
      progress: updated,
      message: "SOP step updated successfully",
    });
  } catch (error) {
    console.error("Error updating SOP progress:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update SOP progress" },
      { status: 500 }
    );
  }
}
