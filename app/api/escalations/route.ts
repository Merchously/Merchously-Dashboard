import { NextRequest, NextResponse } from "next/server";
import { escalations, projects } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

const VALID_LEVELS = ["L1", "L2", "L3"];
const VALID_CATEGORIES = [
  "FINANCIAL",
  "SCOPE",
  "LEGAL_BRAND",
  "RELATIONSHIP",
  "SYSTEM_CONFLICT",
  "OTHER",
];

/**
 * GET /api/escalations
 * List escalations with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const project_id = searchParams.get("project_id");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let data;
    if (status) {
      data = escalations.getByStatus(status as any);
    } else if (project_id) {
      data = escalations.getByProject(project_id);
    } else {
      data = escalations.getAll(limit, offset);
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      escalations: data,
    });
  } catch (error) {
    console.error("Error fetching escalations:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch escalations",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escalations
 * Create an escalation. L3 escalations auto-pause the linked project.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { project_id, level, category, title, description } = body;

    if (!project_id || !level || !category || !title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: project_id, level, category, title",
        },
        { status: 400 }
      );
    }

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid level. Must be one of: ${VALID_LEVELS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = projects.getById(project_id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const escalation = escalations.create({
      project_id,
      level,
      category,
      title,
      description: description || null,
    });

    // L3 side effect: auto-pause the linked project
    if (level === "L3") {
      projects.update(project_id, { status: "PAUSED" });

      broadcast({
        type: "project.updated",
        data: {
          id: project.id,
          client_email: project.client_email,
          status: "PAUSED",
          reason: "L3 escalation auto-pause",
        },
      });
    }

    // Broadcast escalation created
    broadcast({
      type: "escalation.created",
      data: {
        id: escalation.id,
        project_id: escalation.project_id,
        level: escalation.level,
        category: escalation.category,
        title: escalation.title,
        status: escalation.status,
      },
    });

    return NextResponse.json({
      success: true,
      escalation,
      message:
        level === "L3"
          ? "L3 escalation created — project auto-paused"
          : "Escalation created successfully",
    });
  } catch (error) {
    console.error("Error creating escalation:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create escalation",
      },
      { status: 500 }
    );
  }
}
