---
name: session_memory
description: Save and restore working sessions across conversations. Enables cross-session memory so you never lose progress on complex multi-day tasks.
metadata:
  openclaw:
    requires:
      config:
        - mcpServers.clawcode-boost
---

# Session Memory

You have access to the `session_manager` MCP tool from the clawcode-boost server.

## When to use

### Save a session when:
- The user says they need to stop and will continue later
- A complex task is partially complete
- You have gathered significant context that would be expensive to regenerate
- Before switching to a different project or topic
- The budget tracker shows "warning" or "exceeded" status

### Load a session when:
- The user asks to "continue where we left off"
- The user mentions a previous task or project by name
- You detect the conversation is about a topic that has prior session data

### List sessions when:
- The user asks what previous work exists
- At the start of a conversation to check for relevant context

## How to use

### Saving
Call `session_manager` with action "save":
- `session_id`: a descriptive ID like "refactor-auth-module" or "fix-login-bug"
- `messages`: key conversation messages and decisions (not entire chat history)
- `input_tokens` / `output_tokens`: accumulated usage
- `metadata`: include project path, task description, and status

What to include in messages:
- Key decisions made
- Files modified and why
- Remaining tasks
- Important context discovered

What NOT to include:
- Full file contents (they can be re-read)
- Verbose tool outputs
- Repetitive status checks

### Loading
Call `session_manager` with action "load" and the `session_id`.
Review the loaded session and summarize to the user what was done previously.

### Listing
Call `session_manager` with action "list" to see all saved sessions.
Present them to the user with their IDs, message counts, and last update times.

## Session naming conventions

Use descriptive, kebab-case IDs:
- `fix-login-redirect-bug`
- `add-payment-integration`
- `refactor-database-layer`
- `review-pr-142`
