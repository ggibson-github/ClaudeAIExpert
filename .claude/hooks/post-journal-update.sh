#!/bin/bash
# Audit Log Hook: Merges background-agent notes into the journal, then
# captures the journal/status update to Git.
#
# Two responsibilities:
#   1. MERGE: fold any per-agent notes written under <journal>/agent-notes/*.md
#      into progress.md, then archive them under agent-notes/merged/. This lets
#      parallel background agents each write to their own file (no collision on
# progress.md) and have their notes consolidated once, single-threaded.
#   2. COMMIT: snapshot the journal/status to Git for the audit trail.
#
# Usage:
#   bash .claude/hooks/post-journal-update.sh # active Work Item (default)
# bash .claude/hooks/post-journal-update.sh <session-dir> # e.g. work-items/WID-214111151
#
# Zero agent overhead - runs independently of agent decisions.

set -e # Exit on error (but we catch errors below)

# Get workspace root (assumes script is in .claude/hooks/)
WORKSPACE_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$WORKSPACE_ROOT"

# Git setup.
# IMPORTANT: this expert folder may live INSIDE a larger repository (e.g. it is a
# subdirectory of pci-claude-agent-skills). In that case we must NOT create a
# nested repo here - doing so would capture commits in a stray .git that shadows
# the real one. So:
#   - If we are already inside a git work tree, use that existing repo as-is.
#   - Only auto-initialize a fresh repo when there is NO enclosing repo at all
# (a standalone/template checkout), which is the original "first use" case.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1;
then
    : # already inside a repo (this folder's own, or an enclosing parent) - use it
else
    echo "No enclosing Git repository - initializing one for audit log..."
    git init -q

    # Configure Git for automated commits
    git config user.name "Claude Expert Agent"
    git config user.email "expert@claude.local"

    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ];
then
        cat > .gitignore << 'EOF'
# Temporary files
*.tmp
*.temp
*.log

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Build artifacts
node_modules/
__pycache__/
*.pyc
dist/
build/

# Keep audit log clean - don't track these
.claude/plans/
EOF
    fi

    # Initial commit
    git add .
    git commit -q -m "Initial commit: Expert template baseline" || true
    echo "√ Git repository initialized"
fi

# --- Resolve journal directory --------------------------------------------
# Optional positional arg: a session directory (work-items/<id>).
# If given and it has a journal/, use it. Otherwise
# fall back to the active Work Item (original behavior, backward compatible).
SESSION_ARG="${1:-}"

if [ -n "$SESSION_ARG" ] && [ -d "$SESSION_ARG/journal" ]; then
    SESSION_DIR="$SESSION_ARG"
    CONTEXT_LABEL="$(basename "$SESSION_ARG")"
    COMMIT_PREFIX="SESSION-${CONTEXT_LABEL}"
else
    ACTIVE_WI_FILE=".claude/active-work-item.txt"
    if [ ! -f "$ACTIVE_WI_FILE" ]; then
        echo "No session arg and no active Work Item - skipping audit log"
        exit 0
    fi
WORK_ITEM_ID=$(cat "$ACTIVE_WI_FILE" | tr -d '[:space:]')
    if [ -z "$WORK_ITEM_ID" ]; then
        echo "Empty Work Item ID - skipping audit log"
        exit 0
    fi
    SESSION_DIR="work-items/$WORK_ITEM_ID"
    CONTEXT_LABEL="$WORK_ITEM_ID"
COMMIT_PREFIX="WI-${WORK_ITEM_ID}"
fi

JOURNAL_DIR="$SESSION_DIR/journal"
JOURNAL_PATH="$JOURNAL_DIR/progress.md"
STATUS_PATH="$SESSION_DIR/STATUS.md"

if [ ! -f "$JOURNAL_PATH" ]; then
    echo "Journal not found for $CONTEXT_LABEL ($JOURNAL_PATH) - skipping audit log"
    exit 0
fi

