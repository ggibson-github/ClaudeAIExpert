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

  const palette = ["#0b57d0", "#188038", "#e37400", "#c5221f", "#7b61ff"];

  window.VISUAL.languages.chart = {
    id: "chart",
    title: "Chart",
    nodeKinds: [],
    edgeKinds: [],
    drawScene(parent, scene, api) {
      const rows = (scene.data && scene.data.rows) || [];
      const kind = scene.chart || "bar";
      const progress = api.playing || api.scrubbed ? Math.min(1, api.time / (scene.timeline.duration || 1)) : 1;
      const title = el("text", { x: 24, y: 28, "font-size": 16, "font-weight": 600, fill: api.theme.ink });
      title.textContent = (scene.data && scene.data.title) || scene.title || "Chart";
      parent.appendChild(title);
      if (kind === "pie") drawPie(parent, rows, progress, api);
      else if (kind === "line") drawLine(parent, rows, progress, api);
      else drawBars(parent, rows, progress, api);
      const yName = el("text", { x: 24, y: 340, "font-size": 12, fill: api.theme.muted });
      yName.textContent = (scene.data && scene.data.y) || "";
      parent.appendChild(yName);
    },
  };

  function drawBars(parent, rows, progress, api) {
    const max = Math.max(1, ...rows.map((row) => Number(row[1]) || 0));
    const width = 520;
    rows.forEach((row, index) => {
      const value = Number(row[1]) || 0;
      const h = (value / max) * 220 * progress;
      const x = 56 + index * (width / Math.max(1, rows.length));
      const barW = Math.min(48, width / Math.max(1, rows.length) - 16);
      parent.appendChild(el("rect", {
        x: x, y: 300 - h, width: barW, height: h, fill: palette[index % palette.length],
      }));
      const label = el("text", { x: x + barW / 2, y: 318, "text-anchor": "middle", "font-size": 12, fill: api.theme.ink });
      label.textContent = row[0];
      parent.appendChild(label);
    });
    parent.appendChild(el("line", { x1: 40, y1: 300, x2: 600, y2: 300, stroke: "#8a8f98" }));
  }

  function drawLine(parent, rows, progress, api) {
    const max = Math.max(1, ...rows.map((row) => Number(row[1]) || 0));
    const shown = Math.max(1, Math.ceil(rows.length * progress));
    const points = rows.slice(0, shown).map((row, index) => {
      const x = 56 + index * (480 / Math.max(1, rows.length - 1));
      const y = 300 - ((Number(row[1]) || 0) / max) * 220;
      return [x, y];
    });
    if (points.length > 1) {
      parent.appendChild(el("polyline", {
        points: points.map((point) => point.join(",")).join(" "),
        fill: "none", stroke: "#0b57d0", "stroke-width": 2.5,
      }));
    }
    points.forEach((point) => {
      parent.appendChild(el("circle", { cx: point[0], cy: point[1], r: 4, fill: "#0b57d0" }));
    });
    rows.forEach((row, index) => {
      const x = 56 + index * (480 / Math.max(1, rows.length - 1));
      const label = el("text", { x: x, y: 318, "text-anchor": "middle", "font-size": 12, fill: api.theme.ink });
      label.textContent = row[0];
      parent.appendChild(label);
    });
    parent.appendChild(el("line", { x1: 40, y1: 300, x2: 600, y2: 300, stroke: "#8a8f98" }));
  }

  function drawPie(parent, rows, progress, api) {
    const total = rows.reduce((sum, row) => sum + (Number(row[1]) || 0), 0) || 1;
    let angle = -Math.PI / 2;
    const cx = 220;
    const cy = 180;
    const r = 100;
    rows.forEach((row, index) => {
      const slice = ((Number(row[1]) || 0) / total) * Math.PI * 2 * progress;
      const next = angle + Math.max(slice, 0.001);
      const x0 = cx + r * Math.cos(angle);
      const y0 = cy + r * Math.sin(angle);
      const x1 = cx + r * Math.cos(next);
      const y1 = cy + r * Math.sin(next);
      const large = next - angle > Math.PI ? 1 : 0;
      parent.appendChild(el("path", {
        d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
        fill: palette[index % palette.length],
      }));
      const label = el("text", { x: 380, y: 80 + index * 22, "font-size": 13, fill: api.theme.ink });
      label.textContent = row[0] + "  " + row[1];
      parent.appendChild(label);
      angle = next;
    });
  }
})();
