(function () {
  const NS = "http://www.w3.org/2000/svg";
  const theme = {
    ink: "#1c1c1c",
    muted: "#5c6570",
    accent: "#0b57d0",
    line: "#8a8f98",
    card: "#ffffff",
    colors: { blue: "#0b57d0", red: "#c5221f", green: "#188038", orange: "#e37400" },
  };

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value != null) node.setAttribute(key, value);
    });
    return node;
  }

  function find(items, id) {
    return (items || []).find((item) => item.id === id);
  }

  function edgePoints(scene, from, to) {
    if (scene.flow === "vertical") {
      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height;
      const x2 = to.x + to.width / 2;
      const y2 = to.y;
      const mid = (y1 + y2) / 2;
      return [[x1, y1], [x1, mid], [x2, mid], [x2, y2]];
    }
    if (scene.flow === "radial") {
      return [
        [from.x + from.width / 2, from.y + from.height / 2],
        [to.x + to.width / 2, to.y + to.height / 2],
      ];
    }
    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;
    if (x2 < x1 + 24) {
      const low = Math.max(from.y + from.height, to.y + to.height) + 28;
      return [[x1, y1], [x1 + 18, y1], [x1 + 18, low], [x2 - 18, low], [x2 - 18, y2], [x2, y2]];
    }
    const mid = (x1 + x2) / 2;
    return [[x1, y1], [mid, y1], [mid, y2], [x2, y2]];
  }

  function pointAlong(points, t) {
    const lengths = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const len = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      lengths.push(len);
      total += len;
    }
    let remain = Math.max(0, Math.min(1, t)) * total;
    for (let i = 1; i < points.length; i++) {
      if (remain <= lengths[i - 1] || i === points.length - 1) {
        const span = lengths[i - 1] || 1;
        const u = remain / span;
        return {
          x: points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u,
          y: points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u,
        };
      }
      remain -= lengths[i - 1];
    }
    const last = points[points.length - 1];
    return { x: last[0], y: last[1] };
  }

  function tokenPoint(scene, token, time) {
    const route = token.route || [];
    const tracks = (scene.timeline.tracks || []).filter((track) => track.target === token.id && track.action === "move");
    let edgeId = null;
    let local = 0;
    if (route.length) {
      const duration = scene.timeline.duration || route.length * 2;
      const slice = duration / route.length;
      const index = Math.min(route.length - 1, Math.floor(Math.max(0, time) / slice));
      edgeId = route[index];
      local = (time - index * slice) / slice;
    } else if (tracks.length) {
      const track = tracks.find((item) => time >= item.start && time <= item.end) || tracks[0];
      edgeId = track.edge;
      const span = Math.max(0.001, (track.end || 1) - (track.start || 0));
      local = (time - (track.start || 0)) / span;
    }
    const edge = find(scene.edges, edgeId);
    if (!edge) {
      const home = find(scene.nodes, token.at);
      if (!home) return null;
      const width = home.width || 0;
      const height = home.height || 0;
      return { x: home.x + width / 2, y: home.y + height / 2 };
    }
    const from = find(scene.nodes, edge.from);
    const to = find(scene.nodes, edge.to);
    if (!from || !to) return null;
    if (scene.language === "map") {
      return {
        x: from.x + (to.x - from.x) * local,
        y: from.y + (to.y - from.y) * local,
      };
    }
    return pointAlong(edgePoints(scene, from, to), local);
  }

  function drawDefs(defs) {
    defs.replaceChildren();
    [["head", theme.line], ["head-hot", theme.accent]].forEach(([id, fill]) => {
      const marker = el("marker", {
        id: id, markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto",
      });
      marker.appendChild(el("polygon", { points: "0 0, 8 4, 0 8", fill: fill }));
      defs.appendChild(marker);
    });
  }

  function drawGroups(parent, scene) {
    (scene.groups || []).forEach((group) => {
      const members = scene.nodes.filter((node) => node.group === group.id);
      if (!members.length) return;
      const x = Math.min(...members.map((node) => node.x)) - 18;
      const y = Math.min(...members.map((node) => node.y)) - 28;
      const right = Math.max(...members.map((node) => node.x + node.width)) + 18;
      const bottom = Math.max(...members.map((node) => node.y + node.height)) + 16;
      parent.appendChild(el("rect", {
        x: x, y: y, width: right - x, height: bottom - y, rx: 8,
        fill: "#f4f6f8", stroke: "#d5d8de",
      }));
      const label = el("text", { x: x + 12, y: y + 16, "font-size": 12, fill: theme.muted });
      label.textContent = group.label || "";
      parent.appendChild(label);
    });
  }

  function drawEdges(parent, scene, state) {
    scene.edges.forEach((edge) => {
      const from = find(scene.nodes, edge.from);
      const to = find(scene.nodes, edge.to);
      if (!from || !to) return;
      const points = edgePoints(scene, from, to);
      const d = points.map((point, index) => (index ? "L" : "M") + point[0] + " " + point[1]).join(" ");
      const selected = state.selected && state.selected.type === "edge" && state.selected.id === edge.id;
      const hit = el("path", {
        d: d, fill: "none", stroke: "transparent", "stroke-width": 16,
        "data-id": edge.id, "data-type": "edge",
      });
      parent.appendChild(hit);
      parent.appendChild(el("path", {
        d: d, fill: "none", stroke: selected ? theme.accent : theme.line,
        "stroke-width": selected ? 2.4 : 1.4,
        "marker-end": selected ? "url(#head-hot)" : "url(#head)",
        "pointer-events": "none",
      }));
      if (edge.label) {
        const mid = pointAlong(points, 0.5);
        const text = el("text", {
          x: mid.x, y: mid.y - 8, "text-anchor": "middle", "font-size": 12, fill: theme.ink, "pointer-events": "none",
        });
        text.textContent = edge.label;
        parent.appendChild(text);
      }
    });
  }

  function drawAnnotations(parent, scene) {
    (scene.annotations || []).forEach((mark) => {
      const node = find(scene.nodes, mark.target);
      if (!node) return;
      const color = theme.colors[mark.color] || theme.accent;
      parent.appendChild(el("rect", {
        x: node.x - 8, y: node.y - 8, width: node.width + 16, height: node.height + 16, rx: 8,
        fill: "none", stroke: color, "stroke-width": 3, "pointer-events": "none",
      }));
    });
  }

  function drawTokens(parent, scene, state) {
    (scene.tokens || []).forEach((token) => {
      const at = tokenPoint(scene, token, state.time || 0);
      if (!at) return;
      const g = el("g", { "data-id": token.id, "data-type": "token" });
      g.appendChild(el("circle", { cx: at.x, cy: at.y, r: 8, fill: "#e37400", stroke: "#fff", "stroke-width": 2 }));
      const label = el("text", {
        x: at.x + 12, y: at.y + 4, "font-size": 12, fill: theme.ink, "pointer-events": "none",
      });
      label.textContent = token.label || "";
      g.appendChild(label);
      parent.appendChild(g);
    });
  }

  function render(scene, camera, state) {
    camera.replaceChildren();
    const lang = (window.VISUAL.languages || {})[scene.language] || window.VISUAL.languages.flow;
    const api = {
      theme: theme,
      selected: state.selected,
      time: state.time || 0,
      playing: !!state.playing,
      scrubbed: !!state.scrubbed,
      tokenPoint(token) { return tokenPoint(scene, token, state.time || 0); },
    };
    if (lang && lang.drawScene) {
      lang.drawScene(camera, scene, api);
      return;
    }
    drawGroups(camera, scene);
    drawAnnotations(camera, scene);
    drawEdges(camera, scene, state);
    (scene.nodes || []).forEach((node) => {
      if (lang && lang.drawNode) lang.drawNode(camera, node, api);
    });
    drawTokens(camera, scene, state);
  }

  window.VisualRender = { render, theme, tokenPoint };
})();
