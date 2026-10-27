---
name: switch-context
description: Use when the user says "switch to work item WID-XXXXXXXX", or otherwise asks to change the active context. Updates the active-context pointer so subsequent journal/facts/rules operations target the right Work Item.
trigger: User says "switch to work item WID-XXXXXXXX"
---
## Switch Context

Switches the active Work Item context.

## When to use

- User says "switch to work item WID-XXXXXXXX"
- User says "switch to {id}" where id is a work item

## Instructions

1. **Parse user request:**
 - Extract ID from user message
 - Determine context type by the **shape of the ID first**, then fall back to keywords:
 - If starts with "WID-" ? `context_type=work-item`
 - If ambiguous: ask user for a Work Item ID (WID-XXXXXXXX)

2. **Check if context exists:**
 - If `context_type=work-item`: Check if `work-items/<id>/` exists
 - If folder doesn't exist: Ask user "This context doesn't exist yet. Would you like to create it? (yes/no)"
 - If yes: Proceed to step 3
 - If no: Exit skill

3. **Read current context:**
 - Read `.claude/active-context.txt` to get current context
 - Parse as `<type>:<id>`
 - Display to user: "Current context: Work Item {current_id}"

4. **Confirm switch:**
 - Ask user: "Switch from {current_context} to {new_context}? (yes/no)"
 - If no: Exit skill
 - If yes: Proceed to step 5

5. **Write new context:**
 - Write to `.claude/active-context.txt` as `<context_type>:<id>`
 - If work-item: also write to `.claude/active-work-item.txt` for backward compatibility
 - Change `Current work item:` in `journals/expert/progress.md` only when the operator is switching of their own accord. Read the active branch from `journals/work-items/<id>/state.json`. Do not move `active` in this skill.

6. **Confirm to user:**
```
? Switched to Work Item {id}
Context: {context_type}:{id}
Root path: {root_path}
Journal: {journal_path}
Workflow: {workflow_type}
Next action: {next_action}
```

7. **Display journal status:**
 - Read `{journal_path}`
 - Display current phase, next action, and any open questions/blockers
 - Ask user: "Would you like to continue from here? (say 'continue' to proceed)"

## Error Handling

- **Context doesn't exist:** Offer to create new context or cancel
- **Invalid ID format:** Re-prompt with format guidance
- **No active context:** Treat as new context initialization, skip current context display

## Examples

**Example 1: Switch to existing work item**
```
User: "switch to work item WID-214111151"
Agent: "Current context: Work Item WID-100000001. Switch to Work Item WID-214111151? (yes/no)"
User: "yes"
Agent: "? Switched to Work Item WID-214111151. Current phase: HLD. Next action: wait for HLD approval. Would you like to continue?"
```

**Example 2: Context doesn't exist**
```
User: "switch to work item WID-999999999"
Agent: "Work Item WID-999999999 doesn't exist yet. Would you like to create it? (yes/no)"
User: "yes"
Agent: [Invokes workflow-selector to initialize new work item]
```

## Notes

- Switching contexts does NOT lose work in the previous context
- All context state is preserved in their respective journals
- You can switch back and forth between contexts as needed
- Work items are committed to Git (project work)
