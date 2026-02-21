/* ── Types ────────────────────────────────────────────────── */

export type NodeType = "concept" | "process" | "actor" | "data" | "decision";

export type DiagramNode = {
  id: string;
  label: string;
  description?: string;
  type: NodeType;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
};

export type Pos = { x: number; y: number };

/* ── Layout constants ────────────────────────────────────── */

export const NODE_W = 130;
export const NODE_H = 46;
export const H_GAP = 28;
export const V_GAP = 80;
export const PAD = 24;

/* ── Layout algorithms ───────────────────────────────────── */

export function hierarchicalLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Map<string, Pos> | null {
  const inDeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }

  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) {
      queue.push(id);
      level.set(id, 0);
    }
  }

  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) continue;
    processed++;
    for (const next of adj.get(id) ?? []) {
      const nextDeg = (inDeg.get(next) ?? 1) - 1;
      inDeg.set(next, nextDeg);
      level.set(next, Math.max(level.get(next) ?? 0, (level.get(id) ?? 0) + 1));
      if (nextDeg === 0) queue.push(next);
    }
  }

  if (processed < nodes.length) return null; // cyclic — fall back to radial

  const byLevel = new Map<number, string[]>();
  for (const [id, lv] of level) {
    const group = byLevel.get(lv);
    if (group) {
      group.push(id);
    } else {
      byLevel.set(lv, [id]);
    }
  }

  const maxCount = Math.max(...Array.from(byLevel.values()).map((g) => g.length));
  const totalW = maxCount * (NODE_W + H_GAP) - H_GAP;

  const positions = new Map<string, Pos>();
  for (const [lv, ids] of byLevel) {
    const groupW = ids.length * (NODE_W + H_GAP) - H_GAP;
    const startX = (totalW - groupW) / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_W + H_GAP),
        y: lv * (NODE_H + V_GAP),
      });
    });
  }

  return positions;
}

export function radialLayout(nodes: DiagramNode[]): Map<string, Pos> {
  const positions = new Map<string, Pos>();
  if (nodes.length === 0) return positions;

  const radius = Math.max(110, nodes.length * 28);
  const cx = radius;
  const cy = radius;

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions.set(n.id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });

  return positions;
}

export function computeLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  hint?: "hierarchical" | "radial",
): Map<string, Pos> {
  if (hint !== "radial") {
    const result = hierarchicalLayout(nodes, edges);
    if (result) return result;
  }
  return radialLayout(nodes);
}

/* ── Geometry helpers ────────────────────────────────────── */

/** Point on the border of a node rect in the direction of `target` */
export function rectEdge(pos: Pos, target: Pos): Pos {
  const cx = pos.x + NODE_W / 2;
  const cy = pos.y + NODE_H / 2;
  const dx = target.x + NODE_W / 2 - cx;
  const dy = target.y + NODE_H / 2 - cy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return { x: cx, y: cy };
  const hw = NODE_W / 2;
  const hh = NODE_H / 2;
  const sx = Math.abs(dx) > 0.01 ? hw / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 0.01 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

export function svgBounds(positions: Map<string, Pos>) {
  if (positions.size === 0) return { minX: 0, minY: 0, maxX: 200, maxY: 100 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  return { minX, minY, maxX, maxY };
}
