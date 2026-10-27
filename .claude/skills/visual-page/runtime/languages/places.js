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

  window.VISUAL.languages["material-flow"] = {
    id: "material-flow",
    title: "Material flow",
    nodeKinds: [{ id: "place", label: "Place", w: 168, h: 72 }],
    edgeKinds: [{ id: "route", label: "Route" }],
    drawNode(parent, node, api) {
      const selected = api.selected && api.selected.id === node.id && api.selected.type === "node";
      const g = el("g", { "data-id": node.id, "data-type": "node" });
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: node.height, rx: 6,
        fill: "#fff", stroke: selected ? api.theme.accent : "#8a8f98", "stroke-width": selected ? 2.25 : 1.25,
      }));
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: 22, rx: 6, fill: "#e8f0fe", "pointer-events": "none",
      }));
      const kind = el("text", {
        x: node.x + 10, y: node.y + 15, "font-size": 11, fill: api.theme.muted, "pointer-events": "none",
      });
      kind.textContent = "Place";
      g.appendChild(kind);
      const label = el("text", {
        x: node.x + node.width / 2, y: node.y + 48, "text-anchor": "middle", "font-size": 14,
        fill: api.theme.ink, "pointer-events": "none",
      });
      label.textContent = node.label;
      g.appendChild(label);
      parent.appendChild(g);
    },
  };

  window.VISUAL.languages.map = {
    id: "map",
    title: "Map",
    nodeKinds: [{ id: "place", label: "Place", w: 28, h: 28 }],
    edgeKinds: [{ id: "route", label: "Route" }],
    drawScene(parent, scene, api) {
      parent.appendChild(el("rect", { x: 20, y: 20, width: 760, height: 420, rx: 8, fill: "#e7eef5" }));
      for (let i = 1; i < 8; i++) {
        parent.appendChild(el("line", { x1: 20 + i * 95, y1: 20, x2: 20 + i * 95, y2: 440, stroke: "#d5dee8" }));
        parent.appendChild(el("line", { x1: 20, y1: 20 + i * 52, x2: 780, y2: 20 + i * 52, stroke: "#d5dee8" }));
      }
      (scene.edges || []).forEach((edge) => {
        const from = (scene.nodes || []).find((node) => node.id === edge.from);
        const to = (scene.nodes || []).find((node) => node.id === edge.to);
        if (!from || !to) return;
        parent.appendChild(el("line", {
          x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: "#5c6770", "stroke-width": 2, "marker-end": "url(#head)",
        }));
      });
      (scene.nodes || []).forEach((node) => {
        const g = el("g", { "data-id": node.id, "data-type": "node" });
        g.appendChild(el("circle", { cx: node.x, cy: node.y, r: 8, fill: "#0b57d0", stroke: "#fff", "stroke-width": 2 }));
        const label = el("text", { x: node.x + 12, y: node.y - 12, "font-size": 13, fill: api.theme.ink });
        label.textContent = node.label;
        g.appendChild(label);
        parent.appendChild(g);
      });
      (scene.tokens || []).forEach((token) => {
        const at = api.tokenPoint(token);
        if (!at) return;
        const g = el("g", { "data-id": token.id, "data-type": "token" });
        g.appendChild(el("circle", { cx: at.x, cy: at.y, r: 7, fill: "#e37400", stroke: "#fff" }));
        const label = el("text", { x: at.x + 10, y: at.y + 16, "font-size": 12, fill: api.theme.ink });
        label.textContent = token.label || "";
        g.appendChild(label);
        parent.appendChild(g);
      });
    },
  };

  window.VISUAL.languages.layout = {
    id: "layout",
    title: "Layout",
    nodeKinds: [{ id: "region", label: "Region", w: 220, h: 140 }],
    edgeKinds: [{ id: "link", label: "Link" }],
    drawNode(parent, node, api) {
      const selected = api.selected && api.selected.id === node.id && api.selected.type === "node";
      const g = el("g", { "data-id": node.id, "data-type": "node" });
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: node.height, rx: 4,
        fill: "#fbfbfa", stroke: selected ? api.theme.accent : "#8a8f98", "stroke-width": selected ? 2.25 : 1.25,
      }));
      const label = el("text", {
        x: node.x + 12, y: node.y + 22, "font-size": 14, "font-weight": 600, fill: api.theme.ink, "pointer-events": "none",
      });
      label.textContent = node.label;
      g.appendChild(label);
      parent.appendChild(g);
    },
  };
})();
