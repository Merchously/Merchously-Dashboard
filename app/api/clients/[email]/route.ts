import { NextRequest, NextResponse } from "next/server";
import { getClientByEmail } from "@/lib/airtable";
import { requireAuth } from "@/lib/auth";
import { approvals } from "@/lib/db";

/**
 * GET /api/clients/:email
 * Get a single client by email with their approval history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Require authentication
    await requireAuth();

    const { email } = await params;

    // Decode email (in case it's URL encoded)
    const decodedEmail = decodeURIComponent(email);

    // Get client from Airtable
    const client = await getClientByEmail(decodedEmail);

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    // Get client's approval history
    const clientApprovals = approvals.getByEmail(decodedEmail);

    return NextResponse.json({
      success: true,
      client,
      approvals: clientApprovals,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch client",
      },
      { status: 500 }
    );
  }
}
