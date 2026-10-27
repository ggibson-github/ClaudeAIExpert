---
name: continue
description: Use when the user says "continue", "start", or "resume" with no other instruction. Runs define-role while the role is pending, then reads the active journal and performs the next pipeline step. Does NOT mean approval of a gate or an answer to an open question.
trigger: User says "continue", "start", or "resume"
---

# Continue

Resumes the project pipeline from the journal. Use when the user says "continue", "start", or "resume" so the agent reads the journal and performs the next step.

## When to use

- User says "continue", "start", or "resume"
- User asks to pick up where the project left off
- When the pipeline is waiting for an answer or approval, "continue" means re-prompt, not "user answered" or "user approved"

## Instructions

**Do not** treat the user saying "continue" as an answer to a question or as approval/waiver of a gate. "Continue" means only: read the journal and perform the next step. If that step is waiting for an answer or for approval, re-prompt and do **not** advance until the user gives a substantive answer or explicitly approves/waives (e.g. "I approve the HLD" or "Skip HLD approval"). The word "continue" by itself is not an answer and is not approval. Role questions use the same rule: "I approve the role" or "Skip role definition" is the approval, not the word continue.

### Role gate (before any Work Item)

0. Read `MyRole.txt` at the workspace root.
 - If the user said "define my role", run the define-role skill and stop.
 - If `Role status` is `pending` or the field is missing, run define-role and stop. Do not ask for a Work Item ID.
 - If `Role status` is `defined` or `skipped`, continue to step 0a.
 - Do not run a skill marked not used in `.claude/role-skills.md` when that file exists.

### Context Initialization (Steps 0a-0d)

0a. **Check for active context:**
 - Read `.claude/active-context.txt` (new unified system)
 - Format: `<type>:<id>` (e.g., `work-item:WID-214111151`)
 - If file exists: parse type and id, set `context_type` and `context_id`
 - If file missing: check `.claude/active-work-item.txt` (legacy) → assume `context_type=work-item`
 - If both missing: proceed to step 0b

0b. **Prompt for context:** If no active context, ask user: "What are you working on? (work item WID-XXXXXXXX)". Parse response:
 - If starts with "WID-": `context_type=work-item`, `context_id=WID-XXXXXXXX`
 - Write to `.claude/active-context.txt` as `<type>:<id>`
 - If work-item: also write to `.claude/active-work-item.txt` for backward compatibility.

0c. **Set context paths based on type:**
 - If `context_type=work-item`:
 - `root_path=work-items/<context_id>/`
 - `journal_path=journals/work-items/<context_id>/progress.md`
 - `map_path=journals/work-items/<context_id>/state.json`
 - The role file `work-items/<context_id>/journal/progress.md` is a pointer. Do not write notes there.

0d. **Load or select workflow type:**
 - Read `<journal_path>` to check for "Workflow type" field
 - If missing: invoke `workflow-selector` skill → user selects workflow → reload journal
 - If "Pipeline" field exists but no "Workflow type" (backward compat): map old pipeline names:
 - "developer" → "developer"
 - "adhoc-incident" → "production-incident"
 - other → "developer" (default)
 - Read `.claude/workflows/workflow-registry.json` to get workflow metadata
 - Load workflow instruction file: `.claude/workflows/<workflow-type>.md`
 - Use loaded workflow to understand phase sequence, approval gates, artifact organization

0e. **Initialize folder structure:** If `<root_path>` does not exist:
 - If `context_type=work-item`: copy structure from `work-items/_TEMPLATE/`
 - If `journals/work-items/<context_id>/` does not exist, copy `journals/work-items/_TEMPLATE/` there and set **Work item record** to `work-items/<context_id>/`
 - Write `Current work item: <context_id>` in `journals/expert/progress.md`. If that file is missing, copy `journals/_TEMPLATE/expert/progress.md` first. Do not leave a sample id in the line.
 - If `active` is only `work-item`, set it to `work-item` then the workflow's first phase when that phase is outside the current path. Do not drop a longer path that is already under the same phase. After changing `active`, read the new note files once and work from that read.

### Facts and Rules Loading (Step 0f)

0f. **Load facts and rules at session start (workflow-filtered):**
 - Read current workflow type from `<journal_path>` (field: **Workflow type:**)
 - Read the **workflow-split** Expert Role memory. The single `facts/facts.md` / `facts/rules.md` are archived. Load `facts/MEMORY-INDEX.md` first, then the pair matching the workflow type read above (developer → `facts/facts-developer.md` + `facts/rules-developer.md`; production-incident → `*-incident-response.md`). The workflow-filtering below then applies within those files.
 - Read `<root_path>/facts/facts.md` (Context-level facts)
 - Read `<root_path>/facts/rules.md` (Context-level rules)
 - **Filter Expert Role facts/rules by workflow:** For each fact/rule entry:
 - Extract `**Workflows:**` metadata field (default "all" if missing)
 - Parse comma-separated list of applicable workflows
 - Include entry if "all" OR current workflow matches
 - Discard entry if current workflow not in list
 - **Context-level facts/rules:** Do NOT filter - they inherit the context's workflow
 - Internalize filtered facts/rules: Rules MUST be followed during all work; Facts provide context for decisions
 - Log to journal: "Loaded X facts and Y rules (Z total facts, W total rules) for [workflow] workflow"
 - If any rules conflict, note in journal under "Rule violations / conflicts"

