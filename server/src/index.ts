import express from 'express';
import cors from 'cors';
import { config, getCorsOrigins } from './config.js';
import { authRouter } from './routes/auth-routes.js';
import { jiraRouter } from './routes/jira-routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { extractBearerToken } from './middleware/auth.js';
import { getSessionInfo } from './auth/session-service.js';
import { cleanupExpired, getDb } from './auth/token-store.js';

getDb();
cleanupExpired();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use(
  cors({
    origin(origin, callback) {
      // Service worker / server-to-server often omit Origin
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = getCorsOrigins();
      const extensionAllowed =
        Boolean(config.extensionId) && origin === `chrome-extension://${config.extensionId}`;
      // During local MVP before EXTENSION_ID is known, allow any chrome-extension origin.
      const extensionDevFallback =
        !config.extensionId && origin.startsWith('chrome-extension://');
      if (allowed.includes(origin) || extensionAllowed || extensionDevFallback) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.get('/api/session', (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.json({ authenticated: false });
    return;
  }
  res.json(getSessionInfo(token));
});
app.use('/api/jira', jiraRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] listening on ${config.backendPublicUrl} (port ${config.port})`);
  if (!config.atlassianClientId) {
    console.warn('[server] ATLASSIAN_CLIENT_ID is empty — OAuth will fail until configured');
  }
});
