import { describe, it, expect } from "vitest";
import {
  hierarchicalLayout,
  radialLayout,
  computeLayout,
  rectEdge,
  svgBounds,
  NODE_W,
  NODE_H,
  type DiagramNode,
  type DiagramEdge,
} from "./layout.js";

function node(id: string): DiagramNode {
  return { id, label: id, type: "concept" };
}

function edge(from: string, to: string): DiagramEdge {
  return { from, to };
}

/* ── hierarchicalLayout ──────────────────────────────────── */

describe("hierarchicalLayout", () => {
  it("linear chain assigns increasing y levels", () => {
    const pos = hierarchicalLayout(
      [node("a"), node("b"), node("c")],
      [edge("a", "b"), edge("b", "c")],
    );
    expect(pos).not.toBeNull();
    expect(pos!.get("a")!.y).toBeLessThan(pos!.get("b")!.y);
    expect(pos!.get("b")!.y).toBeLessThan(pos!.get("c")!.y);
  });

  it("nodes at the same level share the same y", () => {
    const pos = hierarchicalLayout(
      [node("a"), node("b"), node("c")],
      [edge("a", "c"), edge("b", "c")],
    );
    expect(pos).not.toBeNull();
    expect(pos!.get("a")!.y).toBe(pos!.get("b")!.y);
    expect(pos!.get("c")!.y).toBeGreaterThan(pos!.get("a")!.y);
  });

  it("diamond dependency: B and C at same level, D below both", () => {
    const pos = hierarchicalLayout(
      [node("a"), node("b"), node("c"), node("d")],
      [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")],
    );
    expect(pos).not.toBeNull();
    expect(pos!.get("b")!.y).toBe(pos!.get("c")!.y);
    expect(pos!.get("d")!.y).toBeGreaterThan(pos!.get("b")!.y);
  });

  it("returns null for cyclic graph", () => {
    const pos = hierarchicalLayout(
      [node("a"), node("b")],
      [edge("a", "b"), edge("b", "a")],
    );
    expect(pos).toBeNull();
  });

  it("single node returns a position", () => {
    const pos = hierarchicalLayout([node("a")], []);
    expect(pos).not.toBeNull();
    expect(pos!.get("a")).toBeDefined();
  });

  it("multiple roots are all at y=0", () => {
    const pos = hierarchicalLayout([node("a"), node("b")], []);
    expect(pos).not.toBeNull();
    expect(pos!.get("a")!.y).toBe(0);
    expect(pos!.get("b")!.y).toBe(0);
  });
});

/* ── radialLayout ────────────────────────────────────────── */

describe("radialLayout", () => {
  it("empty array returns empty map", () => {
    expect(radialLayout([]).size).toBe(0);
  });

  it("single node returns exactly one position", () => {
    const pos = radialLayout([node("a")]);
    expect(pos.size).toBe(1);
    expect(pos.get("a")).toBeDefined();
  });

  it("all node positions are distinct", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const pos = radialLayout(nodes);
    const points = nodes.map((n) => pos.get(n.id)!);
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(0.01);
      }
    }
  });

  it("radius scales with node count", () => {
    const nodes4 = Array.from({ length: 4 }, (_, i) => node(`n${i}`));
    const nodes8 = Array.from({ length: 8 }, (_, i) => node(`n${i}`));
    const radius4 = Math.max(110, 4 * 28);
    const radius8 = Math.max(110, 8 * 28);
    const pos4 = radialLayout(nodes4);
    const pos8 = radialLayout(nodes8);
    const center4 = { x: radius4, y: radius4 };
    const center8 = { x: radius8, y: radius8 };
    const p4 = pos4.get("n0")!;
    const p8 = pos8.get("n0")!;
    const dist4 = Math.sqrt((p4.x - center4.x) ** 2 + (p4.y - center4.y) ** 2);
    const dist8 = Math.sqrt((p8.x - center8.x) ** 2 + (p8.y - center8.y) ** 2);
    expect(dist8).toBeGreaterThan(dist4);
  });
});

/* ── computeLayout ───────────────────────────────────────── */

describe("computeLayout", () => {
  it("uses hierarchical for acyclic graph by default", () => {
    const pos = computeLayout([node("a"), node("b")], [edge("a", "b")]);
    expect(pos.get("a")!.y).toBeLessThan(pos.get("b")!.y);
  });

  it("uses radial when hinted", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b")];
    const pos = computeLayout(nodes, edges, "radial");
    const expected = radialLayout(nodes);
    for (const n of nodes) {
      expect(pos.get(n.id)).toEqual(expected.get(n.id));
    }
  });

  it("falls back to radial for a cyclic graph", () => {
    const pos = computeLayout(
      [node("a"), node("b")],
      [edge("a", "b"), edge("b", "a")],
    );
    expect(pos.get("a")).toBeDefined();
    expect(pos.get("b")).toBeDefined();
  });
});

/* ── rectEdge ────────────────────────────────────────────── */

describe("rectEdge", () => {
  it("overlapping positions return centre of the node", () => {
    const pos = { x: 0, y: 0 };
    const result = rectEdge(pos, pos);
    expect(result.x).toBeCloseTo(NODE_W / 2);
    expect(result.y).toBeCloseTo(NODE_H / 2);
  });

  it("target to the right returns right border midpoint", () => {
    const result = rectEdge({ x: 0, y: 0 }, { x: 200, y: 0 });
    expect(result.x).toBeCloseTo(NODE_W);
    expect(result.y).toBeCloseTo(NODE_H / 2);
  });

  it("target below returns bottom border midpoint", () => {
    const result = rectEdge({ x: 0, y: 0 }, { x: 0, y: 200 });
    expect(result.x).toBeCloseTo(NODE_W / 2);
    expect(result.y).toBeCloseTo(NODE_H);
  });
});

/* ── svgBounds ───────────────────────────────────────────── */

describe("svgBounds", () => {
  it("empty map returns default bounds", () => {
    expect(svgBounds(new Map())).toEqual({
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 100,
    });
  });

  it("single position includes node dimensions", () => {
    const bounds = svgBounds(new Map([["a", { x: 10, y: 20 }]]));
    expect(bounds.minX).toBe(10);
    expect(bounds.minY).toBe(20);
    expect(bounds.maxX).toBe(10 + NODE_W);
    expect(bounds.maxY).toBe(20 + NODE_H);
  });

  it("multiple positions span correct min/max", () => {
    const bounds = svgBounds(
      new Map([
        ["a", { x: 0, y: 0 }],
        ["b", { x: 100, y: 200 }],
      ]),
    );
    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(100 + NODE_W);
    expect(bounds.maxY).toBe(200 + NODE_H);
  });
});
