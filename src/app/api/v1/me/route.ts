import { AppError } from "@/lib/errors";
import { authenticateRequestActor } from "@/lib/auth/api-request";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
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
      return jsonData(
        {
          kind: actor.kind,
          createdById: actor.createdById,
          organizationId: actor.organizationId,
          organizationSlug: actor.organizationSlug
        },
        {
          headers: buildCorsHeaders(request)
        }
      );
    }

    const memberships = await getOrganizationsForUser(actor.id);

    return jsonData(
      {
        email: actor.email,
        id: actor.id,
        kind: actor.kind,
        memberships: memberships.map((membership) => ({
          organizationId: membership.organization.id,
          organizationName: membership.organization.name,
          organizationSlug: membership.organization.slug,
          role: membership.role
        })),
        name: actor.name
      },
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
