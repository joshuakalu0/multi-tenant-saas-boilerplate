import { AppError, AuthorizationError } from "@/lib/errors";
import { buildCorsHeaders, optionsResponse } from "@/lib/cors";
import { consumeRateLimit, getRequestSubject } from "@/lib/rate-limit";
import { getPrismaClient } from "@/lib/db";
import { updateProjectSchema } from "@/lib/validation/schemas";
import { deleteProjectForOrganization, updateProjectForOrganization } from "@/lib/tenant/service";
import { hasRequiredRole } from "@/lib/permissions";
import { jsonData, jsonError } from "@/lib/http";
import { authenticateRequestActor } from "@/lib/auth/api-request";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

async function getProjectAccess(projectId: string, request: Request) {
  const actor = await authenticateRequestActor(request);

  if (!actor) {
    return null;
  }

  const project = await getPrismaClient().project.findUnique({
    where: {
      id: projectId
    }
  });

  if (!project) {
    return null;
  }

  if (actor.kind === "api-key") {
    return actor.organizationId === project.organizationId
      ? {
          actor,
          membershipRole: null,
          project
        }
      : null;
  }

  const membership = await getPrismaClient().membership.findUnique({
    where: {
      userId_organizationId: {
        organizationId: project.organizationId,
        userId: actor.id
      }
    }
  });

  if (!membership) {
    return null;
  }

  return {
    actor,
    membershipRole: membership.role,
    project
  };
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await getProjectAccess(id, request);

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), { headers });
    }

    return jsonData(access.project, { headers });
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await getProjectAccess(id, request);

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), { headers });
    }

    const rateLimit = await consumeRateLimit({
      limit: 18,
      scope: "api:projects:update",
      subject: getRequestSubject(
        request,
        access.actor.kind === "api-key" ? access.actor.apiKeyId : access.actor.id
      ),
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

    const payload = updateProjectSchema.parse(await request.json());
    const updatedProject = await updateProjectForOrganization({
      actorId: access.actor.kind === "api-key" ? access.actor.createdById : access.actor.id,
      description: payload.description ?? null,
      name: payload.name ?? access.project.name,
      organizationId: access.project.organizationId,
      projectId: access.project.id
    });

    return jsonData(updatedProject, {
      headers: {
        ...headers,
        ...rateLimit.headers
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  const headers = buildCorsHeaders(request);

  try {
    const access = await getProjectAccess(id, request);

    if (!access) {
      return jsonError(new AppError("Authentication required.", "unauthorized", 401), { headers });
    }

    if (access.actor.kind !== "api-key" && (!access.membershipRole || !hasRequiredRole(access.membershipRole, "ADMIN"))) {
      throw new AuthorizationError("Only admins and owners can delete projects.");
    }

    const rateLimit = await consumeRateLimit({
      limit: 6,
      scope: "api:projects:delete",
      subject: getRequestSubject(
        request,
        access.actor.kind === "api-key" ? access.actor.apiKeyId : access.actor.id
      ),
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

    const deletedProject = await deleteProjectForOrganization({
      actorId: access.actor.kind === "api-key" ? access.actor.createdById : access.actor.id,
      organizationId: access.project.organizationId,
      projectId: access.project.id
    });

    return jsonData(deletedProject, {
      headers: {
        ...headers,
        ...rateLimit.headers
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error : "Unexpected error.", { headers });
  }
}
