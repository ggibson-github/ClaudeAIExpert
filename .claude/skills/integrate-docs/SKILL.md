---
name: integrate-docs
description: "Use when the user provides documentation, notes, Confluence exports, runbooks, or code comments to integrate into the expert system (facts, rules, and MyRole.txt role definition)."
---

# integrate-docs

**Purpose:** Integrate documentation, notes, or knowledge artifacts into the expert system (facts, rules, and role definition).

**When to use:**
- User provides new documentation to integrate (notes files, confluence exports, code comments, runbooks, etc.)
- User wants to update expert knowledge with new domain information
- User wants to capture institutional knowledge from external sources

**Inputs:**
- Path(s) to document(s) containing knowledge to integrate
- Optional: Domain/category hints from user
- Optional: Fact vs rule classification hints

**Outputs:**
- New facts routed into the workflow-split memory files (`facts/facts-developer.md`,
 `facts/facts-incident-response.md`,
 `facts/facts-operations.md`) by their `Workflows:` value
- New rules routed into `facts/rules-developer.md`, `facts/rules-incident-response.md`,
 `facts/rules-operations.md` by their `Workflows:` value
- New/updated reference doc in `facts/` (e.g. `domain-knowledge.md`) for large,
 cross-workflow reference material, with a pointer added to `facts/MEMORY-INDEX.md`
- Updated `facts/MEMORY-INDEX.md` navigation (reference list / Common Scenarios) so new knowledge is discoverable
- Updated `MyRole.txt` if new workflow patterns detected
- Summary report of what was integrated

> **Memory model (read first):** Expert Role memory is **workflow-split**. There is
> no longer a single `facts/facts.md` or `facts/rules.md` — those were archived.
> Each fact/rule carries a `Workflows:`
> field (`all` | `developer` | `production-incident` | comma-separated) that
> determines its destination file. See `facts/MEMORY-INDEX.md` and `facts/HOW-MEMORY-LOADING-WORKS.md`.

---

## Behavior

### Step 1: Gather Documents

Prompt user for document paths:
"What documentation would you like to integrate into the expert system?"

Please provide:
1. File path(s) to the document(s) (e.g., C:\docs\new-runbook.txt)
2. (Optional) A brief description of what this documentation covers
3. (Optional) Is this primarily facts (observations) or rules (procedures)?

You can provide multiple paths separated by commas.


Read all provided documents using the Read tool.

---

### Step 2: Analyze Content

For each document, analyze and identify:

**Facts (observations, data, context):**
- System architecture descriptions
- Environment details (URLs, configurations)
- Table/field definitions
- Monitoring dashboard locations
- Team contacts and channels
- Historical context (why decisions were made)
- Error message catalogs
- Tool locations and versions

**Rules (constraints, procedures, patterns to follow):**
- Standard operating procedures
- Incident response playbooks
- Config change criteria and thresholds
- Required steps in a process
- Validation requirements
- Testing requirements
- Communication protocols (who to notify, when)
- Safety checks before actions

**Role/Workflow Updates:**
- New pipeline patterns
- Workflow modifications
- Responsibility additions

---

### Step 3: Classify and Organize

Group extracted information by domain/category:

**Common Domains for Facts:**
- Application Architecture
- Environments
- Feature Flags
- Monitoring & Dashboards
- Config Changes
- Database Operations
- Common Errors
- Indexes
- Incident Response
- Local Development
- Testing
- Key Tables
- SQL Queries
- Team Collaboration
- Guardrails
- Codebase Structure

**Common Categories for Rules:**
- Config Change Procedures
- Incident Response
- Data Extension Changes
- Monitoring
- Testing
- Database Operations
- Auto-Indexing
- Code Navigation
- Communication Protocols
- Safety Checks

Present classification to user:
"I've analyzed the documentation and identified the following:"

FACTS (observations/data):
- [Domain: Application Architecture] 3 new entries about application architecture
- [Domain: Monitoring & Dashboards] 2 new dashboard URLs
- [Domain: Codebase Structure] 5 new code paths for feature X

RULES (procedures/constraints):
- [Category: Incident Response] 1 new escalation procedure
- [Category: Testing] 2 new test requirements
- [Category: Communication Protocols] 1 new notification rule

ROLE UPDATES:
- No new workflow patterns detected

Does this classification look correct?
"(Reply 'yes' to proceed, or tell me what to adjust)"

After user confirms classification, **ask for workflow applicability for each fact/rule**:
"Which workflows does '[fact/rule title]' apply to?"
- Default: "all" (unless content clearly workflow-specific)
- Examples:
 - Config change procedures → production-incident
 - SQL development standards → developer
 - Monitoring dashboards → all
