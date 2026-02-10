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

  -- Approval state
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'edited'
  reviewed_by TEXT,                 -- Admin name (default: 'Admin')
  reviewed_at DATETIME,             -- ISO timestamp
  admin_comments TEXT,              -- Feedback/notes
  edited_response TEXT,             -- Modified JSON if edited

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
