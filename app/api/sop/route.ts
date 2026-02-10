import { NextRequest, NextResponse } from "next/server";
import { sopDefinitions } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/sop
 * Get SOP definitions, optionally filtered by tier.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier");

    const definitions = tier
      ? sopDefinitions.getByTier(tier)
      : sopDefinitions.getAll();

    return NextResponse.json({
      success: true,
      definitions,
    });
  } catch (error) {
    console.error("Error fetching SOP definitions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch SOP definitions" },
      { status: 500 }
    );
  }
}
