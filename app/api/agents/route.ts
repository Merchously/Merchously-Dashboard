import { NextRequest, NextResponse } from "next/server";
import { agents } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/agents
 * List all registered agents
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const data = agents.getAll();

    return NextResponse.json({
      success: true,
      count: data.length,
      agents: data,
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch agents",
      },
      { status: 500 }
    );
  }
}
