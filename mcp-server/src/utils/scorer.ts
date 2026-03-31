/**
 * Scoring algorithm — ported from claw-code's runtime.py PortRuntime._score()
 *
 * Tokenizes the user prompt, then scores each tool/command by counting
 * how many tokens appear in its name, sourceHint, or responsibility.
 */

import type { ToolEntry, RoutedMatch } from "./types.js";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[\/\-_\.]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

function scoreEntry(tokens: Set<string>, entry: ToolEntry): number {
  const haystacks = [
    entry.name.toLowerCase(),
    entry.sourceHint.toLowerCase(),
    entry.responsibility.toLowerCase(),
  ];
  let score = 0;
  for (const token of tokens) {
    if (haystacks.some((h) => h.includes(token))) {
      score += 1;
    }
  }
  return score;
}

export function collectMatches(
  tokens: Set<string>,
  entries: ToolEntry[],
  kind: "command" | "tool"
): RoutedMatch[] {
  const matches: RoutedMatch[] = [];
  for (const entry of entries) {
    const score = scoreEntry(tokens, entry);
    if (score > 0) {
      matches.push({
        kind,
        name: entry.name,
        sourceHint: entry.sourceHint,
        score,
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return matches;
}

/**
 * Route a prompt to the most relevant tools/commands.
 * Ensures at least one command and one tool are selected (if available),
 * then fills remaining slots by score.
 */
export function routePrompt(
  prompt: string,
  commands: ToolEntry[],
  tools: ToolEntry[],
  limit = 5
): RoutedMatch[] {
  const tokens = tokenize(prompt);
  const byKind = {
    command: collectMatches(tokens, commands, "command"),
    tool: collectMatches(tokens, tools, "tool"),
  };

  const selected: RoutedMatch[] = [];
  for (const kind of ["command", "tool"] as const) {
    if (byKind[kind].length > 0) {
      selected.push(byKind[kind].shift()!);
    }
  }

  const leftovers = [...byKind.command, ...byKind.tool].sort(
    (a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
  );

  for (const match of leftovers) {
    if (selected.length >= limit) break;
    if (!selected.some((s) => s.name === match.name && s.kind === match.kind)) {
      selected.push(match);
    }
  }

  return selected.slice(0, limit);
}
