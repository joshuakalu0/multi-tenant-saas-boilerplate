import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";

function resolveAllowedOrigin(origin: string | null) {
  const allowedOrigins = getServerEnv().API_ALLOWED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin) {
    return allowedOrigins[0] ?? "*";
  }

  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "*";
}

export function buildCorsHeaders(request: Request) {
  return {
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-origin": resolveAllowedOrigin(request.headers.get("origin")),
    vary: "origin"
  };
}

export function optionsResponse(request: Request) {
  return new NextResponse(null, {
    headers: buildCorsHeaders(request),
    status: 204
  });
}
