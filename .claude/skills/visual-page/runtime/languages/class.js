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

  window.VISUAL.languages.class = {
    id: "class",
    title: "Class",
    nodeKinds: [
      { id: "class", label: "Class", w: 200, h: 120 },
      { id: "interface", label: "Interface", w: 200, h: 108 },
    ],
    edgeKinds: [
      { id: "association", label: "Association" },
      { id: "extends", label: "Extends" },
      { id: "implements", label: "Implements" },
    ],
    drawNode(parent, node, api) {
      const selected = api.selected && api.selected.id === node.id && api.selected.type === "node";
      const stroke = selected ? api.theme.accent : "#8a8f98";
      const g = el("g", { "data-id": node.id, "data-type": "node" });
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: node.height, rx: 2,
        fill: "#fff", stroke: stroke, "stroke-width": selected ? 2.25 : 1.25,
      }));
      g.appendChild(el("rect", {
        x: node.x, y: node.y, width: node.width, height: 32, fill: "#e8f0fe", "pointer-events": "none",
      }));
      const title = el("text", {
        x: node.x + 12, y: node.y + 21, "font-size": 14, "font-weight": 600,
        fill: api.theme.ink, "pointer-events": "none",
      });
      title.textContent = node.kind === "interface" ? "«interface» " + node.label : node.label;
      g.appendChild(title);
      let y = node.y + 50;
      (node.attributes || []).forEach((line) => {
        const text = el("text", { x: node.x + 12, y: y, "font-size": 12, fill: api.theme.ink, "pointer-events": "none" });
        text.textContent = line;
        g.appendChild(text);
        y += 18;
      });
      y += 8;
      g.appendChild(el("line", {
        x1: node.x, y1: y - 14, x2: node.x + node.width, y2: y - 14,
        stroke: "#d5d8de", "pointer-events": "none",
      }));
      (node.operations || []).forEach((line) => {
        const text = el("text", { x: node.x + 12, y: y, "font-size": 12, fill: api.theme.ink, "pointer-events": "none" });
        text.textContent = line;
        g.appendChild(text);
        y += 18;
      });
      parent.appendChild(g);
    },
  };
})();
