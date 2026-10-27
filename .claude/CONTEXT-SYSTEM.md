# Active Context System

## Purpose

Tracks whether the user is currently working on a workflow that has session folders such as **Work Item** (development) 

## Context File

- **Location:** `.claude/active-context.txt`
- **Format:** `<type>:<id>`
- **Examples:**
  - `work-item:WID-654321` (development work)

## Context Types

### work-item

- **Purpose:** Development tasks (features, bugs, refactoring)
- **ID Format:** `WID-XXXXXXXX`
- **Root Path:** `work-items/<id>/`
- **Journal:** `work-items/<id>/journal/progress.md`
- **Workflows:** developer

## Switching Context

User commands:
- `switch to work item WID-12345678` → writes `work-item:WID-12345678`

The agent will:
1. Parse the context file to determine type and ID
2. Route to appropriate folder structure
3. Load the correct journal and artifacts

## Backward Compatibility

**Legacy file:** `.claude/active-work-item.txt`

## Skill Integration

Skills that read context:
- **continue.md:** Reads context to determine next action
- **workflowID-selector.md:** Writes context when starting new work
- **journal-keeper.md:** Reads context for journal path
- **spec-parser.md:** Reads context for artifact paths
- **hld-writer.md, dd-writer.md:** Read context for artifact paths

All skills should:
1. Read `.claude/active-context.txt`
2. Parse format: `type:id`
3. Route based on type:
   - `work-item` → `work-items/<id>/`

## Context Parsing Logic

```
Read .claude/active-context.txt
If file doesn't exist:
- Check .claude/active-work-item.txt (legacy)
- If exists: type=work-item, id=content
- If not exists: prompt user to start new work
Parse content as `type:id`
Set context_type = type (work-item)
Set context_id = id
Set root_path = {type}s/{id}/ (pluralize type)
Set journal_path = {root_path}/journal/progress.md
```

## Example Usage

```
**Starting new work item:**
User: "start new work item WID-123456"
Agent: writes `work-item:WID-123456` to `.claude/active-context.txt`
```

**Switching contexts:**

```
User: "switch to work item WID-654321"
Agent: reads current context (work-item:WID-123456)
writes new context (work-item:WID-654321)
confirms switch with user
```

## Benefits

- Single source of truth for active context
- Clear distinction between work types
- Support for multiple context types (extensible)
- Easy to parse and validate
