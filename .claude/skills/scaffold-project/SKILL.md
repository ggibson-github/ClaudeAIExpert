---
name: scaffold-project
description: "Use when the journal says the next action is \"run scaffold-project\" (after task-breakdown and git-workflow setup). Creates the project skeleton per the approved DD."
trigger: Journal says next action is "run scaffold-project" (after task-breakdown)
---

# Scaffold Project

## Journal layer

Step notes and the next action go on the active node through journal-keeper, in `journals/work-items/<id>/nodes/`. Do not write them to `work-items/<id>/journal/progress.md`. Use AskUserQuestion for a fixed choice.

Creates repo layout, config, tooling, and CI skeleton from the design. Use when task breakdown is done and before implementation.

## When to use

- Journal says next action is "run scaffold-project" (after task-breakdown)
- User asks to scaffold or set up the project structure

## Instructions

### 0. Work Item Context
- Read active Work Item ID from `.claude/active-work-item.txt`
- Journal: `work-items/<work-item-id>/journal/progress.md`
- Use Work Item-scoped paths for all artifacts


1. Read the journal. If the scaffold phase is already complete and the expected artifacts (e.g. src/, config) exist, skip scaffolding: set next action to "implement-feature (task 1/N)" (using the total task count from TODOS.md) and update the journal.
2. Otherwise read `docs/design/dd.md` and `TODOS.md` and create the project structure: directory layout, config files, tooling, and CI skeleton as implied by the design.
3. **If the agent needs a library, package URL, or other resource**: Ask the user for the URL (e.g. GitHub repo or other download location) if not known or if the default fails. Do not skip the step.
4. **If scaffold fails or the agent needs anything to unblock** (e.g. package install fails, clone fails, download fails, missing URL): do **not** skip. Explain the situation to the user and ask for help. Describe what failed or what is needed, record in the journal (Blockers / Last failure), and ask the user for the URL or other input. Only continue when the user provides what is needed or agrees on next steps.
5. Update the journal: set phase to scaffold done, Artifacts to include the created paths, next action to "implement-feature (task 1/N)".
