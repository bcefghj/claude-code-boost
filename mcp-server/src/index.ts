#!/usr/bin/env node

/**
 * Claude Code Boost MCP Server
 *
 * Brings Claude Code's architectural intelligence to OpenClaw and other
 * MCP-compatible AI agents. Implements 6 tools ported from Claude Code's
 * core design patterns.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { smartRoute, registerCustomEntries } from "./tools/smart-route.js";
import {
  checkPermission,
  checkMultiplePermissions,
  updatePermissionContext,
} from "./tools/permission-check.js";
import {
  createBudgetSession,
  recordTurn,
  getBudgetState,
  resetBudget,
  formatBudgetReport,
} from "./tools/budget-tracker.js";
import {
  saveSession,
  loadSession,
  listSessions,
} from "./tools/session-manager.js";
import { runParityAudit } from "./tools/parity-audit.js";

const server = new McpServer({
  name: "claude-code-boost",
  version: "1.0.0",
});

// ── Tool 1: smart_route ─────────────────────────────────────────────────
server.tool(
  "smart_route",
  "Intelligently route a natural language prompt to the most relevant tools and commands. " +
    "Uses the scoring algorithm from Claude Code's runtime to match prompts against tool names, " +
    "descriptions, and responsibilities. Returns ranked matches with scores.",
  {
    prompt: z.string().describe("The natural language prompt to route"),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max number of matches to return (default 5)"),
  },
  async ({ prompt, limit }) => {
    const result = smartRoute(prompt, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { matches: result.matches, explanation: result.explanation },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── Tool 2: permission_check ────────────────────────────────────────────
server.tool(
  "permission_check",
  "Check whether a tool is allowed to be used under the current permission policy. " +
    "Implements Claude Code's ToolPermissionContext pattern — blocks tools by exact name " +
    "or prefix match. Use before invoking potentially dangerous tools.",
  {
    tool_name: z
      .string()
      .describe("Name of the tool to check (e.g. 'BashTool')"),
    tool_names: z
      .array(z.string())
      .optional()
      .describe("Optional: check multiple tools at once"),
  },
  async ({ tool_name, tool_names }) => {
    if (tool_names && tool_names.length > 0) {
      const results = checkMultiplePermissions([tool_name, ...tool_names]);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
    const result = checkPermission(tool_name);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── Tool 3: permission_update ───────────────────────────────────────────
server.tool(
  "permission_update",
  "Update the permission policy by setting which tool names or prefixes are denied. " +
    "Pass deny_names for exact matches and deny_prefixes for prefix-based blocking.",
  {
    deny_names: z
      .array(z.string())
      .optional()
      .describe("Tool names to deny (exact match, case-insensitive)"),
    deny_prefixes: z
      .array(z.string())
      .optional()
      .describe("Tool name prefixes to deny (case-insensitive)"),
  },
  async ({ deny_names, deny_prefixes }) => {
    const ctx = updatePermissionContext(deny_names, deny_prefixes);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              updated: true,
              blockedNames: [...ctx.denyNames],
              blockedPrefixes: ctx.denyPrefixes,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── Tool 4: budget_tracker ──────────────────────────────────────────────
server.tool(
  "budget_tracker",
  "Track token usage and turn counts for a session. Implements Claude Code's budget control " +
    "pattern with configurable max turns and token limits. Returns status (ok/warning/exceeded) " +
    "and remaining budget.",
  {
    action: z
      .enum(["create", "record", "status", "reset"])
      .describe("Action: create a session, record a turn, check status, or reset"),
    session_id: z.string().optional().describe("Session ID (auto-generated if omitted for 'create')"),
    input_tokens: z.number().optional().describe("Input tokens for this turn (for 'record' action)"),
    output_tokens: z.number().optional().describe("Output tokens for this turn (for 'record' action)"),
    max_turns: z.number().optional().describe("Max turns allowed (for 'create' action, default 8)"),
    max_budget_tokens: z.number().optional().describe("Max total tokens (for 'create' action, default 2000)"),
  },
  async ({ action, session_id, input_tokens, output_tokens, max_turns, max_budget_tokens }) => {
    let result: string;

    switch (action) {
      case "create": {
        const state = createBudgetSession(
          {
            maxTurns: max_turns,
            maxBudgetTokens: max_budget_tokens,
          },
          session_id
        );
        result = formatBudgetReport(state);
        break;
      }
      case "record": {
        if (!session_id) {
          result = "Error: session_id is required for 'record' action";
          break;
        }
        const state = recordTurn(
          session_id,
          input_tokens ?? 0,
          output_tokens ?? 0
        );
        result = formatBudgetReport(state);
        break;
      }
      case "status": {
        if (!session_id) {
          result = "Error: session_id is required for 'status' action";
          break;
        }
        const state = getBudgetState(session_id);
        result = state
          ? formatBudgetReport(state)
          : `No session found with id: ${session_id}`;
        break;
      }
      case "reset": {
        if (!session_id) {
          result = "Error: session_id is required for 'reset' action";
          break;
        }
        const state = resetBudget(session_id);
        result = state
          ? formatBudgetReport(state)
          : `No session found with id: ${session_id}`;
        break;
      }
    }

    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool 5: session_manager ─────────────────────────────────────────────
server.tool(
  "session_manager",
  "Save, load, or list agent sessions. Enables cross-session memory so agents can resume " +
    "previous work. Sessions are stored as JSON files in ~/.openclaw/boost-sessions/.",
  {
    action: z
      .enum(["save", "load", "list"])
      .describe("Action: save current session, load a previous one, or list all"),
    session_id: z.string().optional().describe("Session ID (required for save/load)"),
    messages: z
      .array(z.string())
      .optional()
      .describe("Messages to save (for 'save' action)"),
    input_tokens: z.number().optional().describe("Total input tokens (for 'save')"),
    output_tokens: z.number().optional().describe("Total output tokens (for 'save')"),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional metadata to attach to the session"),
  },
  async ({ action, session_id, messages, input_tokens, output_tokens, metadata }) => {
    switch (action) {
      case "save": {
        if (!session_id) {
          return {
            content: [
              { type: "text" as const, text: "Error: session_id is required for 'save'" },
            ],
          };
        }
        const { path, session } = saveSession(
          session_id,
          messages ?? [],
          input_tokens ?? 0,
          output_tokens ?? 0,
          metadata
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Session saved successfully.\nPath: ${path}\nMessages: ${session.messages.length}\nTokens: ${session.inputTokens + session.outputTokens}`,
            },
          ],
        };
      }
      case "load": {
        if (!session_id) {
          return {
            content: [
              { type: "text" as const, text: "Error: session_id is required for 'load'" },
            ],
          };
        }
        const session = loadSession(session_id);
        if (!session) {
          return {
            content: [
              { type: "text" as const, text: `No session found: ${session_id}` },
            ],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(session, null, 2) }],
        };
      }
      case "list": {
        const { sessions, directory } = listSessions();
        const lines = [
          `Sessions directory: ${directory}`,
          `Total sessions: ${sessions.length}`,
          "",
          ...sessions.map(
            (s) =>
              `- ${s.id} | ${s.messageCount} msgs | ${s.tokens} tokens | ${s.updatedAt}`
          ),
        ];
        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      }
    }
  }
);

// ── Tool 6: parity_audit ────────────────────────────────────────────────
server.tool(
  "parity_audit",
  "Audit a project directory for file coverage. Walks the directory tree, counts files by type, " +
    "and reports which files have been covered/processed. Useful for tracking migration progress " +
    "or code review status.",
  {
    directory: z.string().describe("Absolute path to the directory to audit"),
    extensions: z
      .array(z.string())
      .optional()
      .describe("File extensions to include (default: .ts,.tsx,.js,.jsx,.py,.rs)"),
    ignore_patterns: z
      .array(z.string())
      .optional()
      .describe("Patterns to ignore (default: node_modules,.git,dist,build)"),
    covered_files: z
      .array(z.string())
      .optional()
      .describe("List of file paths that have been covered/processed"),
  },
  async ({ directory, extensions, ignore_patterns, covered_files }) => {
    const result = runParityAudit({
      directory,
      extensions,
      ignorePatterns: ignore_patterns,
      coveredFiles: covered_files,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              totalFiles: result.totalFiles,
              coveredFiles: result.coveredFiles,
              coveragePercent: result.coveragePercent,
              uncoveredCount: result.uncoveredFiles.length,
              summary: result.summary,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── Start server ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Claude Code Boost MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
