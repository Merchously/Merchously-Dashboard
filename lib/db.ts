import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Database configuration
const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "db", "merchously.db");

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better concurrency
    db.pragma("foreign_keys = ON"); // Enable foreign key constraints

    // Initialize schema if needed
    initSchema();
  }
  return db;
}

function initSchema() {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf8");
    db!.exec(schema);
  }

  // Safe migrations for existing databases
  try {
    const cols = db!.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "webhook_url")) {
      db!.exec("ALTER TABLE agents ADD COLUMN webhook_url TEXT");
    }
  } catch {
    // Table may not exist yet; schema.sql will create it
  }
}

// Types
export interface Approval {
  id: string;
  client_email: string;
  agent_key: string;
  stage_name: string;
  checkpoint_type: "proposal_review" | "discovery_summary" | "tier_execution" | "quality_check";
  agent_payload: string; // JSON string
  agent_response: string; // JSON string
  status: "pending" | "approved" | "rejected" | "edited";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_comments?: string | null;
  edited_response?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  agent_key: string;
  client_email?: string | null;
  payload: string; // JSON string
  response_status?: number | null;
  error_message?: string | null;
  created_at: string;
}

export interface SSEClient {
  id: string;
  user_agent?: string | null;
  connected_at: string;
  last_ping_at?: string | null;
}

export interface Project {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  stage:
    | "LEAD"
    | "QUALIFIED"
    | "DISCOVERY"
    | "FIT_DECISION"
    | "PROPOSAL"
    | "CLOSED"
    | "ONBOARDING"
    | "DELIVERY"
    | "COMPLETE"
    | "PAUSED";
  status: "ACTIVE" | "BLOCKED" | "PAUSED" | "COMPLETE";
  icp_level?: "A" | "B" | "C" | null;
  sop_step_key?: string | null;
  blockers_json: string;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: string;
  project_id: string;
  level: "L1" | "L2" | "L3";
  category:
    | "FINANCIAL"
    | "SCOPE"
    | "LEGAL_BRAND"
    | "RELATIONSHIP"
    | "SYSTEM_CONFLICT"
    | "OTHER";
  status: "OPEN" | "RESOLVED" | "HALTED";
  title: string;
  description?: string | null;
  decision_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  agent_key: string;
  display_name: string;
  category: string;
  is_active: number;
  webhook_url?: string | null;
  last_event_at?: string | null;
  total_events: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  author: string;
  content: string;
  note_type: "note" | "instruction" | "stage_change" | "status_change" | "agent_trigger" | "system";
  created_at: string;
}

export interface AgentTrigger {
  id: string;
  project_id: string;
  agent_key: string;
  trigger_payload: string;
  status: "pending" | "sent" | "failed";
  response_status?: number | null;
  error_message?: string | null;
  triggered_by: string;
  created_at: string;
}

export interface ApprovalPolicyAudit {
  id: string;
  approval_id?: string | null;
  escalation_id?: string | null;
  policy_action: string;
  reason: string;
  created_at: string;
}

