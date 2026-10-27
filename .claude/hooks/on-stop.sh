#!/bin/bash
# Stop hook entry point (safety net).
# Fires every time the main agent finishes a turn. Guarantees the journal is
# never stale for more than one turn: if a SubagentStop merge was ever missed,
# the next main-agent turn folds any pending notes in.
#
# The engine only ever appends + exits 0, so this hook never blocks the stop
# and cannot cause a stop-loop. As belt-and-suspenders we still honor the
# stop_hook_active flag from the hook JSON per Claude Code docs.
INPUT="$(cat 2>/dev/null)"
if command -v jq >/dev/null 2>&1; then
    if [ "$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
        exit 0
    fi
fi
bash "$(dirname "$0")/merge-agent-notes.sh"

# Keep the trigger index in sync with the rules files. Cheap, idempotent; the
# PreToolUse action hook (inject-rules-on-action.sh) reads its JSON output. Runs
# only when a rules file is newer than the generated index, and
# only if python is
# available – never blocks the stop.
WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." &&
pwd)"
GEN="$WORKSPACE_ROOT/scripts/memory/build_trigger_index.py"
IDX="$WORKSPACE_ROOT/facts/trigger-index.json"
if [ -f "$GEN" ];
then
    stale=0
    if [ ! -f "$IDX" ]; then
        stale=1
    else
        for rf in "$WORKSPACE_ROOT"/facts/rules-developer.md \
"$WORKSPACE_ROOT"/facts/rules-incident-response.md \
                  "$WORKSPACE_ROOT"/facts/rules-operations.md; do
            [ -f "$rf" ] && [ "$rf" -nt "$IDX" ] && stale=1 && break
        done
    fi
    if [ "$stale" -eq 1 ]; then
        if command -v
python >/dev/null 2>&1; then
            python "$GEN" >/dev/null 2>&1 || true
        elif command -v python3 >/dev/null 2>&1; then
python3 "$GEN" >/dev/null 2>&1 || true
        fi
    fi
fi
exit 0