- User can specify "all", single workflow, or comma-separated list

---

### Step 4: Format Entries

For each fact, use this format:
```markdown
## Domain: [Domain Name]

### YYYY-MM-DD: [Descriptive Title]
**Scope:** expert-role
**Workflows:** [all | developer | production-incident | comma-separated]
**Captured:** YYYY-MM-DD

**Source:** [Document name/path]

[Content with full formatting preserved]

**Key Points:**
- [Bullet point summary if content is long]

---
```

For each rule, use this format:
```markdown
## Category: [Category Name]

### YYYY-MM-DD: [Descriptive Title]
**Scope:** expert-role
**Workflows:** [all | developer | production-incident | comma-separated]
**Captured:** YYYY-MM-DD
**Source:** [Document name/path]
**Rule:** [Clear statement of what must be done]

**Why:** [Reason/context for this rule]

**How to apply:**
[Step-by-step application instructions]

**Violation:** [Consequence of not following this rule]

---
```

---

### Step 5: Integrate into Files

**Route each entry to the correct file by its `Workflows:` value:**

| `Workflows:` value | Facts file | Rules file |
|---|---|---|
| `developer` | `facts/facts-developer.md` | `facts/rules-developer.md` |
| `production-incident` | `facts/facts-incident-response.md` | `facts/rules-incident-response.md` |
| `all` | the most-fitting workflow file (note in summary), or a reference doc if cross-cutting | same |
| comma-separated (e.g. `developer, production-incident`) | put it in the **primary** workflow file and, for large cross-workflow reference material, prefer a reference doc (below) | same |

**Reference-doc option (for large, cross-workflow material):** when the content is a sizable reference
(~50 lines, e.g. a schema, a catalog, validator internals) that several workflows consult, create or
extend a dedicated `facts/<topic>.md` reference doc instead of inflating a workflow file, and add a
pointer to it in `facts/MEMORY-INDEX.md` (reference list + a Common Scenarios entry). This mirrors the
existing `domain-knowledge.md` / `scheduling-schema.md` pattern.

1. **Read the existing destination files:**
 - Read the target `facts/facts-*.md` and/or `facts/rules-*.md` (or the reference doc) for the chosen
    workflow(s) to check for duplicates and conflicts. Consult `facts/MEMORY-INDEX.md` to confirm the
    right file. (Do NOT use the archived `facts-ARCHIVE-*.md` / `rules-ARCHIVE-*.md` files.)

2. **Detect duplicates/conflicts:**
 - Check if similar facts already exist (avoid redundancy)
 - Check if rules conflict with existing rules (flag for user review)

3. **Organize by domain/category:**
 - Add new facts to the appropriate domain section in the chosen `facts/facts-*.md` (or reference doc)
 - Add new rules to the appropriate category section in the chosen `facts/rules-*.md`
 - Create new domain/category sections if needed

4. **Update MEMORY-INDEX.md if needed:**
 - If a new reference doc was created or a new high-value scenario emerged, add a line to the
    reference list and/or a "Common Scenarios → Memory References" entry so it is discoverable.

5. **Update MyRole.txt if needed:**
 - If new workflow patterns detected, propose additions to pipeline definitions
 - If new responsibilities identified, propose updates to role description

---

### Step 6: Write Updates

Use the Edit tool to add new entries to the routed `facts/facts-*.md` / `facts/rules-*.md` files (and
any reference doc + `facts/MEMORY-INDEX.md` pointer).

**Important:**
 - Preserve all existing content
- Add new entries at the end of their respective domain/category sections
- Maintain consistent formatting
- Include source attribution

---

### Step 7: Provide Summary

Show user a summary:
```
✓ Documentation Integration Complete

ADDED TO FACTS:
- facts/facts-developer.md → Domain: Codebase Structure → 5 entries
- facts/facts-incident-response.md → Domain: Monitoring & Dashboards → 2 entries
- facts/facts-operations.md → Domain: Application Architecture → 3 entries

ADDED TO RULES:
- facts/rules-incident-response.md → Category: Incident Response → 1 entry
- facts/rules-developer.md → Category: Testing → 2 entries
- facts/rules-operations.md → Category: Communication Protocols → 1 entry

REFERENCE DOCS:
- (if created) facts/<topic>.md + pointer added to facts/MEMORY-INDEX.md

ROLE UPDATES:
- No changes to MyRole.txt

DUPLICATES DETECTED:
- 2 facts were similar to existing entries (merged into existing)

CONFLICTS DETECTED:
- None

Total new facts: 8
Total new rules: 4

Next steps:
- Review the changes in the routed facts-*/rules-* files (and MEMORY-INDEX.md)
- Commit the updates: git add facts/ && git commit -m "Integrate [document name]"
- The expert will now use this knowledge in the matching workflow(s)
```

