import crypto from "node:crypto";

import { getPrismaClient } from "@/lib/db";

function hashApiKey(rawKey: string) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function createOrganizationApiKey(input: {
  createdById: string;
  name: string;
  organizationId: string;
}) {
  const rawKey = `pb_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 14);

  const record = await getPrismaClient().apiKey.create({
    data: {
      createdById: input.createdById,
      keyHash: hashApiKey(rawKey),
      keyPrefix,
      name: input.name,
      organizationId: input.organizationId
    }
  });

  return {
    record,
    rawKey
  };
}

export async function authenticateApiKey(rawKey: string) {
  const keyHash = hashApiKey(rawKey);

  return getPrismaClient().apiKey.findFirst({
    include: {
      organization: true
    },
    where: {
      keyHash,
      revokedAt: null
    }
  });
}

export async function touchApiKeyUsage(apiKeyId: string) {
  await getPrismaClient().apiKey.update({
    data: {
      lastUsedAt: new Date()
    },
    where: {
      id: apiKeyId
    }
  });
}
