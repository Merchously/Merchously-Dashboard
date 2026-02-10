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

  // Add recommended_stage and sent_at to approvals
  try {
    const cols = db!.prepare("PRAGMA table_info(approvals)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "recommended_stage")) {
      db!.exec("ALTER TABLE approvals ADD COLUMN recommended_stage TEXT");
    }
    if (!cols.some((c) => c.name === "sent_at")) {
      db!.exec("ALTER TABLE approvals ADD COLUMN sent_at DATETIME");
    }
  } catch {
    // Table may not exist yet; schema.sql will create it
  }

  // Add M1 client record fields to projects
  try {
    const cols = db!.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
    const newCols = [
      { name: "decision_maker", sql: "ALTER TABLE projects ADD COLUMN decision_maker TEXT" },
      { name: "trust_score", sql: "ALTER TABLE projects ADD COLUMN trust_score INTEGER" },
      { name: "assigned_sales_lead", sql: "ALTER TABLE projects ADD COLUMN assigned_sales_lead TEXT" },
      { name: "assigned_delivery_lead", sql: "ALTER TABLE projects ADD COLUMN assigned_delivery_lead TEXT" },
    ];
    for (const col of newCols) {
      if (!cols.some((c) => c.name === col.name)) {
        db!.exec(col.sql);
      }
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
  recommended_stage?: string | null; // Stage the agent suggests (human must approve to advance)
  status: "pending" | "approved" | "rejected" | "edited";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_comments?: string | null;
  edited_response?: string | null;
  sent_at?: string | null;
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
  decision_maker?: string | null;
  trust_score?: number | null;
  assigned_sales_lead?: string | null;
  assigned_delivery_lead?: string | null;
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

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: "FOUNDER" | "SALES_LEAD" | "DELIVERY_LEAD" | "CREATIVE_SPECIALIST" | "AI_OPERATOR";
  password_hash: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SOPDefinition {
  id: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  step_order: number;
  step_key: string;
  step_name: string;
  description?: string | null;
  expected_duration_hours: number;
  required_inputs: string; // JSON array
  created_at: string;
}

export interface SOPProgress {
  id: string;
  project_id: string;
  step_key: string;
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped";
  started_at?: string | null;
  completed_at?: string | null;
  expected_completion_at?: string | null;
  blockers: string; // JSON array
  missing_inputs: string; // JSON array
  notes?: string | null;
  updated_at: string;
}

export interface ClientResponsiveness {
  id: string;
  project_id: string;
  request_type: string;
  description?: string | null;
  requested_at: string;
  responded_at?: string | null;
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
        agent_payload, agent_response, recommended_stage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.client_email,
      data.agent_key,
      data.stage_name,
      data.checkpoint_type,
      data.agent_payload,
      data.agent_response,
      data.recommended_stage || null
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
        | "sent_at"
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
    if (data.sent_at !== undefined) {
      fields.push("sent_at = ?");
      values.push(data.sent_at);
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
        | "decision_maker"
        | "trust_score"
        | "assigned_sales_lead"
        | "assigned_delivery_lead"
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
    if (data.decision_maker !== undefined) {
      fields.push("decision_maker = ?");
      values.push(data.decision_maker);
    }
    if (data.trust_score !== undefined) {
      fields.push("trust_score = ?");
      values.push(data.trust_score);
    }
    if (data.assigned_sales_lead !== undefined) {
      fields.push("assigned_sales_lead = ?");
      values.push(data.assigned_sales_lead);
    }
    if (data.assigned_delivery_lead !== undefined) {
      fields.push("assigned_delivery_lead = ?");
      values.push(data.assigned_delivery_lead);
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

  getAll: (limit = 100, offset = 0): AgentTrigger[] => {
    const database = getDb();
    const stmt = database.prepare(
      "SELECT * FROM agent_triggers ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(limit, offset) as AgentTrigger[];
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

// User CRUD operations
export const users = {
  create: (
    data: Omit<User, "id" | "created_at" | "updated_at" | "is_active"> &
      Partial<Pick<User, "is_active">>
  ): User => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO users (id, username, display_name, role, password_hash, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.username,
      data.display_name,
      data.role,
      data.password_hash,
      data.is_active !== undefined ? data.is_active : 1
    );

    return users.getById(id)!;
  },

  getById: (id: string): User | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | null;
  },

  getByUsername: (username: string): User | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | null;
  },

  getAll: (): User[] => {
    const database = getDb();
    return database.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as User[];
  },

  update: (
    id: string,
    data: Partial<Pick<User, "display_name" | "role" | "password_hash" | "is_active">>
  ): User | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
    if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role); }
    if (data.password_hash !== undefined) { fields.push("password_hash = ?"); values.push(data.password_hash); }
    if (data.is_active !== undefined) { fields.push("is_active = ?"); values.push(data.is_active); }

    if (fields.length === 0) return users.getById(id);

    values.push(id);
    database.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return users.getById(id);
  },

  count: (): number => {
    const database = getDb();
    const row = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count;
  },
};

// SOP Definitions CRUD operations
export const sopDefinitions = {
  create: (
    data: Omit<SOPDefinition, "id" | "created_at">
  ): SOPDefinition => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO sop_definitions (id, tier, step_order, step_key, step_name, description, expected_duration_hours, required_inputs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.tier,
      data.step_order,
      data.step_key,
      data.step_name,
      data.description || null,
      data.expected_duration_hours,
      data.required_inputs || "[]"
    );
    return sopDefinitions.getById(id)!;
  },

  getById: (id: string): SOPDefinition | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM sop_definitions WHERE id = ?").get(id) as SOPDefinition | null;
  },

  getByTier: (tier: string): SOPDefinition[] => {
    const database = getDb();
    return database.prepare(
      "SELECT * FROM sop_definitions WHERE tier = ? ORDER BY step_order ASC"
    ).all(tier) as SOPDefinition[];
  },

  getByStepKey: (step_key: string): SOPDefinition | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM sop_definitions WHERE step_key = ?").get(step_key) as SOPDefinition | null;
  },

  getAll: (): SOPDefinition[] => {
    const database = getDb();
    return database.prepare("SELECT * FROM sop_definitions ORDER BY tier, step_order ASC").all() as SOPDefinition[];
  },
};

