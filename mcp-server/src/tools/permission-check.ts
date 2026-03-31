/**
 * Permission Check Tool — ported from claw-code permissions.py
 *
 * Implements the ToolPermissionContext pattern: an immutable policy object
 * that blocks tools by exact name or prefix match. Prevents agents from
 * invoking dangerous tools without explicit permission.
 */

import {
  DANGEROUS_TOOL_NAMES,
  DANGEROUS_TOOL_PREFIXES,
  type PermissionContext,
  type PermissionDenial,
} from "../utils/types.js";

let activeContext: PermissionContext = {
  denyNames: new Set(DANGEROUS_TOOL_NAMES),
  denyPrefixes: [...DANGEROUS_TOOL_PREFIXES],
};

export function updatePermissionContext(
  denyNames?: string[],
  denyPrefixes?: string[]
): PermissionContext {
  activeContext = {
    denyNames: new Set(
      (denyNames ?? [...DANGEROUS_TOOL_NAMES]).map((n) => n.toLowerCase())
    ),
    denyPrefixes: (denyPrefixes ?? [...DANGEROUS_TOOL_PREFIXES]).map((p) =>
      p.toLowerCase()
    ),
  };
  return activeContext;
}

function blocks(ctx: PermissionContext, toolName: string): boolean {
  const lowered = toolName.toLowerCase();
  if (ctx.denyNames.has(lowered)) return true;
  return ctx.denyPrefixes.some((prefix) => lowered.startsWith(prefix));
}

export interface PermissionCheckResult {
  toolName: string;
  allowed: boolean;
  denial: PermissionDenial | null;
  context: {
    blockedNames: string[];
    blockedPrefixes: string[];
  };
}

export function checkPermission(toolName: string): PermissionCheckResult {
  const isBlocked = blocks(activeContext, toolName);

  let denial: PermissionDenial | null = null;
  if (isBlocked) {
    const lowered = toolName.toLowerCase();
    let reason = "";
    if (activeContext.denyNames.has(lowered)) {
      reason = `Tool "${toolName}" is explicitly denied by name`;
    } else {
      const matchedPrefix = activeContext.denyPrefixes.find((p) =>
        lowered.startsWith(p)
      );
      reason = `Tool "${toolName}" is denied by prefix rule "${matchedPrefix}"`;
    }
    denial = { toolName, reason };
  }

  return {
    toolName,
    allowed: !isBlocked,
    denial,
    context: {
      blockedNames: [...activeContext.denyNames],
      blockedPrefixes: activeContext.denyPrefixes,
    },
  };
}

export function checkMultiplePermissions(
  toolNames: string[]
): PermissionCheckResult[] {
  return toolNames.map(checkPermission);
}