---

### Edge Cases

#### Large Documents

If document is very large (>1000 lines):
1. Inform user it will take time to process
2. Break into chunks and analyze incrementally
3. Show progress updates

#### Ambiguous Content

If unclear whether content is fact or rule:
- **Fact**: Describes what IS (observations, data, context)
- **Rule**: Describes what MUST BE DONE (procedures, constraints)
- Ask user for clarification if truly ambiguous

#### Conflicting Rules

If new rule conflicts with existing rule:
1. Flag the conflict clearly
2. Show both rules side-by-side
3. Ask user which to keep or how to reconcile
4. Document the decision in the rule's "Why" section

#### Outdated Facts

If new fact contradicts existing fact:
1. Flag the contradiction
2. Ask user if old fact should be updated, deprecated, or both kept with version notes
3. Add "Superseded by" note to old fact if applicable

#### Duplicate Prevention

Before adding a fact/rule:
1. Search existing facts/rules for similar content
2. If >70% similar, ask user: "This seems similar to existing entry. Merge or keep separate?"
3. If merge, combine and note both sources
4. If separate, ensure both are clearly differentiated

---

### Guidelines

**Fact Extraction Priorities:**
 - System-specific details (URLs, table names, procedures)
- Operational knowledge (how systems work)
- Historical context (why decisions were made)
- Contact information (teams, channels, escalation paths)
- Tool locations and usage

**Rule Extraction Priorities:**
- Must-follow procedures (incident response, deployment)
- Safety checks (what to verify before taking action)
- Communication requirements (who to notify, when)
- Validation requirements (what to check)
- Error handling patterns (what to do when X happens)

**Formatting Standards:**
- Use consistent date format: YYYY-MM-DD
- Preserve code blocks with proper language tags
- Preserve tables and lists from source documents
- Include enough context to be self-contained
- Add "Key Points" summary for long facts

**Source Attribution:**
- Always include source in **Source:** field
- For files: Use file name (e.g., "GGNotes_App.txt")
- For URLs: Include full URL
- For team knowledge: Include person/team name and date
- For runbooks: Include runbook name and location

---

### Example Usage

**User:**
```
Can you integrate this new runbook I created?
C:\docs\Failover-Procedure-2026.md
```

**Agent:**
```
I'll read and integrate the failover procedure runbook.

[Reads document, analyzes content]

I've analyzed the runbook and identified:

FACTS (observations/data):
- [Domain: Incident Response] 1 new entry: Failover detection criteria
- [Domain: Monitoring & Dashboards] 2 new dashboard links for failover monitoring

RULES (procedures/constraints):
- [Category: Incident Response] 3 new procedures:
 1. Pre-failover health check requirements
 2. Failover coordination with SR team
 3. Post-failover validation steps

Does this classification look correct?
```

**User:**
```yes
```

**Agent:**
```
[Routes content by Workflows: value – a failover runbook is production-incident]

✓ Documentation Integration Complete

ADDED TO FACTS:
- facts/facts-incident-response.md → Domain: Incident Response → 1 entry
- facts/facts-incident-response.md → Domain: Monitoring & Dashboards → 2 entries

ADDED TO RULES:
- facts/rules-incident-response.md → Category: Incident Response → 3 entries

Total new facts: 3
Total new rules: 3

The expert will now reference the failover procedure in incident response scenarios.
```

---

### Integration with Other Skills

**Complements:**
- **remember**: For ad-hoc single facts/rules during conversation
- **promote-facts-rules**: For elevating Work Item learnings to Expert Role level

**Difference from remember:**
- **remember**: Interactive capture during work (user says "remember this")
- **integrate-docs**: Batch processing of existing documentation
- **remember**: Usually 1 fact/rule at a time
- **integrate-docs**: Usually 5-50+ facts/rules from a document

---

### Notes

- This skill does NOT modify Work Item-level facts/rules (only Expert Role level)
- For Work Item-specific knowledge, use the remember skill during active Work Item
- Always maintain source attribution for audit trail
- Prefer facts over rules when ambiguous (facts are informational, rules are restrictive)
- When in doubt about classification, ask the user
- **Route by workflow**: Expert Role memory is workflow-split – write to the `facts-*` / `rules-*` file
 that matches each entry's `Workflows:` value.
 Large cross-workflow reference material goes in a dedicated `facts/<topic>.md` reference doc with a
`MEMORY-INDEX.md` pointer.
