import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __boosterSaasNextPrisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!globalThis.__boosterSaasNextPrisma__) {
    globalThis.__boosterSaasNextPrisma__ = new PrismaClient();
  }

  return globalThis.__boosterSaasNextPrisma__;
}
