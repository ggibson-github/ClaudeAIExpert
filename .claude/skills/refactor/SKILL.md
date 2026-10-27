---
name: refactor
description: "Use when the user asks to refactor or reduce tech debt, or when a change would duplicate logic. Keeps existing tests green."
trigger: User asks to refactor or reduce tech debt
---
# Refactor

## Journal layer

Step notes and the next action go on the active node through journal-keeper, in `journals/work-items/<id>/nodes/`. Do not write them to `work-items/<id>/journal/progress.md`. Use AskUserQuestion for a fixed choice.

Improves code structure without changing behavior; reduces tech debt and avoids spaghetti code. Use when code would become duplicated, when the user asks to refactor, or when tech debt is blocking a feature.

## When to use

- User asks to refactor or reduce tech debt
- Before or during a feature when the change would duplicate logic or worsen structure
- When existing code is hard to extend or test

## Instructions

### 0. Work Item Context
- Read active Work Item ID from `.claude/active-work-item.txt`
- Journal: `work-items/<work-item-id>/journal/progress.md`
- Use Work Item-scoped paths for all artifacts

1. **Scope**: Identify refactor targets (duplication, unclear boundaries, dead code, overly large modules). Prefer small, safe steps. Document scope in journal or a short note in `docs/decisions/` if it's a significant refactor.
2. **Plan**: Decide the order of refactors so tests stay green after each step. Do not add new behavior; only restructure.
3. **Implement**: Make the refactor. Run the full test suite (unit, integration, e2e if present) after the change. If any test fails, fix before proceeding.
4. **Journal**: Record refactor scope and outcome in the journal (e.g. "Refactored X to Y; all tests pass"). Do not mark a feature task complete until refactor is done and tests pass if the feature depended on it.

Existing tests must remain green. No new tests are required for pure refactors, but do not remove or weaken existing coverage.
