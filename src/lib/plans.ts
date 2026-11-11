import type { Plan } from "@prisma/client";

export const PLAN_LIMITS: Record<Plan, { members: number | null; projects: number | null }> = {
  ENTERPRISE: {
    members: null,
    projects: null
  },
  FREE: {
    members: 3,
    projects: 5
  },
  PRO: {
    members: 25,
    projects: 50
  }
};

export type PlanCapability = "members" | "projects";

export function getPlanLimit(plan: Plan, capability: PlanCapability) {
  return PLAN_LIMITS[plan][capability];
}