// Approval CRUD operations
export const approvals = {
  create: (
    data: Omit<Approval, "id" | "created_at" | "updated_at" | "status">
  ): Approval => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO approvals (
        id, client_email, agent_key, stage_name, checkpoint_type,
        agent_payload, agent_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.client_email,
      data.agent_key,
      data.stage_name,
      data.checkpoint_type,
      data.agent_payload,
      data.agent_response
    );

    return approvals.getById(id)!;
  },

  getById: (id: string): Approval | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM approvals WHERE id = ?");
    return stmt.get(id) as Approval | null;
  },

  getByEmail: (email: string): Approval[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approvals WHERE client_email = ? ORDER BY created_at DESC"
    );
    return stmt.all(email) as Approval[];
  },

  getByStatus: (status: Approval["status"]): Approval[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC"
    );
    return stmt.all(status) as Approval[];
  },

  getAll: (limit = 100, offset = 0): Approval[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approvals ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as Approval[];
  },

  update: (
    id: string,
    data: Partial<
      Pick<
        Approval,
        | "status"
        | "reviewed_by"
        | "reviewed_at"
        | "admin_comments"
        | "edited_response"
      >
    >
  ): Approval | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.reviewed_by !== undefined) {
      fields.push("reviewed_by = ?");
      values.push(data.reviewed_by);
    }
    if (data.reviewed_at !== undefined) {
      fields.push("reviewed_at = ?");
      values.push(data.reviewed_at);
    }
    if (data.admin_comments !== undefined) {
      fields.push("admin_comments = ?");
      values.push(data.admin_comments);
    }
    if (data.edited_response !== undefined) {
      fields.push("edited_response = ?");
      values.push(data.edited_response);
    }

    if (fields.length === 0) {
      return approvals.getById(id);
    }

    values.push(id);
    const stmt = database.prepare(`
      UPDATE approvals SET ${fields.join(", ")} WHERE id = ?
    `);
    stmt.run(...values);

    return approvals.getById(id);
  },

  delete: (id: string): boolean => {
    const database = getDb();
    const stmt = database.prepare("DELETE FROM approvals WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// Webhook event logging
export const webhookEvents = {
  create: (
    data: Omit<WebhookEvent, "id" | "created_at">
  ): WebhookEvent => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO webhook_events (
        id, agent_key, client_email, payload, response_status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.agent_key,
      data.client_email || null,
      data.payload,
      data.response_status || null,
      data.error_message || null
    );

    return webhookEvents.getById(id)!;
  },

  getById: (id: string): WebhookEvent | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM webhook_events WHERE id = ?");
    return stmt.get(id) as WebhookEvent | null;
  },

  getByAgent: (agent_key: string, limit = 100): WebhookEvent[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM webhook_events WHERE agent_key = ? ORDER BY created_at DESC LIMIT ?"
    );
    return stmt.all(agent_key, limit) as WebhookEvent[];
  },

  getAll: (limit = 100, offset = 0): WebhookEvent[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as WebhookEvent[];
  },
};

// SSE client management
export const sseClients = {
  add: (user_agent?: string): SSEClient => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO sse_clients (id, user_agent) VALUES (?, ?)
    `);
    stmt.run(id, user_agent || null);

    const getStmt = database.prepare("SELECT * FROM sse_clients WHERE id = ?");
    return getStmt.get(id) as SSEClient;
  },

  updatePing: (id: string): void => {
    const database = getDb();
    const stmt = database.prepare(`
      UPDATE sse_clients SET last_ping_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(id);
  },

  remove: (id: string): boolean => {
    const database = getDb();
    const stmt = database.prepare("DELETE FROM sse_clients WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },

  getAll: (): SSEClient[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM sse_clients ORDER BY connected_at DESC"
    );
    return stmt.all() as SSEClient[];
  },

  cleanup: (olderThanMinutes = 60): number => {
    const database = getDb();
    const stmt = database.prepare(`
      DELETE FROM sse_clients
      WHERE datetime(connected_at) < datetime('now', '-' || ? || ' minutes')
    `);
    const result = stmt.run(olderThanMinutes);
    return result.changes;
  },
};

