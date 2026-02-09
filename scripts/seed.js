// Seed test data for Merchously Dashboard
// Run with: node scripts/seed.js

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'db', 'merchously.db');
const db = new Database(dbPath);

console.log('🌱 Seeding test data...\n');

// Test Approval 1: Proposal Review (Pending)
db.prepare(`
  INSERT INTO approvals (
    id, client_email, agent_key, stage_name, checkpoint_type,
    agent_payload, agent_response, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  uuidv4(),
  'alex.rivera@testbrand.local',
  'proposal',
  'Proposal Drafting',
  'proposal_review',
  JSON.stringify({
    email: 'alex.rivera@testbrand.local',
    tier: 'Launch',
    budget_range: '$4,000-$5,500 CAD'
  }),
  JSON.stringify({
    tier: 'Launch',
    pricing: '$4,500 CAD',
    timeline: '6-8 weeks',
    deliverables: ['SKU Planning', 'Design', 'Production'],
    proposal_markdown: '# Proposal for Rivera Creative Studio\n\n## Recommended Tier: Launch'
  }),
  'pending'
);

console.log('✅ Created pending proposal approval for alex.rivera@testbrand.local');

// Test Approval 2: Discovery Summary (Pending)
db.prepare(`
  INSERT INTO approvals (
    id, client_email, agent_key, stage_name, checkpoint_type,
    agent_payload, agent_response, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  uuidv4(),
  'sarah.johnson@creativebrand.com',
  'discovery',
  'Discovery Support',
  'discovery_summary',
  JSON.stringify({
    email: 'sarah.johnson@creativebrand.com',
    discovery_notes: 'Sustainable fashion brand, 85K Instagram followers'
  }),
  JSON.stringify({
    summary: 'High-fit Launch candidate',
    icp_level: 'A',
    recommended_tier: 'Launch',
    confidence_score: 0.92
  }),
  'pending'
);

console.log('✅ Created pending discovery approval for sarah.johnson@creativebrand.com');

// Test Approval 3: Quality Check (Approved)
db.prepare(`
  INSERT INTO approvals (
    id, client_email, agent_key, stage_name, checkpoint_type,
    agent_payload, agent_response, status, reviewed_by, reviewed_at, admin_comments
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  uuidv4(),
  'completed@example.com',
  'qualityCompliance',
  'Quality & Compliance',
  'quality_check',
  JSON.stringify({
    email: 'completed@example.com',
    deliverable: 'Final product samples'
  }),
  JSON.stringify({
    compliance_status: 'pass',
    pricing_validation: 'correct',
    brand_alignment: 'strong'
  }),
  'approved',
  'Admin',
  new Date().toISOString(),
  'Looks great, approved for delivery!'
);

console.log('✅ Created approved quality check for completed@example.com');

// Count approvals
const pending = db.prepare('SELECT COUNT(*) as count FROM approvals WHERE status = ?').get('pending');
const approved = db.prepare('SELECT COUNT(*) as count FROM approvals WHERE status = ?').get('approved');

console.log('\n✅ Seed complete!');
console.log(`   - ${pending.count} pending approvals`);
console.log(`   - ${approved.count} approved approvals`);
console.log('\n🚀 Refresh the dashboard to see them!');

db.close();
