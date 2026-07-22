import type { ApiErrorBody } from '@epic-plan/shared';

interface Props {
  error: ApiErrorBody;
  onRetry?: () => void;
  onLogin?: () => void;
}

export function ErrorState({ error, onRetry, onLogin }: Props) {
  const showLogin = error.code === 'UNAUTHORIZED' && onLogin;
  const showRetry = error.code !== 'UNAUTHORIZED' && onRetry;

  return (
    <div className="jeg-state" role="alert">
      <div>{error.message}</div>
      <div className="jeg-state__actions">
        {showLogin ? (
          <button type="button" className="jeg-btn" onClick={onLogin}>
            Войти
          </button>
        ) : null}
        {showRetry ? (
          <button type="button" className="jeg-btn" onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </div>
    </div>
  );
}
