\# Spec-to-Artifacts System: Agent Skills for Developer/Architect Workflows



A design for turning a specification document (e.g. markdown) into all artifacts a top-tier developer and software architect would produce, using Claude Agent Skills, a template folder, and a journal so the user can say "continue" after restarting and have the agent resume.



\---



\## 1. Mapping Developer/Architect Tasks to Skills



A senior developer/architect typically does something like:



| Phase | Tasks | Possible skill(s) |

|-------|--------|-------------------|

| \*\*Spec \& requirements\*\* | Parse spec, extract requirements, validate, list assumptions | `spec-parser` |

| \*\*High-level design\*\* | System context, main components, tech choices, risks | `hld-writer` |

| \*\*Detailed design\*\* | APIs, data models, interfaces, sequencing | `dd-writer` |

| \*\*Design artifacts\*\* | Architecture diagrams, ER, sequence, C4-style | `diagram-generator` |

| \*\*Planning\*\* | Phased backlog, dependencies, milestones | `task-breakdown` |

| \*\*Scaffolding\*\* | Repo layout, config, tooling, CI skeleton | `scaffold-project` |

| \*\*Implementation\*\* | Features in order, tests, refactors | `implement-feature`, `test-writer` |

| \*\*Continuity\*\* | "Where we are" and "what's next" across sessions | `journal-keeper`, `continue` |

| \*\*Iterative feature\*\* | New or changed feature: requirements, design, approval, branch, implement | `iterative-feature`, `spec-parser`, `hld-writer`, `dd-writer`, `implement-feature` |

| \*\*Refactoring\*\* | Reduce tech debt, avoid spaghetti; keep tests green | `refactor` |



So the idea: one skill (or a small set) per phase, plus a \*\*journal\*\* and a \*\*continue\*\* skill so the agent can resume after a restart. For \*\*continued development\*\* after initial delivery, the same pipeline supports iterative features (gather requirements, design, approval, branch, implement), refactoring, and a professional Git workflow with tests before push.



\*\*Corporate-style behavior\*\*: Imagine this developer/architect has many years of corporate experience. They would normally ask what team templates or best practices the organization uses for high-level design docs, detailed design docs, ADRs, and the like. The agent can do the same: before producing HLD, DD, or other artifacts, ask the user whether they have existing templates or preferred formats. If generic-looking documents are a concern, ask the user if they prefer you follow an existing document as a template for style and structure. For diagrams, assume a professional company uses professional tooling—default to what a higher-end professional would use (e.g. \*\*Mermaid\*\* for architecture, sequence, ER, and C4-style diagrams that live in the repo and render in docs), not ad-hoc or oversimplified sketches.



\---



\## 2. How the System Could Work



\### Template folder layout



```text

project-template/

├── AGENTS.md                    # Master instructions + pipeline + journal rules

├── spec.md                      # User drops their specification here (or path)

├── .claude/skills/              # or .agents/skills/

│   ├── spec-parser/

│   │   └── SKILL.md

│   ├── hld-writer/

│   │   └── SKILL.md

│   ├── dd-writer/

│   │   └── SKILL.md

│   ├── diagram-generator/

│   │   └── SKILL.md

│   ├── task-breakdown/

│   │   └── SKILL.md

│   ├── scaffold-project/

│   │   └── SKILL.md

│   ├── implement-feature/

│   │   └── SKILL.md

│   ├── test-writer/

│   │   └── SKILL.md

│   ├── journal-keeper/

│   │   └── SKILL.md

│   ├── continue/

│   │   └── SKILL.md

│   ├── iterative-feature/

│   │   └── SKILL.md

│   ├── refactor/

│   │   └── SKILL.md

│   └── remember/

│       └── SKILL.md

├── docs/                        # Organized design and feature artifacts

│   ├── design/                  # Project-level design

│   │   ├── requirements-summary.md

│   │   ├── hld.md

│   │   └── dd.md

│   ├── diagrams/

│   ├── decisions/               # ADRs, resolved Q\\\&A (e.g. decisions.md)

│   └── features/                # Per-feature (iterative) specs and designs

│       └── <feature-id>/

│           ├── spec.md

│           ├── design.md

│           └── approval.md

├── tests/

│   ├── unit/

│   ├── integration/

│   └── e2e/

├── journal/

│   └── progress.md

└── STATUS.md

```



