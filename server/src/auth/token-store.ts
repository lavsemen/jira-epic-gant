import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

export interface OAuthStateRow {
  state: string;
  created_at: number;
  expires_at: number;
}

export interface SessionRow {
  id: string;
  session_token: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: number;
  cloud_id: string;
  jira_host: string;
  display_name: string | null;
  account_id: string | null;
  created_at: number;
  expires_at: number;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }
  mkdirSync(dirname(config.sqlitePath), { recursive: true });
  db = new Database(config.sqlitePath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      access_expires_at INTEGER NOT NULL,
      cloud_id TEXT NOT NULL,
      jira_host TEXT NOT NULL,
      display_name TEXT,
      account_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
  `);
  return db;
}

export function saveOAuthState(state: string, ttlMs: number): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO oauth_states (state, created_at, expires_at) VALUES (?, ?, ?)`,
    )
    .run(state, now, now + ttlMs);
}

export function consumeOAuthState(state: string): boolean {
  const now = Date.now();
  const row = getDb()
    .prepare(`SELECT * FROM oauth_states WHERE state = ?`)
    .get(state) as OAuthStateRow | undefined;
  getDb().prepare(`DELETE FROM oauth_states WHERE state = ?`).run(state);
  getDb().prepare(`DELETE FROM oauth_states WHERE expires_at < ?`).run(now);
  return !!row && row.expires_at >= now;
}

export function createSession(input: Omit<SessionRow, 'created_at'>): SessionRow {
  const created_at = Date.now();
  const row: SessionRow = { ...input, created_at };
  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, session_token, access_token, refresh_token, access_expires_at,
        cloud_id, jira_host, display_name, account_id, created_at, expires_at
      ) VALUES (
        @id, @session_token, @access_token, @refresh_token, @access_expires_at,
        @cloud_id, @jira_host, @display_name, @account_id, @created_at, @expires_at
      )`,
    )
    .run(row);
  return row;
}

export function getSessionByToken(sessionToken: string): SessionRow | undefined {
  const now = Date.now();
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE session_token = ?`)
    .get(sessionToken) as SessionRow | undefined;
  if (!row) {
    return undefined;
  }
  if (row.expires_at < now) {
    deleteSession(sessionToken);
    return undefined;
  }
  return row;
}

export function updateSessionTokens(
  sessionId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    access_expires_at: number;
  },
): void {
  getDb()
    .prepare(
      `UPDATE sessions
       SET access_token = ?, refresh_token = ?, access_expires_at = ?
       WHERE id = ?`,
    )
    .run(tokens.access_token, tokens.refresh_token, tokens.access_expires_at, sessionId);
}

export function deleteSession(sessionToken: string): void {
  getDb().prepare(`DELETE FROM sessions WHERE session_token = ?`).run(sessionToken);
}

export function cleanupExpired(): void {
  const now = Date.now();
  getDb().prepare(`DELETE FROM oauth_states WHERE expires_at < ?`).run(now);
  getDb().prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);
}
