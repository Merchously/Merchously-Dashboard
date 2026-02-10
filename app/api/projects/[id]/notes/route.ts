import { NextRequest, NextResponse } from "next/server";
import { projectNotes, projects } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

/**
 * GET /api/projects/:id/notes
 * List notes for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const project = projects.getById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") || "100",
      10
    );
    const notes = projectNotes.getByProject(id, limit);

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch notes",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:id/notes
 * Create a note on a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const project = projects.getById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, note_type } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Missing required field: content" },
        { status: 400 }
      );
    }

    const note = projectNotes.create({
      project_id: id,
      author: "Admin",
      content,
      note_type: note_type || "note",
    });

    broadcast({
      type: "project.note_added",
      data: {
        project_id: id,
        note_id: note.id,
        note_type: note.note_type,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create note",
      },
      { status: 500 }
    );
  }
}