\- \*\*AGENTS.md\*\*: Defines the "project builder" behavior: always use the journal as state, follow the phase order, and when the user says "continue" (or "start"), run the \*\*continue\*\* flow first.

\- \*\*spec.md\*\*: Input. User either puts the spec here or tells the agent which file is the spec. If the spec is updated mid-project, the agent must re-parse and mark downstream artifacts stale (see §2 Spec change process).

\- \*\*journal/\*\*: The only place that stores "current phase," "last completed step," "next action," resolved decisions, blockers, pause reason, and session summary. Every skill that changes state must read and update the journal.

\- \*\*STATUS.md\*\*: Optional human-readable summary (what was done, what's next, what's needed from the user); refreshed at end of each session.



\### Standard artifact paths (organized in subfolders)



Use these paths so skills and "continue" behave consistently. Artifacts are organized in subfolders to keep everything maintainable as the project grows.



| Artifact | Path |

|----------|------|

| Specification | `spec.md` (or user-specified path) |

| Design (project-level) | `docs/design/requirements-summary.md`, `docs/design/hld.md`, `docs/design/dd.md` |

| Diagrams | `docs/diagrams/` (e.g. `architecture.mmd`, `sequence.mmd`) |

| Decisions / ADRs / Resolved Q\&A | `docs/decisions/` (e.g. `decisions.md` or per-decision files); journal holds current Resolved Q\&A |

| Per-feature artifacts (iterative) | `docs/features/<feature-id>/` (e.g. `spec.md`, `design.md`, `approval.md`) |

| Captured facts / snippets | `docs/facts/captured.md` (user says "remember this", "note this down"; chat excerpts, URLs, SQL, team contacts, etc.) |

| Task list | `TODOS.md` (or `docs/TODOS.md`) |

| Progress state | `journal/progress.md` |

| Session summary for user | `STATUS.md` (optional) |

| Unit tests | `tests/unit/` |

| Integration tests | `tests/integration/` |



\### AGENTS.md role



AGENTS.md would:



1\. \*\*Identity\*\*: You are the project builder. You turn a specification into a complete set of artifacts (HLD, DD, diagrams, TODOs, code, tests, scripts) as a senior developer/architect would.

2\. \*\*State\*\*: All progress is in `journal/`. At the start of every response (and especially when the user says "continue" or "start"), read the journal to know current phase and next step.

3\. \*\*Pipeline\*\*: Follow phases in order: parse spec → HLD → DD → diagrams → task breakdown → scaffold → implement (loop) → done. Do not skip phases unless the journal says they're already complete.

4\. \*\*Skills\*\*: Use the skills in `.claude/skills/` (or `.agents/skills/`) for each phase. After each phase, run the \*\*journal-keeper\*\* behavior (update journal with phase completed, artifacts produced, next step).

5\. \*\*Continue\*\*: When the user says "continue" (or "start" with no prior journal), run the \*\*continue\*\* skill first. It reads the journal and executes the next step in the pipeline.

6\. \*\*Expert-system behavior\*\*: You cannot proceed with the project until all major (high-risk, high-priority) questions about the requirements are answered. Ask the user as many questions as needed. High-risk questions block any work that depends on them; lesser questions can wait until the phase or task that needs the answer. Drive the process by asking the user for help, to do tasks, or to answer questions whenever that unblocks progress.

7\. \*\*Templates and professional artifacts\*\*: Before writing HLD, DD, or other design docs, ask whether the user has team templates or best practices to follow. If generic documents are a concern, ask if they prefer you follow an existing document as a template for style and structure. For diagrams, use professional tooling (e.g. Mermaid) and the kinds of diagrams a higher-end professional would produce—architecture, sequence, ER, C4-style—not oversimplified or ad-hoc sketches.

8\. \*\*Same-turn journal update on user answers\*\*: When the user answers a blocking or deferred question, \*\*in the same response\*\* record the question and answer in the journal (e.g. in Resolved Q\&A / Decisions), remove it from Open questions, and then proceed or ask the next question. The journal is the single source of truth for decisions across sessions.

