/**
 * Seed test data into SQLite database
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { approvals } from "../lib/db";

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

console.log("\n✅ Seed complete! Created 3 test approvals:");
console.log("   - 2 pending (proposal, discovery)");
console.log("   - 1 approved (quality check)");
console.log("\n🚀 Start the dev server and login to see them!");