// Project CRUD operations
export const projects = {
  create: (
    data: Omit<Project, "id" | "created_at" | "updated_at"> &
      Partial<Pick<Project, "status" | "stage">>
  ): Project => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO projects (
        id, client_email, client_name, tier, stage, status,
        icp_level, sop_step_key, blockers_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.client_email,
      data.client_name || null,
      data.tier,
      data.stage || "LEAD",
      data.status || "ACTIVE",
      data.icp_level || null,
      data.sop_step_key || null,
      data.blockers_json || "[]"
    );

    return projects.getById(id)!;
  },

  getById: (id: string): Project | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM projects WHERE id = ?");
    return stmt.get(id) as Project | null;
  },

  getByEmail: (email: string): Project[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM projects WHERE client_email = ? ORDER BY created_at DESC"
    );
    return stmt.all(email) as Project[];
  },

  getByStatus: (status: Project["status"]): Project[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC"
    );
    return stmt.all(status) as Project[];
  },

  getAll: (limit = 100, offset = 0): Project[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as Project[];
  },

  update: (
    id: string,
    data: Partial<
      Pick<
        Project,
        | "stage"
        | "status"
        | "sop_step_key"
        | "blockers_json"
        | "client_name"
        | "icp_level"
      >
    >
  ): Project | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.stage !== undefined) {
      fields.push("stage = ?");
      values.push(data.stage);
    }
    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.sop_step_key !== undefined) {
      fields.push("sop_step_key = ?");
      values.push(data.sop_step_key);
    }
    if (data.blockers_json !== undefined) {
      fields.push("blockers_json = ?");
      values.push(data.blockers_json);
    }
    if (data.client_name !== undefined) {
      fields.push("client_name = ?");
      values.push(data.client_name);
    }
    if (data.icp_level !== undefined) {
      fields.push("icp_level = ?");
      values.push(data.icp_level);
    }

    if (fields.length === 0) {
      return projects.getById(id);
    }

    values.push(id);
    const stmt = database.prepare(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    return projects.getById(id);
  },

  upsertByEmailAndTier: (
    email: string,
    tier: Project["tier"],
    data: Partial<
      Pick<
        Project,
        "stage" | "status" | "sop_step_key" | "client_name" | "icp_level" | "blockers_json"
      >
    >
  ): Project => {
    const database = getDb();
    const existing = database
      .prepare("SELECT * FROM projects WHERE client_email = ? AND tier = ?")
      .get(email, tier) as Project | undefined;

    if (existing) {
      return projects.update(existing.id, data)!;
    } else {
      return projects.create({
        client_email: email,
        tier,
        stage: data.stage || "LEAD",
        status: data.status || "ACTIVE",
        sop_step_key: data.sop_step_key || null,
        client_name: data.client_name || null,
        icp_level: data.icp_level || null,
        blockers_json: data.blockers_json || "[]",
      } as any);
    }
  },

  delete: (id: string): boolean => {
    const database = getDb();
    const stmt = database.prepare("DELETE FROM projects WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// Escalation CRUD operations
export const escalations = {
  create: (
    data: Omit<Escalation, "id" | "created_at" | "updated_at" | "status"> &
      Partial<Pick<Escalation, "status">>
  ): Escalation => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO escalations (
        id, project_id, level, category, status, title,
        description, decision_notes, resolved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.level,
      data.category,
      data.status || "OPEN",
      data.title,
      data.description || null,
      data.decision_notes || null,
      data.resolved_by || null
    );

    return escalations.getById(id)!;
  },

  getById: (id: string): Escalation | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM escalations WHERE id = ?");
    return stmt.get(id) as Escalation | null;
  },

  getByProject: (project_id: string): Escalation[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM escalations WHERE project_id = ? ORDER BY created_at DESC"
    );
    return stmt.all(project_id) as Escalation[];
  },

  getByStatus: (status: Escalation["status"]): Escalation[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM escalations WHERE status = ? ORDER BY created_at DESC"
    );
    return stmt.all(status) as Escalation[];
  },

  getAll: (limit = 100, offset = 0): Escalation[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM escalations ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as Escalation[];
  },

  update: (
    id: string,
    data: Partial<
      Pick<
        Escalation,
        "status" | "decision_notes" | "resolved_by" | "resolved_at"
      >
    >
  ): Escalation | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.decision_notes !== undefined) {
      fields.push("decision_notes = ?");
      values.push(data.decision_notes);
    }
    if (data.resolved_by !== undefined) {
      fields.push("resolved_by = ?");
      values.push(data.resolved_by);
    }
    if (data.resolved_at !== undefined) {
      fields.push("resolved_at = ?");
      values.push(data.resolved_at);
    }

    if (fields.length === 0) {
      return escalations.getById(id);
    }

    values.push(id);
    const stmt = database.prepare(
      `UPDATE escalations SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    return escalations.getById(id);
  },
};

// Agent CRUD operations
export const agents = {
  create: (
    data: Omit<Agent, "id" | "created_at" | "updated_at" | "total_events" | "is_active" | "last_event_at"> &
      Partial<Pick<Agent, "is_active" | "total_events">>
  ): Agent => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO agents (
        id, agent_key, display_name, category, is_active
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.agent_key,
      data.display_name,
      data.category,
      data.is_active !== undefined ? data.is_active : 1
    );

    return agents.getById(id)!;
  },

  getById: (id: string): Agent | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM agents WHERE id = ?");
    return stmt.get(id) as Agent | null;
  },

  getByKey: (agent_key: string): Agent | null => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM agents WHERE agent_key = ?"
    );
    return stmt.get(agent_key) as Agent | null;
  },

  getAll: (): Agent[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM agents ORDER BY agent_key ASC"
    );
    return stmt.all() as Agent[];
  },

  update: (
    id: string,
    data: Partial<Pick<Agent, "is_active" | "category" | "display_name" | "webhook_url">>
  ): Agent | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(data.is_active);
    }
    if (data.category !== undefined) {
      fields.push("category = ?");
      values.push(data.category);
    }
    if (data.display_name !== undefined) {
      fields.push("display_name = ?");
      values.push(data.display_name);
    }
    if (data.webhook_url !== undefined) {
      fields.push("webhook_url = ?");
      values.push(data.webhook_url);
    }

    if (fields.length === 0) {
      return agents.getById(id);
    }

    values.push(id);
    const stmt = database.prepare(
      `UPDATE agents SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    return agents.getById(id);
  },

  incrementEventCount: (agent_key: string): void => {
    const database = getDb();
    database
      .prepare(
        `UPDATE agents SET total_events = total_events + 1,
         last_event_at = CURRENT_TIMESTAMP WHERE agent_key = ?`
      )
      .run(agent_key);
  },
};

