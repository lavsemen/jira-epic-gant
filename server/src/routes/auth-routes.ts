import { Router } from 'express';
import { config } from '../config.js';
import { createAuthorizeUrl } from '../auth/atlassian-oauth.js';
import {
  completeOAuthLogin,
  getSessionInfo,
  logout,
} from '../auth/session-service.js';
import { extractBearerToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../jira/jira-errors.js';
import { cleanupExpired } from '../auth/token-store.js';

/**
 * OAuth callback page is served from the backend origin. Because the extension
 * declares `externally_connectable` for this origin, the page can pass the
 * session token straight into the extension via chrome.runtime.sendMessage.
 * (Server-side 302 redirects to chrome-extension:// are blocked by Chrome.)
 */
function renderCallbackPage(sessionToken: string, extensionId: string): string {
  const token = JSON.stringify(sessionToken);
  const extId = JSON.stringify(extensionId);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Авторизация — Jira Epic Gantt</title>
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f4f5f7; color: #172b4d; }
    .card { background: #fff; padding: 24px 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.12); max-width: 480px; text-align: center; }
    code { display: block; word-break: break-all; margin-top: 12px; padding: 8px; background: #f4f5f7; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="title">Завершаем вход…</h1>
    <p id="status">Передаём сессию в расширение…</p>
  </div>
  <script>
    (function () {
      var EXTENSION_ID = ${extId};
      var TOKEN = ${token};
      var title = document.getElementById('title');
      var status = document.getElementById('status');

      function showManual(prefix) {
        title.textContent = 'Скопируйте токен вручную';
        status.innerHTML = (prefix ? prefix + '<br>' : '') +
          'Откройте настройки расширения и вставьте токен:' +
          '<code>' + TOKEN + '</code>';
      }

      if (!EXTENSION_ID || !window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        showManual('Автоматическая передача недоступна.');
        return;
      }

      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'SAVE_SESSION_TOKEN', payload: { sessionToken: TOKEN } },
          function (response) {
            if (chrome.runtime.lastError) {
              showManual('Не удалось связаться с расширением (' + chrome.runtime.lastError.message + ').');
              return;
            }
            if (response && response.ok) {
              title.textContent = 'Вход выполнен';
              status.textContent = 'Можно закрыть эту вкладку и вернуться в Jira.';
              setTimeout(function () { window.close(); }, 1200);
            } else {
              showManual('Расширение не сохранило сессию.');
            }
          }
        );
      } catch (e) {
        showManual('Ошибка: ' + String(e));
      }
    })();
  </script>
</body>
</html>`;
}

export const authRouter = Router();

authRouter.get('/atlassian/start', (_req, res) => {
  if (!config.atlassianClientId || !config.atlassianClientSecret) {
    throw new AppError(
      'SERVER',
      'OAuth не настроен: задайте ATLASSIAN_CLIENT_ID и ATLASSIAN_CLIENT_SECRET.',
      500,
    );
  }
  cleanupExpired();
  const { url } = createAuthorizeUrl();
  res.redirect(url);
});

authRouter.get('/atlassian/callback', async (req, res, next) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    if (oauthError) {
      res.status(400).send(`OAuth error: ${oauthError}`);
      return;
    }
    if (!code || !state) {
      throw new AppError('BAD_REQUEST', 'Отсутствует code или state', 400);
    }

    const { sessionToken } = await completeOAuthLogin({ code, state });

    res.status(200).type('html').send(renderCallbackPage(sessionToken, config.extensionId));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req, res) => {
  const token = extractBearerToken(req);
  if (token) {
    logout(token);
  }
  res.json({ ok: true });
});

authRouter.get('/session', requireAuth, (req: AuthedRequest, res) => {
  const token = extractBearerToken(req)!;
  res.json(getSessionInfo(token));
});
