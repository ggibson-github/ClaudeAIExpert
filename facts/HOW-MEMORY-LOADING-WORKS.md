\# How Memory Loading Works



\*\*Question\*\*: How does the agent know where to look first for facts and rules? It cannot just load all the files, so how does it work?



\*\*Answer\*\*: The agent uses \*\*workflow-based routing\*\* with a two-step discovery process.



\---



\## Discovery Process



\### Step 1: Load Navigation Index (Always First)



\*\*File\*\*: `facts/MEMORY-INDEX.md` (\~240 lines)



This small index is \*\*always loaded first\*\* before any workflow-specific files. It provides:



\- Workflow mapping table (which files to load for each workflow)

\- Common scenario navigation (6+ step-by-step guides)

\- File organization reference

\- Entry format templates



\*\*Why load this first?\*\*



\- Small context cost (240 lines vs 3,400+ for full memory)

\- Acts as routing table: tells agent which workflow files to load next

\- Provides quick-reference for common tasks without deeper memory access



\### Step 2: Determine Workflow Context



The agent identifies current workflow from \*\*session directory structure\*\*:



| Session Type | Directory Pattern | Workflow | Memory Files to Load |

| --- | --- | --- | --- |

| \*\*Developer Work\*\* | `work-items/WID-\*` | `developer` | `facts-developer.md` + `rules-developer.md` (\~1,300 lines) |

| \*\*Production Incident\*\* | `incident-sessions/\*` | `production-incident` | `facts-incident-response.md` + `rules-incident-response.md` (\~1,300 lines) |




