#!/bin/bash
# PreToolUse wrapper. The loader is Python so it runs without jq.
cd "$(dirname "$0")/../.." || exit 0
if command -v py >/dev/null 2>&1; then
  exec py -3 .claude/hooks/inject_journal_context.py
fi
if command -v python >/dev/null 2>&1; then
  exec python .claude/hooks/inject_journal_context.py
fi
exit 0