# --- COMPLIANCE guard: never commit data outside the git work tree ----------
# If this session's journal is not inside the git work tree, or git ignores
# it, we do the on-disk merge but SKIP the commit.
SESSION_IS_EXTERNAL=0
case "$SESSION_DIR" in
    /*|[A-Za-z]:*)
SESSION_IS_EXTERNAL=1 ;;    # absolute path => external root
esac
if [ "$SESSION_IS_EXTERNAL" -eq 0 ]; then
    # Relative path: still verify git actually tracks it (not gitignored).
    if git check-ignore -q "$JOURNAL_PATH" 2>/dev/null; then
SESSION_IS_EXTERNAL=1
    fi
fi

# --- MERGE background-agent notes ------------------------------------------
# Each background agent writes ONE file to <journal>/agent-notes/<label>.md.
# We concatenate them into progress.md under a timestamped section, then move
# the processed files into agent-notes/merged/ so they are never merged twice.
NOTES_DIR="$JOURNAL_DIR/agent-notes"
if [ -d "$NOTES_DIR" ] && ls "$NOTES_DIR"/*.md >/dev/null 2>&1; then
    MERGED_DIR="$NOTES_DIR/merged"
    mkdir -p "$MERGED_DIR"
MERGE_TS=$(date -Iseconds)
    {
        echo ""
        echo "## Background Agent Notes (merged ${MERGE_TS})"
        echo ""
echo "_Consolidated from parallel background agents. The main session should fold these into the proper journal sections (Artifacts, Resolved Q&A, Next action) via journal-keeper._"
        echo ""
        for note in "$NOTES_DIR"/*.md; do
            [ -e "$note" ] || continue
            echo "### $(basename "$note" .md)"
            echo ""
            cat "$note"
            echo ""
mv "$note" "$MERGED_DIR/" 2>/dev/null || true
        done
    } >> "$JOURNAL_PATH"
    echo "√ Merged background-agent notes into $JOURNAL_PATH (archived to $MERGED_DIR)"
else
    echo "No pending background-agent notes to merge for $CONTEXT_LABEL"
fi

# --- COMPLIANCE: stop here for sessions outside the git work tree ----------
# The on-disk merge above keeps the external journal current, but that data
# must NEVER be committed/pushed. Skip the git snapshot entirely.
if [ "$SESSION_IS_EXTERNAL" -eq 1 ]; then
echo "Session $CONTEXT_LABEL is external/gitignored - merged on disk, skipping git commit (by design)"
    exit 0
fi

# --- Extract key fields for the commit message -----------------------------
# Support both the Work Item journal ("**Current phase:**") and other session
# journals ("**Phase:**" / "**Next Action:**"). Best-effort with fallbacks.
# sed strips the "**Label:**" markdown prefix, leaving just the value.
CURRENT_PHASE=$(grep -m 1 -E '^\*\*(Current phase|Phase):\*\*' "$JOURNAL_PATH" | sed -E 's/^\*\*[^*]*:\*\* *//' || echo "unknown")
NEXT_ACTION=$(grep -m 1 -E '^\*\*Next [Aa]ction:\*\*' "$JOURNAL_PATH" | sed -E 's/^\*\*[^*]*:\*\* *//' || echo "unknown")
LAST_COMPLETED=$(grep -m 1 -E '^\*\*Last [Cc]ompleted:\*\*' "$JOURNAL_PATH" | sed -E 's/^\*\*[^*]*:\*\* *//' || echo "none")
TIMESTAMP=$(date -Iseconds)

# The paths this audit snapshot is allowed to touch. We commit ONLY these,
# never a bare `git commit`, so that in a SHARED repository we never sweep up
# unrelated changes the user may have staged. The merged-notes archive is
# included so the audit trail captures consumed notes too.
COMMIT_PATHS=("$JOURNAL_PATH")
[ -f "$STATUS_PATH" ] && COMMIT_PATHS+=("$STATUS_PATH")
[ -d "$JOURNAL_DIR/agent-notes/merged" ] && COMMIT_PATHS+=("$JOURNAL_DIR/agent-notes/merged")
[ -f "$SESSION_DIR/NEEDS-ATTENTION.md" ] && COMMIT_PATHS+=("$SESSION_DIR/NEEDS-ATTENTION.md")

# Surface a partial/failed/stalled background task in the commit SUBJECT so the
# audit log (git log) makes it obvious without opening the journal.
ATTENTION_TAG=""
if [ -f "$SESSION_DIR/NEEDS-ATTENTION.md" ]; then
    ATTENTION_TAG=" [NEEDS-ATTENTION]"
fi

# Stage only our paths (no-op if a path is git-ignored - the on-disk merge
# still stands regardless).
git add -- "${COMMIT_PATHS[@]}" 2>/dev/null || true

# Check if OUR paths have staged changes (scoped, so a user's pre-staged work
# elsewhere neither triggers nor rides along with this commit).
if git diff --cached --quiet -- "${COMMIT_PATHS[@]}"; then
    echo "No tracked journal changes to commit for $CONTEXT_LABEL (merge, if any, is on disk)"
    exit 0
fi

# Create structured commit message
COMMIT_MSG="${COMMIT_PREFIX}: ${CURRENT_PHASE} → ${NEXT_ACTION}${ATTENTION_TAG}


Phase:
${CURRENT_PHASE}
Completed: ${LAST_COMPLETED}
Next: ${NEXT_ACTION}
Timestamp: ${TIMESTAMP}"

# Commit ONLY our pathspec (leaves any other staged changes untouched).
if git commit -q -m "$COMMIT_MSG" -- "${COMMIT_PATHS[@]}"; then
    echo "√ Audit snapshot committed for ${COMMIT_PREFIX}: ${CURRENT_PHASE} → ${NEXT_ACTION}"
else
    echo "△ Failed to commit audit snapshot (may be no changes)"
exit 0
fi

# Success
exit 0
