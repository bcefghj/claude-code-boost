/**
 * Budget Tracker Tool — ported from claw-code query_engine.py
 *
 * Tracks token usage and turn count per session. Implements the
 * QueryEngineConfig pattern: immutable config + mutable state + explicit
 * stop reasons (max_turns_reached, max_budget_reached, completed).
 */

import {
  DEFAULT_BUDGET_CONFIG,
  type BudgetConfig,
  type BudgetState,
  type UsageSummary,
} from "../utils/types.js";

const sessions = new Map<string, BudgetState>();

function generateSessionId(): string {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBudgetSession(
  config?: Partial<BudgetConfig>,
  sessionId?: string
): BudgetState {
  const id = sessionId ?? generateSessionId();
  const mergedConfig: BudgetConfig = {
    ...DEFAULT_BUDGET_CONFIG,
    ...config,
  };
  const state: BudgetState = {
    sessionId: id,
    turnsUsed: 0,
    usage: { inputTokens: 0, outputTokens: 0 },
    config: mergedConfig,
    status: "ok",
    remainingTokens: mergedConfig.maxBudgetTokens,
    remainingTurns: mergedConfig.maxTurns,
  };
  sessions.set(id, state);
  return state;
}

export function recordTurn(
  sessionId: string,
  inputTokens: number,
  outputTokens: number
): BudgetState {
  let state = sessions.get(sessionId);
  if (!state) {
    state = createBudgetSession(undefined, sessionId);
  }

  const newUsage: UsageSummary = {
    inputTokens: state.usage.inputTokens + inputTokens,
    outputTokens: state.usage.outputTokens + outputTokens,
  };
  const totalTokens = newUsage.inputTokens + newUsage.outputTokens;
  const turnsUsed = state.turnsUsed + 1;
  const remainingTokens = Math.max(0, state.config.maxBudgetTokens - totalTokens);
  const remainingTurns = Math.max(0, state.config.maxTurns - turnsUsed);

  let status: BudgetState["status"] = "ok";
  if (turnsUsed >= state.config.maxTurns) {
    status = "exceeded";
  } else if (totalTokens >= state.config.maxBudgetTokens) {
    status = "exceeded";
  } else if (
    remainingTokens < state.config.maxBudgetTokens * 0.2 ||
    remainingTurns <= 2
  ) {
    status = "warning";
  }

  const updated: BudgetState = {
    ...state,
    turnsUsed,
    usage: newUsage,
    status,
    remainingTokens,
    remainingTurns,
  };
  sessions.set(sessionId, updated);
  return updated;
}

export function getBudgetState(sessionId: string): BudgetState | null {
  return sessions.get(sessionId) ?? null;
}

export function resetBudget(sessionId: string): BudgetState | null {
  const state = sessions.get(sessionId);
  if (!state) return null;
  return createBudgetSession(state.config, sessionId);
}

export function formatBudgetReport(state: BudgetState): string {
  const lines = [
    `=== Budget Report ===`,
    `Session: ${state.sessionId}`,
    `Status:  ${state.status.toUpperCase()}`,
    ``,
    `Turns:   ${state.turnsUsed} / ${state.config.maxTurns} (${state.remainingTurns} remaining)`,
    `Tokens:  ${state.usage.inputTokens + state.usage.outputTokens} / ${state.config.maxBudgetTokens} (${state.remainingTokens} remaining)`,
    `  Input:  ${state.usage.inputTokens}`,
    `  Output: ${state.usage.outputTokens}`,
    ``,
    `Config:`,
    `  Max turns:          ${state.config.maxTurns}`,
    `  Max budget tokens:  ${state.config.maxBudgetTokens}`,
    `  Compact after:      ${state.config.compactAfterTurns} turns`,
  ];

  if (state.status === "warning") {
    lines.push(``, `⚠ Budget is running low. Consider compacting history or finishing soon.`);
  } else if (state.status === "exceeded") {
    lines.push(``, `✗ Budget exceeded. No more turns should be processed.`);
  }

  return lines.join("\n");
}
