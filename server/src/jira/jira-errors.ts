import type { ApiErrorCode } from '@epic-plan/shared';

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function mapHttpStatusToAppError(
  status: number,
  bodyText: string,
  retryAfterHeader: string | null,
): AppError {
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  switch (status) {
    case 401:
      return new AppError('UNAUTHORIZED', 'Сессия Jira истекла. Войдите снова.', 401);
    case 403:
      return new AppError('FORBIDDEN', 'У вас нет доступа к задачам этого эпика.', 403);
    case 404:
      return new AppError('NOT_FOUND', 'Эпик не найден или был удалён.', 404);
    case 429:
      return new AppError(
        'RATE_LIMITED',
        'Jira временно ограничила количество запросов. Повторите попытку позже.',
        429,
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      );
    default:
      if (status >= 500) {
        return new AppError('SERVER', 'Не удалось загрузить диаграмму.', 502);
      }
      return new AppError(
        'SERVER',
        `Ошибка Jira API (${status}): ${bodyText.slice(0, 120)}`,
        status,
      );
  }
}
