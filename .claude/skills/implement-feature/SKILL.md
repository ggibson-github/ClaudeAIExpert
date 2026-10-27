---
name: implement-feature
description: "Use when the journal says the next action is \"implement-feature (task K/N)\". Implements one task from TODOS, keeps tests green, and updates the journal."
trigger: Journal says next action is "implement-feature (task K/N)"
---

# Implement Feature

## Journal layer

Step notes and the next action go on the active node through journal-keeper, in `journals/work-items/<id>/nodes/`. Do not write them to `work-items/<id>/journal/progress.md`. Use AskUserQuestion for a fixed choice.

Implements one feature or task from TODOS in order. Now Work Item-aware with facts/rules enforcement and proactive detection. Use when the pipeline is in implementation phase and next action is implement-feature (task K/N).

## When to use

- Journal says next action is "implement-feature (task K/N)" for some task index K
- Pipeline is in implementation phase

## Instructions

### 0. Work Item Context & Facts/Rules Loading

**Get Work Item context:**
- Read active Work Item ID from `.claude/active-work-item.txt`
- Work Item paths: `work-items/<work-item-id>/[path]`
- Journal: `work-items/<work-item-id>/journal/progress.md`
- TODOS: `work-items/<work-item-id>/TODOS.md`

**Load facts and rules:**
- Read the **workflow-split** Expert Role memory. For the developer workflow load `facts/facts-developer.md` + `facts/rules-developer.md` – rules **MUST be followed during implementation**. Load `facts/MEMORY-INDEX.md` first; pull another workflow's split files only if the task crosses into it.
- Read `work-items/<work-item-id>/facts/facts.md` (Work Item facts)
- Read `work-items/<work-item-id>/facts/rules.md` (Work Item rules) – **MUST be followed**
- Apply rules to coding decisions (coding standards, testing patterns, error handling)
- Log loaded facts/rules to journal

### 1-7. Implementation Process

1. Read `work-items/<work-item-id>/TODOS.md` and `work-items/<work-item-id>/journal/progress.md` to identify the current task (the one indicated by next action).

2. **Check rules before implementing:**
- Review all loaded rules for constraints on this task
- Examples: "Integration tests must use real DB", "Must use repository pattern", "Error messages must include context"
- If implementation would violate a rule, stop and ask user for guidance
- Log any rule conflicts to journal

3. Implement only that task. Do not skip ahead or implement multiple tasks in one go. **Apply loaded rules throughout implementation.**

4. **If the agent needs a library or dependency**: Ask the user for the URL to the GitHub repo or other download location if it is not known or if the default source fails. Do not skip the step or assume a different source without asking.

5. **If a step fails or the agent needs anything to unblock** (e.g. download fails, missing URL, credentials, API key, manual step): do **not** skip the step. **Explain the situation** to the user and **ask for help**. Describe what is needed or what failed, write **Last failure / Retry state** and **Blockers** in the journal, and ask the user for the URL, credentials, or other input (e.g. retry, user provides URL, alternative source, manual download, change approach). Only proceed when the user provides what is needed or agrees on next steps. Do not assume a workaround or skip without user agreement. Do not mark the task complete until the blocker is resolved with the user's input.

6. **Proactive detection – watch for new coding standards/testing rules:**
- User corrects implementation approach (e.g., "no, use X pattern instead of Y")
- User provides coding constraints (e.g., "always include error context")
- User describes testing requirements (e.g., "tests must assert on log messages")
- If detected, use remember skill to propose capturing as Expert Role rule

7. Do not mark the task complete until tests pass or an exception is documented. If tests are handled by test-writer, coordinate: run or add tests, then update journal only on success.

8. **Check commit strategy after task completion:**
- Read journal **Commit strategy** field
- If "incremental":
- Commit this task now using git-workflow commit mode
- Use conventional commit format: `feat(<area>): <description>` or `fix(<area>): <description>`
- Example: `feat(auth): add user login endpoint`
- If "single":
- Defer commit until all tasks complete
- No git operations needed at this step

9. After success: update journal (last completed = this task, loaded facts/rules applied, proactively detected patterns if any, next action = "implement-feature (task K+1/N)" or, if this was the last task, set next action to "run git-workflow (commit/PR)"). If all tasks are complete, add a final handoff note if desired.
