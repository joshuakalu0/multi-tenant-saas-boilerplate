import Redis from "ioredis";

import { getServerEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __boosterSaasNextRedis__: Redis | null | undefined;
}

export function getRedisClient() {
  if (globalThis.__boosterSaasNextRedis__ !== undefined) {
    return globalThis.__boosterSaasNextRedis__;
  }

  const { REDIS_URL } = getServerEnv();
  globalThis.__boosterSaasNextRedis__ = REDIS_URL ? new Redis(REDIS_URL) : null;
  return globalThis.__boosterSaasNextRedis__;
}
