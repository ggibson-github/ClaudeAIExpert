#!/bin/bash
# PreToolUse hook: inject the expert rules that apply to the action the agent is
# about to take, at the moment it takes it – in ANY workflow.
# WHY THIS EXISTS
# The expert's rules are filed by *workflow* (developer / incident-response
# operations) and loaded by session type. But whether a rule is NEEDED is decided
# by the ACTION about to happen (write a .sql file, open a PR, change a config),
# which cuts across workflows. A rule filed under one workflow was invisible in the
# others – the "never loaded" failure. This hook keys on the action instead: it
# classifies the pending tool call into trigger token(s) and injects the matching
# rule text into context BEFORE the tool runs.
# CONTRACT (Claude Code PreToolUse)
# stdin : JSON with .tool_name and .tool_input (.file_path for Write/Edit,
# .command for Bash).
# stdout : {"hookSpecificOutput":{"hookEventName":"PreToolUse",
# "additionalContext":"<rule text>"}} – the model sees this before acting.
# exit : ALWAYS 0. Inject-only, never block (exit 2 would block; we never do).
# The token→rule map is the generated facts/trigger-index.json (built by
# scripts/memory/build_trigger_index.py). If jq or the index is missing, we no-op.
INPUT="$(cat 2>/dev/null)"
# jq is required to read the payload and build valid JSON output. Degrade to no-op.
command -v jq >/dev/null 2>&1 || exit 0
WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INDEX="$WORKSPACE_ROOT/facts/trigger-index.json"
[ -f "$INDEX" ] || exit 0
TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)"
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
# --- Classify the pending action into trigger token(s) -----------------
# Normalize path separators so Windows-style backslashes match too.
PATH_NORM="$(printf '%s' "$FILE_PATH" | tr '\' '/')"
TOKENS=()
case "$TOOL_NAME" in
Write|Edit|MultiEdit)
lc_path="$(printf '%s' "$PATH_NORM" | tr '[:upper:]' '[:lower:]')"
case "$lc_path" in
*.sql)
TOKENS+=("write:sql" "sql:generate")
;;
esac
case "$lc_path" in
*.html)
TOKENS+=("write:doc")
;;
esac
case "$lc_path" in
*/outputs/*|*walkthrough*)
TOKENS+=("write:customer-html")
;;
esac
case "$lc_path" in
*.md|*.markdown)
TOKENS+=("write:doc")
;;
esac
;;
Bash)
# Match on the command string. Keep patterns conservative.
case "$COMMAND" in
*"gh pr create"*)
TOKENS+=("pr:open")
;;
esac
case "$COMMAND" in
*"git push"*)
TOKENS+=("git:push")
;;
esac
case "$COMMAND" in
*"git commit"*)
TOKENS+=("git:commit")
;;
esac
# Change a config.
case "$COMMAND" in
*config*)
TOKENS+=("config:change")
;;
esac
;;
esac
[ "${#TOKENS[@]}" -eq 0 ] && exit 0
# --- De-duplicate tokens -------------------------------------------------
UNIQ_TOKENS=()
for t in "${TOKENS[@]}"; do
skip=
for u in "${UNIQ_TOKENS[@]}"; do
[ "$u" = "$t" ] && skip=1 && break
done
[ -z "$skip" ] && UNIQ_TOKENS+=("$t")
done
# --- Gather rule bodies and build the output in ONE jq pass --------------
# Read the index FILE as jq's input (not the command line) so the
# potentially large rule text never crosses argv (Windows/msys has a small
# arg-length limit – passing the assembled text back via --arg fails with
# "Argument list too long"). We collect the unique rules for the matched
# tokens (dedup by file+line so a rule tagged with two matched tokens
# appears once), format them, and emit the full hook JSON directly.
TOKENS_JSON="$(printf '%s\n' "${UNIQ_TOKENS[@]}" | jq -R . | jq -s -c .)"
OUTPUT="$(jq -c --argjson toks "$TOKENS_JSON" '
  . as $index
  | [ $toks[] as $t | ($index[$t] // [])[] ]
  | unique_by(.file + "|" + (.line|tostring))
  | if length == 0 then empty
    else
      ("⚠️ Expert rules for the action you are about to take "
        + "(matched triggers: " + ($toks | join(", ")) + "). "
        + "These apply REGARDLESS of the current workflow – follow them:\n\n"
        + (map("---\n" + .body) | join("\n\n"))
      ) as $ctx
      | { hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: $ctx } }
    end
' "$INDEX" 2>/dev/null)"
[ -z "$OUTPUT" ] && exit 0
printf '%s\n' "$OUTPUT"
exit 0
