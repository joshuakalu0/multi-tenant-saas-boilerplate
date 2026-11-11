import crypto from "node:crypto";

import type { MembershipRole, Plan, Prisma } from "@prisma/client";

import { logAuditEvent } from "@/lib/audit";
import { createOrganizationApiKey } from "@/lib/api-keys";
import { createStripeCustomerForOrganization } from "@/lib/billing/stripe";
import { getPrismaClient } from "@/lib/db";
import { PlanLimitError } from "@/lib/errors";
import { sendInviteEmail } from "@/lib/email/resend";
import { requirePlanCapability, requireRole } from "@/lib/permissions";
import { slugifyOrganizationName, slugifyProjectName } from "@/lib/tenant/slug";

async function ensureUniqueSlug(baseSlug: string, table: "organization" | "project", organizationId?: string) {
  const prisma = getPrismaClient();
  const seed = baseSlug || crypto.randomUUID().slice(0, 8);
  let slug = seed;
  let suffix = 1;

  if (table === "project" && !organizationId) {
    throw new Error("Project slug generation requires an organization id.");
  }

  while (true) {
    const existing =
      table === "organization"
        ? await prisma.organization.findUnique({
            where: { slug }
          })
        : await prisma.project.findFirst({
            where: {
              organizationId: organizationId as string,
              slug
            }
          });

    if (!existing) {
      return slug;
    }

    slug = `${seed}-${suffix}`;
    suffix += 1;
  }
}

export async function findUserByEmail(email: string) {
  return getPrismaClient().user.findUnique({
    where: {
      email: email.toLowerCase()
    }
  });
}

export async function createUserWithPassword(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return getPrismaClient().user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash
    }
  });
}

export async function getOrganizationsForUser(userId: string) {
  return getPrismaClient().membership.findMany({
    include: {
      organization: true
    },
    orderBy: {
      joinedAt: "asc"
    },
    where: {
      userId
    }
  });
}

export async function getDefaultOrganizationForUser(userId: string) {
  const membership = await getPrismaClient().membership.findFirst({
    include: {
      organization: true
    },
    orderBy: {
      joinedAt: "asc"
    },
    where: {
      userId
    }
  });

  return membership?.organization ?? null;
}

export async function getOrganizationMembership(input: { organizationId: string; userId: string }) {
  return getPrismaClient().membership.findUnique({
    where: {
      userId_organizationId: input
    }
  });
}

export async function saveOnboardingIdentityStep(input: {
  organizationName: string;
  suggestedSlug?: string | null;
  userId: string;
}) {
  const baseSlug = slugifyOrganizationName(input.suggestedSlug || input.organizationName);
  const slug = await ensureUniqueSlug(baseSlug, "organization");

  return getPrismaClient().onboardingDraft.upsert({
    create: {
      organizationName: input.organizationName,
      slug,
      userId: input.userId
    },
    update: {
      organizationName: input.organizationName,
      slug
    },
    where: {
      userId: input.userId
    }
  });
}

export async function saveOnboardingPlanStep(input: {
  plan: Plan;
  userId: string;
}) {
  return getPrismaClient().onboardingDraft.upsert({
    create: {
      plan: input.plan,
      userId: input.userId
    },
    update: {
      plan: input.plan
    },
    where: {
      userId: input.userId
    }
  });
}

export async function getOnboardingDraft(userId: string) {
  return getPrismaClient().onboardingDraft.findUnique({
    where: {
      userId
    }
  });
}

export async function completeOnboardingDraft(input: {
  planOverride?: Plan;
  userId: string;
}) {
  const prisma = getPrismaClient();
  const draft = await prisma.onboardingDraft.findUnique({
    where: {
      userId: input.userId
    }
  });

  if (!draft?.organizationName || !draft.slug) {
    return null;
  }

  const organizationName = draft.organizationName;
  const organizationSlug = draft.slug;

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        plan: input.planOverride ?? draft.plan,
        slug: organizationSlug,
        subscriptionStatus: "ACTIVE"
      }
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        role: "OWNER",
        userId: input.userId
      }
    });

    await tx.onboardingDraft.update({
      data: {
        completedAt: new Date()
      },
      where: {
        id: draft.id
      }
    });

    await tx.auditLog.create({
      data: {
        action: "organization.created",
        actorId: input.userId,
        metadata: {
          plan: organization.plan
        },
        organizationId: organization.id,
        targetId: organization.id,
        targetType: "organization"
      }
    });

    return organization;
  }).then(async (organization) => {
    await createStripeCustomerForOrganization(organization).catch(() => null);
    return organization;
  });
}

export async function createProjectForOrganization(input: {
  actorId: string;
  description?: string | null;
  name: string;
  organizationId: string;
  plan: Plan;
  projectsCount: number;
}) {
  requirePlanCapability({
    capability: "projects",
    currentCount: input.projectsCount,
    plan: input.plan
  });

  const slug = await ensureUniqueSlug(slugifyProjectName(input.name), "project", input.organizationId);

  const project = await getPrismaClient().project.create({
    data: {
      createdById: input.actorId,
      description: input.description ?? null,
      name: input.name,
      organizationId: input.organizationId,
      slug,
      updatedById: input.actorId
    }
  });

  await logAuditEvent({
    action: "project.created",
    actorId: input.actorId,
    metadata: {
      projectSlug: project.slug
    },
    organizationId: input.organizationId,
    targetId: project.id,
    targetType: "project"
  });

  return project;
}

