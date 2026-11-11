import crypto from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/lib/env";
import { verifyStripeWebhookSignature } from "@/lib/billing/stripe";

describe("stripe webhook verification", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    resetServerEnvCache();
  });

  it("accepts valid signatures", () => {
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const timestamp = "1746681000";
    const signature = crypto
      .createHmac("sha256", "whsec_test")
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(verifyStripeWebhookSignature("{}", "t=1746681000,v1=bad")).toBe(false);
  });
});
