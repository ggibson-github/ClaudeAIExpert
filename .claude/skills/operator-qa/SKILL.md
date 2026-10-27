---
name: operator-qa
description: >-
  Runs a self-contained question-and-answer session with the human operator to
  clarify conversation, build specs, verify assumptions before work, or verify
  notes before persisting them. Creates a qa-sessions folder with a journal,
  records Q&A turns, then extracts answers into conclusions for next steps.
  Use when clarifying requirements, checking assumptions, confirming notes,
  building a spec with the operator, helping create a new project spec, or when
  the operator says start a Q&A session, clarify with me, verify this, or ask me
  questions.
trigger: Clarify, verify with operator, build spec, or operator asks for Q&A
---

# Operator Q&A

## Purpose

Hold a focused Q&A session with the human operator. Keep all turns in a session journal. When the session ends, extract answers into conclusions that drive the next action (spec text, work plan, verified notes, assumption list, or pipeline updates).

## Work item branch

Keep the question transcript in this session journal. Present a fixed choice with **AskUserQuestion**. Ask an open-ended question in chat. When a question blocks the current work item, also add a node on that work item's map. The node id is unique and is not `work-item` or a phase name. Store the session id on the node and make it the active leaf through journal-keeper. When the session closes, store the decision and run the journal-keeper answer transition so `active` leaves this question. Do not copy every question onto the node. A decision for the whole work item or the expert goes in that flat journal.

## Session location

This expert is a single role. Sessions live at the expert root under `qa-sessions/`, same idea as `work-items/`.

Active session id file: `.claude/active-qa-session.txt`

Ids are `Q` plus a counter: `Q1`, `Q2`, …

## Folder layout

```
qa-sessions/
  _TEMPLATE/
    PURPOSE.md
    STATUS.md
    journal/progress.md
    conclusions.md
  Q1/
    PURPOSE.md
    STATUS.md
    journal/progress.md
    conclusions.md
```

Copy `_TEMPLATE/` to `qa-sessions/<id>/` when opening a session.

## When to use

- Clarify ambiguous conversation or requirements
- Build or refine a spec with the operator (including "help me create a spec for a new project")
- Verify assumptions before performing work
- Verify notes or facts/rules before persisting them (often before remember)
- Operator says: "ask me", "clarify", "Q&A", "verify this with me", "let's nail this down"

**Initiate on your own** when a human answer would change the plan. Prefer this skill over inventing missing requirements.

Do not use this skill for silent pipeline steps that already have a clear next action and no blocking ambiguity.

## Phases

### 1. Open

1. Choose the next free id (`Q1`, `Q2`, …) under `qa-sessions/` (skip `_TEMPLATE`).
2. Copy `qa-sessions/_TEMPLATE/` to `qa-sessions/<id>/`.
3. Write `.claude/active-qa-session.txt` with that id.
4. Fill `PURPOSE.md`: goal, context (work item / topic / conversation), intended outcome (`spec` | `assumptions` | `notes` | `direction` | `other`).
5. Initialize `journal/progress.md` fields and set Next action to `ask`.
6. Tell the operator the session id and purpose in one short sentence, then present the first question(s) using the presentation rules below.

### 2. Ask

1. Ask only what is needed. Prefer one blocking question at a time. When several independent fixed-choice questions are ready, you may batch up to 4 in one AskUserQuestion call (Claude Code limit); otherwise walk through them one by one.
2. Present questions using **How to present questions** (AskUserQuestion vs chat). Do not rely on the model to invent AskUserQuestion on its own—follow those rules deliberately.
3. Append each asked question under **Open questions** in the journal with the date and presentation mode (`ask-user-question` or `chat`).
4. Set Next action to `wait for operator`.
5. Stop and wait. Do not invent answers. Do not continue the blocked work until answers arrive or the operator defers them.

## How to present questions

Choose the channel from the answer shape. Always journal the question either way.

### Use AskUserQuestion (choice UI)

Use the **AskUserQuestion** tool when it is available and the answer is a small fixed set:

- Yes / no / defer
- A short list of mutually exclusive options (typically 2–4; Claude Code allows 2–4 options per question)
- Confirm / reject a proposed note, fact, rule, or assumption wording
- Pick among named alternatives (auth mode, scope in/out, priority, etc.)

