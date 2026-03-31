---
name: permission_guard
description: Check tool permissions before executing dangerous operations. Implements Claude Code's safety-first pattern to prevent accidental destructive actions.
metadata:
  openclaw:
    requires:
      config:
        - mcpServers.clawcode-boost
---

# Permission Guard

You have access to the `permission_check` and `permission_update` MCP tools from the clawcode-boost server.

## When to use

ALWAYS check permissions before:
- Running shell/bash commands
- Deleting files or directories
- Modifying system configuration
- Executing database operations (DROP, DELETE, TRUNCATE)
- Restarting services or killing processes
- Any operation that cannot be easily undone

## How to use

### Check before executing
1. Before running a potentially dangerous tool, call `permission_check` with the tool name
2. If `allowed` is `false`, inform the user WHY the tool is blocked (the `denial.reason` field)
3. Suggest a safer alternative when possible

### Batch checking
If a task requires multiple tools, check them all at once using the `tool_names` array parameter to avoid round-trip latency.

### Updating permissions
If the user explicitly grants permission for a blocked tool, use `permission_update` to adjust the policy. Only do this when the user clearly understands the risk.

## Default blocked tools

These are blocked by default for safety:
- BashTool, ShellTool, ExecuteTool (arbitrary command execution)
- FileDelTool (file deletion)
- ServerRestartTool (service disruption)
- Any tool with prefix: bash, shell, exec, rm, delete, drop, sudo, kill

## Safe alternatives

| Blocked operation | Safe alternative |
|---|---|
| `rm -rf directory` | List contents first, confirm with user, delete one by one |
| `DROP TABLE` | Create backup first, use soft-delete |
| `kill -9 process` | Use graceful shutdown, check process status first |
| `sudo command` | Explain what elevated access is needed and why |

## Important

Never silently skip a permission check. Always inform the user when a tool is blocked, even if you have an alternative approach.
