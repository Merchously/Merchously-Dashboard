import { NextResponse } from "next/server";
import { users } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    requireRole(user, "FOUNDER");

    const pendingUsers = users.getByStatus(0).map(
      ({ password_hash, ...rest }) => rest
    );

    return NextResponse.json({
      success: true,
      users: pendingUsers,
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pending users",
      },
      { status: error instanceof Error && error.message.includes("Not authenticated") ? 401 : 500 }
    );
  }
}