// Approval policy audit operations
export const policyAudit = {
  create: (
    data: Omit<ApprovalPolicyAudit, "id" | "created_at">
  ): ApprovalPolicyAudit => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO approval_policy_audit (
        id, approval_id, escalation_id, policy_action, reason
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.approval_id || null,
      data.escalation_id || null,
      data.policy_action,
      data.reason
    );

    return policyAudit.getById(id)!;
  },

  getById: (id: string): ApprovalPolicyAudit | null => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approval_policy_audit WHERE id = ?"
    );
    return stmt.get(id) as ApprovalPolicyAudit | null;
  },

  getByApproval: (approval_id: string): ApprovalPolicyAudit[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approval_policy_audit WHERE approval_id = ? ORDER BY created_at DESC"
    );
    return stmt.all(approval_id) as ApprovalPolicyAudit[];
  },

  getAll: (limit = 100, offset = 0): ApprovalPolicyAudit[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM approval_policy_audit ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as ApprovalPolicyAudit[];
  },
};

// Project notes CRUD operations
export const projectNotes = {
  create: (
    data: Omit<ProjectNote, "id" | "created_at">
  ): ProjectNote => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO project_notes (id, project_id, author, content, note_type)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.project_id, data.author, data.content, data.note_type);
    return projectNotes.getById(id)!;
  },

  getById: (id: string): ProjectNote | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM project_notes WHERE id = ?");
    return stmt.get(id) as ProjectNote | null;
  },

  getByProject: (project_id: string, limit = 100): ProjectNote[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC LIMIT ?"
    );
    return stmt.all(project_id, limit) as ProjectNote[];
  },
};

// Agent triggers CRUD operations
export const agentTriggers = {
  create: (
    data: Omit<AgentTrigger, "id" | "created_at" | "status"> &
      Partial<Pick<AgentTrigger, "status">>
  ): AgentTrigger => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO agent_triggers (id, project_id, agent_key, trigger_payload, status, response_status, error_message, triggered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.agent_key,
      data.trigger_payload,
      data.status || "pending",
      data.response_status || null,
      data.error_message || null,
      data.triggered_by
    );

    return agentTriggers.getById(id)!;
  },

  getById: (id: string): AgentTrigger | null => {
    const database = getDb();
    const stmt = database.prepare("SELECT * FROM agent_triggers WHERE id = ?");
    return stmt.get(id) as AgentTrigger | null;
  },

  getByProject: (project_id: string, limit = 50): AgentTrigger[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM agent_triggers WHERE project_id = ? ORDER BY created_at DESC LIMIT ?"
    );
    return stmt.all(project_id, limit) as AgentTrigger[];
  },

  update: (
    id: string,
    data: Partial<Pick<AgentTrigger, "status" | "response_status" | "error_message">>
  ): AgentTrigger | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.response_status !== undefined) {
      fields.push("response_status = ?");
      values.push(data.response_status);
    }
    if (data.error_message !== undefined) {
      fields.push("error_message = ?");
      values.push(data.error_message);
    }

    if (fields.length === 0) return agentTriggers.getById(id);

    values.push(id);
    const stmt = database.prepare(
      `UPDATE agent_triggers SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    return agentTriggers.getById(id);
  },
};

// Close database connection (call on app shutdown)
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export default {
  getDb,
  approvals,
  webhookEvents,
  sseClients,
  projects,
  escalations,
  agents,
  policyAudit,
  projectNotes,
  agentTriggers,
  closeDb,
};
