import { NextRequest, NextResponse } from "next/server";
import { escalations, projects } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

/**
 * GET /api/escalations/:id
 * Get a single escalation with linked project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const escalation = escalations.getById(id);

    if (!escalation) {
      return NextResponse.json(
        { success: false, error: "Escalation not found" },
        { status: 404 }
      );
    }

    const project = projects.getById(escalation.project_id);

    return NextResponse.json({
      success: true,
      escalation,
      project,
    });
  } catch (error) {
    console.error("Error fetching escalation:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch escalation",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/escalations/:id
 * Resolve or halt an escalation.
 * L2/L3 require decision_notes.
 * L3 resolution with unpause_project=true reactivates the project.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    // L2/L3 escalations can only be resolved by FOUNDER
    requireRole(user, "FOUNDER", "SALES_LEAD", "DELIVERY_LEAD");

    const { id } = await params;
    const body = await request.json();

    const { status, decision_notes, unpause_project } = body;

    if (!status || !["RESOLVED", "HALTED"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be RESOLVED or HALTED",
        },
        { status: 400 }
      );
    }

    const existing = escalations.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Escalation not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Escalation is already resolved or halted" },
        { status: 400 }
      );
    }

    // L2/L3 require decision notes
    if (
      (existing.level === "L2" || existing.level === "L3") &&
      !decision_notes
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Decision notes are required when resolving ${existing.level} escalations`,
        },
        { status: 422 }
      );
    }

    const updated = escalations.update(id, {
      status,
      decision_notes: decision_notes || null,
      resolved_by: user.username || "admin",
      resolved_at: new Date().toISOString(),
    });

    // L3 resolution: optionally unpause the linked project
    if (
      existing.level === "L3" &&
      status === "RESOLVED" &&
      unpause_project === true
    ) {
      projects.update(existing.project_id, { status: "ACTIVE" });

      broadcast({
        type: "project.updated",
        data: {
          id: existing.project_id,
          status: "ACTIVE",
          reason: "L3 escalation resolved — project unpaused",
        },
      });
    }

    // Broadcast escalation resolved
    broadcast({
      type: "escalation.resolved",
      data: {
        id: updated!.id,
        project_id: updated!.project_id,
        level: updated!.level,
        status: updated!.status,
      },
    });

    return NextResponse.json({
      success: true,
      escalation: updated,
      message: `Escalation ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Error updating escalation:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update escalation",
      },
      { status: 500 }
    );
  }
}
