#!/usr/bin/env python3
"""Build facts/TRIGGER-INDEX.md – the action-trigger axis of the expert memory. The workflowID-split rules files (facts/rules-*.md) are the *browsing / context-budget* axis: they are loaded by session type (developer / incident-response / operations). But the thing that predicts *when* a rule is needed is the ACTION the agent is about to take (write a .sql file, open a PR, change a config). Those actions cut across workflows, so a rule filed under one workflow is invisible in the others. This script scans every rule entry for a `**Triggers:**` line and emits TWO artifacts: 1. facts/TRIGGER-INDEX.md – human-readable `token -> [rule, ...]` map (fallback discovery path, linked from MEMORY-INDEX.md). 2. facts/trigger-index.json – machine-readable `{token: [{title, file, line, body}]}` consumed by the PreToolUse hook so it can inject the FULL rule text at the moment of the action, in ANY workflow, without re-parsing markdown in bash. GENERATED FILES – never hand-edit either. Re-run this script after adding or retagging a rule: python scripts/memory/build_trigger_index.py # stdlib only (matches .claude/skills/memory-optimize/scripts/analyze-memory.py house style)."""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

# Rules files that carry the Triggers axis. Ordered for stable output.
RULES_FILES = ["rules-developer.md", "rules-incident-response.md", "rules-operations.md"]
# The separate-file rule bodies pointed to by "See Separate File" entries also carry triggers on their pointer entry; the pointer lives in a RULES_FILES file, so no extra scanning is needed here.
# Header for an entry: "### 2026-06-17: Title" or "## 2026-07-30: Title"
HEADER_RE = re.compile(r'^(#{2,3})\s+(\d{4}-\d{2}-\d{2}):\s+(.*?)\s*$')
TRIGGERS_RE = re.compile(r'^\*\*Triggers:\*\*\s*(.*?)\s*$')

def slugify(title):
    """GitHub-style anchor slug for a header title."""
    s = title.lower()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'\s+', '-', s).strip('-')
    return s

def parse_rules(filepath):
    """Yield dict per rule entry: {date, title, line, triggers:[...], anchor, body}. An entry runs from its header to the next header (or EOF). We read the **Triggers:** line within that block and keep the full block text as 'body' (header included, trailing '---'/blank lines trimmed). Tolerates duplicated metadata lines."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    entries = []
    current = None
    buf = []
    def flush():
        if current is not None:
            body = "".join(buf).rstrip()
            # Drop a trailing horizontal-rule separator so injected text is clean.
            body = re.sub(r'\n-{3,}\s*$', '', body).rstrip()
            current["body"] = body
            entries.append(current)
    for i, raw in enumerate(lines):
        m = HEADER_RE.match(raw)
        if m:
            flush()
            _, date, title = m.groups()
            current = {
                "date": date,
                "title": title,
                "line": i + 1,
                "triggers": None,  # None => field missing entirely
                "anchor": slugify(f"{date}-{title}"),
            }
            buf = [raw]
            continue
        if current is not None:
            buf.append(raw)
            if current["triggers"] is None:
                tm = TRIGGERS_RE.match(raw)
                if tm:
                    toks = [t.strip() for t in re.split(r'[,\s]+', tm.group(1)) if t.strip()]
                    current["triggers"] = toks
    flush()
    return entries

def main():
    base = Path(__file__).resolve().parents[2] / "facts"
    if not base.is_dir():
        print(f"ERROR: facts/ not found at {base}", file=sys.stderr)
        return 1
    token_map = defaultdict(list)  # token -> [(file, entry), ...]
    missing = []  # rules with no **Triggers:** line at all
    total = 0
    for fname in RULES_FILES:
        fpath = base / fname
        if not fpath.exists():
            print(f"WARNING: {fname} not found, skipping", file=sys.stderr)
            continue
        for e in parse_rules(fpath):
            total += 1
            if e["triggers"] is None:
                missing.append((fname, e["line"], e["title"]))
                continue
            for tok in e["triggers"]:
                if tok == "none":
                    continue
                token_map[(tok)].append((fname, e))
    # --- Emit TRIGGER-INDEX.md ---
    out = base / "TRIGGER-INDEX.md"
    lines = []
    lines.append("# Trigger Index (action -> rules)")
    lines.append("")
    lines.append("> **GENERATED FILE – do not hand-edit.** Regenerate with `python scripts/memory/build_trigger_index.py` after adding or retagging a rule.")
    lines.append(">")
    lines.append("> This is the **action axis** of the expert memory. Each rule carries a **Triggers:** field naming the tool-action(s) that should surface it. The PreToolUse hook `.claude/hooks/inject-rules-on-action.sh` reads this map and injects the matching rule text at the moment of the action – in **any** workflow, not just the one the rule is filed under. See [MEMORY-INDEX.md](MEMORY-INDEX.md) for the workflow (browsing) axis.")
    lines.append("")
    lines.append(f"Indexed {total} rules across {len(RULES_FILES)} files; " f"{len(token_map)} active trigger tokens; " f"{len(missing)} rules with no Triggers field.")
    lines.append("")
    for tok in sorted(token_map.keys()):
        rules = token_map[tok]
        lines.append(f"## {tok} ({len(rules)})")
        lines.append("")
        for fname, e in rules:
            link = f"{fname}#{e['anchor']}"
            lines.append(f"- [{e['title']}]({link}) — {fname}:{e['line']}")
        lines.append("")
    if missing:
        lines.append("## △ Rules with no **Triggers:** field")
        lines.append("")
        lines.append("_These rules are invisible to the action hook until tagged. " "Add a **Triggers:** line (use `none` if truly background-only)._")
        lines.append("")
        for fname, ln, title in missing:
            lines.append(f"- {title} — {fname}:{ln}")
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    # --- Emit trigger-index.json (machine-readable, for the hook) ---
    json_map = {}
    for tok in sorted(token_map.keys()):
        json_map[tok] = [{"title": e["title"], "file": fname, "line": e["line"], "body": e["body"],} for fname, e in token_map[tok]]
    json_out = base / "trigger-index.json"
    json_out.write_text(json.dumps(json_map, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    print(f"Wrote {json_out}")
    print(f"{total} rules indexed, {len(token_map)} tokens, {len(missing)} missing Triggers")
    for tok in sorted(token_map.keys()):
        print(f"  {tok}: {len(token_map[tok])}")
    if missing:
        print(f"WARNING: {len(missing)} rules have no **Triggers:** line (listed in the index)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
