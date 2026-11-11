export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "app_error", status = 400) {
    super(message);
    this.code = code;
    this.name = "AppError";
    this.status = status;
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "forbidden", 403);
    this.name = "AuthorizationError";
  }
}

export class PlanLimitError extends AppError {
  constructor(message = "Your current plan does not allow this action.") {
    super(message, "plan_limit_reached", 402);
    this.name = "PlanLimitError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource could not be found.") {
    super(message, "not_found", 404);
    this.name = "NotFoundError";
  }
}
