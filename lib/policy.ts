import type { Approval, Project, Escalation } from "./db";

// =============================================
// Types
// =============================================

export interface PolicyContext {
  action: "approved" | "rejected" | "edited";
  admin_comments?: string | null;
  edited_response?: any;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  auto_escalation?: {
    level: Escalation["level"];
    category: Escalation["category"];
    title: string;
    description: string;
  };
}

// =============================================
// Tier pricing boundaries (CAD)
// =============================================

const TIER_PRICING: Record<string, { floor: number; ceiling: number }> = {
  TIER_1: { floor: 4000, ceiling: 5500 },
  TIER_2: { floor: 8000, ceiling: 15000 },
  TIER_3: { floor: 15000, ceiling: 35000 },
};

// =============================================
// Agent key → Project stage mapping
// =============================================

const AGENT_STAGE_MAP: Record<string, Project["stage"]> = {
  leadIntake: "LEAD",
  discovery: "DISCOVERY",
  proposal: "PROPOSAL",
  onboarding: "ONBOARDING",
  tierExecution: "DELIVERY",
  customerSupport: "DELIVERY",
  qualityCompliance: "DELIVERY",
};

// =============================================
// Tier string mapping (Airtable → DB enum)
// =============================================

const TIER_STRING_MAP: Record<string, Project["tier"]> = {
  Launch: "TIER_1",
  launch: "TIER_1",
  Growth: "TIER_2",
  growth: "TIER_2",
  Scale: "TIER_3",
  scale: "TIER_3",
  TIER_1: "TIER_1",
  TIER_2: "TIER_2",
  TIER_3: "TIER_3",
};

// Legal/brand risk keywords
const LEGAL_BRAND_KEYWORDS = [
  "trademark",
  "copyright",
  "infringement",
  "cease and desist",
  "lawsuit",
  "legal action",
  "unauthorized",
  "counterfeit",
  "compliance violation",
  "recall",
  "safety issue",
  "regulatory",
];

// =============================================
// Policy enforcement
// =============================================

/**
 * Enforce approval policy before allowing an approval action.
 * Returns whether the action is allowed and any auto-escalation needed.
 */
export function enforceApprovalPolicy(
  approval: Approval,
  context: PolicyContext
): PolicyResult {
  // Rule 1: Reject/edit requires decision notes
  if (
    (context.action === "rejected" || context.action === "edited") &&
    !context.admin_comments
  ) {
    return {
      allowed: false,
      reason: "Decision notes are required for reject/edit actions",
    };
  }

  // Parse agent response to check for policy violations
  let agentResponse: any;
  try {
    agentResponse =
      typeof approval.agent_response === "string"
        ? JSON.parse(approval.agent_response)
        : approval.agent_response;
  } catch {
    agentResponse = {};
  }

  // Rule 2: Check pricing violations for proposal reviews
  if (approval.checkpoint_type === "proposal_review") {
    const pricingResult = checkPricingBoundaries(agentResponse);
    if (pricingResult) {
      return {
        allowed: true,
        auto_escalation: pricingResult,
      };
    }
  }

  // Rule 3: Check for scope change indicators when editing
  if (context.action === "edited" && context.edited_response) {
    const scopeResult = checkScopeChange(agentResponse, context.edited_response);
    if (scopeResult) {
      return {
        allowed: true,
        auto_escalation: scopeResult,
      };
    }
  }

  // Rule 4: Check for legal/brand risk keywords in response
  const legalResult = checkLegalBrandRisk(agentResponse);
  if (legalResult) {
    return {
      allowed: true,
      auto_escalation: legalResult,
    };
  }

  return { allowed: true };
}

// =============================================
// Helper functions
// =============================================

function checkPricingBoundaries(
  agentResponse: any
): PolicyResult["auto_escalation"] | null {
  const pricingStr = agentResponse?.pricing || agentResponse?.price || "";
  const tierStr = agentResponse?.tier || "";

  if (!pricingStr || !tierStr) return null;

  // Extract numeric price from string like "$4,500 CAD"
  const priceMatch = pricingStr.replace(/,/g, "").match(/\$?([\d.]+)/);
  if (!priceMatch) return null;

  const price = parseFloat(priceMatch[1]);
  const tier = mapTierString(tierStr);
  const bounds = TIER_PRICING[tier];

  if (!bounds) return null;

  if (price < bounds.floor) {
    return {
      level: "L2",
      category: "FINANCIAL",
      title: `Pricing below ${tier} floor`,
      description: `Proposed ${pricingStr} is below the ${tier} floor of $${bounds.floor} CAD`,
    };
  }

  if (price > bounds.ceiling) {
    return {
      level: "L2",
      category: "FINANCIAL",
      title: `Pricing above ${tier} ceiling`,
      description: `Proposed ${pricingStr} exceeds the ${tier} ceiling of $${bounds.ceiling} CAD`,
    };
  }

  return null;
}

function checkScopeChange(
  originalResponse: any,
  editedResponse: any
): PolicyResult["auto_escalation"] | null {
  const originalDeliverables = originalResponse?.deliverables || [];
  const editedDeliverables = editedResponse?.deliverables || [];

  // If deliverables changed, it's a potential scope change
  if (
    Array.isArray(originalDeliverables) &&
    Array.isArray(editedDeliverables) &&
    JSON.stringify(originalDeliverables) !== JSON.stringify(editedDeliverables)
  ) {
    return {
      level: "L2",
      category: "SCOPE",
      title: "Scope change detected in edited response",
      description: `Deliverables were modified from ${originalDeliverables.length} to ${editedDeliverables.length} items`,
    };
  }

  // Check if tier was changed
  if (
    originalResponse?.tier &&
    editedResponse?.tier &&
    originalResponse.tier !== editedResponse.tier
  ) {
    return {
      level: "L2",
      category: "SCOPE",
      title: "Tier change detected",
      description: `Tier changed from ${originalResponse.tier} to ${editedResponse.tier}`,
    };
  }

  return null;
}

function checkLegalBrandRisk(
  agentResponse: any
): PolicyResult["auto_escalation"] | null {
  const responseStr = JSON.stringify(agentResponse).toLowerCase();

  for (const keyword of LEGAL_BRAND_KEYWORDS) {
    if (responseStr.includes(keyword.toLowerCase())) {
      return {
        level: "L3",
        category: "LEGAL_BRAND",
        title: "Legal/brand risk detected",
        description: `Agent response contains risk keyword: "${keyword}"`,
      };
    }
  }

  return null;
}

/**
 * Suggest the project stage for a given agent key.
 * This is a recommendation — stage advancement requires human approval.
 */
export function suggestStageForAgent(agentKey: string): Project["stage"] {
  return AGENT_STAGE_MAP[agentKey] || "LEAD";
}

/** @deprecated Use suggestStageForAgent — stages must be human-gated */
export const mapAgentToStage = suggestStageForAgent;

/**
 * Map tier string (from Airtable/webhook) to DB tier enum
 */
export function mapTierString(tierStr: string): Project["tier"] {
  return TIER_STRING_MAP[tierStr] || "TIER_1";
}
