(function () {
  const NS = "http://www.w3.org/2000/svg";
  window.VISUAL = window.VISUAL || { languages: {} };

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value != null) node.setAttribute(key, value);
    });
    return node;
  }

  function wrap(text, limit) {
    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const next = line ? line + " " + word : word;
      if (next.length > limit && line) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function addLines(g, lines, cx, cy, fill) {
    const start = cy - ((lines.length - 1) * 14) / 2;
    lines.forEach((line, index) => {
      const text = el("text", {
        x: cx,
        y: start + index * 14 + 4,
        "text-anchor": "middle",
        "font-size": 13,
        fill: fill,
        "pointer-events": "none",
      });
      text.textContent = line;
      g.appendChild(text);
    });
  }

  function shape(g, node, theme, selected) {
    const stroke = selected ? theme.accent : "#8a8f98";
    const sw = selected ? 2.25 : 1.25;
    const common = { fill: "#fff", stroke: stroke, "stroke-width": sw };
    if (node.kind === "decision") {
      const x = node.x, y = node.y, w = node.width, h = node.height;
      g.appendChild(el("polygon", Object.assign({
        points: `${x + w / 2},${y + 4} ${x + w - 4},${y + h / 2} ${x + w / 2},${y + h - 4} ${x + 4},${y + h / 2}`,
      }, common)));
      return;
    }
    if (node.kind === "start" || node.kind === "end") {
      g.appendChild(el("rect", Object.assign({
        x: node.x, y: node.y, width: node.width, height: node.height, rx: node.height / 2,
      }, common)));
      return;
    }
    if (node.kind === "person" || node.kind === "topic") {
      g.appendChild(el("ellipse", Object.assign({
        cx: node.x + node.width / 2,
        cy: node.y + node.height / 2,
        rx: node.width / 2,
        ry: node.height / 2,
      }, common)));
      return;
    }
    if (node.kind === "store") {
      g.appendChild(el("rect", Object.assign({
        x: node.x, y: node.y + 10, width: node.width, height: node.height - 16, rx: 2,
      }, common)));
      g.appendChild(el("ellipse", Object.assign({
        cx: node.x + node.width / 2, cy: node.y + 12, rx: node.width / 2, ry: 10,
      }, common)));
      return;
    }
    g.appendChild(el("rect", Object.assign({
      x: node.x, y: node.y, width: node.width, height: node.height, rx: 4,
    }, common)));
    if (node.kind === "system") {
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: 8, rx: 4, fill: theme.accent, "pointer-events": "none",
      }));
    }
  }

  window.VISUAL.languages.flow = {
    id: "flow",
    title: "Flow",
    nodeKinds: [
      { id: "start", label: "Start", w: 132, h: 44 },
      { id: "step", label: "Step", w: 176, h: 60 },
      { id: "decision", label: "Decision", w: 156, h: 88 },
      { id: "end", label: "End", w: 132, h: 44 },
      { id: "system", label: "System", w: 188, h: 72 },
      { id: "person", label: "Person", w: 148, h: 64 },
      { id: "store", label: "Store", w: 168, h: 72 },
      { id: "topic", label: "Topic", w: 136, h: 64 },
    ],
    edgeKinds: [
      { id: "flow", label: "Flow" },
      { id: "link", label: "Link" },
    ],
    drawNode(parent, node, api) {
      const g = el("g", { "data-id": node.id, "data-type": "node" });
      shape(g, node, api.theme, api.selected && api.selected.id === node.id && api.selected.type === "node");
      addLines(g, wrap(node.label, 20), node.x + node.width / 2, node.y + node.height / 2, api.theme.ink);
      parent.appendChild(g);
    },
  };
})();
