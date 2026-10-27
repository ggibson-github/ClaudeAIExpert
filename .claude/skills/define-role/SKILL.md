---
name: define-role
description: "Use when the user says define my role, or when MyRole.txt says Role status: pending. Asks for the specific developer job, workflows, skills, and existing notes, then waits for approval."
trigger: User says "define my role", or Role status is pending
---

# Define role

Specializes this developer expert. The folder stays a software developer expert. The answers define the specific job: stack, ownership, workflows, and skills.

## When to use

- `MyRole.txt` contains `Role status: pending`
- The user says "define my role" (run again even if status is already defined or skipped)

## State file

`docs/role/role-definition.md` holds the questions, the answers, the note sources, the draft workflows, and the draft skills. Create it on the first question.

## Rules

- Ask one question at a time. Record the answer in `docs/role/role-definition.md` before the next question.
- The word continue is not an answer and is not approval.
- "I have no notes" is a real answer.
- People-sensitive notes (private conversations, performance, personal circumstances) are not stored in expert-role memory unless the user explicitly says to store them.

## Questions, in order

1. What is your exact title, and who does this role serve?
2. What is this role accountable for?
3. Which decisions can this role make, and which must someone else approve?
4. What does a normal week include?
5. Which starter workflows match that week, and what recurring work do they miss? Starter workflows are the Developer pipeline (spec, HLD, DD, scaffold, implement, test, commit) and Adhoc incident response (reproduce, fix, test, deploy, document).
6. Which starter skills are required, and which must this expert not use? Starter skills are: spec-parser, hld-writer, dd-writer, diagram-generator, task-breakdown, git-workflow, scaffold-project, implement-feature, iterative-feature, refactor, plus the system skills continue, journal-keeper, workflow-selector, switch-context, remember, integrate-docs, promote-facts-rules, and memory-optimize.
7. What must this expert never do?
8. What languages, frameworks, and systems do you own?
9. How is a change tested and reviewed before it is done?
10. When does a production incident or hotfix come to you, and what must be approved before a production change?
11. Notes: ask for file paths, pasted text, or both. Examples: coding standards, architecture notes, local setup notes, runbooks, and test checklists. Accept further batches until the user says the notes are complete.

## After the notes

1. For each batch, follow integrate-docs and remember. Classify each item as a fact or a rule. Assign `developer`, `production-incident`, or both. Show the proposed entries and store only the ones the user confirms. Route expert-role entries to `facts/facts-developer.md` and `facts/rules-developer.md`, or the incident pair when that workflow applies.
2. If a note implies a workflow or skill the starter pack does not have, put that proposal in the draft. Do not add it to the registry yet.
3. Draft `docs/role/role-definition.md` with: title, who the role serves, responsibilities, decision rights, out of scope, workflows, skills required for each workflow, skills not used, and the list of remembered notes.
4. A missing recurring workflow is drafted as a third pipeline: when to use, phases, gates, artifacts, and skills. Examples of what might appear: refactoring, performance work, or a security review.
5. Ask the user to reply "I approve the role" or to correct the draft. "Skip role definition" keeps the starter pack in `MyRole.txt`, leaves confirmed note entries in place, leaves `workflow-registry.json` as it is, and sets `Role status: skipped`.

## On approval

- Rewrite `MyRole.txt` from the draft and set `Role status: defined`. Keep any starter pipeline the user still wants.
- Update `.claude/workflows/workflow-registry.json` so only approved workflows remain. The developer workflow file is `.claude/workflows/developer.md`. If production-incident is approved and `.claude/workflows/production-incident.md` does not exist, write it from the incident phases already named in the draft, then add the registry entry with `initial_phase` `assess-incident`.
- Add a further workflow file only when the approved draft includes one.
- Write `.claude/role-skills.md` with each starter skill marked required or not used. Do not delete a skill marked not used.
- Keep the questions, answers, and note sources in `docs/role/role-definition.md`.
