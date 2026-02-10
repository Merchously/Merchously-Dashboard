import { NextRequest, NextResponse } from "next/server";
import { users } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { broadcast } from "@/lib/sse";
import { ROLES, type UserRole } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    requireRole(currentUser, "FOUNDER");

    const { id } = await params;
    const body = await request.json();
    const { action, roleOverride } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const targetUser = users.getById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (targetUser.is_active === 1) {
      return NextResponse.json(
        { success: false, error: "User is already active" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const updateData: { is_active: number; role?: UserRole } = { is_active: 1 };
      if (roleOverride && ROLES.includes(roleOverride as UserRole)) {
        updateData.role = roleOverride as UserRole;
      }
      const updated = users.update(id, updateData);

      broadcast({
        type: "user.approved",
        data: {
          id: updated!.id,
          username: updated!.username,
          role: updated!.role,
        },
      });

      return NextResponse.json({
        success: true,
        message: `User ${targetUser.username} approved`,
        user: {
          id: updated!.id,
          username: updated!.username,
          display_name: updated!.display_name,
          role: updated!.role,
        },
      });
    }

    // Reject: delete the user record
    users.delete(id);

    broadcast({
      type: "user.rejected",
      data: {
        id: targetUser.id,
        username: targetUser.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.username} rejected and removed`,
    });
  } catch (error) {
    console.error("Error processing user approval:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process approval",
      },
      { status: 500 }
    );
  }
}
