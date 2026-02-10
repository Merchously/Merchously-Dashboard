import { NextRequest, NextResponse } from "next/server";
import { agents } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

/**
 * PATCH /api/agents/:id
 * Toggle is_active, update category (AI_OPERATOR or FOUNDER only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, "AI_OPERATOR", "FOUNDER");

    const { id } = await params;
    const body = await request.json();

    const existing = agents.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    const { is_active, category, webhook_url } = body;
    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
    if (category !== undefined) updateData.category = category;
    if (webhook_url !== undefined) updateData.webhook_url = webhook_url;

    const updated = agents.update(id, updateData);

    return NextResponse.json({
      success: true,
      agent: updated,
      message: "Agent updated successfully",
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update agent",
      },
      { status: 500 }
    );
  }
}
