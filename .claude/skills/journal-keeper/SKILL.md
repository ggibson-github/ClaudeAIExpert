---
name: journal-keeper
description: "Use after every pipeline phase completes or when the user answers a question - updates the active journal (phase completed, artifacts, Resolved Q&A, next action) and folds merged background-agent notes into the proper sections."
trigger: After every phase completion or when the user answers a question
---

# Journal Keeper

Updates the Work Item progress journal after each phase or when the user answers a question. Use after every phase completion and whenever a decision is recorded. Now Work Item-aware with facts/rules tracking and pipeline support.

## When to use

- After every phase completion (spec-parser, hld-writer, dd-writer, diagram-generator, task-breakdown, scaffold-project, implement-feature)
- Whenever the user answers a blocking or deferred question (record in same response)
- At session end (write Last session summary)
- When facts/rules are loaded or proactively detected

## Instructions

### Where notes go

Three stores. Do not put step notes in the flat journals.

- Expert journal: `journals/expert/progress.md` (current work item line, future work that is not a work item yet)
- Work item journal: `journals/work-items/<id>/progress.md` (premise, goal, workflow type, decisions every branch inherits, completion status)
- Branch map: `journals/work-items/<id>/state.json` (`active` path and `history` only)
- Node notes: `journals/work-items/<id>/nodes/<node-id>.md` (step notes, questions, next action)

`work-items/<id>/journal/progress.md` is a pointer. Do not write notes there.

Preserve the exact `Current work item:` line. Only `continue` and `switch-context` may change it.

`active` is the path from `work-item` to the leaf. `history` is the descendant path below a node, not including that node. A load reads `active` only. A closed question must not stay in `history`.

A blocking question becomes the active leaf. Its id is unique and is not `work-item` or a phase name. Answering or deferring it: if another open blocking question remains, move `active` there; otherwise return `active` to the parent, update that parent's next action, and clear `history`. Use **AskUserQuestion** for a fixed choice. Use chat for an open answer.

### Work Item Context

1. **Read active Work Item ID** from `.claude/active-work-item.txt` (or `work-item:<id>` in `.claude/active-context.txt`)
2. **Flat journal:** `journals/work-items/<work-item-id>/progress.md`
3. **Active note:** the last id in `state.json` `active`, file `nodes/<id>.md`
4. **STATUS path:** `work-items/<work-item-id>/STATUS.md`

### Journal Schema (Extended for Work Items)

Maintain the full journal schema with these fields:

**Work Item Context:**
- **Work Item ID:** `WID-XXXXXXXXX`
- **Work Item description:** [Brief description]
- **Workflow type:** `developer | production-incident` (set by workflow-selector; never changes)
- **Pipeline:** `developer | adhoc-incident | [custom-pipeline-name]` (legacy field for backward compatibility)
- **Pipeline phases:** [Phase sequence for this pipeline]

**Workflow-Specific Context:**
- [Production Incident fields: Incident scope, Customer escalations, Incident bridge URL]
- [External references: chat threads, issue tracker tickets, logs and monitoring alerts, documentation pages]

**Standard Fields:**
- **Spec file:** `spec.md`
- **Spec version / last modified:** [YYYY-MM-DD or detect changes]
- **Mode:** greenfield | iterative feature
- **Current phase:** not started | spec | hld | dd | diagrams | task-breakdown | scaffold | implementation | done
- **Current feature id:** [For iterative mode only]
- **Repo URL:** [Optional; none if not connected]
- **Current branch:** [e.g., main, feature/WID-214111151-description]
- **Last completed:** [Last task/phase completed]
- **Next action:** [Exact pipeline step to run next]

**Artifacts:**
- List of created files/folders with paths relative to Work Item folder (e.g., `docs/design/hld.md`, `docs/diagrams/hld-architecture.mmd`)

**Facts and Rules Context (NEW):**
- **Work Item facts loaded:** [List of fact labels/IDs from `work-items/<id>/facts/facts.md`]
- **Work Item rules loaded:** [List of rule labels/IDs from `work-items/<id>/facts/rules.md`]
- **Expert Role facts applied:** [List of expert-level fact labels/IDs from the workflow-split file, e.g. `facts/facts-developer.md` or `facts/facts-operations.md`]
- **Expert Role rules applied:** [List of expert-level rule labels/IDs from the workflow-split file, e.g. `facts/rules-developer.md` or `facts/rules-operations.md`]
- **Rule violations / conflicts:** [Any conflicts detected between rules or design decisions]
- **Proactively detected facts/rules:** [Facts/rules detected during work and proposed to user, with date and outcome]

**Questions and Decisions:**
- **Open questions (blocking):** [MUST be empty to proceed past spec/HLD]
- **Open questions (deferred):** [Resolve when reaching the task that needs the answer]
- **Resolved Q&A / Decisions:** [Every user answer recorded here with question ID, question, answer, date]

**Blockers:**
- **Status:** none | waiting on user | waiting on external | build failed | blocking question
- **Pause reason / Delay:** [e.g., "Waiting for API key", "Waiting for HLD approval"]
- **Last failure / Retry state:** [For recovery on continue]

