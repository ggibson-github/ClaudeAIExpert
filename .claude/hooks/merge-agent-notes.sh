#!/bin/bash
# Deterministic merge engine for background-agent journal notes.
# Called by BOTH the SubagentStop hook (fires right
# after any background agent finishes) and the Stop hook (fires every main-agent turn, as a safety net). Also callable manually. It
# is idempotent, lock-guarded, and NEVER blocks: it always exits 0 so it can be safe as a Stop hook (no stop-loop risk).
# Two kinds of notes are supported:
# 1. SHARED-TASK notes (multiple agents dividing one task)
# <session>/journal/agent-notes/tasks/<task-id>/
# manifest.json { "task": "...", "session_dir": "...",
# "subtasks": ["a","b","c"] }
# <subtask>.md one file per subtask agent (its completion signal)
# .merged marker written after a successful merge
# A shared task is merged into progress.md ONLY when every subtask listed
# in the manifest has a matching <subtask>.md file present. Until then it
# is left untouched (partial tasks never leak into the journal).
# 2. LOOSE notes (a single background agent, no shared task)
# <session>/journal/agent-notes/<label>.md
# Merged immediately on the next hook fire.
# On merge: notes are appended to progress.md under a timestamped section and
# the source files are archived under agent-notes/merged/. After merging, this
# script invokes post-journal-update.sh <session> to commit the audit snapshot.
# Zero agent overhead - runs independently of agent decisions.
set -u
WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WORKSPACE_ROOT" || exit 0
log() { echo "[merge-agent-notes] $*"; }
# jq is used to read manifests. If absent, we degrade gracefully: shared tasks
# are left for a human/agent, loose notes still merge.
HAVE_JQ=0
if command -v jq >/dev/null 2>&1; then HAVE_JQ=1; fi
# --- Discover candidate sessions ----------------
# In-repo work-items/*. Each must have journal/agent-notes/ holding pending work.
CANDIDATES=()
while IFS= read -r notes_dir; do
[ -z "$notes_dir" ] && continue
session_dir="$(dirname "$(dirname "$notes_dir")")"
# Never touch template sessions (_TEMPLATE); they are scaffolding, not work.
case "$session_dir" in
*/_TEMPLATE|*/_template) continue ;;
esac
CANDIDATES+=("$session_dir")
done < <(find work-items -type d -name agent-notes 2>/dev/null)
if [ "${#CANDIDATES[@]}" -eq 0 ]; then exit 0
fi
merge_one_note_file() {
# $1 = note file, $2 = journal path, $3 = merged archive dir, $4 = heading
local note="$1"
local journal="$2"
local archive="$3"
local heading="$4"
{
echo ""
echo "### ${heading}"
echo ""
cat "$note"
echo ""
} >> "$journal"
mkdir -p "$archive"
mv "$note" "$archive/" 2>/dev/null || true
}
process_session() {
local session_dir="$1"
local journal_dir="$session_dir/journal"
local notes_dir="$journal_dir/agent-notes"
local archive="$notes_dir/merged"
local lock="$notes_dir/.merge.lock"
local wid journal
wid="$(basename "$session_dir")"
local state="$WORKSPACE_ROOT/journals/work-items/$wid/state.json"
if [ ! -f "$state" ] || [ "$HAVE_JQ" -ne 1 ]; then
log "no branch map for $wid - skip"
return
fi
local leaf
if [ "$HAVE_JQ" -eq 1 ]; then
leaf="$(jq -r '.active[-1] // empty' "$state" | tr -d '\r')"
elif command -v py >/dev/null 2>&1; then
leaf="$(py -3 -c "import json,sys; print(json.load(open(sys.argv[1],encoding='utf-8')).get('active',[''])[-1])" "$state" | tr -d '\r')"
else
leaf=""
fi
journal="$WORKSPACE_ROOT/journals/work-items/$wid/nodes/${leaf}.md"
[ -n "$leaf" ] && [ -f "$journal" ] || { log "no active leaf for $wid - skip"; return; }
# --- Lock: serialize merges for this session so concurrent
# SubagentStop fires (several agents finishing at once) cannot race on progress.md. ---
local locked=0
if command -v mkdir >/dev/null 2>&1; then
for _ in 1 2 3 4 5 6 7 8 9 10; do
if mkdir "$lock" 2>/dev/null; then locked=1; break;
fi
sleep 1
done
fi
if [ "$locked" -ne 1 ]; then
log "could not acquire lock for $session_dir (another merge in progress) - skip"
return
fi
# shellcheck disable=SC2064
trap "rmdir '$lock' 2>/dev/null || true" RETURN
local did_merge=0
local ts
ts=$(date -Iseconds)
# --- 1. SHARED-TASK notes: merge when all subtasks
# reach TERMINAL state
# A subtask is TERMINAL when its <subtask>.md note exists. The dispatcher's
# contract is that a subtask writes its note on SUCCESS *or* on give-up
# (after its retry budget), so failure is a written signal - never a silent
# absence. This lets the task complete even when a subtask permanently fails.
if [ -d "$notes_dir/tasks" ]; then
for task_dir in "$notes_dir/tasks"/*/; do
[ -d "$task_dir" ] || continue
[ -f "$task_dir/.merged" ] && continue
# already merged
local manifest="$task_dir/manifest.json"
[ -f "$manifest" ] || { log "task $(basename "$task_dir") has no manifest - skip"; continue; }
if [ "$HAVE_JQ" -ne 1 ]; then
# No jq: cannot read the manifest reliably. Leave shared tasks
# for later rather than merge a partial task.
log "jq not available - deferring shared task $(basename "$task_dir")"
continue
fi
local task_name deadline
task_name=$(jq -r '.task // "unnamed task"' "$manifest" | tr -d '\r')
# Optional ISO-8601 deadline for the stall backstop (see below).
deadline=$(jq -r '.deadline // empty' "$manifest" | tr -d '\r')
# Tally terminal / missing / failed subtasks. tr -d '\r' guards
# against CRLF manifests+notes (common on Windows).
local total=0 present=0 failed=0
local missing_list="" failed_list=""
while IFS= read -r st; do
st="${st%%$'\r'}"
[ -z "$st" ] && continue
total=$((total+1))
local nf="$task_dir/${st}.md"
if [ -f "$nf" ]; then
present=$((present+1))
# A note whose Status line contains "fail" is a give-up.
if grep -qiE '^\*\*status:\*\*.*fail' "$nf" 2>/dev/null; then
failed=$((failed+1))
failed_list="${failed_list}${st} "
fi
else
missing_list="${missing_list}${st} "
fi
done < <(jq -r '.subtasks[]?' "$manifest")
# --- Not yet terminal: wait, unless past deadline (stall backstop) ---
if [ "$present" -lt "$total" ]; then
local stalled=0
if [ -n "$deadline" ] && command -v date >/dev/null 2>&1; then
local dl_epoch now_epoch
dl_epoch=$(date -d "$deadline" +%s 2>/dev/null || echo "")
now_epoch=$(date +%s 2>/dev/null || echo "")
if [ -n "$dl_epoch" ] && [ -n "$now_epoch" ] && [ "$now_epoch" -gt "$dl_epoch" ]; then
stalled=1
fi
fi
if [ "$stalled" -eq 1 ] && [ ! -f "$task_dir/.stall-warned" ]; then
# Agent(s) died without writing even a failure note. Escalate
# once (marker prevents repeat), but do NOT mark .merged - if
# the notes still arrive later they will merge normally.
{
echo ""
echo "## △ ATTENTION - Background task STALLED: ${task_name} (${ts})"
echo ""
echo "Past deadline (${deadline}) with ${present}/${total} subtasks reported."
echo "Never reported (no success or failure note): ${missing_list:-none}"
echo ""
echo "**Blockers:** operator action needed - a subtask agent appears to have died without reporting. Re-dispatch the missing subtask(s) or investigate."
} >> "$journal"
printf '%s\n' "STALLED task '${task_name}' at ${ts}: missing ${missing_list}" > "$session_dir/NEEDS-ATTENTION.md"
: > "$task_dir/.stall-warned"
log "escalated STALLED task '$task_name' (missing: ${missing_list})"
did_merge=1
continue
fi
log "task '$task_name' not terminal ($present/$total reported) - waiting"
continue
fi
# --- All subtasks terminal: merge as one atomic block ------------
local header status_note
if [ "$failed" -gt 0 ]; then
header="## △ Background Task PARTIAL: ${task_name} - ${failed} of ${total} subtask(s) FAILED (merged ${ts})"
status_note="${failed} subtask(s) failed after their retry budget: **${failed_list}**. Successful work below is still captured. **Blockers:** operator must review the failed subtask(s) and decide to re-dispatch or accept. See NEEDS-ATTENTION.md."
else
header="## Background Task Complete: ${task_name} (merged ${ts})"
status_note="All ${total} subtasks succeeded. Fold into the proper journal sections (Artifacts, Resolved Q&A, Next action) via journal-keeper."
fi
{
echo ""
echo "$header"
echo ""
echo "$status_note"
} >> "$journal"
while IFS= read -r st; do
st="${st%%$'\r'}"
[ -z "$st" ] && continue
merge_one_note_file "$task_dir/${st}.md" "$journal" "$archive/$(basename "$task_dir")" "subtask: ${st}"
done < <(jq -r '.subtasks[]?' "$manifest")
# Preserve the manifest in the archive and mark
# the task merged.
cp "$manifest" "$archive/$(basename "$task_dir")/manifest.json" 2>/dev/null || true
: > "$task_dir/.merged"
if [ "$failed" -gt 0 ]; then
printf '%s\n' "PARTIAL task '${task_name}' at ${ts}: ${failed}/${total} FAILED (${failed_list})" > "$session_dir/NEEDS-ATTENTION.md"
log "merged PARTIAL task '$task_name' - ${failed}/${total} failed (${failed_list})"
else
log "merged shared task '$task_name' into $journal"
fi
did_merge=1
done
fi
# --- 2. LOOSE notes: single-agent, merge immediately -------------------
# Collect *.md directly in agent-notes/ (not tasks/, not merged/), skipping
# README.md which
# is the folder's own documentation, not an agent note.
local loose=()
for note in "$notes_dir"/*.md; do
[ -e "$note" ] || continue
case "$(basename "$note")" in
README.md|readme.md) continue ;;
esac
loose+=("$note")
done
if [ "${#loose[@]}" -gt 0 ]; then
{
echo ""
echo "## Background Agent Notes (merged ${ts})"
echo ""
echo "Consolidated from background agents. Fold into the proper journal sections via journal-keeper."
} >> "$journal"
for note in "${loose[@]}"; do
merge_one_note_file "$note" "$journal" "$archive" "$(basename "$note" .md)"
done
log "merged loose notes into $journal"
did_merge=1
fi
# Release lock
# before committing (commit doesn't touch agent-notes state).
rmdir "$lock" 2>/dev/null || true
trap - RETURN
# --- Commit
# the audit snapshot for this session ------------------------
if [ "$did_merge" -eq 1 ]; then
bash "$WORKSPACE_ROOT/.claude/hooks/post-journal-update.sh" "$session_dir" >/dev/null 2>&1 || \
log "post-journal-update failed for $session_dir (merge is on disk)"
fi
}
# De-duplicate candidate list, then process each.
printf '%s\n' "${CANDIDATES[@]}" | sort -u | while IFS= read -r sdir; do
[ -n "$sdir" ] && process_session "$sdir"
done
exit 0