export async function updateProjectForOrganization(input: {
  actorId: string;
  description?: string | null;
  name?: string;
  organizationId: string;
  projectId: string;
}) {
  const project = await getPrismaClient().project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId
    }
  });

  if (!project) {
    return null;
  }

  const updates: Prisma.ProjectUpdateInput = {
    description: input.description ?? project.description,
    updatedBy: {
      connect: {
        id: input.actorId
      }
    }
  };

  if (input.name && input.name !== project.name) {
    updates.name = input.name;
    updates.slug = await ensureUniqueSlug(slugifyProjectName(input.name), "project", input.organizationId);
  }

  const updatedProject = await getPrismaClient().project.update({
    data: updates,
    where: {
      id: project.id
    }
  });

  await logAuditEvent({
    action: "project.updated",
    actorId: input.actorId,
    organizationId: input.organizationId,
    targetId: updatedProject.id,
    targetType: "project"
  });

  return updatedProject;
}

export async function deleteProjectForOrganization(input: {
  actorId: string;
  organizationId: string;
  projectId: string;
}) {
  const project = await getPrismaClient().project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId
    }
  });

  if (!project) {
    return null;
  }

  await getPrismaClient().project.delete({
    where: {
      id: project.id
    }
  });

  await logAuditEvent({
    action: "project.deleted",
    actorId: input.actorId,
    organizationId: input.organizationId,
    targetId: project.id,
    targetType: "project"
  });

  return project;
}

export async function createInviteForOrganization(input: {
  actorId: string;
  actorRole: MembershipRole;
  appUrl: string;
  email: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  plan: Plan;
  role?: MembershipRole;
  usersCount: number;
}) {
  requireRole(input.actorRole, "ADMIN");
  requirePlanCapability({
    capability: "members",
    currentCount: input.usersCount,
    plan: input.plan
  });

  const email = input.email.toLowerCase();
  const existingMembership = await getPrismaClient().membership.findFirst({
    include: {
      user: true
    },
    where: {
      organizationId: input.organizationId,
      user: {
        email
      }
    }
  });

  if (existingMembership) {
    throw new PlanLimitError("That user is already a member of this organization.");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invite = await getPrismaClient().inviteToken.create({
    data: {
      email,
      expiresAt,
      invitedById: input.actorId,
      organizationId: input.organizationId,
      role: input.role ?? "MEMBER",
      token
    }
  });

  await sendInviteEmail({
    acceptUrl: `${input.appUrl}/join/${invite.token}`,
    email,
    organizationName: input.organizationName
  });

  await logAuditEvent({
    action: "invite.created",
    actorId: input.actorId,
    metadata: {
      email,
      role: invite.role
    },
    organizationId: input.organizationId,
    targetId: invite.id,
    targetType: "invite"
  });

  return invite;
}

export async function acceptOrganizationInvite(input: {
  token: string;
  userEmail: string;
  userId: string;
}) {
  const prisma = getPrismaClient();
  const invite = await prisma.inviteToken.findUnique({
    include: {
      organization: true
    },
    where: {
      token: input.token
    }
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return null;
  }

  if (invite.email.toLowerCase() !== input.userEmail.toLowerCase()) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existingMembership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          organizationId: invite.organizationId,
          userId: input.userId
        }
      }
    });

    if (!existingMembership) {
      await tx.membership.create({
        data: {
          organizationId: invite.organizationId,
          role: invite.role,
          userId: input.userId
        }
      });
    }

    await tx.inviteToken.update({
      data: {
        usedAt: new Date()
      },
      where: {
        id: invite.id
      }
    });

    return invite.organization;
  }).then(async (organization) => {
    await logAuditEvent({
      action: "invite.accepted",
      actorId: input.userId,
      metadata: {
        inviteToken: input.token
      },
      organizationId: organization.id,
      targetId: organization.id,
      targetType: "organization"
    });

    return organization;
  });
}

export async function updateOrganizationMemberRole(input: {
  actorId: string;
  actorRole: MembershipRole;
  membershipId: string;
  organizationId: string;
  role: MembershipRole;
}) {
  requireRole(input.actorRole, "ADMIN");

  const membership = await getPrismaClient().membership.findFirst({
    include: {
      user: true
    },
    where: {
      id: input.membershipId,
      organizationId: input.organizationId
    }
  });

  if (!membership || membership.role === "OWNER") {
    return null;
  }

  const updatedMembership = await getPrismaClient().membership.update({
    data: {
      role: input.role
    },
    where: {
      id: membership.id
    }
  });

  await logAuditEvent({
    action: "membership.role_changed",
    actorId: input.actorId,
    metadata: {
      newRole: input.role
    },
    organizationId: input.organizationId,
    targetId: membership.id,
    targetType: "membership"
  });

  return updatedMembership;
}

