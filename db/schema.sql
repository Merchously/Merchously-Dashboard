-- Merchously Dashboard Database Schema
-- SQLite database for approval workflows and webhook event logging

-- Approval workflows (state machine)
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,              -- UUID
  client_email TEXT NOT NULL,       -- Links to Airtable
  agent_key TEXT NOT NULL,          -- 'leadIntake', 'proposal', 'discovery', etc.
  stage_name TEXT NOT NULL,         -- 'Proposal Drafting', 'Discovery Support', etc.
  checkpoint_type TEXT NOT NULL,    -- 'proposal_review', 'discovery_summary', 'tier_execution', 'quality_check'

  -- Agent output data
  agent_payload TEXT NOT NULL,      -- JSON: what was sent to agent
  agent_response TEXT NOT NULL,     -- JSON: agent's response

  -- Stage recommendation (set by webhook, acted on by human approval)
  recommended_stage TEXT,            -- Stage the agent suggests advancing to

  -- Approval state
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'edited'
  reviewed_by TEXT,                 -- Admin name (default: 'Admin')
  reviewed_at DATETIME,             -- ISO timestamp
  admin_comments TEXT,              -- Feedback/notes
  edited_response TEXT,             -- Modified JSON if edited
  sent_at DATETIME,                 -- When the proposal/deliverable was sent to client

  -- Metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(client_email, agent_key),  -- One approval per agent per client
  CHECK(status IN ('pending', 'approved', 'rejected', 'edited')),
  CHECK(checkpoint_type IN ('proposal_review', 'discovery_summary', 'tier_execution', 'quality_check'))
);

-- Indexes for approvals table
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_email ON approvals(client_email);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_checkpoint ON approvals(checkpoint_type);

-- Webhook event log (audit trail)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,              -- UUID
  agent_key TEXT NOT NULL,          -- Which agent sent this webhook
  client_email TEXT,                -- Email from webhook payload (may be null)
  payload TEXT NOT NULL,            -- Full webhook payload (JSON)
  response_status INTEGER,          -- HTTP status sent back
  error_message TEXT,               -- Error message if failed
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook_events table
CREATE INDEX IF NOT EXISTS idx_webhook_events_agent ON webhook_events(agent_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_email ON webhook_events(client_email);

-- SSE connections (track active clients for broadcasting)
CREATE TABLE IF NOT EXISTS sse_clients (
  id TEXT PRIMARY KEY,              -- UUID
  user_agent TEXT,                  -- Browser user agent
  connected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_ping_at DATETIME             -- Last heartbeat
);

-- Index for SSE clients
CREATE INDEX IF NOT EXISTS idx_sse_clients_connected ON sse_clients(connected_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_approvals_timestamp
AFTER UPDATE ON approvals
BEGIN
  UPDATE approvals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================
-- HITL Governance Expansion Tables
-- =============================================

-- Projects table (one per client per tier engagement)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- UUID
  client_email TEXT NOT NULL,             -- Links to Airtable
  client_name TEXT,                       -- Cached from Airtable for display
  tier TEXT NOT NULL CHECK(tier IN ('TIER_1','TIER_2','TIER_3')),
  stage TEXT NOT NULL DEFAULT 'LEAD'
    CHECK(stage IN ('LEAD','QUALIFIED','DISCOVERY','FIT_DECISION',
                     'PROPOSAL','CLOSED','ONBOARDING','DELIVERY',
                     'COMPLETE','PAUSED')),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE','BLOCKED','PAUSED','COMPLETE')),
  icp_level TEXT CHECK(icp_level IS NULL OR icp_level IN ('A','B','C')),
  sop_step_key TEXT,                      -- e.g. 'T1_STEP_3_DESIGN'
  blockers_json TEXT DEFAULT '[]',        -- JSON array of blocker strings
  decision_maker TEXT,                    -- Primary decision-maker name
  trust_score INTEGER CHECK(trust_score IS NULL OR (trust_score >= 1 AND trust_score <= 5)),
  assigned_sales_lead TEXT,               -- Username of assigned sales lead
  assigned_delivery_lead TEXT,            -- Username of assigned delivery lead
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_email, tier)              -- One project per client per tier
);