// SOP Progress CRUD operations
export const sopProgress = {
  create: (
    data: Omit<SOPProgress, "id" | "updated_at">
  ): SOPProgress => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO sop_progress (id, project_id, step_key, status, started_at, completed_at, expected_completion_at, blockers, missing_inputs, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.project_id,
      data.step_key,
      data.status || "pending",
      data.started_at || null,
      data.completed_at || null,
      data.expected_completion_at || null,
      data.blockers || "[]",
      data.missing_inputs || "[]",
      data.notes || null
    );
    return sopProgress.getById(id)!;
  },

  getById: (id: string): SOPProgress | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM sop_progress WHERE id = ?").get(id) as SOPProgress | null;
  },

  getByProject: (project_id: string): SOPProgress[] => {
    const database = getDb();
    return database.prepare(
      `SELECT sp.*, sd.step_name, sd.step_order, sd.expected_duration_hours, sd.description as step_description
       FROM sop_progress sp
       JOIN sop_definitions sd ON sp.step_key = sd.step_key
       WHERE sp.project_id = ?
       ORDER BY sd.step_order ASC`
    ).all(project_id) as (SOPProgress & { step_name: string; step_order: number; expected_duration_hours: number; step_description?: string })[];
  },

  getByProjectAndStep: (project_id: string, step_key: string): SOPProgress | null => {
    const database = getDb();
    return database.prepare(
      "SELECT * FROM sop_progress WHERE project_id = ? AND step_key = ?"
    ).get(project_id, step_key) as SOPProgress | null;
  },

  update: (
    id: string,
    data: Partial<Pick<SOPProgress, "status" | "started_at" | "completed_at" | "expected_completion_at" | "blockers" | "missing_inputs" | "notes">>
  ): SOPProgress | null => {
    const database = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (data.started_at !== undefined) { fields.push("started_at = ?"); values.push(data.started_at); }
    if (data.completed_at !== undefined) { fields.push("completed_at = ?"); values.push(data.completed_at); }
    if (data.expected_completion_at !== undefined) { fields.push("expected_completion_at = ?"); values.push(data.expected_completion_at); }
    if (data.blockers !== undefined) { fields.push("blockers = ?"); values.push(data.blockers); }
    if (data.missing_inputs !== undefined) { fields.push("missing_inputs = ?"); values.push(data.missing_inputs); }
    if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }

    if (fields.length === 0) return sopProgress.getById(id);

    values.push(id);
    database.prepare(`UPDATE sop_progress SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return sopProgress.getById(id);
  },

  initForProject: (project_id: string, tier: string): SOPProgress[] => {
    const definitions = sopDefinitions.getByTier(tier);
    const results: SOPProgress[] = [];
    for (const def of definitions) {
      const existing = sopProgress.getByProjectAndStep(project_id, def.step_key);
      if (!existing) {
        results.push(sopProgress.create({
          project_id,
          step_key: def.step_key,
          status: "pending",
          blockers: "[]",
          missing_inputs: "[]",
        }));
      } else {
        results.push(existing);
      }
    }
    return results;
  },
};

// Client Responsiveness CRUD operations
export const clientResponsiveness = {
  create: (
    data: Omit<ClientResponsiveness, "id" | "created_at">
  ): ClientResponsiveness => {
    const database = getDb();
    const id = uuidv4();
    const stmt = database.prepare(`
      INSERT INTO client_responsiveness (id, project_id, request_type, description, requested_at, responded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.project_id,
      data.request_type,
      data.description || null,
      data.requested_at || new Date().toISOString(),
      data.responded_at || null
    );
    return clientResponsiveness.getById(id)!;
  },

  getById: (id: string): ClientResponsiveness | null => {
    const database = getDb();
    return database.prepare("SELECT * FROM client_responsiveness WHERE id = ?").get(id) as ClientResponsiveness | null;
  },

  getByProject: (project_id: string): ClientResponsiveness[] => {
    const database = getDb();
    return database.prepare(
      "SELECT * FROM client_responsiveness WHERE project_id = ? ORDER BY requested_at DESC"
    ).all(project_id) as ClientResponsiveness[];
  },

  getPending: (project_id: string): ClientResponsiveness[] => {
    const database = getDb();
    return database.prepare(
      "SELECT * FROM client_responsiveness WHERE project_id = ? AND responded_at IS NULL ORDER BY requested_at ASC"
    ).all(project_id) as ClientResponsiveness[];
  },

  markResponded: (id: string): ClientResponsiveness | null => {
    const database = getDb();
    database.prepare(
      "UPDATE client_responsiveness SET responded_at = ? WHERE id = ?"
    ).run(new Date().toISOString(), id);
    return clientResponsiveness.getById(id);
  },

  getAverageResponseTime: (project_id: string): number | null => {
    const database = getDb();
    const row = database.prepare(`
      SELECT AVG(
        (julianday(responded_at) - julianday(requested_at)) * 24
      ) as avg_hours
      FROM client_responsiveness
      WHERE project_id = ? AND responded_at IS NOT NULL
    `).get(project_id) as { avg_hours: number | null };
    return row?.avg_hours || null;
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
  users,
  sopDefinitions,
  sopProgress,
  clientResponsiveness,
  closeDb,
};
