/**
 * Role-Based Access Control (RBAC)
 * Maps the 5 human roles from the architecture document to permissions.
 */

export const ROLES = [
  "FOUNDER",
  "SALES_LEAD",
  "DELIVERY_LEAD",
  "CREATIVE_SPECIALIST",
  "AI_OPERATOR",
] as const;

export type UserRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  FOUNDER: "Founder / Principal",
  SALES_LEAD: "Sales & Discovery Lead",
  DELIVERY_LEAD: "Delivery Lead / Project Owner",
  CREATIVE_SPECIALIST: "Creative / Execution Specialist",
  AI_OPERATOR: "AI Systems Operator",
};

/**
 * Permission set per role.
 * Permissions are action-based strings used for API and UI gating.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  FOUNDER: [
    "view_all",
    "approve_all",
    "resolve_escalations",
    "manage_users",
    "view_metrics",
    "view_decisions",
    "view_delivery",
    "view_agents",
    "view_activity_log",
    "advance_stages",
    "create_projects",
    "manage_agents",
  ],
  SALES_LEAD: [
    "view_pipeline",
    "view_clients",
    "advance_pre_close_stages",
    "approve_discovery",
    "approve_proposals",
    "create_projects",
    "view_activity_log",
  ],
  DELIVERY_LEAD: [
    "view_delivery",
    "view_pipeline",
    "advance_post_close_stages",
    "approve_tier_execution",
    "approve_quality_check",
    "manage_sop",
    "view_activity_log",
  ],
  CREATIVE_SPECIALIST: [
    "view_assigned_projects",
    "add_notes",
  ],
  AI_OPERATOR: [
    "view_agents",
    "manage_agents",
    "view_activity_log",
    "view_metrics",
  ],
};

/**
 * Navigation items visible per role.
 */
export const ROLE_NAV_ITEMS: Record<UserRole, string[]> = {
  FOUNDER: ["dashboard", "projects", "escalations", "agents", "decisions", "delivery", "metrics", "activity-log"],
  SALES_LEAD: ["dashboard", "projects", "escalations", "activity-log"],
  DELIVERY_LEAD: ["dashboard", "projects", "delivery", "escalations", "activity-log"],
  CREATIVE_SPECIALIST: ["dashboard", "projects"],
  AI_OPERATOR: ["dashboard", "agents", "metrics", "activity-log"],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can see a specific nav item.
 */
export function canSeeNavItem(role: UserRole, navItem: string): boolean {
  return ROLE_NAV_ITEMS[role]?.includes(navItem) ?? false;
}
