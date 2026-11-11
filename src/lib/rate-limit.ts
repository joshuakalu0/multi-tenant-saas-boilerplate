import { getRedisClient } from "@/lib/redis";
import { getServerEnv } from "@/lib/env";

const inMemoryRateLimit = new Map<string, { count: number; expiresAt: number }>();

function buildRateLimitKey(scope: string, subject: string, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  return `${getServerEnv().REDIS_PREFIX}:ratelimit:${scope}:${bucket}:${subject}`;
}

export function getRequestSubject(request: Request, fallback: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || fallback;
}

export async function consumeRateLimit({
  limit,
  scope,
  subject,
  windowSeconds
}: {
  limit: number;
  scope: string;
  subject: string;
  windowSeconds: number;
}) {
  const redis = getRedisClient();
  const key = buildRateLimitKey(scope, subject, windowSeconds);

  if (redis) {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    return {
      allowed: count <= limit,
      headers: {
        "x-ratelimit-limit": String(limit),
        "x-ratelimit-remaining": String(Math.max(0, limit - count)),
        "x-ratelimit-reset-seconds": String(windowSeconds)
      },
      retryAfterSeconds: windowSeconds
    };
  }

  const entry = inMemoryRateLimit.get(key);
  const now = Date.now();

  if (!entry || entry.expiresAt < now) {
    inMemoryRateLimit.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000
    });

    return {
      allowed: true,
      headers: {
        "x-ratelimit-limit": String(limit),
        "x-ratelimit-remaining": String(limit - 1),
        "x-ratelimit-reset-seconds": String(windowSeconds)
      },
      retryAfterSeconds: windowSeconds
    };
  }

  entry.count += 1;
  inMemoryRateLimit.set(key, entry);

  return {
    allowed: entry.count <= limit,
    headers: {
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": String(Math.max(0, limit - entry.count)),
      "x-ratelimit-reset-seconds": String(windowSeconds)
    },
    retryAfterSeconds: windowSeconds
  };
}
