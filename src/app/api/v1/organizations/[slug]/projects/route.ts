import { AppError, AuthorizationError } from "@/lib/errors";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
import { createProjectSchema } from "@/lib/validation/schemas";
import { consumeRateLimit, getRequestSubject } from "@/lib/rate-limit";
import { createProjectForOrganization, listProjectsForOrganization } from "@/lib/tenant/service";
import { getPrismaClient } from "@/lib/db";
import { jsonData, jsonError } from "@/lib/http";
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

  try {
    const access = await requireOrganizationActor(request, slug);

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), {
        headers: buildCorsHeaders(request)
      });
    }

    const projects = await listProjectsForOrganization(access.organizationId);

    return jsonData(projects, {
      headers: buildCorsHeaders(request)
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", {
      headers: buildCorsHeaders(request)
    });
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

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), { headers });
    }

    const rateLimit = await consumeRateLimit({
      limit: 12,
      scope: "api:projects:create",
      subject: getRequestSubject(request, access.actor.kind === "api-key" ? access.actor.apiKeyId : access.actor.id),
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

    const organization = await getPrismaClient().organization.findUnique({
      where: {
        id: access.organizationId
      }
    });

    if (!organization) {
      return jsonError(new AppError("Organization not found.", "not_found", 404), { headers });
    }

    const projectsCount = await getPrismaClient().project.count({
      where: {
        organizationId: access.organizationId
      }
    });

    const payload = createProjectSchema.parse(await request.json());
    const project = await createProjectForOrganization({
      actorId: access.actor.kind === "api-key" ? access.actor.createdById : access.actor.id,
      description: payload.description ?? null,
      name: payload.name,
      organizationId: access.organizationId,
      plan: organization.plan,
      projectsCount
    });

    return jsonData(project, {
      headers: {
        ...headers,
        ...rateLimit.headers
      },
      status: 201
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonError(error, { headers });
    }

    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}
