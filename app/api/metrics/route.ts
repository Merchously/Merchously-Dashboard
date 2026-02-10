import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "db", "merchously.db");
  const db = new Database(dbPath, { readonly: true });
  db.pragma("journal_mode = WAL");
  return db;
}

/**
 * GET /api/metrics
 * Aggregated system health metrics.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    requireRole(user, "FOUNDER", "AI_OPERATOR");

    const db = getDb();

    // Conversion funnel: count of projects per stage
    const funnel = db.prepare(`
      SELECT stage, COUNT(*) as count FROM projects GROUP BY stage
    `).all() as { stage: string; count: number }[];

    // ICP distribution
    const icpDist = db.prepare(`
      SELECT icp_level, COUNT(*) as count FROM projects WHERE icp_level IS NOT NULL GROUP BY icp_level
    `).all() as { icp_level: string; count: number }[];

    // Escalation frequency (last 30 days)
    const escalationFreq = db.prepare(`
      SELECT level, COUNT(*) as count FROM escalations
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY level
    `).all() as { level: string; count: number }[];

    // Escalation frequency by category
    const escalationByCat = db.prepare(`
      SELECT category, COUNT(*) as count FROM escalations
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY category
    `).all() as { category: string; count: number }[];

    // Approval metrics
    const approvalStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM approvals GROUP BY status
    `).all() as { status: string; count: number }[];

    // Average time per stage (from project_notes stage_change entries)
    const stageTimings = db.prepare(`
      SELECT content, created_at FROM project_notes
      WHERE note_type = 'stage_change'
      ORDER BY project_id, created_at ASC
    `).all() as { content: string; created_at: string }[];

    // Agent activity (last 30 days)
    const agentActivity = db.prepare(`
      SELECT agent_key, total_events, last_event_at FROM agents
      WHERE is_active = 1
      ORDER BY total_events DESC
    `).all() as { agent_key: string; total_events: number; last_event_at: string }[];

    // Total projects by status
    const projectsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM projects GROUP BY status
    `).all() as { status: string; count: number }[];

    db.close();

    return NextResponse.json({
      success: true,
      metrics: {
        funnel,
        icp_distribution: icpDist,
        escalation_frequency: escalationFreq,
        escalation_by_category: escalationByCat,
        approval_stats: approvalStats,
        agent_activity: agentActivity,
        projects_by_status: projectsByStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