9\. \*\*Human gates (review points)\*\*: After producing HLD, do not proceed to DD until the user has confirmed approval of the HLD (or explicitly waived the gate). Same for DD before implementation: do not proceed to scaffold/implement until the user has approved the DD (or waived). Record approval in the journal (e.g. "HLD approved on …").

10\. \*\*Definition of done\*\*: Treat the project as \*\*done\*\* when all tasks in TODOS are complete, tests pass (or documented exceptions are recorded), and optionally the user has accepted. Set journal \*\*Completion status\*\* and, if desired, a final handoff note ("Implementation complete; ready for review").

11\. \*\*Session summary\*\*: At the end of each session (before token limit or user stop), write a short \*\*Session summary\*\* or update \*\*STATUS.md\*\*: what was completed, what is next, and what is needed from the user (e.g. answers, approval, running a script). So the user can resume without re-reading the full journal.



So "continue" is not a separate AI; it's a skill that encodes: read journal → decide next phase/step → invoke the right skill(s) → update journal.



\### Journal format (single source of truth)



So that "continue" works after a restart, the journal should be explicit and machine-friendly. Include the following:



```markdown

\\# Project progress



\\- \\\*\\\*Spec file:\\\*\\\* spec.md

\\- \\\*\\\*Spec version / last modified:\\\*\\\* (optional; use to detect spec changes)

\\- \\\*\\\*Current phase:\\\*\\\* implementing

\\- \\\*\\\*Last completed:\\\*\\\* implement-feature (task 3/12)

\\- \\\*\\\*Next action:\\\*\\\* implement-feature (task 4/12) then update journal

\\- \\\*\\\*Artifacts:\\\*\\\* docs/design/hld.md, docs/design/dd.md, docs/diagrams/, TODOS.md, src/...

\\- \\\*\\\*Open questions (blocking):\\\*\\\* (none — must be empty to proceed past spec/HLD)

\\- \\\*\\\*Open questions (deferred):\\\*\\\* (optional list; resolve when reaching the task that needs each answer)

\\- \\\*\\\*Resolved Q\\\&A / Decisions:\\\*\\\* (record every user answer here: question id, question text, answer, optional date)

\\- \\\*\\\*Blockers:\\\*\\\* (none | type: description). Types: waiting\\\_on\\\_user | waiting\\\_on\\\_external | build\\\_failed | blocking\\\_question. Clear when resolved.

\\- \\\*\\\*Pause reason / Delay:\\\*\\\* (optional; e.g. "Waiting for API key from user" or "User requested review before implementation")

\\- \\\*\\\*Last failure / Retry state:\\\*\\\* (optional; e.g. "Task 4 failed: …" so "continue" can retry or ask user)

\\- \\\*\\\*Completion status:\\\*\\\* (not\\\_started | in\\\_progress | done)

\\- \\\*\\\*Last session summary:\\\*\\\* (one short paragraph: what was done, what's next, what's needed from user)

```



\*\*Blockers\*\*: When something blocks progress (unanswered question, waiting for user to run a script, build broken), set \*\*Blockers\*\* with a type and description. When the blocker is resolved, clear it and update the journal. \*\*continue\*\* should surface active blockers to the user.



\*\*Session summary\*\*: At session end, write \*\*Last session summary\*\* (and optionally refresh `STATUS.md`) so the user sees what was completed, what's next, and what they need to do.



Skills would:



\- \*\*journal-keeper\*\*: Define the full journal schema (phase, last step, next step, artifacts, open questions blocking/deferred, Resolved Q\&A, Blockers with types, Pause reason, Last failure, Completion status, Last session summary). Instruct the agent to write/update `journal/progress.md` after each phase and at session end. Do not mark a phase complete if blocking questions remain unanswered. When the user answers a question, record it in Resolved Q\&A in the same turn.

\- \*\*spec-parser\*\* (and \*\*hld-writer\*\* / \*\*dd-writer\*\*): Emit assumptions and open questions; classify each as blocking (major/high-risk) or deferred. Write them into the journal. Do not proceed past the current phase until all blocking questions are answered by the user. When the user answers, record in Resolved Q\&A immediately. Before writing HLD/DD, ask whether the user has team templates or an existing document to use for style and structure; if so, follow that template.

\- \*\*diagram-generator\*\*: Produce diagrams using professional tooling (e.g. Mermaid) by default—architecture, sequence, ER, C4-style—as a higher-end professional would; store in `docs/diagrams/` and reference from design docs.

