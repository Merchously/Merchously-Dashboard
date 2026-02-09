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
  closeDb,
};
