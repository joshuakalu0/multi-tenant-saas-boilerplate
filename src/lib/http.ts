import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";

export function jsonData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      data,
      detail: null,
      error: null
    },
    init
  );
}

export function jsonDetail(detail: string, init?: ResponseInit) {
  return NextResponse.json(
    {
      data: null,
      detail,
      error: null
    },
    init
  );
}

export function jsonError(error: AppError | Error | string, init?: ResponseInit) {
  const appError =
    typeof error === "string"
      ? new AppError(error)
      : error instanceof AppError
        ? error
        : new AppError(error.message || "An unexpected error occurred.", "internal_error", 500);

  return NextResponse.json(
    {
      data: null,
      detail: null,
      error: {
        code: appError.code,
        message: appError.message
      }
    },
    {
      status: appError.status,
      ...init
    }
  );
}
