# Workflow Framework

The expert uses a workflow framework to support different types of work with specialized phase sequences, approval gates, and domain rules.

## Available Workflows

Defined in `workflowID-registry.json`:

1. **Developer Pipeline** (`developer`)
 - Full SDLC: spec → HLD → DD → implementation → testing
 - Use for: New features, greenfield projects, planned enhancements
 - Approval gates: HLD approval, DD approval
 - Artifacts: `docs/design/`, `docs/diagrams/`, `TODOS.md`

2. **Production Incident Response** (`production-incident`)
 - Urgent response: assess → analyze → mitigate → monitor → resolve
 - Use for: Production incidents, DBHS alerts, rollback spikes, customer escalations
 - NO HLD/DD phases (fast response required)
 - Approval gates: Fix approach approval, deployment approval
 - Artifacts: `docs/incident/`


## How It Works

### 1. Workflow Selection

When starting a new Work Item:
1. `continue.md` calls `workflowID-selector` skill
2. User selects workflow by number or name
3. Workflow type stored in journal: `Workflow type: developer | production-incident`
4. Initial phase set from registry (e.g., "spec" for developer)

### 2. Workflow Execution

During Work Item execution:
1. `continue.md` reads workflow type from journal
2. Loads workflow instruction file (e.g., `.claude/workflows/developer.md`)
3. Executes phases according to workflowID-specific sequence
4. Applies workflowID-specific approval gates
5. Uses workflowID-specific artifact organization

### 3. WorkflowID-Aware Skills

Skills check workflow type and adjust behavior:

**`spec-parser.md`:**
 - developer: Write to `docs/design/requirements-summary.md`
 - production-incident: Write to `docs/incident/assessment.md`, ask incident-specific questions

**`hld-writer.md`:**
 - developer: Execute HLD phase
 - production-incident: SKIP HLD → set next action to "run analyze-root-cause"

**`journal-keeper.md`:**
 - Preserves workflow type field across updates
 - Tracks workflowID-specific context fields

## Adding New Workflows

1. **Add to registry** (`workflowID-registry.json`):
```json
"newID-workflow": {
"name": "New Workflow Name",
"description": "Brief description",
"instruction_file": ".claude/workflows/newID-workflow.md",
"initial_phase": "first-phase"
}
```
2. **Create workflow file** (`.claude/workflows/newID-workflow.md`):
 - Phase sequence
 - Approval gates
 - Artifact organization
 - Phase behaviors
 - Domain rules

3. **Update workflowID-aware skills** (if needed):
 - Add new workflow to skill's behavior switch
 - Define workflowID-specific artifact paths
 - Add workflowID-specific questions

4. **Test:**
 - Start new Work Item
 - Select new workflow
 - Verify phases execute correctly
 - Verify artifacts created in correct locations

## Backward Compatibility

If journal has old "Pipeline" field but no "Workflow type":
 - Map "developer" → "developer"
 - Map "adhoc-incident" → "production-incident"
 - Map "custom-pipeline-name" → "developer" (default)

If journal missing both fields:
 - Default to "developer" workflow
 - Prompt user to confirm or change

---

## WorkflowID-Specific Facts and Rules

Facts and rules can be scoped to specific workflows using the **Workflows:** metadata field. This allows skills to load only the facts and rules relevant to the current workflow, reducing cognitive load and improving focus.

### Metadata Format

Add the **Workflows:** field to fact/rule metadata:
```markdown
## YYYY-MM-DD: [Label/Title]
**Scope:** expert-role
**Workflows:** production-incident
**Captured:** YYYY-MM-DD
**Source:** [Optional]
**Rule:** [content]
```
**Field values:**
 - `all` - Applies to all workflows (default if field missing)
 - `production-incident` - Only incident response workflow
 - `developer` - Only feature development workflow
 - `production-incident, developer` - Multiple workflows (comma-separated)

### Workflow Assignment Guidelines

**production-incident workflow:**
 - Config change procedures (change a config, revert, gradual removal)
 - Incident response coordination (bridge, DBEST, CCE teams)
 - SRM Studio runbook operations
 - Safety checks (current config state, queue depth before reverting a config change)
 - Real-time monitoring (DBHS dashboards, logs and monitoring, DPA)
 - Communication protocols (post to the team incident channel)

**developer workflow:**
 - Coding standards (SQL naming conventions, backwards compatibility requirements)
 - Testing requirements (unit test structure, integration test patterns, test automation)
 - Deployment procedures (DB changes before code, feature flag defaults)
 - Local development setup (dev environment tools and apps)
 - SQL development (reserved keyword escaping, DMV schema knowledge, parameter naming)
 - Code change patterns (extend with optional parameters, NULL defaults for OUTPUT params)

**all workflows:**
 - Application architecture and structure
 - Monitoring dashboard locations (monitoring tools)
 - Team contacts and chat channels (#teamchat)
 - Environment URLs and credentials (tools)
 - General safety and validation rules

### Filtering Behavior

**Skills load facts and rules with workflowID-based filtering:**

1. Read current workflow type from journal (`Workflow type: developer`)
2. Load facts/rules files (`facts/facts.md`, `facts/rules.md`)
3. For each entry:
 - Extract `**Workflows:**` metadata field (default "all" if missing)
 - Parse comma-separated list of applicable workflows
 - Include entry if "all" OR current workflow matches
 - Discard entry if current workflow not in list
Internalize only filtered facts/rules
5. Log to journal: "Loaded X facts (Y total) and Z rules (W total) for [workflow] workflow"

**Backward compatibility:** Existing facts/rules without `**Workflows:**` field default to "all" (load in every workflow).

### When in Doubt
Default to `**Workflows:** all`. It's better to load a rule in all workflows than to miss it in a workflow where it's needed.

You can always refine workflow applicability later via manual edit to the facts/rules file.

### Capturing WorkflowID-Specific Facts/Rules
When using `remember` skill to capture Expert Role-level facts/rules, the skill will ask: "Which workflows does this apply to?"

**Smart default behavior:**
 - Default to current workflow (from Work Item journal)
 - User can override to "all", specific workflow, or comma-separated list
 - Decision tree provided to guide classification
When using `promote-facts-rules` skill:
 - Default to parent Work Item's workflow
 - User can generalize to "all" or specify different workflows during promotion
When using `integrate-docs` skill:
 - Ask for workflow applicability during classification step
 - Default to "all" unless content is clearly workflowID-specific