### Pipeline Execution (Steps 1-8)

1. **Read context journal:** Read `<journal_path>` (determined in step 0c). If the file is missing or empty, initialize it from template (step 0e should have created it), set workflow from step 0d, set next action to first phase of selected workflow, and proceed.
2. **Blocking questions:** If Open questions (blocking) is non-empty, ask the user those questions and do not advance until they are answered. **The word "continue" is not an answer.** If the user only said "continue", re-ask the blocking questions and do not advance. Only when the user provides a substantive answer (and you record it in Resolved Q&A) may you proceed. When the user answers, record each question and answer in Resolved Q&A in the **same turn** and remove from open questions, then re-evaluate.
3. **Blockers / Last failure:** If Blockers or Last failure is set, **communicate with the user**: describe the block clearly, explain what failed or what is needed, and **discuss how to proceed**. Do not skip the blocked step or assume a workaround without the user's agreement. Wait for the user to agree on next steps (e.g. retry, alternative approach, manual action). Only then clear the blocker and update the journal.
4. **Wait for approval:** If next action is "wait for HLD approval", "wait for DD approval", "wait for feature approval" (or similar), do **not** advance. Re-surface the item: e.g. "The HLD is ready at docs/design/hld.md. Please review and reply with 'I approve the HLD' or 'Skip HLD approval' to proceed. Saying 'continue' does not count as approval." Do not record approval in the journal and do not set next action to the following step until the user explicitly approves or waives. Only then update the journal (e.g. "HLD approved on ...") and set next action to the next pipeline step (e.g. "run dd-writer" for HLD approval; "run diagram-generator" for DD approval).
5. **Done or empty:** If next action is empty or "done", stop and optionally ask the user what they want to do next.
6. **Otherwise perform the single next step (workflow-aware, with context-scoped paths):**

**Path context:** All artifact paths use `<root_path>` determined in step 0c. Paths vary by workflow type and context type (see loaded workflow file).

**Developer workflow phases (work-item context):**
 - "run spec-parser" → write to <root_path>/docs/design/requirements-summary.md
 - "run hld-writer" → write to <root_path>/docs/design/, diagrams to docs/diagrams/
 - "run dd-writer" → write to <root_path>/docs/design/, diagrams to docs/diagrams/
 - "run diagram-generator" → <root_path>/docs/diagrams/
 - "run task-breakdown" → write to <root_path>/TODOS.md
 - "run git-workflow (setup)" → stash uncommitted changes if needed, fetch latest code, create feature branch feature/WID-<id>, ask commit strategy, then next: run scaffold-project
 - "run scaffold-project" → create context-specific or global structure
 - "implement-feature (task K/N)" → read <root_path>/TODOS.md, implement task K
 - "run iterative-feature" → docs/features/<feature-id>/, approval, branch, implement, test
 - "run refactor" → run refactor workflow; run full test suite after
 - "run git-workflow (commit/PR)" → commit if single strategy, fetch/merge latest, wait for user build/test confirmation, create PR
 - "run git-workflow" → legacy entry point, determine mode from context (setup vs commit/PR)

**Production Incident workflow phases (work-item context):**
 - "run assess-incident" → write to <root_path>/docs/incident/assessment.md
 - "run analyze-root-cause" → write to <root_path>/docs/incident/root-cause-analysis.md
 - "run apply-mitigation" → write to <root_path>/docs/incident/mitigation-log.md
 - "run monitor-impact" → update docs/incident/mitigation-log.md with observations
 - "run resolve-and-document" → write to <root_path>/docs/incident/resolution.md

(Consult loaded workflow file for complete phase sequence and routing)  
  
(Do not run any of the above when next action is a "wait for … approval" value; step 4 handles those.)
7. After the step, update the context journal (journal-keeper behavior): phase completed, next action set, artifacts updated, facts/rules loaded tracked, proactively detected facts/rules recorded. For iterative mode, update Mode, Current feature id, Current branch, Repo URL as needed. Journal path: `<journal_path>`.
8. At session end, write **Last session summary** in the context journal and optionally refresh `<root_path>/STATUS.md`.
9. **Prompt for fact/rule promotion at context completion:** When context reaches "done" status, ask user: "Would you like to review and promote facts/rules from this work item to Expert Role level?" If yes, run promote-facts-rules skill.

Always follow the phase order. Do not skip phases unless the journal says the phase is already complete and the artifact exists.
