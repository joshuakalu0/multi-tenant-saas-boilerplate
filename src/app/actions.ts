"use server";

import type { MembershipRole, Plan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { createPasswordHash } from "@/lib/auth/password";
import { createCustomerPortalSession, createCheckoutSession } from "@/lib/billing/stripe";
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import { getTenantContext } from "@/lib/tenant/context";
import {
  acceptOrganizationInvite,
  completeOnboardingDraft,
  createApiKeyForOrganization,
  createInviteForOrganization,
  createProjectForOrganization,
  createUserWithPassword,
  findUserByEmail,
  getDefaultOrganizationForUser,
  removeOrganizationMember,
  revokeApiKeyForOrganization,
  saveOnboardingIdentityStep,
  saveOnboardingPlanStep,
  transferOrganizationOwnership,
  updateOrganizationMemberRole,
  updateOrganizationSettings
} from "@/lib/tenant/service";
import {
  createApiKeySchema,
  createProjectSchema,
  inviteMemberSchema,
  onboardingIdentitySchema,
  onboardingPlanSchema,
  removeMemberSchema,
  signInSchema,
  signUpSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateOrganizationSettingsSchema
} from "@/lib/validation/schemas";
import { requireViewerSession } from "@/lib/session";

export type AuthFormState = {
  error: string | null;
};

export type ApiKeyFormState = {
  error: string | null;
  rawKey: string | null;
  success: string | null;
};

const emptyAuthState: AuthFormState = {
  error: null
};

export const defaultAuthFormState = emptyAuthState;

export const defaultApiKeyFormState: ApiKeyFormState = {
  error: null,
  rawKey: null,
  success: null
};

function getSafeRedirectTarget(redirectTo: string | null | undefined) {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return "/";
  }

  return redirectTo;
}

export async function signInWithCredentials(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo")?.toString());

  if (!parsed.success) {
    return {
      error: "Enter a valid email and password."
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "The email or password did not match an existing account."
      };
    }

    throw error;
  }

  return emptyAuthState;
}

export async function signInWithGitHub(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo")?.toString());
  await signIn("github", { redirectTo });
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo")?.toString());
  await signIn("google", { redirectTo });
}

export async function registerWithCredentials(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password")
  });
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo")?.toString() || "/onboarding");

  if (!parsed.success) {
    return {
      error: parsed.error.issues.at(0)?.message ?? "Complete every field with a strong password."
    };
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser) {
    return {
      error: "That email already has an account. Sign in instead."
    };
  }

  const passwordHash = await createPasswordHash(parsed.data.password);

  await createUserWithPassword({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Your account was created, but the sign-in handoff failed. Try signing in manually."
      };
    }

    throw error;
  }

  return emptyAuthState;
}

export async function signOutAction() {
  await signOut({
    redirectTo: "/"
  });
}

export async function saveOnboardingIdentityAction(formData: FormData) {
  const session = await requireViewerSession();
  const parsed = onboardingIdentitySchema.safeParse({
    organizationName: formData.get("organizationName"),
    suggestedSlug: formData.get("suggestedSlug")
  });

  if (!parsed.success) {
    redirect("/onboarding?step=1&error=identity");
  }

  await saveOnboardingIdentityStep({
    organizationName: parsed.data.organizationName,
    suggestedSlug: parsed.data.suggestedSlug ?? null,
    userId: session.user.id
  });

  redirect("/onboarding?step=2");
}

export async function saveOnboardingPlanAction(formData: FormData) {
  const session = await requireViewerSession();
  const parsed = onboardingPlanSchema.safeParse({
    plan: formData.get("plan")
  });

  if (!parsed.success) {
    redirect("/onboarding?step=2&error=plan");
  }

  await saveOnboardingPlanStep({
    plan: parsed.data.plan as Plan,
    userId: session.user.id
  });

  redirect("/onboarding?step=3");
}

export async function completeOnboardingAction() {
  const session = await requireViewerSession();
  const organization = await completeOnboardingDraft({
    userId: session.user.id
  });

  if (!organization) {
    redirect("/onboarding?step=1&error=complete");
  }

  redirect(`/w/${organization.slug}`);
}

export async function acceptInviteAction(token: string) {
  const session = await requireViewerSession();

  const organization = await acceptOrganizationInvite({
    token,
    userEmail: session.user.email ?? "",
    userId: session.user.id
  });

  if (!organization) {
    redirect(`/join/${token}?error=accept`);
  }

  redirect(`/w/${organization.slug}`);
}

export async function createProjectAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = createProjectSchema.safeParse({
    description: formData.get("description"),
    name: formData.get("name")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/projects?error=project`);
  }

  await createProjectForOrganization({
    actorId: context.userId,
    description: parsed.data.description ?? null,
    name: parsed.data.name,
    organizationId: context.organization.id,
    plan: context.plan,
    projectsCount: context.projectsCount
  });

  revalidatePath(`/w/${organizationSlug}`);
  revalidatePath(`/w/${organizationSlug}/projects`);
  redirect(`/w/${organizationSlug}/projects?created=1`);
}

export async function inviteMemberAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/members?error=invite`);
  }

  try {
    await createInviteForOrganization({
      actorId: context.userId,
      actorRole: context.membershipRole,
      appUrl: getServerEnv().NEXT_PUBLIC_APP_URL,
      email: parsed.data.email,
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      organizationSlug,
      plan: context.plan,
      role: parsed.data.role as MembershipRole,
      usersCount: context.usersCount
    });
  } catch (error) {
    redirect(`/w/${organizationSlug}/members?error=${encodeURIComponent(getActionError(error))}`);
  }

  revalidatePath(`/w/${organizationSlug}/members`);
  redirect(`/w/${organizationSlug}/members?invited=1`);
}

