---
name: spec-parser
description: "Use when the user says \"start\", \"implement from spec\", or points to a requirements/spec file, or when the journal is missing. Parses the spec, raises blocking questions, and creates the journal."
trigger: User says "start", "implement from spec", or points to a requirements/spec file
---

# Spec Parser

## Journal layer

Do not create a second tree. `continue` copies `journals/work-items/_TEMPLATE/`. A blocking question becomes a map node through journal-keeper and becomes the active leaf. Its id is unique and is not `work-item` or a phase name. Use AskUserQuestion for a fixed choice and chat for an open answer.

Parses the project specification, extracts requirements, validates, and lists assumptions and open questions. Use when starting the project, when the user points to a spec file, or when the spec has changed and must be re-parsed.

## When to use

- User says "start", "implement from spec", or points to a requirements/spec file
- Pipeline is at spec phase or journal says next action is "run spec-parser"
- User indicates the spec has changed and must be re-parsed

## Workflow-Aware Behavior

This skill adjusts artifact paths and questions based on workflow type:

**Developer workflow:**
- Artifact path: `work-items/<id>/docs/design/requirements-summary.md`
- Standard requirement questions

**Production Incident workflow:**
- Artifact path: `work-items/<id>/docs/incident/assessment.md`
- Additional questions:
  - "What is the incident scope? (Datacenter, DB, CustomerID)"
  - "Are there customer escalations? Which customers?"
  - "What dashboards show the issue? (DBHS, SLO Tracker, logs and monitoring)"
  - "What is the rollback count?"

## Instructions

### Work Item Context & Facts/Rules Loading

0. **Get Work Item context:**
  - Read active Work Item ID from `.claude/active-work-item.txt`
  - Work Item paths: `work-items/<work-item-id>/[path]`
  - Journal: `work-items/<work-item-id>/journal/progress.md`

**0a. Check if spec-parser should run for this workflow:**
  - Read journal **Workflow type** field
  - **If production-incident workflow:** Spec-parser runs but uses incident-specific artifact path (see step 2)
  - **If developer workflow:** Continue with spec parsing (standard behavior)
  - **If Custom pipeline (legacy):** Check MyRole.txt to see if spec phase is included; if not, skip

1. **Load facts and rules:**
  - Read the **workflow-split** Expert Role memory. The single `facts/facts.md` / `facts/rules.md` are archived. Load `facts/MEMORY-INDEX.md` first, then the current workflow's pair (developer → `facts/facts-developer.md` + `facts/rules-developer.md`; production-incident → `*-incident-response.md`).
  - Read `work-items/<work-item-id>/facts/facts.md` (Work Item facts, if any exist yet)
  - Read `work-items/<work-item-id>/facts/rules.md` (Work Item rules, if any exist yet)
  - Internalize: Rules MUST be followed; Facts provide context
  - Log loaded facts/rules labels to journal via journal-keeper

### Spec Location and Creation

2. **Determine artifact path based on workflow type:**
  - Read `work-items/<work-item-id>/journal/progress.md` to get workflow type
  - Set artifact path:
  - developer: `docs/design/requirements-summary.md`
  - production-incident: `docs/incident/assessment.md`

3. **Locate or create spec file:**

  a. **Check for spec in Work Item folder first:**
  - Look for `work-items/<work-item-id>/spec.md`
  - If found, use this as the spec source

  b. **Check for spec at repo root (legacy):**
  - If not in Work Item folder, check `spec.md` at repo root
  - If found, use this as the spec source

  c. **Check journal for custom spec path:**
  - If journal has a custom spec file path, use that

  d. **If no spec file exists:**
  - At this point, we're in Developer pipeline (production-incident uses Q&A from workflow-selector)
  - Developer pipeline requires requirements documentation

**No spec found - offer options:**
  - Ask user: "No spec.md file found. Would you like to:"
  - Option 1: "Provide a path to an existing spec file"
  - Option 2: "Begin a specification Q&A session to create spec.md"
  - Option 3: "Skip spec and provide requirements informally"

