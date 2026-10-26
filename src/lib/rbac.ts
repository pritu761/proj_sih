export type Role =
  | "ADMIN"
  | "COMPETENT_AUTHORITY"
  | "REGULATION_OFFICER"
  | "PGRC_OFFICER"
  | "BUREAU_OFFICER"
  | "REGIONAL_OFFICER";

export type Bureau =
  | "REGULATION_BUREAU"
  | "PGRC"
  | "APPROVAL_BUREAU"
  | "SKILL_CELL"
  | "ALL";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  bureau: Bureau;
  region?: string | null;
  designation?: string | null;
}

/**
 * Validates whether user has one of the allowed roles
 */
export function hasRole(user: SessionUser | null | undefined, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Checks if a user is permitted to perform mutate actions on a case
 * - ADMIN and COMPETENT_AUTHORITY can act or escalate
 * - Officers can only mutate cases assigned to their specific bureau
 * - Regional officers are read-only observers for their region
 */
export function canActOnCase(user: SessionUser | null | undefined, caseItem: { assigned_bureau: string; institution?: { region?: string } }): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "COMPETENT_AUTHORITY") return true;

  if (user.role === "REGULATION_OFFICER") {
    return caseItem.assigned_bureau === "REGULATION_BUREAU";
  }

  if (user.role === "PGRC_OFFICER") {
    return caseItem.assigned_bureau === "PGRC";
  }

  if (user.role === "BUREAU_OFFICER") {
    return caseItem.assigned_bureau === user.bureau;
  }

  if (user.role === "REGIONAL_OFFICER") {
    return false; // Regional officers observe and monitor their region
  }

  return false;
}

/**
 * Checks if a user is permitted to view a case
 * - Competent Authority, Admin, and Bureau Officers can view all cases (Single Source of Truth)
 * - Regional officers see cases in their region by default
 */
export function canViewCase(user: SessionUser | null | undefined, caseItem: { assigned_bureau: string; institution?: { region?: string } }): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "COMPETENT_AUTHORITY") return true;
  if (["REGULATION_OFFICER", "PGRC_OFFICER", "BUREAU_OFFICER"].includes(user.role)) return true; // Single Source of Truth
  
  if (user.role === "REGIONAL_OFFICER") {
    if (!user.region) return true;
    return caseItem.institution?.region === user.region;
  }

  return true;
}

/**
 * Checks if user can acknowledge or coordinate an overlap alert
 */
export function canCoordinateOverlap(user: SessionUser | null | undefined, alert: { bureaus_involved: string[] }): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "COMPETENT_AUTHORITY") return true;
  if (user.bureau === "ALL") return true;
  return alert.bureaus_involved.includes(user.bureau);
}

/**
 * Enforces action authorization and throws if forbidden
 */
export function assertCanActOnCase(user: SessionUser | null | undefined, caseItem: { assigned_bureau: string; institution?: { region?: string } }) {
  if (!canActOnCase(user, caseItem)) {
    throw new Error(`Unauthorized: User ${user?.email || "Anonymous"} with role ${user?.role} cannot perform actions on cases assigned to ${caseItem.assigned_bureau}.`);
  }
}
