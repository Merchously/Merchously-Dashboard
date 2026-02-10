import { NextRequest, NextResponse } from "next/server";
import { projects } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

function safeJSONParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}

function parseProject(project: any) {
  return {
    ...project,
    blockers_json: safeJSONParse(project.blockers_json),
  };
}

const VALID_TIERS = ["TIER_1", "TIER_2", "TIER_3"];

/**
 * GET /api/projects
 * List projects with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const email = searchParams.get("email");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let data;
    if (status) {
      data = projects.getByStatus(status as any);
    } else if (email) {
      data = projects.getByEmail(email);
    } else {
      data = projects.getAll(limit, offset);
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      projects: data.map(parseProject),
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { client_email, tier, stage, client_name, icp_level, sop_step_key } =
      body;

    if (!client_email || !tier) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: client_email, tier" },
        { status: 400 }
      );
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const project = projects.create({
      client_email,
      tier,
      stage: stage || "LEAD",
      status: "ACTIVE",
      client_name: client_name || null,
      icp_level: icp_level || null,
      sop_step_key: sop_step_key || null,
      blockers_json: "[]",
    } as any);

    broadcast({
      type: "project.created",
      data: {
        id: project.id,
        client_email: project.client_email,
        tier: project.tier,
        stage: project.stage,
        status: project.status,
      },
    });

    return NextResponse.json({
      success: true,
      project: parseProject(project),
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
