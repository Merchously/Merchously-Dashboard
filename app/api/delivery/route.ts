import { NextRequest, NextResponse } from "next/server";
import { projects, sopProgress, clientResponsiveness } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * GET /api/delivery
 * Get all delivery-stage projects with their SOP progress, drift indicators,
 * and client responsiveness scores.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, "FOUNDER", "DELIVERY_LEAD", "SALES_LEAD");

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // ACTIVE, BLOCKED, PAUSED

    // Get projects in delivery-related stages
    const allProjects = projects.getAll();
    const deliveryProjects = allProjects.filter((p) => {
      const inDeliveryStage = ["ONBOARDING", "DELIVERY"].includes(p.stage);
      if (!inDeliveryStage) return false;
      if (statusFilter) return p.status === statusFilter;
      return true;
    });

    // Enrich each project with SOP progress and responsiveness
    const enriched = deliveryProjects.map((project) => {
      const progress = sopProgress.getByProject(project.id);
      const responsiveness = clientResponsiveness.getByProject(project.id);
      const avgResponseHours = clientResponsiveness.getAverageResponseTime(project.id);
      const pendingRequests = clientResponsiveness.getPending(project.id);

      // Calculate SOP metrics
      const totalSteps = progress.length;
      const completedSteps = progress.filter((s) => s.status === "completed").length;
      const blockedSteps = progress.filter((s) => s.status === "blocked").length;
      const inProgressSteps = progress.filter((s) => s.status === "in_progress").length;

      // Check for timeline drift: any in_progress step past expected_completion_at
      const now = new Date();
      const driftingSteps = progress.filter((s) => {
        if (s.status !== "in_progress" || !s.expected_completion_at) return false;
        return new Date(s.expected_completion_at) < now;
      });

      return {
        ...project,
        sop: {
          progress,
          totalSteps,
          completedSteps,
          blockedSteps,
          inProgressSteps,
          completionPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          driftingSteps: driftingSteps.length,
        },
        responsiveness: {
          avgResponseHours: avgResponseHours ? Math.round(avgResponseHours * 10) / 10 : null,
          pendingRequests: pendingRequests.length,
          totalRequests: responsiveness.length,
          respondedRequests: responsiveness.filter((r) => r.responded_at).length,
        },
      };
    });

    // Sort: blocked first, then by drift count desc, then by completion % asc
    enriched.sort((a, b) => {
      if (a.status === "BLOCKED" && b.status !== "BLOCKED") return -1;
      if (b.status === "BLOCKED" && a.status !== "BLOCKED") return 1;
      if (a.sop.driftingSteps !== b.sop.driftingSteps) return b.sop.driftingSteps - a.sop.driftingSteps;
      return a.sop.completionPercent - b.sop.completionPercent;
    });

    return NextResponse.json({
      success: true,
      projects: enriched,
      summary: {
        total: enriched.length,
        active: enriched.filter((p) => p.status === "ACTIVE").length,
        blocked: enriched.filter((p) => p.status === "BLOCKED").length,
        paused: enriched.filter((p) => p.status === "PAUSED").length,
        withDrift: enriched.filter((p) => p.sop.driftingSteps > 0).length,
      },
    });
  } catch (error) {
    console.error("Error fetching delivery data:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch delivery data" },
      { status: 500 }
    );
  }
}
