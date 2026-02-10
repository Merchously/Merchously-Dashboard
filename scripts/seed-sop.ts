/**
 * Seed SOP definitions for all tiers.
 * Usage: npx tsx scripts/seed-sop.ts
 */

import { sopDefinitions } from "../lib/db";

const SOP_STEPS = [
  // TIER_1 — Launch (basic e-commerce setup)
  { tier: "TIER_1" as const, step_order: 1, step_key: "T1_KICKOFF", step_name: "Kickoff Call", description: "Initial meeting to align on goals, timeline, and deliverables", expected_duration_hours: 2, required_inputs: '["client_brief","brand_assets"]' },
  { tier: "TIER_1" as const, step_order: 2, step_key: "T1_BRAND_SETUP", step_name: "Brand & Store Setup", description: "Configure store branding, theme, and basic settings", expected_duration_hours: 24, required_inputs: '["logo","color_palette","product_photos"]' },
  { tier: "TIER_1" as const, step_order: 3, step_key: "T1_PRODUCT_UPLOAD", step_name: "Product Upload", description: "Upload product catalog with descriptions, images, and pricing", expected_duration_hours: 48, required_inputs: '["product_spreadsheet","product_images","pricing_sheet"]' },
  { tier: "TIER_1" as const, step_order: 4, step_key: "T1_PAYMENT_SHIPPING", step_name: "Payment & Shipping", description: "Configure payment gateway and shipping rules", expected_duration_hours: 8, required_inputs: '["payment_credentials","shipping_rates"]' },
  { tier: "TIER_1" as const, step_order: 5, step_key: "T1_QA_REVIEW", step_name: "QA Review", description: "Full quality check of store functionality, checkout flow, and mobile responsiveness", expected_duration_hours: 16, required_inputs: '[]' },
  { tier: "TIER_1" as const, step_order: 6, step_key: "T1_CLIENT_REVIEW", step_name: "Client Review", description: "Client walkthrough and feedback collection", expected_duration_hours: 48, required_inputs: '["client_feedback"]' },
  { tier: "TIER_1" as const, step_order: 7, step_key: "T1_LAUNCH", step_name: "Launch", description: "Go live, DNS setup, launch checklist", expected_duration_hours: 4, required_inputs: '["domain_access","launch_approval"]' },

  // TIER_2 — Growth (enhanced features + marketing)
  { tier: "TIER_2" as const, step_order: 1, step_key: "T2_KICKOFF", step_name: "Kickoff & Strategy", description: "Strategic alignment meeting covering goals, KPIs, and growth plan", expected_duration_hours: 4, required_inputs: '["client_brief","brand_guidelines","competitor_list"]' },
  { tier: "TIER_2" as const, step_order: 2, step_key: "T2_BRAND_DESIGN", step_name: "Custom Brand Design", description: "Custom theme design with brand identity integration", expected_duration_hours: 72, required_inputs: '["brand_assets","design_preferences","inspiration_links"]' },
  { tier: "TIER_2" as const, step_order: 3, step_key: "T2_STORE_BUILD", step_name: "Store Build & Config", description: "Full store build with custom sections and integrations", expected_duration_hours: 80, required_inputs: '["product_catalog","integration_credentials"]' },
  { tier: "TIER_2" as const, step_order: 4, step_key: "T2_CONTENT", step_name: "Content & Copywriting", description: "Professional product descriptions, about page, and marketing copy", expected_duration_hours: 40, required_inputs: '["brand_voice_guide","product_details"]' },
  { tier: "TIER_2" as const, step_order: 5, step_key: "T2_SEO_SETUP", step_name: "SEO & Analytics Setup", description: "SEO optimization, meta tags, Google Analytics, and tracking pixels", expected_duration_hours: 16, required_inputs: '["google_analytics_id","social_pixels"]' },
  { tier: "TIER_2" as const, step_order: 6, step_key: "T2_EMAIL_MARKETING", step_name: "Email Marketing Setup", description: "Email platform integration, welcome flow, and abandoned cart recovery", expected_duration_hours: 24, required_inputs: '["email_platform_credentials"]' },
  { tier: "TIER_2" as const, step_order: 7, step_key: "T2_QA_REVIEW", step_name: "QA & Performance Review", description: "Comprehensive QA, performance testing, and mobile optimization", expected_duration_hours: 24, required_inputs: '[]' },
  { tier: "TIER_2" as const, step_order: 8, step_key: "T2_CLIENT_REVIEW", step_name: "Client Review & Revisions", description: "Client walkthrough with up to 2 revision rounds", expected_duration_hours: 72, required_inputs: '["client_feedback"]' },
  { tier: "TIER_2" as const, step_order: 9, step_key: "T2_LAUNCH", step_name: "Launch & Handoff", description: "Go live, training session, and documentation handoff", expected_duration_hours: 8, required_inputs: '["domain_access","launch_approval"]' },

  // TIER_3 — Scale (full service + ongoing)
  { tier: "TIER_3" as const, step_order: 1, step_key: "T3_KICKOFF", step_name: "Strategic Discovery", description: "Deep-dive strategy session covering market positioning, competitive analysis, and growth roadmap", expected_duration_hours: 8, required_inputs: '["client_brief","brand_guidelines","competitor_analysis","financial_targets"]' },
  { tier: "TIER_3" as const, step_order: 2, step_key: "T3_UX_DESIGN", step_name: "UX Research & Design", description: "User research, wireframing, and custom UX design system", expected_duration_hours: 120, required_inputs: '["brand_assets","customer_personas","user_research"]' },
  { tier: "TIER_3" as const, step_order: 3, step_key: "T3_DEVELOPMENT", step_name: "Custom Development", description: "Custom theme build, advanced integrations, and custom functionality", expected_duration_hours: 160, required_inputs: '["design_approved","integration_specs","api_credentials"]' },
  { tier: "TIER_3" as const, step_order: 4, step_key: "T3_CONTENT_STRATEGY", step_name: "Content Strategy & Creation", description: "Full content strategy, professional copywriting, and content calendar", expected_duration_hours: 80, required_inputs: '["brand_voice_guide","product_details","content_calendar_approval"]' },
  { tier: "TIER_3" as const, step_order: 5, step_key: "T3_MARKETING_STACK", step_name: "Marketing Stack Integration", description: "Full marketing automation, CRM integration, ad platform setup", expected_duration_hours: 40, required_inputs: '["marketing_platform_credentials","crm_credentials","ad_account_access"]' },
  { tier: "TIER_3" as const, step_order: 6, step_key: "T3_TESTING", step_name: "Testing & Optimization", description: "Load testing, A/B testing setup, conversion optimization", expected_duration_hours: 40, required_inputs: '[]' },
  { tier: "TIER_3" as const, step_order: 7, step_key: "T3_CLIENT_UAT", step_name: "Client UAT", description: "User acceptance testing with structured feedback process", expected_duration_hours: 80, required_inputs: '["client_testers","test_scenarios"]' },
  { tier: "TIER_3" as const, step_order: 8, step_key: "T3_LAUNCH", step_name: "Launch & Go-Live", description: "Phased launch, monitoring, and immediate post-launch support", expected_duration_hours: 16, required_inputs: '["domain_access","launch_approval","monitoring_setup"]' },
  { tier: "TIER_3" as const, step_order: 9, step_key: "T3_POST_LAUNCH", step_name: "Post-Launch Optimization", description: "30-day post-launch monitoring, optimization, and training", expected_duration_hours: 120, required_inputs: '[]' },
];

function seed() {
  console.log("Seeding SOP definitions...\n");

  let created = 0;
  let skipped = 0;

  for (const step of SOP_STEPS) {
    const existing = sopDefinitions.getByStepKey(step.step_key);
    if (existing) {
      console.log(`  [skip] ${step.step_key} already exists`);
      skipped++;
      continue;
    }

    sopDefinitions.create(step);
    console.log(`  [+] ${step.tier} #${step.step_order}: ${step.step_name}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  console.log(`\nSummary by tier:`);

  for (const tier of ["TIER_1", "TIER_2", "TIER_3"]) {
    const defs = sopDefinitions.getByTier(tier);
    console.log(`  ${tier}: ${defs.length} steps`);
  }
}

seed();