\- \*\*continue\*\*: (1) Read `journal/progress.md`. (2) If there are unanswered blocking questions, ask the user and do not advance until answered. (3) If \*\*Blockers\*\* or \*\*Last failure\*\* is set, surface to the user and either wait for resolution or retry with that context. (4) If "next action" is empty or "done," stop or ask user. (5) Otherwise run the skill for that action, then update journal (or call journal-keeper). (6) At session end, write Last session summary and optionally refresh STATUS.md.



\### Flow: first run vs "continue"



\- \*\*First run\*\*: User opens the template (with their spec), says e.g. "Implement the project from spec.md" or "Start." Agent has no journal (or empty). \*\*continue\*\* skill runs, sees "no phase" or "parse spec," runs \*\*spec-parser\*\* → updates journal (phase: parsed) → then runs \*\*hld-writer\*\* → … and so on until token/session limit or user stop. Before stopping, agent updates journal with "next action: …" so the next session can resume.

\- \*\*Next day / "continue"\*\*: User says "continue." Agent runs \*\*continue\*\* → reads journal → sees e.g. "next action: implement-feature (task 4/12)" → runs \*\*implement-feature\*\* for that task → updates journal → continues until limit or done.



So the system "works" by: \*\*one canonical pipeline\*\*, \*\*one journal\*\*, and \*\*continue\*\* as the resumption entry point.



\### "Continue" never means answer or approval



When the user says "continue" and the journal indicates the pipeline is waiting for an answer to a question (blocking or deferred) or for approval of an artifact (HLD, DD, feature design), the agent must \*\*not\*\* treat "continue" as that answer or as approval/waiver. It must re-prompt (re-ask the questions or re-surface the item and ask for explicit approval or waiver) and not advance. Only a substantive answer (recorded in Resolved Q\&A) or an explicit approval/waiver phrase (recorded in the journal) clears the wait. This avoids accidental advancement when the user is only resuming the session.



\### Agent and human work together on blockers



When important questions or blockers are encountered, the agent and user work together: communicate the block or question clearly, discuss how to proceed, and ensure both are in agreement before proceeding. The agent must \*\*not\*\* skip a blocked step or assume a workaround without discussing with the user. If the agent needs a library, it should ask the user for the URL to the GitHub repo or other download location. If the agent needs anything to unblock (e.g. a URL, credentials, a manual step), it should explain the situation and ask the user for help—do not skip steps. For example: if a task requires downloading a library from GitHub or model files from Hugging Face and the download fails, the agent must \*\*not\*\* skip that step; it must tell the user about the block, ask for the URL or location if needed, record it in the journal (Blockers / Last failure), and discuss how to proceed (e.g. retry, user provides URL, alternative source, manual download, change approach). During design (spec-parser, hld-writer, dd-writer) and implementation (scaffold-project, implement-feature), the agent should anticipate possible blockers—external dependencies, APIs, network access, credentials, downloads—and ask the user follow-up questions so agent and user are in agreement about important decisions. Skills should embody this: on failure or when something is needed, explain and ask for help; do not skip without user agreement.



\### Fully install and set up requirements so the app runs locally



When detailed design documents are created, \*\*always add tasks for setting up the requirements\*\* as part of creating the application. The agent is expected to do these tasks—they are not optional or left to the user. For the generated code to work, \*\*all requirements must be installed and in the correct order\*\*. The agent must ensure that \*\*every requirement to run the app locally is actually installed or set up\*\*—not assumed or left to the user. Setup and install steps are \*\*first-class tasks\*\* in the plan:



\- \*\*Portable Python, venv, or other development environment\*\*: If the design calls for a portable Python, venv, Visual Studio solution, or other development/runtime environment, the agent must \*\*automatically add tasks\*\* to download and set up that environment. \*\*Environment-setup tasks must be ordered before any task that installs libraries or packages\*\* so that package installs (pip, NuGet, etc.) run inside or against the correct environment (e.g. "Download portable Python", "Set up venv", "Create Visual Studio solution" before "Install project dependencies" or scaffold that adds packages).

