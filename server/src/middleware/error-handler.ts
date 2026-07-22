import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody, ApiErrorCode } from '@epic-plan/shared';
import { AppError } from '../jira/jira-errors.js';

function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'RATE_LIMITED':
      return 429;
    case 'FIELDS_NOT_CONFIGURED':
    case 'INVALID_EPIC_KEY':
    case 'BAD_REQUEST':
      return 400;
    case 'NETWORK':
    case 'SERVER':
    default:
      return 500;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      code: err.code,
      message: err.message,
    };
    if (err.retryAfterSeconds !== undefined) {
      body.retryAfterSeconds = err.retryAfterSeconds;
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
    res.status(err.status).json(body);
    return;
  }

  const code = (err as { code?: ApiErrorCode })?.code;
  const message = err instanceof Error ? err.message : 'Неизвестная ошибка';

  if (code) {
    const body: ApiErrorBody = { code, message };
    res.status(statusForCode(code)).json(body);
    return;
  }

  console.error('[server] unexpected error', message);
  const body: ApiErrorBody = {
    code: 'SERVER',
    message: 'Не удалось загрузить диаграмму.',
  };
  res.status(500).json(body);
}
