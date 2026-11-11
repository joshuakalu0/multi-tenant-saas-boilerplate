import { z } from "zod";

const serverEnvSchema = z.object({
  API_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  APP_ROOT_DOMAIN: z.string().default("lvh.me:3000"),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_MARKETING_URL: z.string().url().default("http://localhost:3000"),
  REDIS_PREFIX: z.string().default("booster:saas-next"),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("Booster SaaS <noreply@example.com>"),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional()
});

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = serverEnvSchema.parse({
    ...process.env,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_MARKETING_URL: process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000",
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "Booster SaaS <noreply@example.com>"
  });

  return cachedServerEnv;
}

export function getPublicEnv() {
  const env = getServerEnv();

  return {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MARKETING_URL: env.NEXT_PUBLIC_MARKETING_URL
  };
}

export function resetServerEnvCache() {
  cachedServerEnv = null;
}
