import type { MembershipRole, Organization, Plan } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/db";

export type TenantContext = {
  membershipRole: MembershipRole;
  organization: Organization;
  projectsCount: number;
  plan: Plan;
  userId: string;
  usersCount: number;
};

export async function getTenantContext(slug: string): Promise<TenantContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/w/${slug}`)}`);
  }

  return getTenantContextForUser(session.user.id, slug);
}

export async function getTenantContextForUser(userId: string, slug: string): Promise<TenantContext> {
  const organization = await getPrismaClient().organization.findUnique({
    where: {
      slug
    }
  });

  if (!organization) {
    redirect("/");
  }

  const membership = await getPrismaClient().membership.findUnique({
    where: {
      userId_organizationId: {
        organizationId: organization.id,
        userId
      }
    }
  });

  if (!membership) {
    redirect("/");
  }

  const [projectsCount, usersCount] = await Promise.all([
    getPrismaClient().project.count({
      where: {
        organizationId: organization.id
      }
    }),
    getPrismaClient().membership.count({
      where: {
        organizationId: organization.id
      }
    })
  ]);

  return {
    membershipRole: membership.role,
    organization,
    plan: organization.plan,
    projectsCount,
    userId,
    usersCount
  };
}
