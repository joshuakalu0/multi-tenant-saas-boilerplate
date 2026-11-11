import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const signUpSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8)
});

export const onboardingIdentitySchema = z.object({
  organizationName: z.string().trim().min(2).max(80),
  suggestedSlug: z.string().trim().optional()
});

export const onboardingPlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"])
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

export const updateMemberRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"])
});

export const removeMemberSchema = z.object({
  membershipId: z.string().min(1)
});

export const transferOwnershipSchema = z.object({
  targetMembershipId: z.string().min(1)
});

export const createProjectSchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(2).max(80)
});

export const updateProjectSchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(2).max(80).optional()
});

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(80)
});
