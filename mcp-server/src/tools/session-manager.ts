/**
 * Session Manager Tool — ported from claw-code session_store.py + transcript.py
 *
 * Provides save/load/list for agent sessions. Each session is stored as a
 * JSON file under a configurable directory, enabling cross-session memory.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SessionData } from "../utils/types.js";

const SESSION_DIR = join(homedir(), ".openclaw", "boost-sessions");

function ensureDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function sessionPath(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return join(SESSION_DIR, `${safe}.json`);
}

export function saveSession(
  sessionId: string,
  messages: string[],
  inputTokens: number,
  outputTokens: number,
  metadata?: Record<string, unknown>
): { path: string; session: SessionData } {
  ensureDir();
  const filePath = sessionPath(sessionId);
  const now = new Date().toISOString();

  let existing: SessionData | null = null;
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      // corrupted file, overwrite
    }
  }

  const session: SessionData = {
    sessionId,
    messages,
    inputTokens,
    outputTokens,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    metadata: { ...(existing?.metadata ?? {}), ...(metadata ?? {}) },
  };

  writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  return { path: filePath, session };
}

export function loadSession(sessionId: string): SessionData | null {
  const filePath = sessionPath(sessionId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function listSessions(): {
  sessions: Array<{ id: string; updatedAt: string; messageCount: number; tokens: number }>;
  directory: string;
} {
  ensureDir();
  const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith(".json"));
  const summaries = files.map((f) => {
    try {
      const data: SessionData = JSON.parse(
        readFileSync(join(SESSION_DIR, f), "utf-8")
      );
      return {
        id: data.sessionId,
        updatedAt: data.updatedAt,
        messageCount: data.messages.length,
        tokens: data.inputTokens + data.outputTokens,
      };
    } catch {
      return {
        id: f.replace(".json", ""),
        updatedAt: "unknown",
        messageCount: 0,
        tokens: 0,
      };
    }
  });
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { sessions: summaries, directory: SESSION_DIR };
}

export function deleteSession(sessionId: string): boolean {
  const filePath = sessionPath(sessionId);
  if (!existsSync(filePath)) return false;
  const { unlinkSync } = require("node:fs");
  unlinkSync(filePath);
  return true;
}
