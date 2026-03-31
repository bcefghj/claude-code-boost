/**
 * Core type definitions — ported from claw-code's models.py and permissions.py
 */

export interface ToolEntry {
  name: string;
  responsibility: string;
  sourceHint: string;
  status: string;
}

export interface RoutedMatch {
  kind: "command" | "tool";
  name: string;
  sourceHint: string;
  score: number;
}

export interface PermissionDenial {
  toolName: string;
  reason: string;
}

export interface UsageSummary {
  inputTokens: number;
  outputTokens: number;
}

export interface BudgetConfig {
  maxTurns: number;
  maxBudgetTokens: number;
  compactAfterTurns: number;
}

export interface BudgetState {
  sessionId: string;
  turnsUsed: number;
  usage: UsageSummary;
  config: BudgetConfig;
  status: "ok" | "warning" | "exceeded";
  remainingTokens: number;
  remainingTurns: number;
}

export interface SessionData {
  sessionId: string;
  messages: string[];
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface AuditResult {
  totalFiles: number;
  coveredFiles: number;
  coveragePercent: number;
  uncoveredFiles: string[];
  summary: string;
}

export interface PermissionContext {
  denyNames: Set<string>;
  denyPrefixes: string[];
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  maxTurns: 8,
  maxBudgetTokens: 2000,
  compactAfterTurns: 12,
};

export const DANGEROUS_TOOL_PREFIXES = [
  "bash",
  "shell",
  "exec",
  "rm",
  "delete",
  "drop",
  "sudo",
  "kill",
];

export const DANGEROUS_TOOL_NAMES = new Set([
  "bashtool",
  "shelltool",
  "executetool",
  "filedeltool",
  "serverrestarttool",
]);
