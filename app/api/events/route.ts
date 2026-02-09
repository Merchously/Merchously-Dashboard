import { NextRequest } from "next/server";
import { createSSEStream } from "@/lib/sse";
import { requireAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time dashboard updates
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    // Generate client ID
    const clientId = uuidv4();

    // Create SSE stream
    const stream = createSSEStream(clientId);

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE error:", error);
    return new Response("Unauthorized", { status: 401 });
  }
}
