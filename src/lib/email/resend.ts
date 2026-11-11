import { getServerEnv } from "@/lib/env";

async function sendEmail(input: {
  html: string;
  subject: string;
  to: string;
}) {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      html: input.html,
      subject: input.subject,
      to: [input.to]
    }),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export async function sendInviteEmail(input: {
  acceptUrl: string;
  email: string;
  organizationName: string;
}) {
  await sendEmail({
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2>You were invited to join ${input.organizationName}</h2>
        <p>Open the link below to accept your workspace invitation.</p>
        <p><a href="${input.acceptUrl}">${input.acceptUrl}</a></p>
      </div>
    `,
    subject: `Join ${input.organizationName} on Booster`,
    to: input.email
  });
}

export async function sendBillingWarningEmail(input: {
  email: string;
  organizationName: string;
}) {
  await sendEmail({
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2>Payment issue for ${input.organizationName}</h2>
        <p>Your latest subscription invoice could not be processed. Open your billing settings to update payment details.</p>
      </div>
    `,
    subject: `${input.organizationName} billing needs attention`,
    to: input.email
  });
}
