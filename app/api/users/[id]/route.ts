import { NextRequest, NextResponse } from "next/server";
import { users } from "@/lib/db";
import { requireAuth, requireRole, hashPassword } from "@/lib/auth";
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

    const targetUser = users.getById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Self-protection
    if (id === currentUser.userId && body.is_active === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const updateData: Partial<
      Pick<typeof targetUser, "role" | "is_active" | "password_hash" | "display_name">
    > = {};

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: "Invalid role" },
          { status: 400 }
        );
      }
      updateData.role = body.role as UserRole;
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active ? 1 : 0;
    }

    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      updateData.password_hash = await hashPassword(body.newPassword);
    }

    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name;
    }

    const updated = users.update(id, updateData);

    let eventType = "user.updated";
    if (body.is_active === 0) eventType = "user.deactivated";
    else if (body.is_active === 1 && targetUser.is_active === 0)
      eventType = "user.reactivated";
    else if (body.newPassword) eventType = "user.password_reset";
    else if (body.role) eventType = "user.role_changed";

    broadcast({
      type: eventType,
      data: {
        id: updated!.id,
        username: updated!.username,
        role: updated!.role,
        is_active: updated!.is_active,
      },
    });

    const { password_hash, ...safeUser } = updated!;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    requireRole(currentUser, "FOUNDER");

    const { id } = await params;

    if (id === currentUser.userId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
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

    users.delete(id);

    broadcast({
      type: "user.deleted",
      data: {
        id: targetUser.id,
        username: targetUser.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.username} permanently deleted`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 500 }
    );
  }
}
