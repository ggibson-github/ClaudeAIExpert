"""Serve the visual communication page on this machine only."""

import argparse
import json
import socket
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RUNTIME = Path(__file__).resolve().parent
DATA = RUNTIME
HOST = "127.0.0.1"
PORT = 8765
LOCK = threading.Lock()
MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".css": "text/css; charset=utf-8",
}


def read_json(path, fallback):
    if not path.is_file():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def find(items, item_id):
    for item in items:
        if item.get("id") == item_id:
            return item
    return None


def apply_op(scene, op):
    name = op.get("op")
    nodes = scene.setdefault("nodes", [])
    edges = scene.setdefault("edges", [])
    annotations = scene.setdefault("annotations", [])
    tokens = scene.setdefault("tokens", [])
    if name == "move":
        node = find(nodes, op.get("id"))
        if node:
            node["x"] = op.get("x")
            node["y"] = op.get("y")
    elif name == "layout":
        for pos in op.get("positions") or []:
            node = find(nodes, pos.get("id"))
            if not node:
                continue
            for key in ("x", "y", "width", "height"):
                if key in pos:
                    node[key] = pos[key]
    elif name == "connect":
        if not find(edges, op.get("id")):
            edges.append(
                {
                    "id": op.get("id"),
                    "kind": op.get("kind") or "flow",
                    "from": op.get("from"),
                    "to": op.get("to"),
                    "label": op.get("label") or "",
                }
            )
    elif name == "reverse":
        edge = find(edges, op.get("id"))
        if edge:
            edge["from"], edge["to"] = edge.get("to"), edge.get("from")
    elif name == "delete":
        target = op.get("target") or op.get("id")
        bucket = op.get("bucket") or "edge"
        key = {
            "node": "nodes",
            "edge": "edges",
            "annotation": "annotations",
            "token": "tokens",
        }.get(bucket)
        if key:
            scene[key] = [item for item in scene.get(key, []) if item.get("id") != target]
        if bucket == "node":
            scene["edges"] = [
                edge
                for edge in scene.get("edges", [])
                if edge.get("from") != target and edge.get("to") != target
            ]
    elif name == "annotate":
        same = [
            mark
            for mark in annotations
            if mark.get("target") == op.get("target") and mark.get("color") == op.get("color")
        ]
        if same:
            scene["annotations"] = [
                mark
                for mark in annotations
                if not (
                    mark.get("target") == op.get("target")
                    and mark.get("color") == op.get("color")
                )
            ]
        else:
            annotations.append(
                {"id": op.get("id"), "target": op.get("target"), "color": op.get("color")}
            )
    elif name == "relabel":
        node = find(nodes, op.get("id"))
        if node:
            node["label"] = op.get("label", "")
    elif name == "add-node":
        node = op.get("node")
        if node and not find(nodes, node.get("id")):
            nodes.append(node)
    elif name == "reroute":
        token = find(tokens, op.get("token"))
        if token:
            token["route"] = list(op.get("edges") or [])


def compose():
    scene = read_json(DATA / "scene.json", {})
    edits = read_json(DATA / "edits.json", {"items": []})
    for item in edits.get("items", []):
        if item.get("baseRev") == scene.get("rev"):
            apply_op(scene, item)
    return scene


class ExclusiveServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        self.socket.bind(self.server_address)
        self.server_address = self.socket.getsockname()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/view":
            with LOCK:
                body = json.dumps(compose()).encode("utf-8")
            self._bytes(body, "application/json")
            return
        if path == "/health":
            body = json.dumps({"port": PORT, "data": str(DATA)}).encode("utf-8")
            self._bytes(body, "application/json")
            return
        if path in ("/scene.json", "/edits.json"):
            file_path = DATA / path.lstrip("/")
            if not file_path.is_file():
                self.send_error(404)
                return
            self._bytes(file_path.read_bytes(), "application/json")
            return
        file_path = self._resolve(path)
        if file_path is None or not file_path.is_file():
            self.send_error(404)
            return
        self._bytes(file_path.read_bytes(), MIME.get(file_path.suffix, "application/octet-stream"))

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/edits":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            op = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Expected JSON")
            return
        if not isinstance(op, dict) or "op" not in op:
            self.send_error(400, "Expected an edit")
            return
        with LOCK:
            scene = read_json(DATA / "scene.json", {})
            if op.get("baseRev") != scene.get("rev"):
                self.send_error(409, "The picture changed. Reload it.")
                return
            edits = read_json(DATA / "edits.json", {"items": []})
            edits.setdefault("items", []).append(op)
            write_json(DATA / "edits.json", edits)
        body = b'{"ok":true}\n'
        self._bytes(body, "application/json")

    def _resolve(self, url_path):
        if url_path == "/":
            url_path = "/index.html"
        rel = url_path.lstrip("/")
        if not rel or any(part == ".." for part in rel.split("/")):
            return None
        path = (RUNTIME / rel).resolve()
        if path != RUNTIME and RUNTIME not in path.parents:
            return None
        return path

    def _bytes(self, data, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


def ensure_data():
    DATA.mkdir(parents=True, exist_ok=True)
    for name in ("scene.json", "edits.json"):
        target = DATA / name
        template = RUNTIME / "templates" / name
        if not target.is_file() and template.is_file():
            target.write_text(template.read_text(encoding="utf-8"), encoding="utf-8")


def same_folder(left, right):
    try:
        return Path(left).resolve() == Path(right).resolve()
    except OSError:
        return False


def read_health(port):
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/health", timeout=0.2) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


def remember(port):
    write_json(
        DATA / "server.json",
        {"port": port, "url": f"http://{HOST}:{port}/", "data": str(DATA)},
    )


def already_serving(preferred):
    ports = []
    saved = read_json(DATA / "server.json", {})
    if isinstance(saved.get("port"), int):
        ports.append(saved["port"])
        ports.extend(range(preferred, preferred + 10))
    seen = set()
    for port in ports:
        if port in seen:
            continue
        seen.add(port)
        info = read_health(port)
        if info and same_folder(info.get("data", ""), DATA):
            return port
    return None


def bind_server(preferred):
    last_error = None
    for port in range(preferred, preferred + 40):
        try:
            return ExclusiveServer((HOST, port), Handler), port
        except OSError as exc:
            last_error = exc
    raise SystemExit(f"No free port from {preferred} to {preferred + 39}: {last_error}")


def main():
    global DATA, PORT
    parser = argparse.ArgumentParser(description="Serve the visual page for one project.")
    parser.add_argument("--data", help="Folder that holds this project's scene.json and edits.json")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    DATA = Path(args.data).resolve() if args.data else RUNTIME
    ensure_data()
    existing = already_serving(args.port)
    if existing:
        PORT = existing
        remember(existing)
        print(f"Visual page already at http://{HOST}:{existing}/", flush=True)
        print(f"Picture data in {DATA}", flush=True)
        return
    server, PORT = bind_server(args.port)
    remember(PORT)
    print(f"Visual page at http://{HOST}:{PORT}/", flush=True)
    print(f"Picture data in {DATA}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
