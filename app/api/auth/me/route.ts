import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns the current user's info from the JWT.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }
}