**If user chooses Option 2 (Q&A session):**
  - Conduct structured requirements gathering via questions:
  - What problem does this solve? (Problem statement)
  - Who are the users/stakeholders?
  - What are the key features/capabilities?
  - What are the constraints? (technology, timeline, budget, compliance)
  - What are the success criteria?
  - What is out of scope?
  - Any dependencies or integrations?
  - As user answers, build spec content incrementally
  - Write completed spec to `work-items/<work-item-id>/spec.md`
  - Confirm: "Created spec.md at work-items/<work-item-id>/spec.md"

**If user chooses Option 3 (informal):**
  - Gather requirements conversationally
  - Document in `work-items/<work-item-id>/docs/design/requirements-summary.md` directly
  - Note in journal: "No formal spec; requirements captured informally"

4. **Read the spec file** (from determined location)

5. **Cross-reference spec against loaded facts/rules:**
  - Check if any Expert Role rules constrain requirements (e.g., "must use X technology", "no Y pattern")
  - Check if any Expert Role facts provide context (e.g., "team prefers Z approach")
  - Note any conflicts or relevant constraints

6. **Ask workflow-specific questions:**
  - For all workflows: Standard requirement questions (what, why, constraints, success criteria)
  - For production-incident: Add incident-specific questions (scope, escalations, dashboards, metrics) if not already captured by workflow-selector

7. Emit a requirements summary and write it to the workflow-specific artifact path (from step 2).

8. Emit assumptions and open questions; classify each as **blocking** (major/high-risk) or **deferred** (resolve when reaching the task that needs the answer). **Flag possible blockers** the user should be aware of: external dependencies (e.g. downloads from GitHub, Hugging Face), APIs, access or credentials, so these can be discussed early and the agent and user stay in agreement.

9. Write open questions into `work-items/<work-item-id>/journal/progress.md` under Open questions (blocking) and Open questions (deferred). Do not proceed past this phase until all blocking questions are answered by the user.

10. If the user has answered any question in this turn, record the question and answer in Resolved Q&A in the journal in the **same response** and remove it from open questions.

11. Record spec file path and last-modified (or a version) in the journal for spec-change detection. Path should be relative to repo root or indicate if spec was created via Q&A session.

### Proactive Detection

12. **Watch for new facts/rules during requirements analysis:**
  - User provides constraints not in rules (e.g., "we must use Python 3.11+")
  - User describes team practices (e.g., "we always use pytest for testing")
  - If detected, use remember skill to propose capturing

### Completion

13. After completion (and only when blocking questions are empty), set next action based on **Workflow type** field in journal:
  - **developer:** "run hld-writer"
  - **production-incident:** "run analyze-root-cause" (skip HLD)
  - **Custom pipeline (legacy):** Next phase from MyRole.txt definition

14. Update the journal via journal-keeper with phase completed, artifacts (including spec file location and workflow-specific artifact path), facts/rules loaded.

## Spec Q&A Session Example

When conducting a spec Q&A session to create spec.md, follow this structured approach:

**Step 1: Problem Statement**
- "What problem are you trying to solve?"
- "Who is affected by this problem?"

**Step 2: Solution Overview**
- "What solution do you envision?"
- "What are the key capabilities/features needed?"

**Step 3: Users & Stakeholders**
- "Who will use this?"
- "Are there different user roles?"

**Step 4: Constraints**
- "Are there technology constraints? (e.g., must use .NET, Python, cloud platform)"
- "Are there timeline or budget constraints?"
- "Any compliance or security requirements?"

**Step 5: Success Criteria**
- "How will you know this is successful?"
- "What metrics or outcomes define success?"

**Step 6: Scope Boundaries**
- "What is explicitly out of scope?"
- "What can be deferred to future phases?"

**Step 7: Dependencies**
- "Are there external systems to integrate with?"
- "Any third-party services or APIs?"
- "Any existing codebases or data sources?"

After gathering answers, synthesize into a structured spec.md with sections:
- Problem Statement
- Solution Overview
- Users & Stakeholders
- Requirements (Functional & Non-Functional)
- Constraints
- Success Criteria
- Out of Scope
- Dependencies & Integrations
- Assumptions