\*\*Workflow detection rules\*\* (from CLAUDE.md rule #21):



1\. Check active session file (`.claude/active-work-item.txt`, `.claude/active-incident.txt`, etc.)

2\. Inspect session directory path

3\. Read journal to confirm workflow pipeline selection

4\. Default to `developer` if ambiguous



\### Step 3: Load Workflow-Specific Files Only



Once workflow is known, agent loads \*\*only the 2 relevant files\*\* instead of all 6:



\*\*Example: Developer Work Item Start\*\*



```

1\. Load MEMORY-INDEX.md (240 lines) - navigation

2\. Detect workflow: work-items/WID-123456 → developer workflow

3\. Load facts-developer.md (521 lines) - architecture, local dev, codebase

4\. Load rules-developer.md (1,016 lines) - code standards, testing, deployment

```



\---



\*\*Total context:\*\* \~1,800 lines (vs 3,400+ for full memory)

\*\*Reduction:\*\* 47% fewer lines to scan



\---



\*\*Example: Production Incident Start\*\*



```

1\. Load MEMORY-INDEX.md (240 lines) - navigation

2\. Detect workflow: incident-sessions/INC-2026-042 → production-incident

3\. Load facts-incident-response.md (344 lines) - monitoring, config changes, errors

4\. Load rules-incident-response.md (734 lines) - config change procedures, safety

```



\---



\*\*Total context:\*\* \~1,300 lines (vs 3,400+ for full memory)

\*\*Reduction:\*\* 62% fewer lines to scan

\*\*Time savings:\*\* 7 min → 2 min to find a config change procedure



\### Step 4: On-Demand Reference Materials



\*\*Large reference files\*\* are NOT automatically loaded. Agent loads them only when task requires:



\*\*How agent decides to load reference\*\*:



1\. MEMORY-INDEX.md points to reference file in scenario guide

2\. Workflow-specific fact/rule entry references it

3\. Task explicitly requires schema/domain knowledge



\---



\## Routing Logic (Detailed)



\### Automatic Routing (Rule-Based)



The agent follows these routing rules from \*\*CLAUDE.md rule #21\*\*:



```

IF session\_directory starts with "work-items/"

&#x20; → workflow = "developer"

&#x20; → load facts-developer.md + rules-developer.md

ELSE

&#x20; → check active session file (.claude/active-work-item.txt, etc.)

&#x20; → default to "developer" if still ambiguous

```



\---



\### Cross-Workflow Loading (Hybrid)



Some tasks span workflows. Agent can load \*\*additional\*\* workflow files as needed:



\*\*Example: Database-related production incident\*\*



```

1\. Load MEMORY-INDEX.md (navigation)

2\. Primary workflow: production-incident

&#x20;  → Load facts-incident-response.md + rules-incident-response.md

3\. Task involves DB operations

&#x20;  → Also load facts-operations.md + rules-operations.md (shared operational knowledge)

```



\---



\*\*Total:\*\* \~2,100 lines (still 38% reduction vs full 3,400+)



\*\*Current behavior\*\*: Workflow field used for \*\*file organization\*\* (which file to place entry in)



\*\*Future enhancement\*\*: Skills could filter entries dynamically:



```python

\# Load developer files

facts = load\_file('facts-developer.md')

rules = load\_file('rules-developer.md')

\# Filter to only developer-relevant entries

developer\_facts = filter\_entries(facts, workflow='developer')

developer\_rules = filter\_entries(rules, workflow='developer')

```



This would enable even finer-grained context reduction if needed.



\---



\## Why This Approach Works



\### Performance Benefits



| Metric | Before Optimization | After Optimization | Improvement |

| --- | --- | --- | --- |

| \*\*Files loaded\*\* | 2 monolithic (facts.md, rules.md) | 1 index + 2 workflow-specific | Targeted loading |

| \*\*Context load (developer)\*\* | 3,423 lines | \~1,800 lines | 47% reduction |

| \*\*Context load (incident)\*\* | 3,423 lines | \~1,300 lines | 62% reduction |

| \*\*Context load (support)\*\* | 3,423 lines | \~800 lines | 77% reduction |

| \*\*Discovery time (config change)\*\* | \~7 minutes (scan 374 entries) | \~2 minutes (scan 5 relevant entries) | 3.5x faster |

| \*\*Work item start\*\* | \~5 minutes (load all memory) | \~1 minute (load developer memory) | 5x faster |



\### Scalability Benefits



\*\*Before\*\*: Adding 50 new facts/rules → 3,900+ lines for ANY memory access (all workflows suffer)



\*\*After\*\*: Adding 50 new facts/rules distributed by workflow:



\- 20 developer facts → facts-developer.md grows to 600 lines (developer loads 1,900 total)

\- 15 incident rules → rules-incident-response.md grows to 780 lines (incident loads 1,400 total)

\- 15 operations facts → facts-operations.md grows to 650 lines (operations loads 900 total)



\*\*Result\*\*: Growth isolated by workflow. Adding developer facts doesn't slow down incident response.



\### Maintainability Benefits



1\. \*\*Clear ownership\*\*: Each workflow team can focus on their 2 files (\~1,300 lines) not entire 3,400+ line memory

2\. \*\*Deduplication\*\*: Consolidating 4x CCE templates into 1 entry reduced maintenance burden

3\. \*\*Navigation\*\*: MEMORY-INDEX.md provides single source of truth for "where do I find X?"

4\. \*\*Health checks\*\*: `/memory-optimize --metrics` can detect per-workflow bloat



\---



```

1\. Load facts.md (1,307 lines)

2\. Load rules.md (2,116 lines)

3\. Scan rules.md for "config" keyword

4\. Find 8+ entries across 3 categories:

&#x20;  - Config Change Procedures (5 entries)

&#x20;  - Incident Response (14 entries, some mention config)

&#x20;  - Safety Checks (3 entries about config verification)

5\. Read each entry to determine relevance

6\. Follow references to facts.md for config queries

7\. Total time: \~7 minutes, \~3,400 lines scanned

```



\*\*Key insight\*\*: MEMORY-INDEX.md acts as a "table of contents" that routes to exactly the right memory locations for the task.



\---



\## Configuration (CLAUDE.md)



The routing logic is documented in \*\*CLAUDE.md rule #21\*\*:



> \*\*Memory loading by workflow\*\*: Expert Role memory has been optimized into workflow-specific files. At start of each session or skill execution, determine the current workflow context from session type (work-items/ = developer, incident-sessions/ = production-incident) and load ONLY the relevant workflow files: (1) \*\*Always load first\*\*: `facts/MEMORY-INDEX.md` (\~240 lines, navigation guide), (2) \*\*Developer workflow\*\*: `facts/facts-developer.md` + `facts/rules-developer.md` (\~1,300 lines total), (3) \*\*Production incident workflow\*\*: `facts/facts-incident-response.md` + `facts/rules-incident-response.md` (\~1,300 lines total) See MEMORY-INDEX.md for scenario-based navigation.



\---



\## Memory System Files Reference



\### Always Load First



\- \*\*MEMORY-INDEX.md\*\* (241 lines) - Navigation, workflow mapping, common scenarios



\### Workflow-Specific (Load Based on Session Type)



\- \*\*facts-developer.md\*\* (521 lines) - Architecture, feature flags, local dev, codebase structure

\- \*\*rules-developer.md\*\* (1,016 lines) - Code standards, testing, deployment



\---



\### Maintenance



\#### Quarterly Health Check



Run `/memory-optimize --metrics` to verify:



\- No workflow file exceeds 1,500 lines (warning threshold)

\- Entry distribution balanced across workflows

\- No unintentional duplication (>2 occurrences)

\- 100% workflow metadata coverage



\### When to Re-optimize



Trigger full `/memory-optimize` analysis when:



\- Any workflow file grows by 20% (e.g., 734 → 880 lines)

\- 10+ new facts/rules captured in single session

\- Agent reports slow memory lookups

\- User feedback indicates difficulty finding rules



\### Updating MEMORY-INDEX.md



After adding new facts/rules:



1\. Check if new entry fits existing common scenarios

2\. If new common scenario emerges (5+ similar questions), add scenario guide

3\. Update file size/entry counts in "Quick Navigation" section

4\. Commit index with memory changes



\---



