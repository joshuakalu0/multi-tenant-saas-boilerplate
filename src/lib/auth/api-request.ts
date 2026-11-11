import type { MembershipRole } from "@prisma/client";

import { auth } from "@/auth";
import { authenticateApiKey, touchApiKeyUsage } from "@/lib/api-keys";
import { getPrismaClient } from "@/lib/db";

type SessionActor = {
  email: string | null;
  id: string;
  kind: "session";
  name: string | null;
};

type ApiKeyActor = {
  apiKeyId: string;
  createdById: string;
  kind: "api-key";
  organizationId: string;
  organizationSlug: string;
};

export type ApiActor = ApiKeyActor | SessionActor;

export async function authenticateRequestActor(request: Request): Promise<ApiActor | null> {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const apiKey = await authenticateApiKey(authorization.slice("Bearer ".length).trim());

    if (!apiKey) {
      return null;
    }

    await touchApiKeyUsage(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      createdById: apiKey.createdById,
      kind: "api-key",
      organizationId: apiKey.organizationId,
      organizationSlug: apiKey.organization.slug
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    email: session.user.email ?? null,
    id: session.user.id,
    kind: "session",
    name: session.user.name ?? null
  };
}

export async function requireOrganizationActor(
  request: Request,
  organizationSlug: string
): Promise<null | { actor: ApiActor; membershipRole: MembershipRole | null; organizationId: string }> {
  const actor = await authenticateRequestActor(request);

  if (!actor) {
    return null;
  }

  const organization = await getPrismaClient().organization.findUnique({
    where: {
      slug: organizationSlug
    }
  });

  if (!organization) {
    return null;
  }

  if (actor.kind === "api-key") {
    return actor.organizationId === organization.id
      ? {
          actor,
          membershipRole: null,
          organizationId: organization.id
        }
      : null;
  }

  const membership = await getPrismaClient().membership.findUnique({
    where: {
      userId_organizationId: {
        organizationId: organization.id,
        userId: actor.id
      }
    }
  });

  if (!membership) {
    return null;
  }

  return {
    actor,
    membershipRole: membership.role,
    organizationId: organization.id
  };
}
