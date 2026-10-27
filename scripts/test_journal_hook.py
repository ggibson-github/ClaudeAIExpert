"""Claude PreToolUse journal hook loads the active branch only."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOK = ROOT / ".claude" / "hooks" / "inject-journal-context.sh"


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _bash(path: Path) -> str:
    text = path.resolve().as_posix()
    if len(text) > 2 and text[1] == ":":
        return "/" + text[0].lower() + text[2:]
    return text


def _run(payload: dict, workspace: Path) -> dict:
    completed = subprocess.run(
        ["bash", str(HOOK)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=str(workspace),
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit(completed.stderr or completed.stdout or "hook failed")
    if not completed.stdout.strip():
        return {}
    return json.loads(completed.stdout)


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="claude-journal-"))
    try:
        shutil.copytree(ROOT / "journals", tmp / "journals")
        (tmp / ".claude").mkdir(parents=True, exist_ok=True)
        expert = tmp / "journals" / "expert" / "progress.md"
        expert.write_text("EXPERT_JOURNAL\n\nCurrent work item: WID-1\n", encoding="utf-8")
        base = tmp / "journals" / "work-items" / "WID-1"
        _write(base / "progress.md", "WORK_ITEM_JOURNAL\n\nCompletion status: in progress\n")
        _write(
            base / "state.json",
            json.dumps(
                {
                    "active": ["work-item", "spec"],
                    "nodes": {
                        "work-item": {"parent": None, "status": "open", "history": []},
                        "spec": {"parent": "work-item", "status": "open", "history": []},
                        "implement": {"parent": "work-item", "status": "open", "history": []},
                    },
                }
            ),
        )
        _write(base / "nodes" / "work-item.md", "ROOT_NOTE\n")
        _write(base / "nodes" / "spec.md", "ACTIVE_BRANCH_NOTE\n")
        _write(base / "nodes" / "implement.md", "INACTIVE_BRANCH_NOTE\n")
        (tmp / ".claude").mkdir(exist_ok=True)
        (tmp / ".claude" / "active-work-item.txt").write_text("WID-1\n", encoding="utf-8")

        hook = str(ROOT / ".claude" / "hooks" / "inject_journal_context.py")
        loaded = subprocess.run(
            [sys.executable, hook],
            input=json.dumps({"tool_name": "Bash", "tool_input": {"command": "echo hi"}}),
            text=True,
            capture_output=True,
            cwd=str(tmp),
            check=False,
        )
        _assert(loaded.returncode == 0, loaded.stderr or "hook failed")
        body = json.loads(loaded.stdout)["hookSpecificOutput"]["additionalContext"]
        _assert("EXPERT_JOURNAL" in body, "expert journal missing")
        _assert("WORK_ITEM_JOURNAL" in body, "work item journal missing")
        _assert("ACTIVE_BRANCH_NOTE" in body, "active branch missing")
        _assert("INACTIVE_BRANCH_NOTE" not in body, "inactive branch was loaded")
        _assert((base / "nodes" / "implement.md").is_file(), "inactive note removed")

        reading = subprocess.run(
            [sys.executable, hook],
            input=json.dumps(
                {
                    "tool_name": "Read",
                    "tool_input": {"file_path": "journals/work-items/WID-1/nodes/spec.md"},
                }
            ),
            text=True,
            capture_output=True,
            cwd=str(tmp),
            check=False,
        )
        read_body = json.loads(reading.stdout)["hookSpecificOutput"]["additionalContext"]
        _assert("ACTIVE_BRANCH_NOTE" not in read_body, "active note injected onto its own read")
        _assert("EXPERT_JOURNAL" in read_body, "expert journal dropped on note read")

        (base / "progress.md").write_text(
            "WORK_ITEM_JOURNAL\n\nCompletion status: done\n", encoding="utf-8"
        )
        done = subprocess.run(
            [sys.executable, hook],
            input=json.dumps({"tool_name": "Bash", "tool_input": {"command": "echo hi"}}),
            text=True,
            capture_output=True,
            cwd=str(tmp),
            check=False,
        )
        done_body = json.loads(done.stdout)["hookSpecificOutput"]["additionalContext"]
        _assert("DONE" not in done_body or "ACTIVE_BRANCH_NOTE" not in done_body, "done branch loaded")
        _assert("ACTIVE_BRANCH_NOTE" not in done_body, "done branch note was loaded")
        _assert("WORK_ITEM_JOURNAL" in done_body, "done work item journal missing")
        print("claude journal hook tests passed")
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
