/**
 * Smart Route Tool — ported from claw-code runtime.py's route_prompt()
 *
 * Given a natural language prompt, scores and ranks available tools/commands
 * to find the best match. This helps agents pick the right tool without
 * exhaustive schema scanning.
 */

import { routePrompt } from "../utils/scorer.js";
import type { ToolEntry, RoutedMatch } from "../utils/types.js";

const BUILTIN_COMMANDS: ToolEntry[] = [
  { name: "add-dir", responsibility: "Add a directory to the workspace context", sourceHint: "commands/add-dir", status: "active" },
  { name: "compact", responsibility: "Compact conversation history to save tokens", sourceHint: "commands/compact", status: "active" },
  { name: "config", responsibility: "View or update agent configuration", sourceHint: "commands/config", status: "active" },
  { name: "cost", responsibility: "Show token usage and cost for the current session", sourceHint: "commands/cost", status: "active" },
  { name: "doctor", responsibility: "Diagnose and fix environment issues", sourceHint: "commands/doctor", status: "active" },
  { name: "help", responsibility: "Show available commands and usage information", sourceHint: "commands/help", status: "active" },
  { name: "init", responsibility: "Initialize a new project with configuration", sourceHint: "commands/init", status: "active" },
  { name: "login", responsibility: "Authenticate with the AI provider", sourceHint: "commands/login", status: "active" },
  { name: "logout", responsibility: "Remove stored authentication credentials", sourceHint: "commands/logout", status: "active" },
  { name: "mcp", responsibility: "Manage MCP server connections", sourceHint: "commands/mcp", status: "active" },
  { name: "memory", responsibility: "View and manage persistent memory entries", sourceHint: "commands/memory", status: "active" },
  { name: "model", responsibility: "Switch the active language model", sourceHint: "commands/model", status: "active" },
  { name: "permissions", responsibility: "View and manage tool permissions", sourceHint: "commands/permissions", status: "active" },
  { name: "review", responsibility: "Review recent changes or pull requests", sourceHint: "commands/review", status: "active" },
  { name: "status", responsibility: "Show workspace status, file counts, and health", sourceHint: "commands/status", status: "active" },
  { name: "vim", responsibility: "Open a file in vim-like editor mode", sourceHint: "commands/vim", status: "active" },
];

const BUILTIN_TOOLS: ToolEntry[] = [
  { name: "AgentTool", responsibility: "Spawn a sub-agent to handle a complex subtask", sourceHint: "tools/AgentTool", status: "active" },
  { name: "BashTool", responsibility: "Execute shell commands in a sandboxed environment", sourceHint: "tools/BashTool", status: "active" },
  { name: "FileEditTool", responsibility: "Edit files with precise string replacements", sourceHint: "tools/FileEditTool", status: "active" },
  { name: "FileReadTool", responsibility: "Read file contents with optional line ranges", sourceHint: "tools/FileReadTool", status: "active" },
  { name: "FileWriteTool", responsibility: "Create or overwrite files with new content", sourceHint: "tools/FileWriteTool", status: "active" },
  { name: "GlobTool", responsibility: "Find files matching glob patterns recursively", sourceHint: "tools/GlobTool", status: "active" },
  { name: "GrepTool", responsibility: "Search file contents with regex patterns", sourceHint: "tools/GrepTool", status: "active" },
  { name: "MCPTool", responsibility: "Call a tool exposed by an MCP server", sourceHint: "tools/MCPTool", status: "active" },
  { name: "NotebookEditTool", responsibility: "Edit Jupyter notebook cells", sourceHint: "tools/NotebookEditTool", status: "active" },
  { name: "SearchTool", responsibility: "Semantic code search across the workspace", sourceHint: "tools/SearchTool", status: "active" },
  { name: "WebFetchTool", responsibility: "Fetch and parse content from URLs", sourceHint: "tools/WebFetchTool", status: "active" },
  { name: "WebSearchTool", responsibility: "Search the web for real-time information", sourceHint: "tools/WebSearchTool", status: "active" },
];

let customCommands: ToolEntry[] = [];
let customTools: ToolEntry[] = [];

export function registerCustomEntries(commands: ToolEntry[], tools: ToolEntry[]): void {
  customCommands = commands;
  customTools = tools;
}

export function smartRoute(
  prompt: string,
  limit = 5,
  includeCustom = true
): { matches: RoutedMatch[]; explanation: string } {
  const commands = includeCustom
    ? [...BUILTIN_COMMANDS, ...customCommands]
    : BUILTIN_COMMANDS;
  const tools = includeCustom
    ? [...BUILTIN_TOOLS, ...customTools]
    : BUILTIN_TOOLS;

  const matches = routePrompt(prompt, commands, tools, limit);

  const explanationLines = [
    `Prompt: "${prompt}"`,
    `Searched ${commands.length} commands + ${tools.length} tools`,
    `Found ${matches.length} matches:`,
    ...matches.map(
      (m, i) => `  ${i + 1}. [${m.kind}] ${m.name} (score: ${m.score}) — ${m.sourceHint}`
    ),
  ];

  return {
    matches,
    explanation: explanationLines.join("\n"),
  };
}
