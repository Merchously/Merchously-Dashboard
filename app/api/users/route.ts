import { NextResponse } from "next/server";
import { users } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await requireAuth();
    requireRole(currentUser, "FOUNDER");

    const allUsers = users.getAll().map(({ password_hash, ...rest }) => rest);

    return NextResponse.json({ success: true, users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}
