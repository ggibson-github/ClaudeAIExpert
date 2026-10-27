#!/bin/bash
# SubagentStop hook entry point.
# Fires automatically right after ANY subagent (including background agents)
# finishes. It reads (and ignores) the hook JSON on stdin, then runs the
# deterministic merge engine, which merges whatever notes are ready. This is
# the "merge right after background work is done" guarantee - no reliance on
# the main agent remembering.
cat >/dev/null 2>&1  # drain stdin (hook JSON); the engine scans disk itself
bash "$(dirname "$0")/merge-agent-notes.sh"
exit 0
