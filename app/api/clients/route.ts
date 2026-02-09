import { NextRequest, NextResponse } from "next/server";
import { getClients, searchClients } from "@/lib/airtable";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/clients
 * Get all clients from Airtable
 * Query params:
 *   - limit: number (default 100)
 *   - search: string (optional search query)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const search = searchParams.get("search");

    // Search or get all clients
    const clients = search
      ? await searchClients(search)
      : await getClients(limit);

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch clients",
      },
      { status: 500 }
    );
  }
}
