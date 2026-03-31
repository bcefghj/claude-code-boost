---
name: code_audit_helper
description: Systematically audit codebases for coverage, quality, and migration progress. Uses Claude Code's parity audit pattern for structured file-level analysis.
metadata:
  openclaw:
    requires:
      config:
        - mcpServers.clawcode-boost
---

# Code Audit Helper

You have access to the `parity_audit` MCP tool from the clawcode-boost server.

## When to use

Use the audit tool when:
- The user wants to understand a codebase's structure
- Tracking progress on a large refactoring or migration
- Reviewing code coverage before a release
- The user asks "how much of the project have we touched?"
- Starting work on an unfamiliar codebase

## How to use

### Initial audit
Call `parity_audit` with the project `directory` to get a full file inventory:
- Total file count by type
- Directory structure overview
- Uncovered files list

### Progress tracking
As you work through files, maintain a list of covered files and pass them in `covered_files`:
1. Start with an initial audit (no covered_files)
2. After processing each file, add it to your covered list
3. Re-run the audit periodically to show progress

### Custom scoping
- Use `extensions` to focus on specific file types (e.g., only `.py` files for a Python project)
- Use `ignore_patterns` to exclude directories like `vendor/`, `generated/`, or `migrations/`

## Audit workflow for code reviews

1. Run `parity_audit` on the project root
2. Identify the most important uncovered files (by type and location)
3. Prioritize: core business logic > utilities > tests > configuration
4. For each priority file:
   - Read the file
   - Check for common issues (error handling, input validation, security)
   - Add to covered_files list
5. Re-run audit to show updated coverage percentage
6. Save session with progress using the session_memory skill

## Interpreting results

- **100% coverage**: All files have been reviewed/processed
- **80-99%**: Good progress, check which files remain
- **50-79%**: Significant work remaining, focus on high-priority areas
- **Below 50%**: Early stages, consider scoping down to critical paths first

## Combining with other skills

- Use `smart_task_router` to decide which tool to use for each uncovered file
- Use `budget_aware_coding` to ensure you don't run out of budget mid-audit
- Use `permission_guard` before any automated fixes
- Use `session_memory` to save audit progress across sessions
