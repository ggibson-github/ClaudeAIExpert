---
name: workflow-selector
description: "Use when the continue skill finds the journal missing a workflow type, or when starting a new Work Item. Reads the workflow registry and prompts the user to select an enabled pipeline."
trigger: Called by continue skill when journal missing workflow type
---

# Workflow Selector

Presents workflow type menu to user and records selection in journal.

When to use

- Called by continue skill when journal is missing "Workflow type" field
- On new Work Item initialization

## Instructions

1. **Determine context type:**
 - Read `.claude/active-context.txt` to get `context_type` and `context_id`
 - If `context_type=work-item`: working on development tasks

2. **Read workflow registry:**
 - Read `.claude/workflows/workflow-registry.json` to get available workflows.

3. **Present menu to user from the registry only:**

 List each workflow in `workflow-registry.json` as a numbered line: name, then the description from the registry. Do not offer a workflow that is not in the registry. define-role rewrites the registry when the user approves a role, so this menu is the enabled set.

 Until that approval changes it, the registry contains:

 1. Developer Pipeline (Greenfield & Iterative Features)
 Full SDLC: spec → HLD → DD → implementation → testing

4. **Accept user input:**
 - Work item: a number matching the menu, or a workflow name (flexible parsing: "developer", "Developer Pipeline", and any other name present in the registry)

5. **Validate selection:** Ensure workflow exists in registry. If invalid, re-prompt.

6. **Ask context-specific questions:**
 - **Work item (all workflows):** "What is the Work Item ID? (e.g., WID-21411151 or incident-2026-04-28)"
 - **Work item (production-incident):** "What is the incident scope? (Datacenter, DB, CustomerID, customer escalations?)"
 - **All contexts:** "Any external references? (chat threads, issue tracker tickets, logs and monitoring alerts, confluence pages)"

7. **Record in journal:**
 - Write `Workflow type` on `journals/work-items/<id>/progress.md` when that field is missing. Do not replace `active`.
 - Set `Context ID: <context_id>` on that flat journal
 - Set workflow-specific fields on that flat journal
 - Put `Next action` on `nodes/work-item.md` only when `active` is still just `work-item`. If `active` is already deeper, leave it.

8. **Write active context file:**
 - Write to `.claude/active-context.txt` as `<context_type>:<context_id>`
 If work-item: also write to `.claude/active-work-item.txt` for backward compatibility

9. **Confirm to user:**

 ✅ Work Item initialized with <workflow-name>
 Initial phase: <phase-name>
 Next action: <next-action>

## Workflow-Specific Fields to Record

**Production Incident:**
- Incident scope: Datacenter, DB, CustomerID
- Customer escalations: (yes/no, which customers)
- Incident bridge URL: (if applicable)

**Developer:**
- No additional fields beyond Work Item ID

## Notes

- This skill is called by continue.md when journal missing workflow type
- Backward compatibility: If user has existing journal with "Pipeline" field but no "Workflow type", map old pipeline names to new workflow types
