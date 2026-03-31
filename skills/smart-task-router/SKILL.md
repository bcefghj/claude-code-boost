---
name: smart_task_router
description: Intelligently route user requests to the best tool using Claude Code's scoring algorithm. Reduces wrong tool calls and improves task completion speed.
metadata:
  openclaw:
    requires:
      config:
        - mcpServers.claude-code-boost
---

# Smart Task Router

You have access to the `smart_route` MCP tool from the claude-code-boost server.

## When to use

Use smart routing when:
- The user's request is ambiguous and could map to multiple tools
- You are unsure which tool is the best fit for a task
- The request involves multiple steps that may need different tools
- You want to verify your tool choice before executing

## How to use

1. Before executing a complex task, call `smart_route` with the user's prompt
2. Review the returned matches — each has a `kind` (command or tool), `name`, `score`, and `sourceHint`
3. Higher scores indicate better matches
4. Prefer the highest-scoring match, but consider the `kind`:
   - Use "command" matches for configuration, navigation, or status operations
   - Use "tool" matches for file operations, code editing, or external calls
5. If the top match has a score of 1 and there are multiple matches with score 1, consider asking the user for clarification

## Decision rules

- Score >= 3: High confidence — use this tool directly
- Score 2: Good match — proceed unless another tool seems more appropriate from context
- Score 1: Weak match — consider the alternatives or ask the user
- If no matches returned: fall back to general-purpose tools (FileReadTool, BashTool)

## Example

User says: "read the config file and update the database URL"

Call `smart_route` with prompt "read the config file and update the database URL":
- This might return FileReadTool (score 3), FileEditTool (score 2), config command (score 1)
- Use FileReadTool first to read, then FileEditTool to update
