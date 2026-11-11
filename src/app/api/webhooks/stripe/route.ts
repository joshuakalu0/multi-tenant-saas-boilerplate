import { handleStripeWebhookEvent, verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { jsonDetail, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payloadText = await request.text();
  const isValid = verifyStripeWebhookSignature(payloadText, request.headers.get("stripe-signature"));

  if (!isValid) {
    return jsonError("Invalid Stripe webhook signature.", { status: 400 });
  }

  await handleStripeWebhookEvent({
    payload: JSON.parse(payloadText) as Record<string, unknown>
  });

  return jsonDetail("Webhook processed.", { status: 200 });
}
