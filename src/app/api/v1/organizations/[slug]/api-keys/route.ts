import { AppError, AuthorizationError } from "@/lib/errors";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
import { consumeRateLimit, getRequestSubject } from "@/lib/rate-limit";
import { createApiKeyForOrganization, listApiKeys } from "@/lib/tenant/service";
import { createApiKeySchema } from "@/lib/validation/schemas";
import { jsonData, jsonError } from "@/lib/http";
import { hasRequiredRole } from "@/lib/permissions";
import { requireOrganizationActor } from "@/lib/auth/api-request";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await requireOrganizationActor(request, slug);

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), { headers });
    }

    if (access.actor.kind === "api-key" || !access.membershipRole || !hasRequiredRole(access.membershipRole, "ADMIN")) {
      throw new AuthorizationError("Only owners and admins can view API keys.");
    }

    const records = await listApiKeys(access.organizationId);

    return jsonData(
      records.map((record) => ({
        createdAt: record.createdAt,
        id: record.id,
        keyPrefix: record.keyPrefix,
        lastUsedAt: record.lastUsedAt,
        name: record.name,
        revokedAt: record.revokedAt
      })),
      { headers }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await requireOrganizationActor(request, slug);

    if (!access || access.actor.kind === "api-key" || !access.membershipRole) {
      throw new AuthorizationError("Only owners and admins can create API keys.");
    }

    if (!hasRequiredRole(access.membershipRole, "ADMIN")) {
      throw new AuthorizationError("Only owners and admins can create API keys.");
    }

    const rateLimit = await consumeRateLimit({
      limit: 6,
      scope: "api:keys:create",
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

    const payload = createApiKeySchema.parse(await request.json());
    const result = await createApiKeyForOrganization({
      actorId: access.actor.id,
      actorRole: access.membershipRole,
      name: payload.name,
      organizationId: access.organizationId
    });

    return jsonData(
      {
        id: result.record.id,
        keyPrefix: result.record.keyPrefix,
        name: result.record.name,
        rawKey: result.rawKey
      },
      {
        headers: {
          ...headers,
          ...rateLimit.headers
        },
        status: 201
      }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}
