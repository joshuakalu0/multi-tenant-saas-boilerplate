import { AppError } from "@/lib/errors";
import { authenticateRequestActor } from "@/lib/auth/api-request";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
import { getPrismaClient } from "@/lib/db";
import { getOrganizationsForUser } from "@/lib/tenant/service";
import { jsonData, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = await authenticateRequestActor(request);

    if (!actor) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), {
        headers: buildCorsHeaders(request)
      });
    }

    if (actor.kind === "api-key") {
      const organization = await getPrismaClient().organization.findUnique({
        where: {
          id: actor.organizationId
        }
      });

      return jsonData(
        organization
          ? [
              {
                id: organization.id,
                name: organization.name,
                plan: organization.plan,
                slug: organization.slug,
                subscriptionStatus: organization.subscriptionStatus
              }
            ]
          : [],
        {
          headers: buildCorsHeaders(request)
        }
      );
    }

    const memberships = await getOrganizationsForUser(actor.id);

    return jsonData(
      memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        plan: membership.organization.plan,
        role: membership.role,
        slug: membership.organization.slug,
        subscriptionStatus: membership.organization.subscriptionStatus
      })),
      {
        headers: buildCorsHeaders(request)
      }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", {
      headers: buildCorsHeaders(request)
    });
  }
}
