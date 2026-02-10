import type { Project } from "./db";

// =============================================
// Pipeline stages (single source of truth)
// =============================================

export const PIPELINE_STAGES = [
  "LEAD",
  "QUALIFIED",
  "DISCOVERY",
  "FIT_DECISION",
  "PROPOSAL",
  "CLOSED",
  "ONBOARDING",
  "DELIVERY",
  "COMPLETE",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// =============================================
// Agent key → stages where they can be triggered
// =============================================

export const STAGE_AGENT_MAP: Record<string, string[]> = {
  LEAD: ["leadIntake"],
  QUALIFIED: ["leadIntake"],
  DISCOVERY: ["discovery"],
  FIT_DECISION: ["discovery"],
  PROPOSAL: ["proposal"],
  CLOSED: [],
  ONBOARDING: ["onboarding"],
  DELIVERY: ["tierExecution", "customerSupport", "qualityCompliance"],
  COMPLETE: ["qualityCompliance"],
};

// =============================================
// Stage advancement actions
// =============================================

export const STAGE_ACTIONS: Record<string, { nextStage: string; label: string }> = {
  LEAD: { nextStage: "QUALIFIED", label: "Qualify Lead" },
  QUALIFIED: { nextStage: "DISCOVERY", label: "Start Discovery" },
  DISCOVERY: { nextStage: "FIT_DECISION", label: "Move to Fit Decision" },
  FIT_DECISION: { nextStage: "PROPOSAL", label: "Create Proposal" },
  PROPOSAL: { nextStage: "CLOSED", label: "Close Deal" },
  CLOSED: { nextStage: "ONBOARDING", label: "Start Onboarding" },
  ONBOARDING: { nextStage: "DELIVERY", label: "Begin Delivery" },
  DELIVERY: { nextStage: "COMPLETE", label: "Mark Complete" },
};

// =============================================
// Agent display names
// =============================================

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  leadIntake: "Lead Intake & Qualification",
  discovery: "Discovery Support",
  proposal: "Proposal Drafting",
  onboarding: "Client Onboarding",
  tierExecution: "Tier Execution Support",
  customerSupport: "Customer Support & Escalation",
  qualityCompliance: "Quality & Compliance",
};

// =============================================
// Agent key → Project stage mapping (used by policy)
// =============================================

export const AGENT_STAGE_MAP: Record<string, Project["stage"]> = {
  leadIntake: "LEAD",
  discovery: "DISCOVERY",
  proposal: "PROPOSAL",
  onboarding: "ONBOARDING",
  tierExecution: "DELIVERY",
  customerSupport: "DELIVERY",
  qualityCompliance: "DELIVERY",
};

// =============================================
// Stage display names (aligned with architecture doc)
// =============================================

export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  LEAD: "Lead Captured",
  QUALIFIED: "Qualified",
  DISCOVERY: "Discovery",
  FIT_DECISION: "Internal Review",
  PROPOSAL: "Proposal",
  CLOSED: "Closed Won",
  ONBOARDING: "Onboarding",
  DELIVERY: "Active Delivery",
  COMPLETE: "Complete / Transition",
};

/**
 * Get the display name for a stage, with fallback.
 */
export function getStageName(stage: string): string {
  return STAGE_DISPLAY_NAMES[stage] || stage.replace(/_/g, " ");
}

// =============================================
// Tier labels
// =============================================

export const TIER_LABELS: Record<string, string> = {
  TIER_1: "Launch",
  TIER_2: "Growth",
  TIER_3: "Scale",
};

// =============================================
// Escalation categories
// =============================================

export const ESCALATION_CATEGORIES = [
  "FINANCIAL",
  "SCOPE",
  "LEGAL_BRAND",
  "RELATIONSHIP",
  "SYSTEM_CONFLICT",
  "OTHER",
] as const;

export const ESCALATION_CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: "Financial",
  SCOPE: "Scope",
  LEGAL_BRAND: "Legal/Brand",
  RELATIONSHIP: "Relationship",
  SYSTEM_CONFLICT: "System Conflict",
  OTHER: "Other",
};

export const ESCALATION_LEVELS = ["L1", "L2", "L3"] as const;

// =============================================
// Stage transition validation helpers
// =============================================

/**
 * Get the next sequential stage, or null if at COMPLETE.
 */
export function getNextStage(current: PipelineStage): PipelineStage | null {
  const action = STAGE_ACTIONS[current];
  return action ? (action.nextStage as PipelineStage) : null;
}

/**
 * Check if a stage transition is the next sequential step.
 */
export function isValidTransition(from: PipelineStage, to: PipelineStage): boolean {
  const next = getNextStage(from);
  return next === to;
}