**Completion:**
- **Completion status:** not started | in progress | done
- **Last session summary:** [One paragraph: what was done, next step, what's needed from user]

**Design Metadata:**
- **HLD profile:** [unset until HLD runs] standard | part1 | extended
- **HLD intake links:** [Optional designs, prior HLD, documentation URLs]
- **GovCloud / compliance review:** unknown | required | not required | n/a

### Update Procedures

**After each phase:**
1. Write the phase completed to **Last completed**
2. Add artifacts produced to **Artifacts** list (use Work Item-relative paths)
3. Set **Next action** to next pipeline step (based on **Workflow type** or legacy **Pipeline** field)
4. If facts/rules were loaded, update **Facts and Rules Context** section
5. If new facts/rules were proactively detected and captured, add to **Proactively detected facts/rules**
6. **After hld-writer phase completes**: Ensure **HLD profile**, **HLD intake links**, and **GovCloud / compliance review** are set
7. Do not mark a phase complete if blocking questions remain unanswered
8. **Preserve workflow type and workflow-specific context fields** - these are set once by workflow-selector and never changed

**When user answers a question:**
- In the **same response**, add question and answer to **Resolved Q&A / Decisions**
- Remove the question from **Open questions (blocking)** or **Open questions (deferred)**
- Include date: `[YYYY-MM-DD] Q: [question] A: [answer]`

**When facts/rules are loaded (at skill start):**
- Update **Work Item facts loaded** with labels from `work-items/<id>/facts/facts.md`
- Update **Work Item rules loaded** with labels from `work-items/<id>/facts/rules.md`
- Update **Expert Role facts applied** with labels from the workflow-split facts file (e.g. `facts/facts-developer.md`, `facts/facts-operations.md`)
- Update **Expert Role rules applied** with labels from the workflow-split rules file (e.g. `facts/rules-developer.md`, `facts/rules-operations.md`)
- If any rule conflicts detected, note in **Rule violations / conflicts**

**When facts/rules are proactively detected:**
- Add entry to **Proactively detected facts/rules**
- Format: `[YYYY-MM-DD] Detected [fact/rule]: [label] - [user approved/declined]`

**At session end:**
1. Write **Last session summary** (one short paragraph: what was done, what is next, what is needed from user)
2. Optionally refresh `work-items/<work-item-id>/STATUS.md` with:
 - Last updated timestamp
 - Current phase
 - Last session summary
 - Next action

**Trigger audit snapshot (automatic, deterministic):**
3. After journal update is complete, execute: `bash .claude/hooks/post-journal-update.sh`
 - This is automatic and deterministic - agent doesn't manage content
 - Hook script handles Git commit of journal/status state
 - Script auto-initializes Git on first use (engineer's local copy)
 - If script fails, log error but don't block workflow
 - Agent simply invokes script; hook captures state independently
 - Creates audit trail for time-travel and recovery

**Merge background-agent notes (automatic, parallel-safe):**
- Background agents do **not** edit `progress.md` directly. Each writes to the agent-notes drop folder (loose note `agent-notes/<label>.md`, or a shared-task folder `agent-notes/tasks/<task-id>/` gated by a manifest - see that folder's README). This prevents collisions when several agents run at once.
- The merge is **automatic and deterministic**: the `SubagentStop` and `Stop` hooks (`.claude/settings.json`) run `.claude/hooks/merge-agent-notes.sh` after every subagent finishes and every main-agent turn. It is lock-guarded and idempotent; shared tasks merge only once **all** their subtasks are present. Merged notes land in `progress.md` under a timestamped section; originals are archived to `agent-notes/merged/`; the audit commit runs via `post-journal-update.sh`. You do **not** need to invoke the merge yourself.
- Your job after a merge: fold the appended raw notes into the proper journal sections (Artifacts, Resolved Q&A / Decisions, Next action) and set the real next step, exactly as you would for a phase you ran yourself. If you haven't yet, the content is already present and current – tidiness is pending, not truth.

**Workflow-aware next actions:**
- For **developer workflow**: Follow standard sequence (spec → hld → dd → task-breakdown → scaffold → implement → done)
- For **production-incident workflow**: Follow incident sequence (assess-incident → analyze-root-cause → apply-mitigation → monitor-impact → resolve-and-document → done)
- For **legacy pipelines**: Map old pipeline names to workflow types (adhoc-incident → production-incident)

### Artifact Paths

All artifact paths are Work Item-scoped:
- `docs/design/` → Design documents (HLD, DD, requirements-summary.md)
- `docs/diagrams/` → Mermaid diagrams and index.html
- `docs/decisions/` → ADRs
- `docs/features/<feature-id>/` → Feature-specific docs (for iterative mode)
- `facts/` → Work Item facts and rules
- `tests/` → Work Item tests (if not using global tests)
- `TODOS.md` → Task list
- `STATUS.md` → Status summary

### Example Journal Updates

**After HLD completion:**
- **Last completed:** hld-writer 
- **Next action:** wait for HLD approval
- **Artifacts:** [docs/design/hld.md, docs/diagrams/hld-architecture.mmd, docs/diagrams/hld-system-context.mmd, docs/diagrams/index.html]
- **HLD profile:** extended
- **Expert Role rules applied:** [Repository pattern requirement, No microservices, Integration tests use real DB]

**After proactive detection:**
- **Proactively detected facts/rules:**
 - [2026-04-28] Detected rule: "Integration tests must use real database" - user approved, stored at expert-role level

**At session end:**
- **Last session summary:** Completed HLD with extended profile, generated architecture and system context diagrams. Next: Waiting for HLD approval. Please review docs/design/hld.md and reply with "I approve the HLD" to proceed to DD phase.

### Notes
- Journal is the single source of truth for Work Item state across sessions
- All pipeline skills read from and write to this journal via journal-keeper
- Facts/rules tracking enables visibility into what knowledge informed decisions
- Workflow type field determines phase sequence (developer vs production-incident)
- Workflow type is set once by workflow-selector and never changes for a Work Item
- Workflow-specific context fields (incident scope, external references) must be preserved across updates
