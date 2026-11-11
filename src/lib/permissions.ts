import type { MembershipRole, Plan } from "@prisma/client";

import { AuthorizationError, PlanLimitError } from "@/lib/errors";
import { getPlanLimit, type PlanCapability } from "@/lib/plans";

const roleRank: Record<MembershipRole, number> = {
  ADMIN: 2,
  MEMBER: 1,
  OWNER: 3
};

export function hasRequiredRole(role: MembershipRole, requiredRole: MembershipRole) {
  return roleRank[role] >= roleRank[requiredRole];
}

export function requireRole(role: MembershipRole, requiredRole: MembershipRole) {
  if (!hasRequiredRole(role, requiredRole)) {
    throw new AuthorizationError();
  }
}

export function hasPlanCapacity(plan: Plan, capability: PlanCapability, currentCount: number) {
  const limit = getPlanLimit(plan, capability);

  if (limit === null) {
    return true;
  }

  return currentCount < limit;
}

export function requirePlanCapability({
  capability,
  currentCount,
  plan
}: {
  capability: PlanCapability;
  currentCount: number;
  plan: Plan;
}) {
  if (!hasPlanCapacity(plan, capability, currentCount)) {
    throw new PlanLimitError(
      capability === "members"
        ? "Your current plan has reached its member limit."
        : "Your current plan has reached its project limit."
    );
  }
}
