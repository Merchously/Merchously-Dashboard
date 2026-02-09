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