\- \*\*GitHub or other repo\*\*: If the design requires downloading or cloning a repo from GitHub (or another source), the agent must \*\*automatically add tasks\*\* to obtain that repo (e.g. "Obtain repo from GitHub (clone or download; URL from design or user if needed)", "Integrate or place repo as required by design"). If the URL is unknown, the task can state that the agent will ask the user for the URL when the task is executed.

\- \*\*Other runtimes, SDKs, or assets\*\*: Add explicit tasks to download, install, or configure them so they are ready before features that depend on them.



The \*\*task-breakdown\*\* skill is responsible for identifying these setup/install requirements from the design (HLD, DD) and \*\*always\*\* adding them as ordered tasks. The agent is expected to perform these tasks. \*\*Order matters\*\*: requirements must be installed in the correct order for the generated code to work—e.g. portable Python, venv, Visual Studio solution, or any other development/runtime environment setup must come \*\*before\*\* any tasks that install libraries or packages, so those packages are installed inside or against the correct environment. Then scaffold and feature implementation follow. By the time implementation is complete, the app can be run locally with all dependencies and runtimes in place. Do not treat "environment setup" or "dependency download" as out of scope; include them in TODOS and implement them like any other task. HLD and DD should explicitly capture run-environment and setup requirements (e.g. portable Python, venv, Visual Studio solution or other dev environment, repos to clone or download, SDKs, assets) so task-breakdown can add the corresponding tasks.



\### Spec change process



If the user updates the spec mid-project (e.g. edits `spec.md` or says "we changed the requirements"):



1\. \*\*Detect or be told\*\*: The agent can note spec path and optional last-modified or version in the journal; if the user says the spec changed, or the file is newer than the last parse, treat it as changed.

2\. \*\*Re-parse\*\*: Run \*\*spec-parser\*\* again on the new spec; update requirements summary and journal.

3\. \*\*Mark downstream stale\*\*: Set journal or artifact metadata so that HLD, DD, task list, and implementation are considered \*\*stale\*\* until re-run or explicitly re-approved. Do not overwrite automatically; either ask the user ("HLD/DD may be out of date; re-run from HLD?") or re-run from HLD when "continue" is used and staleness is detected.

4\. \*\*Optional change log\*\*: In the journal, record "Spec updated on …; HLD/DD/tasks marked stale."



\### Error and failure handling



\- \*\*Agent fails mid-step\*\* (e.g. implement-feature for task 4 errors): Write \*\*Last failure / Retry state\*\* in the journal (e.g. "Task 4 failed: …"). On next "continue," the agent should use that context to retry, ask the user for help, or suggest a fix.

\- \*\*Build or test failure\*\*: \*\*implement-feature\*\* / \*\*test-writer\*\* should require tests to pass (or document an exception) before marking a task complete. If tests fail, record a \*\*Blockers\*\* entry (e.g. `build\\\_failed: tests failing for task 4`) and do not advance until resolved.

\- \*\*User says "stop" or "undo"\*\*: Document that rollback/checkpoint is out of scope for v1, or add a rule: ensure journal is up to date so the user can revert files and reset journal manually if needed. Optional future: checkpoint (e.g. branch/tag) before scaffold or large changes.



\---



\## 3. Blockers and Limitations



\### A. Skill selection is heuristic, not hard-wired



