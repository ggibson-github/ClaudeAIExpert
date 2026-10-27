"""PreToolUse hook. Load the expert journal and the active branch.

Claude Code contract: read hook JSON on stdin, write
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "..."}}
and always exit 0.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return ""


def _current_work_item(text: str) -> str:
    for line in text.splitlines():
        if line.startswith("Current work item:"):
            return line.split(":", 1)[1].strip()
    return ""


def _work_id(root: Path, expert_text: str) -> str:
    context = root / ".claude" / "active-context.txt"
    if context.is_file():
        line = _read(context).splitlines()[0].strip() if _read(context).splitlines() else ""
        if line.startswith("work-item:"):
            return line.split(":", 1)[1].strip()
    pointer = root / ".claude" / "active-work-item.txt"
    if pointer.is_file():
        lines = [line.strip() for line in _read(pointer).splitlines() if line.strip()]
        if lines:
            return lines[0]
    return _current_work_item(expert_text)


def _same(requested: str, target: Path) -> bool:
    raw = requested.replace("\\", "/").rstrip("/").lower()
    if not raw:
        return False
    absolute = str(target).replace("\\", "/").rstrip("/").lower()
    tail = "/".join(target.parts[-5:]).replace("\\", "/").lower()
    return raw == absolute or absolute.endswith("/" + raw.lstrip("/")) or raw.endswith(tail)


def context_sections(root: Path, tool_name: str, file_path: str) -> list[tuple[Path, str]]:
    expert = root / "journals" / "expert" / "progress.md"
    if not expert.is_file():
        return []
    expert_text = _read(expert).strip()
    sections: list[tuple[Path, str]] = []
    if expert_text:
        sections.append((expert, expert_text))
    work_id = _work_id(root, expert_text)
    if not work_id:
        return _drop_read(tool_name, file_path, sections)
    base = root / "journals" / "work-items" / work_id
    flat = base / "progress.md"
    if not flat.is_file():
        return _drop_read(tool_name, file_path, sections)
    flat_text = _read(flat).strip()
    if flat_text:
        sections.append((flat, flat_text))
    if any(
        line.lower().startswith("completion status:") and line.split(":", 1)[1].strip().lower() == "done"
        for line in flat_text.splitlines()
    ):
        return _drop_read(tool_name, file_path, sections)
    state_path = base / "state.json"
    try:
        state = json.loads(_read(state_path)) if state_path.is_file() else {}
    except json.JSONDecodeError:
        state = {}
    active = state.get("active") if isinstance(state, dict) else []
    if not isinstance(active, list):
        active = []
    for node_id in active:
        if not isinstance(node_id, str) or not node_id.strip():
            continue
        if "/" in node_id or "\\" in node_id or ".." in node_id:
            continue
        note = base / "nodes" / f"{node_id.strip()}.md"
        body = _read(note).strip() if note.is_file() else ""
        if body:
            sections.append((note, body))
    return _drop_read(tool_name, file_path, sections)


def _drop_read(tool_name: str, file_path: str, sections: list[tuple[Path, str]]) -> list[tuple[Path, str]]:
    if tool_name not in {"Read", "ReadFile"}:
        return sections
    return [(path, body) for path, body in sections if not _same(file_path, path)]


def additional_context(root: Path, payload: dict) -> str:
    tool_input = payload.get("tool_input") if isinstance(payload.get("tool_input"), dict) else {}
    tool_name = str(payload.get("tool_name") or "")
    file_path = str(tool_input.get("file_path") or tool_input.get("path") or "")
    chunks = [body for _path, body in context_sections(root, tool_name, file_path)]
    if not chunks:
        return ""
    return "Journal context:\n\n" + "\n\n".join(chunks)


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    text = additional_context(Path.cwd(), payload)
    if text:
        json.dump(
            {"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": text}},
            sys.stdout,
        )
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
