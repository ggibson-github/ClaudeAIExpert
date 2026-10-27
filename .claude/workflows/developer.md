# Developer Pipeline Workflow

**When to use:** New feature development, greenfield projects, planned enhancements that require architectural planning.

## Phase Sequence

spec-parser → hld-writer → dd-writer → diagram-generator → task-breakdown → git-workflow (setup) → scaffold-project → implement-feature (loop) → test → git-workflow (commit/PR) → done

## Approval Gates

- **HLD approval** (after HLD + diagrams complete): Next action waits for "I approve the HLD" or "Skip HLD approval"
- **DD approval** (after DD + diagrams complete): Next action waits for "I approve the DD" or "Skip DD approval"
- **Feature design approval** (for iterative features): Next action waits for feature approval before implementation

## Artifact Organization

- Requirements: `work-items/<id>/docs/design/requirements-summary.md`
- HLD: `work-items/<id>/docs/design/hld.md`
- DD: `work-items/<id>/docs/design/dd.md`
- Diagrams: `work-items/<id>/docs/diagrams/*.mmd`, `work-items/<id>/docs/diagrams/index.html`
- Tasks: `work-items/<id>/TODOS.md`
- Features: `work-items/<id>/docs/features/<feature-id>/`
- Tests: `work-items/<id>/tests/` or root `tests/` (if shared)

## Phase Behaviors

#### spec-parser

- Write to `docs/design/requirements-summary.md`
- Ask standard requirement questions
- Identify high-risk unknowns
- Set next action: "run hld-writer"

#### hld-writer

- Write to `docs/design/hld.md`
- Generate architecture diagrams to `docs/diagrams/`
- Apply architecture rules from `facts/rules.md`
- Set next action: "wait for HLD approval"

#### dd-writer

- Write to `docs/design/dd.md`
- Generate detailed diagrams to `docs/diagrams/`
- Apply design patterns from `facts/rules.md`
- Set next action: "wait for DD approval"

#### task-breakdown

- Write to `TODOS.md`
- Add environment setup tasks (venv, Node/npm)
- Set next action: "run git-workflow (setup)"

#### git-workflow (setup)

- Check for uncommitted changes, offer to stash if needed
- Fetch latest code from remote repository
- Create feature branch: `feature/WID-<work-item-id>`
- Ask user about commit strategy (incremental vs single commit)
- Update journal: Repo URL, Current branch, Commit strategy
- Set next action: "run scaffold-project"

#### implement-feature

- Implement task K/N from `TODOS.md`
- Enforce rules from `facts/rules.md`
- Run tests after implementation
- Check journal **Commit strategy** field:
  - If "incremental": commit this task (use git-workflow commit mode)
  - If "single": defer commit until all tasks complete
- Set next action: "implement-feature (task K+1/N)" or "run git-workflow (commit/PR)" if all tasks complete

#### git-workflow (commit/PR)

- If Commit strategy is "single": commit all changes now
- Fetch and merge latest code from remote (merge strategy, not rebase)
- Inform user to run full build and test suite
- Wait for user confirmation: "tests pass" or "build successful"
- Push branch and create pull request
- Update journal: PR URL
- Set next action: "done"

## Domain Rules (from facts/rules.md)
