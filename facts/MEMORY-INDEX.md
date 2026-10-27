\# Memory System Index



Quick navigation guide for the AI expert role memory system. Load only the workflow-specific files you need to reduce context load by 60-70%.



\---



\## Two Axes: Workflow (browsing) and Triggers (action)



Rules are indexed on \*\*two orthogonal axes\*\*:



1\. \*\*Workflow axis\*\* (this file, below) — \*human browsing + context-budget loading\*. You load `rules-<workflow>.md` by session type. Good for reading; but a rule filed under one workflow is invisible when a \*different\* workflow file is loaded.

2\. \*\*Trigger axis\*\* (\[TRIGGER-INDEX.md](TRIGGER-INDEX.md)) — \*action-time surfacing, workflow-independent\*. Every rule carries a `\*\*Triggers:\*\*` field naming the tool-action(s) that should surface it (`write:sql`, `pr:open`, `config:change`, ...). The PreToolUse hook `.claude/hooks/inject-rules-on-action.sh` reads the generated `trigger-index.json` and injects the matching rule text at the moment of the action – in \*\*any\*\* workflow.



`TRIGGER-INDEX.md` and `trigger-index.json` are \*\*generated\*\* by `python scripts/memory/build\_trigger\_index.py` – never hand-edit them; regenerate after adding or retagging a rule (the `remember`/`promote-facts-rules` skills prompt for this).



\---



\## Quick Navigation by Workflow



\### Production Incident Response



\*\*When to use\*\*: Bridge call, SEV incident, urgent config change, rollback alerts



\*\*Load these files\*\*:

\- \[facts-incident-response.md](facts-incident-response.md) – Monitoring dashboards, app metrics, config data, common errors

\- \[rules-incident-response.md](rules-incident-response.md) – Config change procedures, incident response steps, safety checks, communication protocols



\*\*Key sections\*\*: Config change procedures, DEHS dashboard, rollback thresholds, adaptive config, CCE communication



\*\*Typical context load\*\*: \~1,380 lines (vs 3,400+ for full memory)



\---



\### Developer

(Greenfield/Iterative Features)



\*\*When to use\*\*: New feature development, code changes, testing, local debugging



\*\*Load these files\*\*:

\- \[facts-developer.md](facts-developer.md) – Architecture, feature flags, local dev setup, key tables, codebase structure, app testing (incl. \*\*running app NUnit suites headlessly\*\* via `Common\\NUnit\\nunit-console.exe` – vstest finds 0; \*\*build logs\*\* at `D:\\code\\main_app\\build\build.log` ; rotated `build\logs\_1..14.log`)

\- \[rules-developer.md](rules-developer.md) – Code standards, SQL development, deployment rules, testing patterns, git workflow



\*\*Typical context load\*\*: \~1,300 lines (vs 3,400+ for full memory)



\---



\## Entry Format Reference



\### Fact Entry Template



```markdown

\### YYYY-MM-DD: Descriptive Title

\*\*Scope:\*\* expert-role

\*\*Workflows:\*\* developer | production-incident | all

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* <where this came from>



Descriptive content about what this is, how it works, what it means...

```



\### Rule Entry Template



```markdown

\### YYYY-MM-DD: Prescriptive Action Title

\*\*Scope:\*\* expert-role

\*\*Workflows:\*\* developer | production-incident | all

\*\*Triggers:\*\* write:sql | write:customer-html | write:customer-sql | pr:open | git:push | git:commit | config:change | sql:generate | none

\*\*Captured:\*\* YYYY-MM-DD

\*\*Source:\*\* <where this came from>



\*\*Rule:\*\* Clear statement of what MUST be done



\*\*Why:\*\* Rationale and context for why this rule exists



\*\*How to apply:\*\*

1\. Step-by-step procedure

2\. With specific commands/queries where applicable

3\. Including what to check/verify

```



\---



\### Usage Tips



\*\*For development work\*\*:

1\. Load `facts-developer.md` + `rules-developer.md`

3\. Total context: \~1,300 lines + reference files as needed



\*\*Cross-workflow needs\*\*:

\- Load multiple workflow files as needed (incident + operations, developer + operations, etc.)

\- `facts-operations.md` and `rules-operations.md` contain shared operational knowledge useful across all workflows



\---



\*\*Maintenance Note\*\*: When adding new facts/rules, classify by primary workflow and add to appropriate file. If useful across multiple workflows, duplicate entry (or add pointer) in each relevant file. For system health metrics and optimization history, see \[HOW-MEMORY-LOADING-WORKS.md](HOW-MEMORY-LOADING-WORKS.md).



\---