When calling AskUserQuestion:

1. Provide 1–4 questions in the `questions` array.
2. For each question set `question` (full prompt), `header` (short chip label, max ~12 chars), and `options` (2–4 items with `label` and `description`).
3. Set `multiSelect` only when several options may apply at once.
4. Do not add an "Other" option yourself—Claude Code provides it automatically. Include an explicit defer/skip-style option when postponing is valid (for example `Defer for later`).
5. After the operator selects, treat the selected label(s) as the answer and continue to Record.

If AskUserQuestion is unavailable in the session, fall back to chat with the same options written as a numbered list and ask the operator to reply with a number or label.

### Use chat (conversational)

Ask in the chat message when the answer is open-ended:

- Free-text requirements, acceptance criteria, or wording edits
- Explanations, examples, or "tell me how you want this to work"
- Anything that cannot be reduced to a short option list without losing meaning

In chat, ask one blocking question at a time unless the operator asked for a batch. Keep the question plain and specific.

### Mixed sessions

A single Q&A session may alternate: AskUserQuestion for closed choices, chat for free text. Record both the same way in the journal.

### 3. Record (when the operator replies)

In the same response as acknowledging the answer (from AskUserQuestion selection or chat text):

1. Move each answered item from Open questions to **Resolved Q&A** with date, question, answer, and presentation mode.
2. Note any deferred or refused questions under **Deferred**.
3. Update STATUS.md Last session summary.
4. Either ask the next question (phase Ask) or close (phase Close) when enough is known.

### 4. Close

1. Read the full journal Resolved Q&A and Deferred lists.
2. Write `conclusions.md` with:
   - **Session goal**
   - **Decisions / answers** (bullets tied to questions)
   - **Assumptions still open** (if any)
   - **Forward actions** (concrete next steps: write/update spec, create work item, run remember, proceed with pipeline phase, etc.)
   - **Artifacts to update** (paths)
3. Set journal Completion status to `done`, Next action to `done`.
4. Leave `.claude/active-qa-session.txt` with the closed id for reference; next Open picks a new id.
5. Tell the operator the session is closed and point to `conclusions.md`.
6. Apply forward actions only after close, unless the operator asked to apply during the session.

## Journal fields

Keep these in `journal/progress.md`:

- Session ID, purpose
- Linked work item (if any)
- Outcome type: spec | assumptions | notes | direction | other
- Open questions
- Resolved Q&A (date, question, answer)
- Deferred
- Last completed, Next action
- Completion status
- Last session summary

## Rules

- One active Q&A session at a time unless the operator names another id to resume.
- To resume: set `.claude/active-qa-session.txt` and continue from the journal Next action.
- Do not persist remember/facts/rules from unverified notes until this session closes with verification conclusions, when that was the purpose.
- Do not ask the operator to invent a session id; create it.
- Keep operator-facing questions plain and specific.
- Prefer AskUserQuestion for closed choices; do not present a fixed option set only as plain chat when AskUserQuestion is available.
- "Continue" is not an answer to an open Q&A question; wait for a substantive reply or AskUserQuestion selection.

## Examples

**Clarify before implement (closed choice → AskUserQuestion)**

1. Open Q3 with purpose "verify API auth assumption before implement".
2. Call AskUserQuestion with prompt about auth and options: `Bearer token required`, `Open on LAN`, `Defer`.
3. Record selected option → Close → conclusions say update design and proceed implement.

**Help create a new project spec**

1. Open Q1 with outcome `spec`.
2. Ask in chat / AskUserQuestion for goals, users, must-haves, out-of-scope, constraints.
3. Close → conclusions list forward actions to write the spec and start a Work Item / run spec-parser.

**Verify notes before remember (yes/no → AskUserQuestion; edits → chat)**

1. Open Q4 with outcome `notes`.
2. AskUserQuestion: "Persist this as an expert-role rule?" with options `Yes, store as written`, `Yes, but I will edit`, `No`, `Defer`.
3. If the operator chooses edit, ask in chat for the revised wording.
4. Close → conclusions say run remember with the verified wording.