From the \[Claude skills docs](https://code.claude.com/docs/en/skills): Claude uses skills when they are relevant based on context. It doesn't guarantee a fixed order. So the pipeline might be skipped or reordered.



\- \*\*Mitigation\*\*: Put the pipeline and phase order \*\*in AGENTS.md\*\* and in the \*\*continue\*\* skill: "Always follow the phase order. When user says 'continue', read journal and perform the single next step in the pipeline." Keep \*\*continue\*\* and \*\*journal-keeper\*\* descriptions very explicit ("Use when the user says 'continue' or when resuming work"; "Use after every phase to update journal") so they're chosen reliably. Optionally make \*\*continue\*\* `disable-model-invocation: false` so it's still auto-considered when the user says "continue."



\### B. No built-in "run skill X then skill Y" primitive



The agent doesn't have a literal "call skill X" API; it just gets skill text in context and decides what to do. So "run spec-parser then hld-writer" is enforced only by instructions, not by the runtime.



\- \*\*Mitigation\*\*: Design \*\*continue\*\* so that its instructions are a \*\*single, linear checklist\*\*: "1. Read journal. 2. If next action is 'run spec-parser', do the spec-parser workflow (read spec, extract requirements, write requirements summary), then set next action to 'run hld-writer' and write journal. 3. If next action is 'run hld-writer', …" etc. So one "continue" turn = one pipeline step + journal update. That keeps behavior predictable and resumable.



\### C. Context and session limits



A full project in one session can hit context or token limits. "Continue" is there to chunk work across sessions.



\- \*\*Mitigation\*\*: Journal + \*\*small steps\*\*. Each "next action" should be one phase or one task (e.g. "implement task 4"), not "implement everything." AGENTS.md can say: "Prefer completing one pipeline step and updating the journal over starting many steps without updating."



\### D. Idempotency and overwrites



Re-running "scaffold" or "write HLD" might overwrite or duplicate.



\- \*\*Mitigation\*\*: In each skill, add rules: "If the artifact for this phase already exists (e.g. `docs/design/hld.md`) and journal says phase is complete, skip and set next action to the following phase." \*\*continue\*\* can say: "If journal says phase X is complete and the artifact exists, do not re-run phase X; go to next phase."



\### E. Spec ambiguity and assumptions — expert-system style clarification



Specs are often incomplete. The agent must not guess on major unknowns: \*\*you cannot proceed with a project without first having all major questions about the requirements answered.\*\* Treat the system like a traditional expert system: it should feel free to ask the user as many questions as needed to gather the information required to complete the tasks.



\- \*\*Major / high-risk questions\*\*: If an assumption is major (high impact, high risk, or affects architecture or scope), treat it as blocking. Do not proceed to HLD, DD, or any build step that relies on that assumption until the user has answered. State clearly: "I cannot proceed until this is decided: …" and list the questions. Record them in the journal under e.g. "Open questions (blocking)" and do not advance the pipeline until they are resolved.

\- \*\*Lesser / lower-priority questions\*\*: Questions that only affect a specific feature or implementation detail can wait. Record them in the journal (e.g. "Open questions (deferred)") and resolve them when the agent reaches the phase or task that needs the answer—then ask the user before implementing that part.

\- \*\*Driving the process via the user\*\*: The agent may drive the development process by asking the user for help, asking the user to perform tasks (e.g. "Please confirm the API base URL" or "Please run this script and paste the output"), or by asking questions. AGENTS.md and the \*\*spec-parser\*\* / \*\*hld-writer\*\* / \*\*dd-writer\*\* skills should instruct the agent to: (1) emit a structured list of assumptions and open questions and write them into the journal, (2) classify each as blocking vs deferred, (3) stop and ask the user before proceeding past any step that depends on unanswered blocking questions, (4) ask the user when first touching a task that depends on a deferred question, and (5) \*\*in the same response\*\* when the user answers, record the question and answer in the journal \*\*Resolved Q\&A / Decisions\*\* and remove it from open questions so the journal remains the single source of truth across sessions. Document assumptions and answers in the design docs and journal so "continue" and later phases stay consistent.



\### F. Quality and "top-tier" judgment — templates and diagram standards



Generated HLD/DD/code may be generic or not match a senior human's judgment.



\- \*\*Mitigation (documents)\*\*: Frame the system as \*\*first-draft generator\*\*. Ask the user if they have team templates or an existing document they want used as a template for style and structure (HLD, DD, ADRs, etc.). If they do, read that document and follow its sections and conventions. If generic output is a concern and they have no template, offer to draft in a standard structure and note that they can supply a template later for consistency. Skills can reference checklists (e.g. "HLD must list components, interfaces, and tech choices"; "DD must have API contracts and data model"). AGENTS.md can say "Human should review HLD and DD before implementation." No blocker, but expectations matter.

\- \*\*Mitigation (diagrams)\*\*: Assume a professional company uses professional diagram tooling. Default to what a higher-end professional would use: e.g. \*\*Mermaid\*\* for architecture, sequence, ER, and C4-style diagrams—version-controlled, readable in markdown, and renderable in docs. The \*\*diagram-generator\*\* skill should produce Mermaid (or similar) diagrams by default, not oversimplified or ad-hoc sketches.



\### G. Tools and permissions



Skills can reference scripts (e.g. in `scaffold-project/scripts/`). The agent needs permission to run them.



\- \*\*Mitigation\*\*: Document in the template: "For full automation, allow the agent to run scripts in the project." Where possible, design skills so the agent can do the same work with read/write (e.g. create files by editing) so the template still works in more locked-down environments.



\### H. Multi-file coherence



Keeping code, config, and docs in sync across many files is hard; the agent might leave stale or inconsistent artifacts.



\- \*\*Mitigation\*\*: Prefer single sources of truth (e.g. API from DD → generate OpenAPI or client code). In \*\*journal-keeper\*\*, "Artifacts" list can remind the agent what was created so later steps can "update X when Y changes." Optional later skill: "sync-docs" or "update-diagrams" that runs after implementation changes.



\---



\## 4. Summary



\- \*\*Could it work?\*\* Yes, as a \*\*template folder + AGENTS.md + pipeline skills + journal + continue\*\*: the journal is the state, \*\*continue\*\* is the resumption entry point, and each skill encodes one phase or step. Copy the folder, add `spec.md`, open in Claude, say "start" or "continue," and the agent moves through parse → HLD → DD → diagrams → tasks → scaffold → implement, updating the journal so the next "continue" continues from the right place.

\- \*\*Main risks\*\*: pipeline order is only enforced by instructions (no hard "run skill A then B"); session limits require small steps and consistent journal updates; and quality depends on spec clarity and human review. None of these are fundamental blockers if the template is designed around a strict, journal-driven pipeline and the \*\*continue\*\* and \*\*journal-keeper\*\* skills are written to that contract.



\---



\## 5. Gaps and design-phase requirements



Before or during design/implementation, ensure the following are addressed so the process is complete for A–Z, iterative, multi-day use:



| # | Requirement | Severity | Notes |

|---|--------------|----------|--------|

| 1 | \*\*Resolved Q\&A / Decisions\*\* in journal | High | Every user answer recorded in journal in the same turn; journal is single source of truth across sessions. |

| 2 | \*\*Spec-change process\*\* | High | Re-parse on spec change; mark HLD/DD/tasks stale; do not proceed without re-run or user approval. |

| 3 | \*\*Blockers\*\* typed and clearable | Medium | Types: waiting\_on\_user, waiting\_on\_external, build\_failed, blocking\_question. Update journal when set/cleared. |

| 4 | \*\*Pause reason / Delay\*\* in journal | Medium | So "continue" and the user know why the pipeline did not advance. |

| 5 | \*\*Session summary\*\* at end of each run | Medium | Last session summary in journal and/or STATUS.md: what was done, what's next, what's needed from user. |

| 6 | \*\*Human gates\*\* (e.g. after HLD, after DD) | Medium | Agent must not proceed past HLD/DD until user approves (or waives); record approval in journal. |

| 7 | \*\*Definition of done\*\* | Medium | Done = all TODOs complete, tests pass (or exceptions documented), optional user acceptance. |

| 8 | \*\*Failure / retry state\*\* in journal | Medium | Last failure recorded; "continue" retries or asks user with that context; build/test failure blocks task completion. |

| 9 | \*\*Same-turn journal update\*\* on user answer | High | Explicit rule in AGENTS.md and skills: record answer in journal in same response, then proceed. |

| 10 | \*\*Standard artifact paths\*\* | Low | Use the paths in §2 (Standard artifact paths) so skills and template are consistent. |

| 11 | \*\*Rollback / checkpoint\*\* (optional) | Low | Out of scope for v1, or document: keep journal updated so user can revert + reset; optional future checkpoint before big steps. |



\---



\## 6. Continued development, Git, refactoring, and testing



After initial delivery, the system supports \*\*continued development\*\* in a professional iterative manner: new features, changes to existing features, refactoring to prevent spaghetti code and tech debt, and a full Git workflow with tests before push.



\### 6.1 Iterative feature workflow



For each new or modified feature, follow the same professional loop:



1\. \*\*Gather requirements\*\*: User describes the feature (or provides a spec snippet). Agent asks clarifying questions; record in journal or in `docs/features/<feature-id>/spec.md`.

2\. \*\*Research\*\*: If needed, agent or user researches options; document in `docs/features/<feature-id>/research.md` or decisions.

3\. \*\*Design\*\*: Produce or update design (HLD/DD or feature-level design) in `docs/features/<feature-id>/design.md`; update project-level `docs/design/` if the feature affects architecture.

4\. \*\*Approval\*\*: Human gate—do not implement until user approves (or waives). Record in journal or `docs/features/<feature-id>/approval.md`.

5\. \*\*Branch\*\*: Create a new Git branch (e.g. `feature/<feature-id>` or `feature/short-name`). If the project is not yet connected to a repo, run \*\*git-workflow\*\* to connect (init, remote add, first push).

6\. \*\*Implement\*\*: Make changes; add/update unit and integration tests; run regression tests to prove previous features still work.

7\. \*\*Refactor if needed\*\*: If the change would create duplication or tech debt, run \*\*refactor\*\* (see below) before or as part of the change.

8\. \*\*Commit, PR, push\*\*: Stage, commit, open PR (or push branch), and push. Do not push until tests pass.



The \*\*iterative-feature\*\* skill (and \*\*continue\*\*) drives this loop. Journal tracks \*\*mode\*\* (e.g. `greenfield` vs `iterative\\\_feature`), \*\*current\_feature\_id\*\*, and \*\*next action\*\* (e.g. "run iterative-feature (gather requirements)" or "run git-workflow (branch)").



\### 6.2 Refactoring and tech debt



A top-tier developer refactors continuously to avoid spaghetti code and tech debt. The \*\*refactor\*\* skill:



\- \*\*When\*\*: Before or during a feature (e.g. "this change would duplicate logic; refactor first") or when the user asks to reduce tech debt.

\- \*\*What\*\*: Identify targets (duplication, unclear boundaries, dead code); plan small, safe steps; implement refactor while keeping tests green. Run full test suite (unit, integration) after refactor.

\- \*\*Journal\*\*: Record refactor scope and outcome in journal; do not advance feature task until refactor is done and tests pass.



Refactoring does not add new behavior; it improves structure. New tests are not required for pure refactors, but existing tests must remain green.



\### 6.3 Git workflow




Journal fields: \*\*Repo URL\*\* (or "none"), \*\*Current branch\*\*, \*\*Last commit\*\*, \*\*PR URL\*\* (if opened). Skills that modify code should invoke git-workflow for commit/PR/push when the user requests it or when the pipeline step "commit and push" is reached.



\### 6.4 Artifact organization (subfolders)



Keep artifacts organized so the project stays maintainable as it grows:



\- \*\*docs/design/\*\* — Project-level design: `requirements-summary.md`, `hld.md`, `dd.md`.

\- \*\*docs/diagrams/\*\* — Mermaid and other diagrams (e.g. `architecture.mmd`, `sequence.mmd`).

\- \*\*docs/decisions/\*\* — ADRs, resolved Q\&A, key decisions (e.g. `decisions.md` or one file per decision).

\- \*\*docs/features/<feature-id>/\*\* — Per-feature spec, design, research, approval (e.g. `spec.md`, `design.md`, `approval.md`). Use a stable feature-id (e.g. slug or ticket number).

\- \*\*docs/facts/\*\* — Captured facts and snippets (e.g. `captured.md`). When the user says "remember this" or "note this down" and pastes text, the agent appends to this file so it can be found later (chat excerpts, URLs, SQL, team contacts, etc.).

\- \*\*journal/\*\* — `progress.md` (and optionally dated logs); single source of truth for current phase, next action, blockers, Resolved Q\&A.

\- \*\*tests/unit/\*\* — Unit tests (e.g. by module or feature).

\- \*\*tests/integration/\*\* — Integration tests (APIs, DB, services).

\- \*\*tests/e2e/\*\* — End-to-end tests.



Skills that create or update design docs, decisions, or feature artifacts should write to these paths. The \*\*continue\*\* and \*\*journal-keeper\*\* skills should reference these paths when listing Artifacts in the journal.



\### 6.5 Testing strategy: prove previous features still work



Before pushing changes, the agent must \*\*run the full test suite\*\* so that previous features are still working (regression safety). Testing includes:



1\. \*\*Unit tests\*\*: Fast, isolated; cover logic and boundaries. Live in `tests/unit/` (or project-standard location). Run on every change.

2\. \*\*Integration tests\*\*: Cover APIs, DB, external services. Live in `tests/integration/`. Run before commit or push.

