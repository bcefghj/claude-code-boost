/**
 * Parity Audit Tool — ported from claw-code parity_audit.py
 *
 * Walks a project directory and computes file-level coverage stats.
 * Useful for tracking migration progress, code review coverage,
 * or understanding how much of a codebase has been processed.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import type { AuditResult } from "../utils/types.js";

interface AuditOptions {
  directory: string;
  extensions?: string[];
  ignorePatterns?: string[];
  coveredFiles?: string[];
}

function walkDir(
  dir: string,
  extensions: string[],
  ignorePatterns: string[],
  results: string[] = []
): string[] {
  if (!existsSync(dir)) return results;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(dir, fullPath);

    if (ignorePatterns.some((p) => entry.name.includes(p) || relPath.includes(p))) {
      continue;
    }

    if (entry.isDirectory()) {
      walkDir(fullPath, extensions, ignorePatterns, results);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (extensions.length === 0 || extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export function runParityAudit(options: AuditOptions): AuditResult {
  const {
    directory,
    extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs"],
    ignorePatterns = ["node_modules", ".git", "dist", "build", "__pycache__", ".next"],
    coveredFiles = [],
  } = options;

  if (!existsSync(directory)) {
    return {
      totalFiles: 0,
      coveredFiles: 0,
      coveragePercent: 0,
      uncoveredFiles: [],
      summary: `Directory not found: ${directory}`,
    };
  }

  const allFiles = walkDir(directory, extensions, ignorePatterns);
  const coveredSet = new Set(coveredFiles.map((f) => f.toLowerCase()));

  const uncovered = allFiles.filter(
    (f) => !coveredSet.has(f.toLowerCase()) && !coveredSet.has(relative(directory, f).toLowerCase())
  );

  const coveredCount = allFiles.length - uncovered.length;
  const coveragePercent =
    allFiles.length > 0 ? Math.round((coveredCount / allFiles.length) * 100) : 100;

  const extCounts = new Map<string, number>();
  for (const f of allFiles) {
    const ext = extname(f).toLowerCase();
    extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }

  const extBreakdown = [...extCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `  ${ext}: ${count} files`)
    .join("\n");

  const summaryLines = [
    `=== Parity Audit Report ===`,
    `Directory: ${directory}`,
    `Total files: ${allFiles.length}`,
    `Covered: ${coveredCount} (${coveragePercent}%)`,
    `Uncovered: ${uncovered.length}`,
    ``,
    `File types:`,
    extBreakdown,
  ];

  if (uncovered.length > 0 && uncovered.length <= 20) {
    summaryLines.push(``, `Uncovered files:`);
    for (const f of uncovered) {
      summaryLines.push(`  - ${relative(directory, f)}`);
    }
  } else if (uncovered.length > 20) {
    summaryLines.push(
      ``,
      `Uncovered files (first 20 of ${uncovered.length}):`
    );
    for (const f of uncovered.slice(0, 20)) {
      summaryLines.push(`  - ${relative(directory, f)}`);
    }
  }

  return {
    totalFiles: allFiles.length,
    coveredFiles: coveredCount,
    coveragePercent,
    uncoveredFiles: uncovered.map((f) => relative(directory, f)),
    summary: summaryLines.join("\n"),
  };
}

export function quickAudit(directory: string): string {
  const result = runParityAudit({ directory });
  return result.summary;
}
