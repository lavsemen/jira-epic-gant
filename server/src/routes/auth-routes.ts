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

    if (!config.extensionId) {
      res
        .status(200)
        .type('html')
        .send(`<!doctype html>
<html lang="ru"><body style="font-family:system-ui;padding:2rem">
  <h1>Авторизация успешна</h1>
  <p>Скопируйте session token в расширение (EXTENSION_ID не задан, automatic redirect недоступен):</p>
  <code style="word-break:break-all">${sessionToken}</code>
</body></html>`);
      return;
    }

    const redirectUrl = new URL(`chrome-extension://${config.extensionId}/auth-callback.html`);
    redirectUrl.searchParams.set('token', sessionToken);
    res.redirect(redirectUrl.toString());
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
