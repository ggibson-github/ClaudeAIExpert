(function () {
  const svg = document.getElementById("board");
  const camera = document.getElementById("camera");
  const defs = document.getElementById("defs");
  const titleEl = document.getElementById("title");
  const captionEl = document.getElementById("caption");
  const paletteEl = document.getElementById("palette");
  const hintEl = document.getElementById("hint");
  const scrubber = document.getElementById("scrubber");
  const languageEl = document.getElementById("language");

  const state = {
    scene: null,
    rev: -1,
    mode: "select",
    circleColor: "blue",
    selected: null,
    connectFrom: null,
    view: { x: 40, y: 36, scale: 1 },
    time: 0,
    playing: false,
    scrubbed: false,
    dragging: false,
    undo: [],
    redo: [],
    laidOut: false,
  };

  function normalize(scene) {
    scene.nodes = scene.nodes || [];
    scene.edges = scene.edges || [];
    scene.groups = scene.groups || [];
    scene.annotations = scene.annotations || [];
    scene.tokens = scene.tokens || [];
    scene.timeline = scene.timeline || { duration: 0, tracks: [] };
    scene.timeline.tracks = scene.timeline.tracks || [];
    scene.interactive = scene.interactive !== false;
    scene.layout = scene.layout || "free";
    return scene;
  }

  function find(items, id) {
    return (items || []).find((item) => item.id === id);
  }

  function applyOp(scene, op) {
    const name = op.op;
    if (name === "move") {
      const node = find(scene.nodes, op.id);
      if (node) {
        node.x = op.x;
        node.y = op.y;
      }
    } else if (name === "layout") {
      (op.positions || []).forEach((pos) => {
        const node = find(scene.nodes, pos.id);
        if (!node) return;
        ["x", "y", "width", "height"].forEach((key) => {
          if (pos[key] != null) node[key] = pos[key];
        });
      });
    } else if (name === "connect") {
      if (!find(scene.edges, op.id)) {
        scene.edges.push({
          id: op.id, kind: op.kind || "flow", from: op.from, to: op.to, label: op.label || "",
        });
      }
    } else if (name === "reverse") {
      const edge = find(scene.edges, op.id);
      if (edge) {
        const from = edge.from;
        edge.from = edge.to;
        edge.to = from;
      }
    } else if (name === "delete") {
      const bucket = op.bucket || "edge";
      const key = { node: "nodes", edge: "edges", annotation: "annotations", token: "tokens" }[bucket];
      if (key) scene[key] = scene[key].filter((item) => item.id !== op.target);
      if (bucket === "node") {
        scene.edges = scene.edges.filter((edge) => edge.from !== op.target && edge.to !== op.target);
      }
    } else if (name === "annotate") {
      const same = scene.annotations.find((mark) => mark.target === op.target && mark.color === op.color);
      if (same) scene.annotations = scene.annotations.filter((mark) => mark !== same);
      else scene.annotations.push({ id: op.id, target: op.target, color: op.color });
    } else if (name === "relabel") {
      const node = find(scene.nodes, op.id);
      if (node) node.label = op.label || "";
    } else if (name === "add-node") {
      if (op.node && !find(scene.nodes, op.node.id)) scene.nodes.push(op.node);
    } else if (name === "reroute") {
      const token = find(scene.tokens, op.token);
      if (token) token.route = (op.edges || []).slice();
    }
  }

  function post(op) {
    op.baseRev = state.rev;
    fetch("/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op),
    }).then((response) => {
      if (response.status === 409) poll();
    });
  }

  function commit(op, inverse) {
    applyOp(state.scene, op);
    state.undo.push(inverse);
    state.redo = [];
    post(op);
    draw();
    updateTools();
  }

  function undo() {
    const inverse = state.undo.pop();
    if (!inverse) return;
    applyOp(state.scene, inverse.op);
    state.redo.push(inverse.reverse);
    post(inverse.op);
    draw();
    updateTools();
  }

  function redo() {
    const again = state.redo.pop();
    if (!again) return;
    applyOp(state.scene, again.op);
    state.undo.push(again.reverse);
    post(again.op);
    draw();
    updateTools();
  }

  function snap(value) {
    return Math.round(value / 16) * 16;
  }

  function lang() {
    return (window.VISUAL.languages || {})[state.scene.language] || window.VISUAL.languages.flow;
  }

  function draw() {
    if (!state.scene) return;
    camera.setAttribute("transform", `translate(${state.view.x} ${state.view.y}) scale(${state.view.scale})`);
    window.VisualRender.render(state.scene, camera, state);
    titleEl.textContent = state.scene.title || "Shared page";
    captionEl.textContent = state.scene.caption || "";
    languageEl.textContent = lang().title || state.scene.language;
    const duration = state.scene.timeline.duration || 0;
    scrubber.max = String(duration || 0);
    scrubber.value = String(Math.min(duration, state.time));
    scrubber.disabled = !duration;
  }

  function fit() {
    const nodes = state.scene.nodes || [];
    const bounds = nodes.length
      ? {
          w: Math.max(...nodes.map((node) => node.x + node.width)) + 80,
          h: Math.max(...nodes.map((node) => node.y + node.height)) + 80,
        }
      : { w: 760, h: 460 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(1, (rect.width - 48) / bounds.w, (rect.height - 48) / bounds.h);
    state.view.scale = Math.max(0.4, scale || 1);
    state.view.x = 28;
    state.view.y = 24;
  }

  function rememberLayout() {
    if (state.laidOut) return;
    state.laidOut = true;
    post({
      op: "layout",
      positions: state.scene.nodes.map((node) => ({
        id: node.id, x: node.x, y: node.y, width: node.width, height: node.height,
      })),
    });
  }

  async function poll() {
    try {
      const response = await fetch("/view", { cache: "no-store" });
      const scene = normalize(await response.json());
      const revisionChanged = !state.scene || scene.rev !== state.rev;
      if ((state.dragging || state.playing) && !revisionChanged) return;
      if (revisionChanged) {
        const missing = scene.nodes.some((node) => node.x == null || node.y == null);
        window.VisualLayout.apply(scene, window.VISUAL.languages);
        state.scene = scene;
        state.rev = scene.rev;
        state.time = 0;
        state.playing = false;
        state.scrubbed = false;
        state.selected = null;
        state.connectFrom = null;
        state.mode = "select";
        state.undo = [];
        state.redo = [];
        state.laidOut = !missing;
        fit();
        buildPalette();
        draw();
        if (missing) rememberLayout();
        updateTools();
      }
    } catch (err) {
      captionEl.textContent = "The page could not load the picture.";
    }
  }

  function buildPalette() {
    paletteEl.replaceChildren();
    if (!state.scene.interactive) return;
    (lang().nodeKinds || []).forEach((kind) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = kind.label;
      button.addEventListener("click", () => addNode(kind));
      paletteEl.appendChild(button);
    });
  }

  function addNode(kind) {
    const rect = svg.getBoundingClientRect();
    const x = snap((rect.width / 2 - state.view.x) / state.view.scale);
    const y = snap((rect.height / 2 - state.view.y) / state.view.scale);
    const node = {
      id: "node-" + Date.now(),
      kind: kind.id,
      label: kind.label,
      x: x,
      y: y,
      width: kind.w,
      height: kind.h,
    };
    if (state.scene.language === "class") {
      node.attributes = [];
      node.operations = [];
      node.height = 88;
    }
    commit(
      { op: "add-node", node: node },
      pair(
        { op: "delete", target: node.id, bucket: "node" },
        { op: "add-node", node: node }
      )
    );
  }

  function updateTools() {
    document.getElementById("undo").disabled = state.undo.length === 0;
    document.getElementById("redo").disabled = state.redo.length === 0;
    const edge = state.selected && state.selected.type === "edge";
    document.getElementById("reverse").disabled = !edge;
    document.getElementById("delete").disabled = !state.selected;
    const token = (state.scene.tokens || []).length > 0;
    document.getElementById("route").disabled = !(edge && token);
    document.getElementById("connect").classList.toggle("on", state.mode === "connect");
    const interactive = state.scene.interactive !== false;
    document.getElementById("connect").disabled = !interactive;
    document.getElementById("palette").hidden = !interactive;
    document.querySelectorAll("[data-color]").forEach((button) => {
      button.hidden = !interactive;
      button.classList.toggle("on", state.mode === "circle" && button.dataset.color === state.circleColor);
    });
    if (!interactive) {
      document.getElementById("reverse").disabled = true;
      document.getElementById("delete").disabled = true;
      document.getElementById("route").disabled = true;
    }
    document.getElementById("play").textContent = state.playing ? "Pause" : "Play";
    if (state.mode === "connect") hintEl.textContent = "Click the start, then the end. The arrowhead is the direction.";
    else if (state.mode === "circle") hintEl.textContent = "Click an item to circle it in " + state.circleColor + ". Click it again to remove the circle.";
    else hintEl.textContent = "Drag an item. Draw an arrow, then reverse or delete it. Circle something to point it out, then say in chat what you meant.";
  }

  function screenToWorld(event) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - state.view.x) / state.view.scale,
      y: (event.clientY - rect.top - state.view.y) / state.view.scale,
    };
  }

  svg.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    window.getSelection().removeAllRanges();
    const hit = event.target.closest("[data-id]");
    if (!hit) {
      state.selected = null;
      startPan(event);
      draw();
      updateTools();
      return;
    }
    const type = hit.dataset.type;
    const id = hit.dataset.id;
    if (state.mode === "connect" && type === "node") {
      connect(id);
      return;
    }
    if (state.mode === "circle" && type === "node") {
      annotate(id);
      return;
    }
    state.selected = { type: type, id: id };
    updateTools();
    if (type === "node" && state.scene.interactive !== false) startDrag(event, id);
    else draw();
  });

  svg.addEventListener("dblclick", (event) => {
    const hit = event.target.closest("[data-type='node']");
    if (!hit || state.scene.interactive === false) return;
    const node = find(state.scene.nodes, hit.dataset.id);
    const input = document.createElement("input");
    input.value = node.label || "";
    input.style.position = "fixed";
    input.style.left = event.clientX + "px";
    input.style.top = event.clientY + "px";
    input.style.font = "14px Segoe UI, sans-serif";
    input.style.zIndex = "5";
    document.body.appendChild(input);
    input.focus();
    input.select();
    const finish = () => {
      const previous = node.label;
      const next = input.value;
      input.remove();
      if (next !== previous) {
        commit(
          { op: "relabel", id: node.id, label: next },
          pair({ op: "relabel", id: node.id, label: previous }, { op: "relabel", id: node.id, label: next })
        );
      }
    };
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (key) => {
      if (key.key === "Enter") input.blur();
    });
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const prev = state.view.scale;
    const next = Math.min(2.4, Math.max(0.35, prev * (event.deltaY < 0 ? 1.08 : 0.92)));
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const wx = (mx - state.view.x) / prev;
    const wy = (my - state.view.y) / prev;
    state.view.scale = next;
    state.view.x = mx - wx * next;
    state.view.y = my - wy * next;
    draw();
  }, { passive: false });

  function startPan(event) {
    state.dragging = true;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = state.view.x;
    const originY = state.view.y;
    function move(ev) {
      window.getSelection().removeAllRanges();
      state.view.x = originX + ev.clientX - startX;
      state.view.y = originY + ev.clientY - startY;
      draw();
    }
    function up() {
      state.dragging = false;
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
    }
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  }

  function startDrag(event, id) {
    const node = find(state.scene.nodes, id);
    state.dragging = true;
    const origin = screenToWorld(event);
    const startX = node.x;
    const startY = node.y;
    let moved = false;
    function move(ev) {
      const point = screenToWorld(ev);
      node.x = snap(startX + point.x - origin.x);
      node.y = snap(startY + point.y - origin.y);
      moved = moved || node.x !== startX || node.y !== startY;
      draw();
    }
    function up() {
      state.dragging = false;
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      if (moved) {
        commit(
          { op: "move", id: id, x: node.x, y: node.y },
          pair({ op: "move", id: id, x: startX, y: startY }, { op: "move", id: id, x: node.x, y: node.y })
        );
      } else draw();
    }
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  }

  function pair(inverseOp, forwardOp) {
    const inverse = { op: inverseOp, reverse: null };
    const forward = { op: forwardOp, reverse: inverse };
    inverse.reverse = forward;
    return inverse;
  }

  function connect(id) {
    if (!state.connectFrom) {
      state.connectFrom = id;
      hintEl.textContent = "Now click the item the arrow points to.";
      return;
    }
    if (state.connectFrom === id) {
      state.connectFrom = null;
      return;
    }
    const edgeKind = (lang().edgeKinds[0] || { id: "flow" }).id;
    const edge = { id: "edge-" + Date.now(), kind: edgeKind, from: state.connectFrom, to: id, label: "" };
    state.connectFrom = null;
    state.mode = "select";
    commit(
      { op: "connect", id: edge.id, kind: edge.kind, from: edge.from, to: edge.to, label: "" },
      pair({ op: "delete", target: edge.id, bucket: "edge" }, { op: "connect", id: edge.id, kind: edge.kind, from: edge.from, to: edge.to, label: "" })
    );
    state.selected = { type: "edge", id: edge.id };
    updateTools();
  }

  function annotate(id) {
    const color = state.circleColor;
    const markId = "mark-" + Date.now();
    commit(
      { op: "annotate", id: markId, target: id, color: color },
      pair({ op: "annotate", id: markId, target: id, color: color }, { op: "annotate", id: markId, target: id, color: color })
    );
  }

  function deleteSelected() {
    if (!state.selected) return;
    const selected = state.selected;
    if (selected.type === "node") {
      const node = Object.assign({}, find(state.scene.nodes, selected.id));
      commit(
        { op: "delete", target: selected.id, bucket: "node" },
        pair({ op: "add-node", node: node }, { op: "delete", target: selected.id, bucket: "node" })
      );
    } else if (selected.type === "edge") {
      const edge = Object.assign({}, find(state.scene.edges, selected.id));
      commit(
        { op: "delete", target: selected.id, bucket: "edge" },
        pair(
          { op: "connect", id: edge.id, kind: edge.kind, from: edge.from, to: edge.to, label: edge.label || "" },
          { op: "delete", target: selected.id, bucket: "edge" }
        )
      );
    }
    state.selected = null;
    updateTools();
  }

  function reverseSelected() {
    if (!state.selected || state.selected.type !== "edge") return;
    const id = state.selected.id;
    commit({ op: "reverse", id: id }, pair({ op: "reverse", id: id }, { op: "reverse", id: id }));
  }

  function routeToken() {
    if (!state.selected || state.selected.type !== "edge") return;
    const token = state.scene.tokens[0];
    if (!token) return;
    const previous = (token.route || []).slice();
    const next = previous.indexOf(state.selected.id) === -1 ? previous.concat(state.selected.id) : previous;
    commit(
      { op: "reroute", token: token.id, edges: next },
      pair({ op: "reroute", token: token.id, edges: previous }, { op: "reroute", token: token.id, edges: next })
    );
  }

  function togglePlay() {
    const duration = state.scene.timeline.duration || 0;
    if (!duration && !(state.scene.tokens || []).some((token) => (token.route || []).length)) return;
    if (!state.scene.timeline.duration && (state.scene.tokens[0].route || []).length) {
      state.scene.timeline.duration = state.scene.tokens[0].route.length * 2;
    }
    state.playing = !state.playing;
    state.scrubbed = true;
    updateTools();
  }

  document.getElementById("undo").addEventListener("click", undo);
  document.getElementById("redo").addEventListener("click", redo);
  document.getElementById("connect").addEventListener("click", () => {
    state.mode = state.mode === "connect" ? "select" : "connect";
    state.connectFrom = null;
    updateTools();
  });
  document.getElementById("reverse").addEventListener("click", reverseSelected);
  document.getElementById("delete").addEventListener("click", deleteSelected);
  document.getElementById("route").addEventListener("click", routeToken);
  document.getElementById("play").addEventListener("click", togglePlay);
  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.mode === "circle" && state.circleColor === button.dataset.color) state.mode = "select";
      else {
        state.mode = "circle";
        state.circleColor = button.dataset.color;
      }
      updateTools();
    });
  });
  scrubber.addEventListener("input", () => {
    state.playing = false;
    state.scrubbed = true;
    state.time = Number(scrubber.value);
    draw();
    updateTools();
  });
  document.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT") return;
    if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
    if (event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
  });

  let last = 0;
  function frame(now) {
    if (state.playing && state.scene) {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      state.time += dt;
      const duration = state.scene.timeline.duration || 1;
      if (state.time > duration) state.time = 0;
      draw();
    } else last = 0;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function ensureDefs() {
    [["head", "#8a8f98"], ["head-hot", "#0b57d0"]].forEach(([id, fill]) => {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", id);
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("refX", "7");
      marker.setAttribute("refY", "4");
      marker.setAttribute("orient", "auto");
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", "0 0, 8 4, 0 8");
      polygon.setAttribute("fill", fill);
      marker.appendChild(polygon);
      defs.appendChild(marker);
    });
  }
  ensureDefs();
  poll();
  setInterval(poll, 400);
  window.VisualApp = { state: state, draw: draw };
})();
