/**
 * Seed test data into SQLite database
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { approvals, projects, escalations, agents } from "../lib/db";

console.log("🌱 Seeding test data...\n");

// Test approval 1: Proposal Review
const approval1 = approvals.create({
  client_email: "alex.rivera@testbrand.local",
  agent_key: "proposal",
  stage_name: "Proposal Drafting",
  checkpoint_type: "proposal_review",
  agent_payload: JSON.stringify({
    email: "alex.rivera@testbrand.local",
    tier: "Launch",
    budget_range: "$4,000-$5,500 CAD",
  }),
  agent_response: JSON.stringify({
    tier: "Launch",
    pricing: "$4,500 CAD",
    timeline: "6-8 weeks",
    deliverables: [
      "SKU Planning & Product Definition",
      "Supplier Sourcing & Coordination",
      "Design Coordination",
      "Sample Approval & Quality Check",
      "Production Oversight",
      "Logistics & Fulfillment Setup",
      "Launch Support",
    ],
    proposal_markdown: "# Proposal for Rivera Creative Studio\n\n## Recommended Tier: Launch\n\n..."
  }),
});

console.log("✅ Created approval 1:", approval1.id);

// Test approval 2: Discovery Summary
const approval2 = approvals.create({
  client_email: "sarah.johnson@creativebrand.com",
  agent_key: "discovery",
  stage_name: "Discovery Support",
  checkpoint_type: "discovery_summary",
  agent_payload: JSON.stringify({
    email: "sarah.johnson@creativebrand.com",
    discovery_notes: "Sustainable fashion brand, 85K Instagram followers",
  }),
  agent_response: JSON.stringify({
    summary: "High-fit Launch candidate with strong brand alignment",
    icp_level: "A",
    recommended_tier: "Launch",
    confidence_score: 0.92,
    budget_alignment: "Strong ($5,000 budget)",
    next_steps: "Generate proposal",
  }),
});

console.log("✅ Created approval 2:", approval2.id);

// Test approval 3: Already approved
const approval3 = approvals.create({
  client_email: "completed@example.com",
  agent_key: "qualityCompliance",
  stage_name: "Quality & Compliance",
  checkpoint_type: "quality_check",
  agent_payload: JSON.stringify({
    email: "completed@example.com",
    deliverable: "Final product samples",
  }),
  agent_response: JSON.stringify({
    compliance_status: "pass",
    pricing_validation: "correct",
    brand_alignment: "strong",
  }),
});

// Mark as approved
approvals.update(approval3.id, {
  status: "approved",
  reviewed_by: "Admin",
  reviewed_at: new Date().toISOString(),
  admin_comments: "Looks great, approved for delivery!",
});

console.log("✅ Created and approved approval 3:", approval3.id);

// =============================================
// Seed Agents Registry
// =============================================
console.log("\n🤖 Seeding agents registry...\n");

const agentSeeds = [
  { agent_key: "leadIntake", display_name: "Lead Intake & Qualification", category: "sales" },
  { agent_key: "discovery", display_name: "Discovery Support", category: "sales" },
  { agent_key: "proposal", display_name: "Proposal Drafting", category: "sales" },
  { agent_key: "onboarding", display_name: "Client Onboarding", category: "operations" },
  { agent_key: "tierExecution", display_name: "Tier Execution Support", category: "operations" },
  { agent_key: "customerSupport", display_name: "Customer Support & Escalation", category: "support" },
  { agent_key: "qualityCompliance", display_name: "Quality & Compliance", category: "compliance" },
];

for (const seed of agentSeeds) {
  const existing = agents.getByKey(seed.agent_key);
  if (!existing) {
    const agent = agents.create(seed);
    console.log(`✅ Created agent: ${agent.agent_key} (${agent.display_name})`);
  } else {
    console.log(`⏭️  Agent already exists: ${seed.agent_key}`);
  }
}

// =============================================
// Seed Projects
// =============================================
console.log("\n📁 Seeding projects...\n");

const project1 = projects.upsertByEmailAndTier(
  "alex.rivera@testbrand.local",
  "TIER_1",
  {
    stage: "PROPOSAL",
    client_name: "Alex Rivera",
    icp_level: "B",
  }
);
console.log(`✅ Created project 1: ${project1.id} (${project1.client_email}, ${project1.tier})`);

const project2 = projects.upsertByEmailAndTier(
  "sarah.johnson@creativebrand.com",
  "TIER_1",
  {
    stage: "DISCOVERY",
    client_name: "Sarah Johnson",
    icp_level: "A",
  }
);
console.log(`✅ Created project 2: ${project2.id} (${project2.client_email}, ${project2.tier})`);

const project3 = projects.upsertByEmailAndTier(
  "completed@example.com",
  "TIER_2",
  {
    stage: "DELIVERY",
    status: "PAUSED",
    client_name: "Demo Client",
    icp_level: "A",
    sop_step_key: "T2_STEP_4_PRODUCTION",
  }
);
console.log(`✅ Created project 3: ${project3.id} (${project3.client_email}, PAUSED)`);

// =============================================
// Seed Escalations
// =============================================
console.log("\n🚨 Seeding escalations...\n");

const escalation1 = escalations.create({
  project_id: project1.id,
  level: "L1",
  category: "FINANCIAL",
  title: "Pricing below tier floor",
  description: "Proposed $3,800 CAD for Launch tier — floor is $4,000 CAD.",
});
console.log(`✅ Created L1 escalation: ${escalation1.id}`);

const escalation2 = escalations.create({
  project_id: project3.id,
  level: "L3",
  category: "LEGAL_BRAND",
  title: "Brand compliance violation detected",
  description: "Quality check flagged unauthorized logo usage in final deliverables. Project auto-paused.",
});
console.log(`✅ Created L3 escalation: ${escalation2.id} (project paused)`);

console.log("\n✅ Seed complete!");
console.log("   - 3 test approvals (2 pending, 1 approved)");
console.log("   - 7 agents registered");
console.log("   - 3 projects (PROPOSAL, DISCOVERY, DELIVERY/PAUSED)");
console.log("   - 2 escalations (L1 FINANCIAL, L3 LEGAL_BRAND)");
console.log("\n🚀 Start the dev server and login to see them!");
