import { NextRequest, NextResponse } from "next/server";
import { approvals } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/approvals/:id
 * Get a single approval by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { id } = await params;

    const approval = approvals.getById(id);

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedApproval = {
      ...approval,
      agent_payload: safeJSONParse(approval.agent_payload),
      agent_response: safeJSONParse(approval.agent_response),
      edited_response: approval.edited_response
        ? safeJSONParse(approval.edited_response)
        : null,
    };

    return NextResponse.json({
      success: true,
      approval: parsedApproval,
    });
  } catch (error) {
    console.error("Error fetching approval:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch approval",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/approvals/:id
 * Update an approval (approve, reject, edit)
 * Body:
 *   - status: 'approved' | 'rejected' | 'edited'
 *   - admin_comments: string (optional)
 *   - edited_response: object (optional, for edited status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    const { id } = await params;
    const body = await request.json();

    const { status, admin_comments, edited_response } = body;

    // Validate status
    if (!status || !["approved", "rejected", "edited"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get existing approval
    const existingApproval = approvals.getById(id);
    if (!existingApproval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 }
      );
    }

    // Update approval
    const updatedApproval = approvals.update(id, {
      status,
      reviewed_by: user.username || "admin",
      reviewed_at: new Date().toISOString(),
      admin_comments: admin_comments || null,
      edited_response: edited_response
        ? JSON.stringify(edited_response)
        : null,
    });

    if (!updatedApproval) {
      return NextResponse.json(
        { success: false, error: "Failed to update approval" },
        { status: 500 }
      );
    }

    // TODO: Call n8n workflow to execute approved action
    // For now, we'll just update the database
    // In Phase 4, we'll add webhook calls to n8n here

    // Parse JSON fields for response
    const parsedApproval = {
      ...updatedApproval,
      agent_payload: safeJSONParse(updatedApproval.agent_payload),
      agent_response: safeJSONParse(updatedApproval.agent_response),
      edited_response: updatedApproval.edited_response
        ? safeJSONParse(updatedApproval.edited_response)
        : null,
    };

    return NextResponse.json({
      success: true,
      approval: parsedApproval,
      message: `Approval ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update approval",
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
