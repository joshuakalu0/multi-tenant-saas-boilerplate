import crypto from "node:crypto";

import type { Organization, Plan, SubscriptionStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { logAuditEvent } from "@/lib/audit";
import { sendBillingWarningEmail } from "@/lib/email/resend";

type StripeCheckoutSessionResponse = {
  id: string;
  url: string | null;
};

function isStripeEnabled() {
  return Boolean(getServerEnv().STRIPE_SECRET_KEY);
}

function getStripePriceIdForPlan(plan: Plan) {
  const env = getServerEnv();

  if (plan === "PRO") {
    return env.STRIPE_PRICE_PRO;
  }

  if (plan === "ENTERPRISE") {
    return env.STRIPE_PRICE_ENTERPRISE;
  }

  return undefined;
}

async function stripeRequest<T>(pathname: string, params?: URLSearchParams) {
  const { STRIPE_SECRET_KEY } = getServerEnv();

  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }

  const requestInit: RequestInit = {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: params ? "POST" : "GET"
  };

  if (params) {
    requestInit.body = params;
  }

  const response = await fetch(`https://api.stripe.com/v1${pathname}`, requestInit);

  const payload = (await response.json()) as T & {
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Stripe request failed.");
  }

  return payload as T;
}

export async function createStripeCustomerForOrganization(organization: Organization) {
  if (!isStripeEnabled() || organization.stripeCustomerId) {
    return organization.stripeCustomerId ?? null;
  }

  const payload = await stripeRequest<{ id: string }>(
    "/customers",
    new URLSearchParams({
      description: `Customer for ${organization.name}`,
      name: organization.name
    })
  );

  await getPrismaClient().organization.update({
    data: {
      stripeCustomerId: payload.id
    },
    where: {
      id: organization.id
    }
  });

  return payload.id;
}

export async function createCheckoutSession(input: {
  cancelUrl: string;
  organization: Organization;
  organizationSlug: string;
  plan: Exclude<Plan, "FREE">;
  successUrl: string;
}) {
  const priceId = getStripePriceIdForPlan(input.plan);

  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${input.plan}.`);
  }

  const customerId = await createStripeCustomerForOrganization(input.organization);
  const params = new URLSearchParams({
    cancel_url: input.cancelUrl,
    mode: "subscription",
    success_url: input.successUrl
  });

  if (customerId) {
    params.append("customer", customerId);
  }

  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[organizationId]", input.organization.id);
  params.append("metadata[organizationSlug]", input.organizationSlug);
  params.append("metadata[targetPlan]", input.plan);

  return stripeRequest<StripeCheckoutSessionResponse>("/checkout/sessions", params);
}

export async function createCustomerPortalSession(input: {
  organization: Organization;
  returnUrl: string;
}) {
  if (!input.organization.stripeCustomerId) {
    throw new Error("This organization does not have a Stripe customer yet.");
  }

  return stripeRequest<{ url: string }>(
    "/billing/portal/sessions",
    new URLSearchParams({
      customer: input.organization.stripeCustomerId,
      return_url: input.returnUrl
    })
  );
}

function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();

  if (!STRIPE_WEBHOOK_SECRET || !signatureHeader) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((item) => {
      const [key, value] = item.split("=");
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(signedPayload).digest("hex");

  return secureCompare(expectedSignature, signature);
}

export async function handleStripeWebhookEvent(input: {
  payload: Record<string, unknown>;
}) {
  const prisma = getPrismaClient();
  const eventType = String(input.payload.type ?? "");
  const dataObject = (input.payload.data as { object?: Record<string, unknown> } | undefined)?.object ?? {};
  const metadata = (dataObject.metadata as Record<string, string> | undefined) ?? {};
  const organizationId = metadata.organizationId;

  if (!organizationId) {
    return;
  }

  if (eventType === "checkout.session.completed") {
    const targetPlan = (metadata.targetPlan as Plan | undefined) ?? "PRO";
    const subscriptionId = String(dataObject.subscription ?? "");

    await prisma.organization.update({
      data: {
        plan: targetPlan,
        stripeSubscriptionId: subscriptionId || null,
        subscriptionStatus: "ACTIVE"
      },
      where: {
        id: organizationId
      }
    });

    await logAuditEvent({
      action: "billing.checkout_completed",
      metadata: {
        plan: targetPlan,
        stripeSubscriptionId: subscriptionId
      },
      organizationId,
      targetId: organizationId,
      targetType: "organization"
    });

    return;
  }

  if (eventType === "invoice.payment_failed") {
    await setOrganizationSubscriptionStatus(organizationId, "PAST_DUE", "billing.payment_failed");
    const recipients = await prisma.membership.findMany({
      include: {
        user: true
      },
      where: {
        organizationId,
        role: {
          in: ["OWNER", "ADMIN"]
        }
      }
    });

    await Promise.all(
      recipients
        .map((membership) => membership.user.email)
        .filter(Boolean)
        .map((email) =>
          sendBillingWarningEmail({
            email,
            organizationName: String(metadata.organizationSlug ?? "your workspace")
          })
        )
    );
    return;
  }

  if (eventType === "customer.subscription.deleted") {
    await prisma.organization.update({
      data: {
        plan: "FREE",
        stripeSubscriptionId: null,
        subscriptionStatus: "CANCELED"
      },
      where: {
        id: organizationId
      }
    });

    await logAuditEvent({
      action: "billing.subscription_deleted",
      organizationId,
      targetId: organizationId,
      targetType: "organization"
    });
  }
}

async function setOrganizationSubscriptionStatus(
  organizationId: string,
  subscriptionStatus: SubscriptionStatus,
  action: string
) {
  await getPrismaClient().organization.update({
    data: {
      subscriptionStatus
    },
    where: {
      id: organizationId
    }
  });

  await logAuditEvent({
    action,
    metadata: {
      subscriptionStatus
    },
    organizationId,
    targetId: organizationId,
    targetType: "organization"
  });
}