export async function updateMemberRoleAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = updateMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/members?error=role`);
  }

  await updateOrganizationMemberRole({
    actorId: context.userId,
    actorRole: context.membershipRole,
    membershipId: parsed.data.membershipId,
    organizationId: context.organization.id,
    role: parsed.data.role as MembershipRole
  });

  revalidatePath(`/w/${organizationSlug}/members`);
  redirect(`/w/${organizationSlug}/members?updated=1`);
}

export async function removeMemberAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = removeMemberSchema.safeParse({
    membershipId: formData.get("membershipId")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/members?error=remove`);
  }

  await removeOrganizationMember({
    actorId: context.userId,
    actorRole: context.membershipRole,
    membershipId: parsed.data.membershipId,
    organizationId: context.organization.id
  });

  revalidatePath(`/w/${organizationSlug}/members`);
  redirect(`/w/${organizationSlug}/members?removed=1`);
}

export async function transferOwnershipAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = transferOwnershipSchema.safeParse({
    targetMembershipId: formData.get("targetMembershipId")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/members?error=transfer`);
  }

  await transferOrganizationOwnership({
    actorId: context.userId,
    organizationId: context.organization.id,
    targetMembershipId: parsed.data.targetMembershipId
  });

  revalidatePath(`/w/${organizationSlug}/members`);
  redirect(`/w/${organizationSlug}/members?transferred=1`);
}

export async function updateOrganizationSettingsAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const parsed = updateOrganizationSettingsSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    redirect(`/w/${organizationSlug}/settings?error=settings`);
  }

  await updateOrganizationSettings({
    actorId: context.userId,
    actorRole: context.membershipRole,
    name: parsed.data.name,
    organizationId: context.organization.id
  });

  revalidatePath(`/w/${organizationSlug}`);
  revalidatePath(`/w/${organizationSlug}/settings`);
  redirect(`/w/${organizationSlug}/settings?saved=1`);
}

export async function startCheckoutAction(organizationSlug: string, plan: Exclude<Plan, "FREE">) {
  const context = await getTenantContext(organizationSlug);

  const session = await createCheckoutSession({
    cancelUrl: `${getServerEnv().NEXT_PUBLIC_APP_URL}/w/${organizationSlug}/billing?canceled=1`,
    organization: context.organization,
    organizationSlug,
    plan,
    successUrl: `${getServerEnv().NEXT_PUBLIC_APP_URL}/w/${organizationSlug}/billing?success=1`
  });

  redirect(session.url ?? `/w/${organizationSlug}/billing?error=checkout`);
}

export async function openBillingPortalAction(organizationSlug: string) {
  const context = await getTenantContext(organizationSlug);
  const portalSession = await createCustomerPortalSession({
    organization: context.organization,
    returnUrl: `${getServerEnv().NEXT_PUBLIC_APP_URL}/w/${organizationSlug}/billing`
  });

  redirect(portalSession.url);
}

export async function createApiKeyAction(
  organizationSlug: string,
  _previousState: ApiKeyFormState,
  formData: FormData
): Promise<ApiKeyFormState> {
  const context = await getTenantContext(organizationSlug);
  const parsed = createApiKeySchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.at(0)?.message ?? "Enter a descriptive key name.",
      rawKey: null,
      success: null
    };
  }

  try {
    const result = await createApiKeyForOrganization({
      actorId: context.userId,
      actorRole: context.membershipRole,
      name: parsed.data.name,
      organizationId: context.organization.id
    });

    revalidatePath(`/w/${organizationSlug}/api-keys`);

    return {
      error: null,
      rawKey: result.rawKey,
      success: "Copy this key now. It will not be shown again."
    };
  } catch (error) {
    return {
      error: getActionError(error),
      rawKey: null,
      success: null
    };
  }
}

export async function revokeApiKeyAction(organizationSlug: string, formData: FormData) {
  const context = await getTenantContext(organizationSlug);
  const keyId = formData.get("keyId")?.toString();

  if (!keyId) {
    redirect(`/w/${organizationSlug}/api-keys?error=key`);
  }

  await revokeApiKeyForOrganization({
    actorId: context.userId,
    actorRole: context.membershipRole,
    keyId,
    organizationId: context.organization.id
  });

  revalidatePath(`/w/${organizationSlug}/api-keys`);
  redirect(`/w/${organizationSlug}/api-keys?revoked=1`);
}

function getActionError(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export async function resolvePostAuthDestination(userId: string) {
  const organization = await getDefaultOrganizationForUser(userId);
  return organization ? `/w/${organization.slug}` : "/onboarding";
}
