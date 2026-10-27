---
name: remember
description: Use when the user says "remember this", "note this down", "save this", "capture this", or provides a fact/rule to store – or when the agent proactively detects a new reusable pattern, constraint, or procedure worth capturing. Classifies content as fact vs rule and Work Item vs Expert Role scope, then stores it in the workflow-split memory files.
trigger: User says "remember this", "note this down", "save this", or similar
---

# Remember / Note down

Captures facts and rules with structured classification when the user says "remember this", "note this down", "save this", or similar. Facts are observations/data (informative); rules are constraints/procedures (prescriptive). Content is classified by type and scope (Work Item-level vs Expert Role-level) and stored in structured markdown files for automatic loading during skill execution.

## When to use

- User says "remember this", "note this down", "save this", "capture this", "note that", or similar and provides text to store
- User specifies scope/type inline: "remember this as a work-item fact", "remember this as an expert rule"
- Agent proactively detects new patterns during work (see Proactive Detection section)

> **Memory model (read first):** Expert Role memory is **workflow-split** (since 2027-01-01). There is no
> single `facts/facts.md` or `facts/rules.md` – those were archived (`facts-ARCHIVE-2027-01-01.md`,
> `rules-ARCHIVE-2027-01-01.md`). Store each Expert Role capture in the file matching its `Workflows:`
> value: facts -> `facts/facts-developer.md` | `facts/facts-incident-response.md` | `facts/facts-operations.md`;
> rules -> `facts/rules-developer.md` |
> `facts/rules-incident-response.md` | `facts/rules-operations.md`.
> `Workflows: all` -> store in the developer file (or the one it's most used in) with `**Workflows:** all` so
> every loader includes it. Add a pointer to `facts/MEMORY-INDEX.md` when the capture
> introduces a new topic.
> **Work Item context-level** captures are NOT split – use `work-items/<id>/facts/facts.md`
> and `.../rules.md` as written.
> When cross-referencing for duplicates, read the split Expert Role files, not the archived monoliths.

## Instructions

### User-Initiated Capture

When user says "remember this" (or similar):

1. **Check for inline scope/type specification:**
    - If user said "as a work-item fact" or "as a WI fact" -> type=fact, scope=work-item
    - If user said "as an expert fact" or "as an expert-role fact" -> type=fact, scope=expert-role
    - If user said "as a work-item rule" or "as a WI rule" -> type=rule, scope=work-item
    - If user said "as an expert rule" or "as an expert-role rule" -> type=rule, scope=expert-role
    - If no inline specification, proceed to step 2.

2. **Cross-reference against existing facts/rules:**
    - Read ALL fact/rule files:
    - Expert Role (workflow-split): `facts/facts-developer.md`, `facts/facts-incident-response.md`, `facts/facts-operations.md` (facts) and `facts/rules-developer.md`, `facts/rules-incident-response.md`, `facts/rules-operations.md` (rules) – read the file(s) for the current workflow first, and any other workflow the content might already live under
    - `work-items/<work-item-id>/facts/facts.md` (Work Item facts)
    - `work-items/<work-item-id>/facts/rules.md` (Work Item rules)
    - Search for existing captures that match or overlap with the content
    - If match found: "This appears similar to existing [fact/rule] '[label]' in [file]. Should I: (a) Update existing, (b) Create new entry, (c) Skip?"
    - Wait for user response before proceeding

3. **Ask classification questions (if not specified inline):**

**Question 1: Type**
    - "Is this a **fact** (observation/data) or a **rule** (constraint/procedure)?"

**Fact:** Observations, data, context (informative)
    - Things that ARE (observations about the codebase, environment, team)
    - Locations, URLs, contact information
    - Architecture descriptions ("We use monolithic architecture")
    - Historical context ("This was added because...")
    - Where to find things ("Error handling in CExceptionHandler")

**Rule:** Constraints, procedures, patterns to follow (prescriptive)
    - Things that MUST be done or avoided
    - Procedures to follow ("Always do X before Y")
    - Constraints ("Never use X", "Always check Y")
    - Patterns to apply ("Use repository pattern for data access")
    - Deployment requirements ("Database changes deploy before C# changes")

**Decision tree for ambiguous cases:**
    - "We prefer X over Y" -> **Fact** (observation about preference)
    - "Always use X, never Y" -> **Rule** (constraint)
    - "X is located at..." -> **Fact** (location information)
    - "Check X before doing Y" -> **Rule** (procedure)
    - "Lines 228-240 resolve table name" -> **Fact** (code detail, likely Work Item-level)
    - "T-SQL uses OUTPUT parameters for error context" -> **Fact** (pattern observation, Expert-level)
    - "Always check for NULL before using OUTPUT parameters" -> **Rule** (coding standard)

**Question 2: Scope**
    - "What scope does this apply to?"

**Work Item-level Facts/Rules** (specific to current WI):
    - Line numbers, file paths, specific variable names
    - This work item's specific design decisions
    - Implementation details of current feature
    - Temporary workarounds or one-time solutions
    - "Lines 470-487 read OUTPUT parameters" (too specific)
    - "We decided to use approach X for this feature" (this WI only)

**Expert Role-level Facts/Rules** (reusable across WIs):
    - Where to find categories of code (e.g., "Error handling is in the data access layer")
    - General architecture patterns (e.g., "The application uses T-SQL -> C# error propagation")
    - Team conventions (e.g., "Always check NULL before using OUTPUT params")
    - File/directory locations (e.g., "Main App is at c:\projects\main_app")
    - Deployment practices (e.g., "Deploy database before C# changes")
    - Coding standards (e.g., "All stored procedure params must be backwards compatible")
    - Testing requirements (e.g., "Integration tests must hit real database")

**When in doubt:**
    - If it's a general principle or pattern -> Expert Role-level
    - If it contains specific line numbers or implementation details -> Work Item-level
    - If you'd need to know it for similar work in the future -> Expert Role-level
    - If it's only relevant to understanding this specific feature -> Work Item-level

**Question 3: Workflow Applicability (Expert Role-level only)**

Skip if scope is Work Item-level (WI facts/rules inherit workflow from Work Item context).

If scope is Expert Role-level, ask: "Which workflows does this apply to?"

**Smart default behavior:**
    - Read current workflow from `journals/work-items/<work-item-id>/progress.md`
    - Default to current workflow (e.g., "production-incident")
    - User can override by saying "all", "developer", "production-incident", or "production-incident, developer"

**Decision tree for workflow selection:**
    - Coding standards, testing patterns, deployment rules, SQL development -> `developer`
    - Architecture, monitoring, team contacts, environment URLs -> `all`
    - When in doubt -> `all`

**Question 4: Action Trigger (rules only)**

Ask this for **rules** (constraints/procedures); facts are browse-only and skip it.

Ask: "What tool-action is the agent about to take when this rule becomes relevant?" This is the **action axis** – independent of workflow – that lets the PreToolUse hook (`.claude/hooks/inject-rules-on-action.sh`) surface the rule at the exact moment of the action, in *any* session, not just the workflow file it's filed under. This is the mechanism that fixes "the rule was never loaded."

**Trigger vocabulary** (comma-separate multiple; use `none` if the rule is pure background/judgment with no discrete tool-action moment):
    - `write:sql` – about to Write/Edit any `.sql` file
    - `write:customer-html` – about to Write/Edit a customer-facing `.html`
    - `write:customer-sql` – about to emit recommended SQL into a customer deliverable
    - `pr:open` – about to run `gh pr create`
    - `git:push` / `git:commit` – about to run `git push` / `git commit`
    - `config:change` – about to change a config
    - `sql:generate` – about to generate SQL from memory (companion to evidence-based rules)
    - `none` – no discrete tool-action trigger

**Principle:** `Triggers:` answers "what is the agent about to DO that means it needs this rule RIGHT NOW", NOT the rule's topic. A SQL-coding-standard rule -> `write:sql`; a PR-policy rule -> `pr:open`; a diagnostic judgment principle -> `none`.

**Storage format:**
```markdown
## YYYY-MM-DD: [Label]
**Scope:** expert-role
**Workflows:** production-incident
**Triggers:** write:sql | none + rules only; see vocabulary above
**Captured:** YYYY-MM-DD
[Content]
---
```

**After storing a rule with a real trigger** (anything other than `none`), regenerate the trigger index so the hook picks it up:
```bash
python scripts/memory/build_trigger_index.py
```

3.5. **Size Management and File Organization:**

Before storing, assess content size and scope:

**Inline Storage (in facts.md or rules.md):**
    - Short facts/rules (< 50 lines)
    - Single concept or pattern
    - Frequently referenced content

**Separate File Storage:**
    - Large collections (> 50 lines)
    - Multiple related facts/rules on same topic
    - Detailed procedures or extensive lists
    - Content with complex formatting (tables, code blocks, nested lists)

**Pattern for separate files:**
    - Create file: `facts/<topic>-<type>.md`
    - Examples: `facts/deployment-rules.md`, `facts/monolith-files.md`, `facts/config-change-procedures.md`
    - In main facts.md or rules.md, add pointer entry:
```markdown
## YYYY-MM-DD: [Topic] - See Separate File
**Scope:** expert-role
**Captured:** YYYY-MM-DD
**Source:** [reference]
**File:** [topic-type.md](topic-type.md)

**Summary:** 1-2 sentence overview of what's in the separate file

**Quick Reference:**
- Key point 1
- Key point 2
- Key point 3

---
```
    - In separate file, use same metadata format but include full content

**When to use separate files:**
    - Collection of 5+ related rules (e.g., all deployment rules)
    - Comprehensive lists (e.g., file locations, API endpoints)
    - Multi-step procedures with detailed explanations
    - Reference material that's consulted but not memorized
4. **Infer or use label:** If user provided a short label/title, use it. Otherwise, infer a brief label from content (e.g., "Architecture constraint", "Testing requirement", "Team contact", "API URL").
5. **Store appropriately based on type and scope:**

**File paths:**
    - Work Item facts: `work-items/<work-item-id>/facts/facts.md`
    - Work Item rules: `work-items/<work-item-id>/facts/rules.md`
    - Expert Role facts: the workflow-split file by `Workflows:` value – `facts/facts-developer.md` | `facts/facts-incident-response.md` | `facts/facts-operations.md` (`all` -> developer file, keep `**Workflows:** all`)
    - Expert Role rules: the workflow-split file by `Workflows:` value – `facts/rules-developer.md` | `facts/rules-incident-response.md` | `facts/rules-operations.md` (`all` -> developer file, keep `**Workflows:** all`)
    - After adding an Expert Role entry that introduces a new topic, add a one-line pointer to `facts/MEMORY-INDEX.md`

**Format:**
```markdown
## YYYY-MM-DD: [Label/Title]
**Scope:** work-item | expert-role
**Workflows:** [developer | production-incident | all – expert-role rules only]
**Triggers:** [action token(s) or `none` – rules only; see Question 4 vocabulary]
**Captured:** YYYY-MM-DD
**Source:** [Optional: user name, URL, chat thread, etc.]
**Status:** active

[Content with full formatting preserved - code blocks, links, markdown]

---
```
6. **Append to appropriate file.** If file doesn't exist, create it with header (see template in `work-items/_TEMPLATE/facts/` or `facts/`).
6.5. **Regenerate the trigger index (rules with a real trigger only).** If you stored a **rule** whose `**Triggers:**` is anything other than `none`, run `python scripts/memory/build_trigger_index.py` so the PreToolUse action hook picks it up. (Facts, and rules tagged `none`, don't need this.)
7. **Confirm to user:** "Saved as [fact/rule] at [Work Item/Expert Role] level to [file path]."
8. **Record in journal:** Name the layer. Expert-wide notes go in `journals/expert/progress.md`. Work-item-wide notes go in `journals/work-items/<id>/progress.md`. A note about the current step goes on the active node's note file. Facts and rules themselves stay in `facts/`.


### Proactive Detection During Work

When performing design, implementation, or decision-making work, the agent should watch for patterns that indicate new facts or rules:


**Triggers for proactive detection:**
    - User corrects a design decision ("no, not that way", "we don't use X")
    - User provides constraints not yet in rules ("we always do Y", "must use Z")
    - User describes team-specific patterns ("our testing policy is...", "we require...")
    - Repeated patterns across multiple Work Items
    - Workflow deviations from standard pipeline

**When pattern detected:**

1. **Cross-reference against existing facts/rules:**
    - Read ALL fact/rule files first:
    - Expert Role (workflow-split): the `facts/facts-*.md` and `facts/rules-*.md` file(s) for the current workflow (developer / incident-response / operations), plus any other workflow the pattern might already live under
    - `work-items/<work-item-id>/facts/facts.md` (Work Item facts)
    - `work-items/<work-item-id>/facts/rules.md` (Work Item rules)
    - Search for existing captures that match or overlap with the detected pattern
    - Check for contradictions with existing rules

2. **If pattern already exists:**
- Acknowledge: "This is already captured in [file] as '[label]'. I'll apply it to current work."
- Do not propose a duplicate
- Apply the existing fact/rule to current work
3. **If pattern conflicts with existing rule:**
- Alert user: "I noticed [pattern], but this conflicts with existing rule '[label]' in [file]: '[rule text]'. Should I update the existing rule, add this as an exception, or skip?"
- Wait for user decision before proceeding
4. **If novel pattern, propose to user:**
- Present context: "I noticed [pattern/constraint/procedure]."
- Show suggested fact/rule text (formatted, complete)
- Present existing similar facts/rules (if any): "Related existing captures: [list]"
- Ask: "This seems like a new [fact/rule] for your role. Should I remember this?"
- Ask scope: "Should this be Work Item-level or Expert Role-level?"
5. **If user approves:**
- Store using steps 3-7 from User-Initiated Capture above
- Apply the rule immediately to current work
- Continue with task
6. **If user declines:**
- Continue without capturing
- Do not propose the same pattern again this session
**Detection points by skill:**
- **hld-writer:** Architecture rules, design patterns, technology constraints
- **dd-writer:** API conventions, data model patterns, interface standards
- **implement-feature:** Coding standards, testing requirements, error handling patterns
- **iterative-feature:** Feature development workflows, approval processes
- **continue:** Workflow pipeline patterns (deviations from standard)

### Backward Compatibility

- Legacy facts in `docs/facts/captured.md` can remain; they can be migrated to structured format over time
- User can still capture unstructured facts to captured.md if they prefer (but structured facts/rules are preferred)



### Rule Granularity Guidelines

When capturing rules, especially multiple related rules, decide on appropriate granularity:

**Single Rule Entry** (keep as one entry):
- One clear, standalone constraint or procedure
- Simple rule with 1-3 steps
- Fits in < 20 lines including examples
- Example: "Always check for NULL before using new OUTPUT parameters"

**Multiple Related Rules (2-4 rules)** (keep as separate entries):
- Related but distinct constraints/procedures
- Each stands alone and makes sense independently
- Can be referenced individually
- Use consistent labeling pattern (e.g., "Deployment: X", "Deployment: Y")
- Example: Separate rules for "Deploy DB first", "Use NULL defaults", "Check NULL before use"

**Rule Collection (5+ related rules)** (move to separate file):
- Many rules on same topic (e.g., "Config Change Procedures", "Deployment Practices")
- Complex procedures with sub-steps
- Reference material consulted during specific tasks
- Create separate file: `facts/<topic>-rules.md`
- Add pointer entry in main rules.md with summary and quick reference
- Example: `facts/deployment-rules.md` with pointer in main rules.md

**Complex Rule with Sub-steps** (single entry with structure):
- Procedure with multiple steps but single purpose
- Use numbered list or hierarchical structure
- Include "Why" and "How to apply" sections
- Keep in main rules.md if < 50 lines
- Example: "Calculate a config value from P100" with 3 calculation approaches

### Examples

**Example 1: User-initiated rule with inline scope**
User: "remember this as an expert rule: Always use repository pattern for data access"
Agent: Stores to `facts/rules-developer.md` (Workflows: developer) with scope=expert-role, label="Repository pattern requirement"

**Example 2: User-initiated fact with questions**
User: "remember this: API base URL is https://api.example.com/v2"
Agent: Asks "Is this a fact or rule?" -> User: "Fact" -> Agent: "Work Item-level or Expert Role-level?" -> User: "Expert Role" -> asks workflow -> "all" -> Stores to `facts/facts-developer.md` with `**Workflows:** all`

**Example 3: Proactive detection during HLD**
Agent (during HLD design): Proposes microservices architecture
User: "No, we don't use microservices here. We use a monolithic architecture with modular design."
Agent (detects correction): "I noticed we don't use microservices. This seems like a new rule for your role: 'Use monolithic architecture with modular design, not microservices.' Should I remember this?"
User: "Yes, that's an expert rule."
Agent: Stores to `facts/rules-developer.md` (architecture -> Workflows: all or developer), applies to current HLD design

**Example 4: Proactive detection during implementation**
Agent (implementing tests): Creates mocked database tests
User: "No, integration tests must hit a real database, not mocks. We were burned last quarter when mocked tests passed but prod migration failed."
Agent (detects constraint): "I noticed integration tests must use real database. This seems like a new rule: 'Integration tests must hit a real database, not mocks. Reason: prior incident where mock/prod divergence masked a broken migration.' Should I remember this?"
User: "Yes, expert rule."
Agent: Stores to `facts/rules-developer.md` (Workflows: developer), updates test implementation to use real database

## Verify before persist

When notes or proposed memory need operator confirmation before writing, open an `operator-qa` session, record the verification answers in that journal, close to `conclusions.md`, then store only the verified wording.