export async function removeOrganizationMember(input: {
  actorId: string;
  actorRole: MembershipRole;
  membershipId: string;
  organizationId: string;
}) {
  requireRole(input.actorRole, "ADMIN");

  const membership = await getPrismaClient().membership.findFirst({
    where: {
      id: input.membershipId,
      organizationId: input.organizationId
    }
  });

  if (!membership || membership.role === "OWNER") {
    return null;
  }

  await getPrismaClient().membership.delete({
    where: {
      id: membership.id
    }
  });

  await logAuditEvent({
    action: "membership.removed",
    actorId: input.actorId,
    organizationId: input.organizationId,
    targetId: membership.id,
    targetType: "membership"
  });

  return membership;
}

export async function transferOrganizationOwnership(input: {
  actorId: string;
  organizationId: string;
  targetMembershipId: string;
}) {
  const prisma = getPrismaClient();
  const ownerMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        organizationId: input.organizationId,
        userId: input.actorId
      }
    }
  });

  if (!ownerMembership || ownerMembership.role !== "OWNER") {
    return null;
  }

  const targetMembership = await prisma.membership.findFirst({
    where: {
      id: input.targetMembershipId,
      organizationId: input.organizationId
    }
  });

  if (!targetMembership || targetMembership.id === ownerMembership.id) {
    return null;
  }

  await prisma.$transaction([
    prisma.membership.update({
      data: {
        role: "ADMIN"
      },
      where: {
        id: ownerMembership.id
      }
    }),
    prisma.membership.update({
      data: {
        role: "OWNER"
      },
      where: {
        id: targetMembership.id
      }
    })
  ]);

  await logAuditEvent({
    action: "organization.ownership_transferred",
    actorId: input.actorId,
    metadata: {
      nextOwnerMembershipId: targetMembership.id
    },
    organizationId: input.organizationId,
    targetId: targetMembership.id,
    targetType: "membership"
  });

  return true;
}

export async function updateOrganizationSettings(input: {
  actorId: string;
  actorRole: MembershipRole;
  name: string;
  organizationId: string;
}) {
  requireRole(input.actorRole, "ADMIN");

  const organization = await getPrismaClient().organization.update({
    data: {
      name: input.name
    },
    where: {
      id: input.organizationId
    }
  });

  await logAuditEvent({
    action: "organization.settings_updated",
    actorId: input.actorId,
    organizationId: input.organizationId,
    targetId: organization.id,
    targetType: "organization"
  });

  return organization;
}

export async function createApiKeyForOrganization(input: {
  actorId: string;
  actorRole: MembershipRole;
  name: string;
  organizationId: string;
}) {
  requireRole(input.actorRole, "ADMIN");

  const result = await createOrganizationApiKey({
    createdById: input.actorId,
    name: input.name,
    organizationId: input.organizationId
  });

  await logAuditEvent({
    action: "api_key.created",
    actorId: input.actorId,
    metadata: {
      keyPrefix: result.record.keyPrefix,
      name: result.record.name
    },
    organizationId: input.organizationId,
    targetId: result.record.id,
    targetType: "api_key"
  });

  return result;
}

export async function revokeApiKeyForOrganization(input: {
  actorId: string;
  actorRole: MembershipRole;
  keyId: string;
  organizationId: string;
}) {
  requireRole(input.actorRole, "ADMIN");

  const record = await getPrismaClient().apiKey.updateMany({
    data: {
      revokedAt: new Date()
    },
    where: {
      id: input.keyId,
      organizationId: input.organizationId,
      revokedAt: null
    }
  });

  if (!record.count) {
    return false;
  }

  await logAuditEvent({
    action: "api_key.revoked",
    actorId: input.actorId,
    organizationId: input.organizationId,
    targetId: input.keyId,
    targetType: "api_key"
  });

  return true;
}

export async function listProjectsForOrganization(organizationId: string) {
  return getPrismaClient().project.findMany({
    orderBy: {
      updatedAt: "desc"
    },
    where: {
      organizationId
    }
  });
}

export async function getProjectById(projectId: string) {
  return getPrismaClient().project.findUnique({
    where: {
      id: projectId
    }
  });
}

export async function listOrganizationMembers(organizationId: string) {
  return getPrismaClient().membership.findMany({
    include: {
      user: true
    },
    orderBy: {
      joinedAt: "asc"
    },
    where: {
      organizationId
    }
  });
}

export async function listOrganizationInvites(organizationId: string) {
  return getPrismaClient().inviteToken.findMany({
    orderBy: {
      createdAt: "desc"
    },
    where: {
      organizationId,
      usedAt: null
    }
  });
}

export async function listAuditLogs(organizationId: string) {
  return getPrismaClient().auditLog.findMany({
    include: {
      actor: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    where: {
      organizationId
    }
  });
}

export async function listApiKeys(organizationId: string) {
  return getPrismaClient().apiKey.findMany({
    orderBy: {
      createdAt: "desc"
    },
    where: {
      organizationId
    }
  });
}