CREATE INDEX IF NOT EXISTS idx_projects_email ON projects(client_email);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
BEGIN
  UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Escalations table (linked to projects)
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id),
  level TEXT NOT NULL CHECK(level IN ('L1','L2','L3')),
  category TEXT NOT NULL
    CHECK(category IN ('FINANCIAL','SCOPE','LEGAL_BRAND',
                        'RELATIONSHIP','SYSTEM_CONFLICT','OTHER')),
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK(status IN ('OPEN','RESOLVED','HALTED')),
  title TEXT NOT NULL,
  description TEXT,
  decision_notes TEXT,                    -- Required for L2/L3 resolution
  resolved_by TEXT,
  resolved_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escalations_project ON escalations(project_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_level ON escalations(level);
CREATE INDEX IF NOT EXISTS idx_escalations_created ON escalations(created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_escalations_timestamp
AFTER UPDATE ON escalations
BEGIN
  UPDATE escalations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Agents registry table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,                    -- UUID
  agent_key TEXT NOT NULL UNIQUE,         -- 'leadIntake', 'discovery', etc.
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active INTEGER NOT NULL DEFAULT 1,  -- SQLite boolean (0/1)
  last_event_at DATETIME,
  total_events INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_key ON agents(agent_key);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);

-- Add webhook_url column to agents (safe migration for existing DBs)

CREATE TRIGGER IF NOT EXISTS update_agents_timestamp
AFTER UPDATE ON agents
BEGIN
  UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Approval policy audit trail
CREATE TABLE IF NOT EXISTS approval_policy_audit (
  id TEXT PRIMARY KEY,                    -- UUID
  approval_id TEXT,                       -- References approvals(id)
  escalation_id TEXT,                     -- References escalations(id)
  policy_action TEXT NOT NULL,            -- 'auto_escalated', 'notes_required', 'blocked'
  reason TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_audit_approval ON approval_policy_audit(approval_id);
CREATE INDEX IF NOT EXISTS idx_policy_audit_created ON approval_policy_audit(created_at DESC);

-- =============================================
-- HITL Command & Control Tables
-- =============================================

-- Project notes (activity feed / human instructions)
CREATE TABLE IF NOT EXISTS project_notes (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id),
  author TEXT NOT NULL DEFAULT 'Admin',
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'note'
    CHECK(note_type IN ('note','instruction','stage_change','status_change','agent_trigger','system')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_created ON project_notes(created_at DESC);

-- Agent triggers (log of agent invocations from dashboard)
CREATE TABLE IF NOT EXISTS agent_triggers (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_key TEXT NOT NULL,
  trigger_payload TEXT NOT NULL,          -- JSON
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sent','failed')),
  response_status INTEGER,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'Admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_triggers_project ON agent_triggers(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_triggers_agent ON agent_triggers(agent_key);
CREATE INDEX IF NOT EXISTS idx_agent_triggers_created ON agent_triggers(created_at DESC);

-- =============================================
-- RBAC: Users & Roles
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- UUID
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK(role IN ('FOUNDER','SALES_LEAD','DELIVERY_LEAD','CREATIVE_SPECIALIST','AI_OPERATOR')),
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,  -- SQLite boolean (0/1)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================
-- Delivery Command Center Tables
-- =============================================

-- SOP definitions (per tier, defines the ordered steps)
CREATE TABLE IF NOT EXISTS sop_definitions (
  id TEXT PRIMARY KEY,                    -- UUID
  tier TEXT NOT NULL CHECK(tier IN ('TIER_1','TIER_2','TIER_3')),
  step_order INTEGER NOT NULL,            -- Sequential order within tier
  step_key TEXT NOT NULL UNIQUE,          -- e.g. 'T1_STEP_1_KICKOFF'
  step_name TEXT NOT NULL,                -- Human-readable: 'Kickoff Call'
  description TEXT,                       -- What this step involves
  expected_duration_hours INTEGER NOT NULL DEFAULT 24,
  required_inputs TEXT DEFAULT '[]',      -- JSON array of required inputs
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sop_definitions_tier ON sop_definitions(tier);
CREATE INDEX IF NOT EXISTS idx_sop_definitions_order ON sop_definitions(tier, step_order);

-- SOP progress (tracks each step's status per project)
CREATE TABLE IF NOT EXISTS sop_progress (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id),
  step_key TEXT NOT NULL REFERENCES sop_definitions(step_key),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','in_progress','blocked','completed','skipped')),
  started_at DATETIME,
  completed_at DATETIME,
  expected_completion_at DATETIME,        -- Calculated from started_at + expected_duration
  blockers TEXT DEFAULT '[]',             -- JSON array of blocker strings
  missing_inputs TEXT DEFAULT '[]',       -- JSON array of missing input items
  notes TEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, step_key)           -- One progress entry per step per project
);

CREATE INDEX IF NOT EXISTS idx_sop_progress_project ON sop_progress(project_id);
CREATE INDEX IF NOT EXISTS idx_sop_progress_status ON sop_progress(status);
CREATE INDEX IF NOT EXISTS idx_sop_progress_step ON sop_progress(step_key);

CREATE TRIGGER IF NOT EXISTS update_sop_progress_timestamp
AFTER UPDATE ON sop_progress
BEGIN
  UPDATE sop_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Client responsiveness (tracks response times for requests)
CREATE TABLE IF NOT EXISTS client_responsiveness (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL REFERENCES projects(id),
  request_type TEXT NOT NULL,             -- 'asset_upload', 'feedback', 'approval', 'info_request'
  description TEXT,                       -- What was requested
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME,                  -- NULL if still waiting
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_resp_project ON client_responsiveness(project_id);
CREATE INDEX IF NOT EXISTS idx_client_resp_pending ON client_responsiveness(responded_at);
