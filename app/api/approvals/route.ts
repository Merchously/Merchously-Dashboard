import { NextRequest, NextResponse } from "next/server";
import { approvals } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/approvals
 * Get all approvals from SQLite
 * Query params:
 *   - status: 'pending' | 'approved' | 'rejected' | 'edited'
 *   - limit: number (default 100)
 *   - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | "edited"
      | null;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get approvals by status or all
    const approvalsData = status
      ? approvals.getByStatus(status)
      : approvals.getAll(limit, offset);

    // Parse JSON fields
    const parsedApprovals = approvalsData.map((approval) => ({
      ...approval,
      agent_payload: safeJSONParse(approval.agent_payload),
      agent_response: safeJSONParse(approval.agent_response),
      edited_response: approval.edited_response
        ? safeJSONParse(approval.edited_response)
        : null,
    }));

    return NextResponse.json({
      success: true,
      count: parsedApprovals.length,
      approvals: parsedApprovals,
    });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch approvals",
      },
      { status: 500 }
    );
  }
}

// Helper function to safely parse JSON
function safeJSONParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}
