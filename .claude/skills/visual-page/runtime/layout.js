(function () {
  function find(items, id) {
    return (items || []).find((item) => item.id === id);
  }

  function incoming(scene) {
    const counts = {};
    scene.nodes.forEach((node) => {
      counts[node.id] = 0;
    });
    scene.edges.forEach((edge) => {
      if (counts[edge.to] != null) counts[edge.to] += 1;
    });
    return counts;
  }

  function sizeNodes(scene, languages) {
    const lang = languages[scene.language] || { nodeKinds: [] };
    scene.nodes.forEach((node) => {
      const kind = lang.nodeKinds.find((item) => item.id === node.kind) || { w: 168, h: 56 };
      if (scene.language === "class") {
        const lines = [node.label || ""].concat(node.attributes || [], node.operations || []);
        const widest = lines.reduce((max, line) => Math.max(max, String(line).length), 8);
        node.width = node.width || Math.max(188, 28 + widest * 7.4);
        const attrs = (node.attributes || []).length;
        const ops = (node.operations || []).length;
        node.height = node.height || 36 + Math.max(1, attrs) * 18 + 10 + Math.max(1, ops) * 18 + 12;
      } else {
        node.width = node.width || kind.w;
        node.height = node.height || kind.h;
      }
    });
  }

  function layoutLayered(scene) {
    const counts = incoming(scene);
    const children = {};
    scene.edges.forEach((edge) => {
      (children[edge.from] = children[edge.from] || []).push(edge.to);
    });
    const layer = {};
    const queue = scene.nodes.filter((node) => !counts[node.id]).map((node) => [node.id, 0]);
    if (!queue.length && scene.nodes.length) queue.push([scene.nodes[0].id, 0]);
    const seen = new Set();
    while (queue.length) {
      const [id, depth] = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      layer[id] = depth;
      (children[id] || []).forEach((next) => queue.push([next, depth + 1]));
    }
    const columns = {};
    scene.nodes.forEach((node) => {
      const depth = layer[node.id] || 0;
      (columns[depth] = columns[depth] || []).push(node);
    });
    Object.keys(columns).forEach((depth) => {
      columns[depth].forEach((node, index) => {
        node.x = 64 + Number(depth) * 240;
        node.y = 56 + index * 128;
      });
    });
    scene.flow = "horizontal";
  }

  function layoutTree(scene) {
    const counts = incoming(scene);
    const children = {};
    scene.edges.forEach((edge) => {
      (children[edge.from] = children[edge.from] || []).push(edge.to);
    });
    const root = scene.nodes.find((node) => !counts[node.id]) || scene.nodes[0];
    if (!root) return;
    function leaves(id) {
      const kids = children[id] || [];
      if (!kids.length) return 1;
      return kids.reduce((sum, kid) => sum + leaves(kid), 0);
    }
    function place(id, left, depth) {
      const node = find(scene.nodes, id);
      if (!node) return;
      const kids = children[id] || [];
      node.y = 48 + depth * 140;
      if (!kids.length) {
        node.x = 48 + left * 200;
        return;
      }
      let cursor = left;
      kids.forEach((kid) => {
        const width = leaves(kid);
        place(kid, cursor, depth + 1);
        cursor += width;
      });
      const first = find(scene.nodes, kids[0]);
      const last = find(scene.nodes, kids[kids.length - 1]);
      node.x = first && last ? (first.x + last.x) / 2 : 48;
    }
    place(root.id, 0, 0);
    scene.flow = "vertical";
  }

  function layoutRadial(scene) {
    if (!scene.nodes.length) return;
    const counts = incoming(scene);
    const root = scene.nodes.find((node) => !counts[node.id]) || scene.nodes[0];
    root.x = 340;
    root.y = 200;
    const rest = scene.nodes.filter((node) => node !== root);
    rest.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(1, rest.length);
      node.x = 340 + Math.cos(angle) * 220 - node.width / 2;
      node.y = 210 + Math.sin(angle) * 150 - node.height / 2;
    });
    scene.flow = "radial";
  }

  function apply(scene, languages) {
    sizeNodes(scene, languages || {});
    if (!scene.nodes.length) return;
    if (scene.layout === "free") {
      scene.flow = scene.flow || "horizontal";
      return;
    }
    if (scene.nodes.every((node) => node.x != null && node.y != null)) {
      scene.flow = scene.flow || (scene.layout === "tree" ? "vertical" : scene.layout === "radial" ? "radial" : "horizontal");
      return;
    }
    if (scene.layout === "tree") layoutTree(scene);
    else if (scene.layout === "radial") layoutRadial(scene);
    else layoutLayered(scene);
  }

  window.VisualLayout = { apply };
})();
