import { useEffect, useState } from 'react';
import type { SessionInfo } from '@jira-epic-gantt/shared';

export function OptionsApp() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const auth = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      if (auth?.ok) {
        setSession(auth.data);
      }
      setLoading(false);
    })();
  }, []);

  async function login(): Promise<void> {
    await chrome.runtime.sendMessage({ type: 'START_AUTH' });
  }

  async function logout(): Promise<void> {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    setSession({ authenticated: false });
    setStatus('Вы вышли из аккаунта.');
  }

  return (
    <div className="options">
      <h1>Jira Epic Gantt — настройки</h1>
      <p>Диаграмма строится так:</p>
      <ul>
        <li>
          <strong>Начало</strong> — дата перевода задачи в статус In Progress («В работе»)
        </li>
        <li>
          <strong>Окончание</strong> — начало + Original Estimate (8 часов = 1 рабочий день)
        </li>
      </ul>

      {loading ? <p className="status">Загрузка…</p> : null}

      {!session?.authenticated ? (
        <div>
          <p>Для просмотра диаграммы войдите через Atlassian.</p>
          <button type="button" onClick={() => void login()}>
            Войти
          </button>
        </div>
      ) : (
        <div>
          <p className="status">
            Сессия активна
            {session.jiraHost ? ` · ${session.jiraHost}` : ''}
            {session.displayName ? ` · ${session.displayName}` : ''}
          </p>
          <button type="button" className="secondary" onClick={() => void logout()}>
            Выйти
          </button>
        </div>
      )}

      {status ? <p className="status">{status}</p> : null}
    </div>
  );
}
