import { NextRequest, NextResponse } from "next/server";
import { webhookEvents } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function safeJSONParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}

/**
 * GET /api/webhook-events
 * List recent webhook events
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const agent_key = searchParams.get("agent_key");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let data;
    if (agent_key) {
      data = webhookEvents.getByAgent(agent_key, limit);
    } else {
      data = webhookEvents.getAll(limit, offset);
    }

    const parsed = data.map((e) => ({
      ...e,
      payload: safeJSONParse(e.payload),
    }));

    return NextResponse.json({
      success: true,
      count: parsed.length,
      events: parsed,
    });
  } catch (error) {
    console.error("Error fetching webhook events:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch webhook events",
      },
      { status: 500 }
    );
  }
}
