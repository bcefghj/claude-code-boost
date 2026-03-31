---
name: budget_aware_coding
description: Monitor and manage token budgets during coding sessions. Prevents runaway costs and teaches efficient tool usage patterns from Claude Code's query engine.
metadata:
  openclaw:
    requires:
      config:
        - mcpServers.clawcode-boost
---

# Budget-Aware Coding

You have access to the `budget_tracker` MCP tool from the clawcode-boost server.

## When to use

Use budget tracking when:
- Starting a new coding session (create a budget)
- After each significant tool call (record usage)
- Before starting an expensive operation (check remaining budget)
- The user asks about costs or token usage

## How to use

### Start of session
Call `budget_tracker` with action "create" to initialize tracking.
Optionally set `max_turns` (default 8) and `max_budget_tokens` (default 2000).

### After each turn
Call `budget_tracker` with action "record", providing:
- `session_id`: the ID from the create step
- `input_tokens`: estimated tokens consumed by the input
- `output_tokens`: estimated tokens consumed by the output

### Check status
Call `budget_tracker` with action "status" to see remaining budget.

## Efficiency strategies

When budget status is "warning" (running low):
1. Combine multiple small reads into a single operation
2. Use GrepTool instead of reading entire files
3. Make targeted edits rather than rewriting whole files
4. Summarize findings concisely
5. Ask the user if they want to continue or wrap up

When budget status is "exceeded":
1. Stop making new tool calls
2. Summarize what has been accomplished
3. List remaining tasks that need another session
4. Save the session state for later resumption

## Token estimation rules

- File read: ~1 token per 4 characters
- Code output: ~1 token per 4 characters
- Tool call overhead: ~50 tokens per call
- System prompt: ~500 tokens (amortized across turns)
