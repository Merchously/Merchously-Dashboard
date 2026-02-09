-- Seed test data for Merchously Dashboard
-- Run with: sqlite3 db/merchously.db < scripts/seed.sql

-- Test Approval 1: Proposal Review (Pending)
INSERT INTO approvals (
  id, client_email, agent_key, stage_name, checkpoint_type,
  agent_payload, agent_response, status
) VALUES (
  'test-approval-1',
  'alex.rivera@testbrand.local',
  'proposal',
  'Proposal Drafting',
  'proposal_review',
  '{"email":"alex.rivera@testbrand.local","tier":"Launch","budget_range":"$4,000-$5,500 CAD"}',
  '{"tier":"Launch","pricing":"$4,500 CAD","timeline":"6-8 weeks","deliverables":["SKU Planning","Design","Production"],"proposal_markdown":"# Proposal for Rivera Creative"}',
  'pending'
);

-- Test Approval 2: Discovery Summary (Pending)
INSERT INTO approvals (
  id, client_email, agent_key, stage_name, checkpoint_type,
  agent_payload, agent_response, status
) VALUES (
  'test-approval-2',
  'sarah.johnson@creativebrand.com',
  'discovery',
  'Discovery Support',
  'discovery_summary',
  '{"email":"sarah.johnson@creativebrand.com","discovery_notes":"Sustainable fashion brand, 85K Instagram followers"}',
  '{"summary":"High-fit Launch candidate","icp_level":"A","recommended_tier":"Launch","confidence_score":0.92}',
  'pending'
);

-- Test Approval 3: Quality Check (Approved)
INSERT INTO approvals (
  id, client_email, agent_key, stage_name, checkpoint_type,
  agent_payload, agent_response, status, reviewed_by, reviewed_at, admin_comments
) VALUES (
  'test-approval-3',
  'completed@example.com',
  'qualityCompliance',
  'Quality & Compliance',
  'quality_check',
  '{"email":"completed@example.com","deliverable":"Final product samples"}',
  '{"compliance_status":"pass","pricing_validation":"correct","brand_alignment":"strong"}',
  'approved',
  'Admin',
  datetime('now'),
  'Looks great, approved for delivery!'
);

-- Log the seed
SELECT 'Seed complete! Created 3 test approvals:' AS message;
SELECT '  - ' || COUNT(*) || ' pending approvals' FROM approvals WHERE status = 'pending';
SELECT '  - ' || COUNT(*) || ' approved approvals' FROM approvals WHERE status = 'approved';
