import type { NextFunction, Request, Response } from 'express';
import { requireSession } from '../auth/session-service.js';
import type { SessionRow } from '../auth/token-store.js';

export interface AuthedRequest extends Request {
  sessionRow?: SessionRow;
}

export function extractBearerToken(req: Request): string | undefined {
  const header = req.header('authorization');
  if (!header) {
    return undefined;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    req.sessionRow = requireSession(token);
    next();
  } catch (error) {
    next(error);
  }
}
