import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/db";

export async function logAuditEvent(input: {
  action: string;
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue;
  organizationId: string;
  targetId?: string | null;
  targetType: string;
}) {
  await getPrismaClient().auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
      organizationId: input.organizationId,
      targetId: input.targetId ?? null,
      targetType: input.targetType
    }
  });
}
