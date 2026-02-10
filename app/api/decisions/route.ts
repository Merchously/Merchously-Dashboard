import { NextResponse } from "next/server";
import { approvals, escalations, policyAudit } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * GET /api/decisions
 * Unified decision queue: pending approvals + open escalations + policy alerts.
 * Sorted by urgency: L3 escalations first, then L2, then pending approvals by age.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    requireRole(user, "FOUNDER", "SALES_LEAD", "DELIVERY_LEAD");

    const pendingApprovals = approvals.getByStatus("pending");
    const openEscalations = escalations.getByStatus("OPEN");
    const recentAudits = policyAudit.getAll(50, 0);

    // Build unified queue
    type DecisionItem = {
      id: string;
      type: "escalation" | "approval" | "policy_alert";
      urgency: number; // lower = more urgent
      title: string;
      description: string;
      category?: string;
      level?: string;
      client_email?: string;
      created_at: string;
      source_id: string;
    };

    const items: DecisionItem[] = [];

    // Add escalations (most urgent)
    for (const esc of openEscalations) {
      items.push({
        id: `esc-${esc.id}`,
        type: "escalation",
        urgency: esc.level === "L3" ? 0 : esc.level === "L2" ? 1 : 2,
        title: esc.title,
        description: esc.description || "",
        category: esc.category,
        level: esc.level,
        created_at: esc.created_at,
        source_id: esc.id,
      });
    }

    // Add pending approvals
    for (const app of pendingApprovals) {
      items.push({
        id: `app-${app.id}`,
        type: "approval",
        urgency: 3,
        title: `${app.stage_name} — ${app.checkpoint_type.replace(/_/g, " ")}`,
        description: `Pending review for ${app.client_email}`,
        client_email: app.client_email,
        created_at: app.created_at,
        source_id: app.id,
      });
    }

    // Sort: by urgency first, then by age (oldest first)
    items.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency - b.urgency;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return NextResponse.json({
      success: true,
      decisions: items,
      summary: {
        l3_escalations: openEscalations.filter((e) => e.level === "L3").length,
        l2_escalations: openEscalations.filter((e) => e.level === "L2").length,
        l1_escalations: openEscalations.filter((e) => e.level === "L1").length,
        pending_approvals: pendingApprovals.length,
        recent_policy_actions: recentAudits.length,
      },
    });
  } catch (error) {
    console.error("Error fetching decisions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch decisions" },
      { status: 500 }
    );
  }
}
