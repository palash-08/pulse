export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super("VALIDATION_ERROR", message, 422, details);
  }
}

export class UrlNotAllowedError extends AppError {
  constructor(message: string = "URL is blocked by security policy") {
    super("URL_NOT_ALLOWED", message, 422);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string = "Authentication required") {
    super("UNAUTHENTICATED", message, 401);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = "Invalid email or password") {
    super("INVALID_CREDENTIALS", message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class EmailTakenError extends AppError {
  constructor(message: string = "Email already registered") {
    super("EMAIL_TAKEN", message, 409);
  }
}

export class DuplicateUrlError extends AppError {
  constructor(message: string = "You already monitor this URL") {
    super("DUPLICATE_URL", message, 409);
  }
}

export class GuestLimitReachedError extends AppError {
  constructor(message: string = "Guest accounts can monitor at most 2 sites. Please register to add more.") {
    super("GUEST_LIMIT_REACHED", message, 403);
  }
}

export class RateLimitedError extends AppError {
  constructor(message: string = "Too many requests. Please slow down.") {
    super("RATE_LIMITED", message, 429);
  }
}
