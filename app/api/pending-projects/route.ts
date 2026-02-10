import { NextResponse } from "next/server";
import { approvals, projects } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { mapTierString } from "@/lib/policy";

/**
 * GET /api/pending-projects
 * Returns pending approvals that don't have a linked project yet.
 * These represent leads where AI has submitted data but no human
 * has authorized project creation.
 */
export async function GET() {
  try {
    await requireAuth();

    const pendingApprovals = approvals.getByStatus("pending");

    // Find approvals where no project exists for the client email
    const orphans = pendingApprovals.filter((approval) => {
      const clientProjects = projects.getByEmail(approval.client_email);
      return clientProjects.length === 0;
    });

    // Parse JSON fields for each orphan
    const parsed = orphans.map((a) => {
      let response: any = {};
      try {
        response = JSON.parse(a.agent_response);
      } catch {}
      return {
        approval_id: a.id,
        client_email: a.client_email,
        agent_key: a.agent_key,
        stage_name: a.stage_name,
        recommended_stage: a.recommended_stage,
        tier: mapTierString(response?.tier || response?.recommended_tier || "Launch"),
        client_name: response?.name || response?.client_name || null,
        created_at: a.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      pending_projects: parsed,
    });
  } catch (error) {
    console.error("Error fetching pending projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending projects" },
      { status: 500 }
    );
  }
}
