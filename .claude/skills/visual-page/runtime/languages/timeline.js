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

  window.VISUAL.languages.timeline = {
    id: "timeline",
    title: "Timeline",
    nodeKinds: [{ id: "event", label: "Event", w: 140, h: 36 }],
    edgeKinds: [],
    drawScene(parent, scene, api) {
      const events = (scene.nodes || []).slice().sort((a, b) => (a.time || 0) - (b.time || 0));
      const max = Math.max(1, ...events.map((node) => Number(node.time) || 0));
      parent.appendChild(el("line", { x1: 40, y1: 120, x2: 760, y2: 120, stroke: "#8a8f98", "stroke-width": 2 }));
      events.forEach((node, index) => {
        const track = (scene.timeline.tracks || []).find((item) => item.target === node.id && item.action === "appear");
        const shown = !(api.playing || api.scrubbed) || !track || api.time >= track.start;
        if (!shown) return;
        const x = 48 + ((Number(node.time) || 0) / max) * 680;
        const above = index % 2 === 0;
        parent.appendChild(el("line", { x1: x, y1: 120, x2: x, y2: above ? 78 : 162, stroke: "#8a8f98" }));
        parent.appendChild(el("circle", { cx: x, cy: 120, r: 6, fill: "#0b57d0" }));
        const label = el("text", {
          x: x, y: above ? 64 : 184, "text-anchor": "middle", "font-size": 13, fill: api.theme.ink,
        });
        label.textContent = node.label;
        parent.appendChild(label);
        const time = el("text", {
          x: x, y: above ? 48 : 200, "text-anchor": "middle", "font-size": 11, fill: api.theme.muted,
        });
        time.textContent = node.when || String(node.time);
        parent.appendChild(time);
      });
    },
  };
})();
