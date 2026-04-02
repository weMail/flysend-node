import type { FlySendErrorResponse } from './types';

export class FlySendError extends Error {
  public readonly statusCode: number;
  public readonly code: string | undefined;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'FlySendError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static fromResponse(statusCode: number, body: FlySendErrorResponse): FlySendError {
    const message = body.message ?? body.error ?? 'Unknown error';
    const code = body.error;

    if (statusCode === 422 && body.errors) {
      return new ValidationError(message, body.errors);
    }

    if (statusCode === 429 && body.quota) {
      return new QuotaExceededError(message, body.quota);
    }

    return new FlySendError(message, statusCode, code);
  }
}

export class ValidationError extends FlySendError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 422, 'validation_error');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class QuotaExceededError extends FlySendError {
  public readonly quota: {
    limit: number;
    used: number;
    remaining: number;
    resets_at: string;
  };

  constructor(
    message: string,
    quota: { limit: number; used: number; remaining: number; resets_at: string },
  ) {
    super(message, 429, 'quota_exceeded');
    this.name = 'QuotaExceededError';
    this.quota = quota;
  }
}
