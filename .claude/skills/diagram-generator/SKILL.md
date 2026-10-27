---
name: diagram-generator
description: "Use when the journal or user asks to regenerate, refresh, expand, or synchronize design diagrams (docs/diagrams/*.mmd and index.html) with existing HLD/DD documents."
trigger: Journal or user requests diagram regeneration/refresh/synchronization
---

# Diagram Generator

## Journal layer

Step notes and the next action go on the active node through journal-keeper, in `journals/work-items/<id>/nodes/`. Do not write them to `work-items/<id>/journal/progress.md`. Use AskUserQuestion for a fixed choice.

Regenerates and synchronizes architecture, sequence, ER, and C4-style diagrams from design docs. Use when diagrams need refresh or consistency checks.

## When to use

- Journal or user requests diagram regeneration/refresh/synchronization
- Diagrams in `docs/diagrams/` are missing, outdated, inconsistent, or not aligned with `docs/design/hld.md` and `docs/design/dd.md`
- The HTML viewer page needs to be rebuilt or updated after design changes

## Instructions

### 0. Work Item Context
- Read active Work Item ID from `.claude/active-work-item.txt`
- Journal: `work-items/<work-item-id>/journal/progress.md`
- Use Work Item-scoped paths for all artifacts


1. Use **Mermaid** by default for all diagrams (architecture, sequence, ER, C4-style).
2. Read `docs/design/hld.md` and `docs/design/dd.md`. Read `journal/progress.md` for **HLD profile**, if **extended**, ensure diagram set aligns with [`docs/design/hld-extended-sections.md`](docs/design/hld-extended-sections.md) (e.g. key sequences, ERD/data view when entities matter, optional state diagrams)—add or refresh diagrams rather than dropping expected types without reason.
3. Regenerate or update diagrams in `docs/diagrams/` so they are synchronized with current HLD/DD content. Preserve clear naming conventions and avoid removing valid existing diagrams without reason.
4. **Generate or refresh the HTML page** (e.g. `docs/diagrams/index.html`) used to view diagrams in a browser. The page should load Mermaid.js (e.g. from a CDN), render each diagram, and include a simple list or nav.
5. Verify `docs/design/hld.md` and `docs/design/dd.md` reference relevant diagrams and update references if needed.
6. Update the journal with what was regenerated/refreshed and set the next action according to the active pipeline step (do not force a pipeline jump if the project is not in a standalone diagram phase).
