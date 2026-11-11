import { AppError, AuthorizationError } from "@/lib/errors";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
import { consumeRateLimit, getRequestSubject } from "@/lib/rate-limit";
import { hasRequiredRole } from "@/lib/permissions";
import { revokeApiKeyForOrganization } from "@/lib/tenant/service";
import { jsonData, jsonError } from "@/lib/http";
import { requireOrganizationActor } from "@/lib/auth/api-request";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ keyId: string; slug: string }>;
  }
) {
  const { keyId, slug } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await requireOrganizationActor(request, slug);

    if (!access || access.actor.kind === "api-key" || !access.membershipRole) {
      throw new AuthorizationError("Only owners and admins can revoke API keys.");
    }

    if (!hasRequiredRole(access.membershipRole, "ADMIN")) {
      throw new AuthorizationError("Only owners and admins can revoke API keys.");
    }

    const rateLimit = await consumeRateLimit({
      limit: 6,
      scope: "api:keys:delete",
      subject: getRequestSubject(request, access.actor.id),
      windowSeconds: 60
    });

    if (!rateLimit.allowed) {
      return jsonError(new AppError("Rate limit exceeded.", "rate_limited", 429), {
        headers: {
          ...headers,
          ...rateLimit.headers
        }
      });
    }

    const revoked = await revokeApiKeyForOrganization({
      actorId: access.actor.id,
      actorRole: access.membershipRole,
      keyId,
      organizationId: access.organizationId
    });

    return jsonData(
      {
        revoked
      },
      {
        headers: {
          ...headers,
          ...rateLimit.headers
        }
      }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}
