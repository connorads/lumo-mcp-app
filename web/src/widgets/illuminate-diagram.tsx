import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useEffect, useState } from "react";
import {
  useToolInfo,
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "../helpers.js";

/* ── Types ────────────────────────────────────────────────── */

type NodeType = "concept" | "process" | "actor" | "data" | "decision";

type DiagramNode = {
  id: string;
  label: string;
  description?: string;
  type: NodeType;
};

type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
};

type Pos = { x: number; y: number };

/* ── Layout constants ────────────────────────────────────── */

const NODE_W = 130;
const NODE_H = 46;
const H_GAP = 28;
const V_GAP = 80;
const PAD = 24;

/* ── Layout algorithms ───────────────────────────────────── */

function hierarchicalLayout(
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
    const id = queue.shift()!;
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
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(id);
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

function radialLayout(nodes: DiagramNode[]): Map<string, Pos> {
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

function computeLayout(
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
function rectEdge(pos: Pos, target: Pos): Pos {
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

function svgBounds(positions: Map<string, Pos>) {
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

/* ── Component ───────────────────────────────────────────── */

function IlluminateDiagram() {
  const toolState = useToolInfo<"illuminate-diagram">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ selectedNodeId: string | null }>({
    selectedNodeId: null,
  });
  const { theme } = useLayout();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (!toolState.isSuccess) {
    return (
      <div className="ill-loading">
        <div className="ill-spinner" />
      </div>
    );
  }

  const {
    title,
    nodes,
    edges,
    explanation,
    layout: layoutHint,
    stepInfo,
  } = toolState.input;

  const positions = computeLayout(nodes, edges, layoutHint);
  const bounds = svgBounds(positions);
  const vbX = bounds.minX - PAD;
  const vbY = bounds.minY - PAD;
  const vbW = bounds.maxX - bounds.minX + PAD * 2;
  const vbH = bounds.maxY - bounds.minY + PAD * 2;

  const handleNodeClick = (node: DiagramNode) => {
    setState({ selectedNodeId: node.id });
    void sendFollowUp(
      `Explain '${node.label}' in more detail with a new diagram. Context: ${node.label} is a ${node.type} node in the "${title}" diagram.${node.description ? ` Description: ${node.description}` : ""}`,
    );
  };

  const selectedLabel =
    state.selectedNodeId != null
      ? (nodes.find((n) => n.id === state.selectedNodeId)?.label ?? "none")
      : "none";

  const dataContent = `Diagram: "${title}" | Nodes: ${nodes.map((n) => n.label).join(", ")} | Selected: ${selectedLabel}`;

  return (
    <DataLLM content={dataContent}>
      <div className="ill-diagram-root" data-theme={theme}>
        <div className="ill-diagram-header">
          <h2 className="ill-title">{title}</h2>
          {stepInfo && (
            <span className="ill-step-badge">
              Step {stepInfo.current}/{stepInfo.total}
            </span>
          )}
        </div>

        <div className="ill-svg-container">
          <svg
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            className="ill-svg"
          >
            <defs>
              <marker
                id="ill-arrow"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" className="ill-arrowhead" />
              </marker>
            </defs>

            {/* Edges — drawn first so nodes sit on top */}
            {edges.map((edge, i) => {
              const fromPos = positions.get(edge.from);
              const toPos = positions.get(edge.to);
              if (!fromPos || !toPos) return null;

              const p1 = rectEdge(fromPos, toPos);
              const p2 = rectEdge(toPos, fromPos);
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;
              const dy = (p2.y - p1.y) * 0.35;
              const d = `M${p1.x},${p1.y} C${p1.x},${p1.y + dy} ${p2.x},${p2.y - dy} ${p2.x},${p2.y}`;
              const approxLen =
                Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) * 1.1 + 1;

              return (
                <g key={`e-${i}`}>
                  <path
                    d={d}
                    className={`ill-edge${edge.animated ? " ill-edge-animated" : ""}`}
                    style={{
                      strokeDasharray: edge.animated ? undefined : approxLen,
                      strokeDashoffset: edge.animated
                        ? undefined
                        : visible
                          ? 0
                          : approxLen,
                      transition: edge.animated
                        ? undefined
                        : `stroke-dashoffset 0.55s ease ${0.35 + i * 0.06}s`,
                    }}
                    markerEnd="url(#ill-arrow)"
                  />
                  {edge.label && (
                    <text x={mx} y={my - 6} className="ill-edge-label">
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const isSelected = state.selectedNodeId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onClick={() => handleNodeClick(node)}
                  className={`ill-node-group${visible ? " ill-visible" : ""}`}
                  style={{ transitionDelay: `${i * 0.07}s` }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    ry={8}
                    fill={`var(--node-${node.type})`}
                    fillOpacity={isSelected ? 1 : 0.88}
                    stroke={isSelected ? "#fff" : "none"}
                    strokeWidth={2.5}
                    className="ill-node-rect"
                  />
                  <text
                    x={NODE_W / 2}
                    y={NODE_H / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="ill-node-label"
                  >
                    {node.label}
                  </text>
                  {node.description && <title>{node.description}</title>}
                </g>
              );
            })}
          </svg>
        </div>

        {explanation && <p className="ill-explanation">{explanation}</p>}
        <p className="ill-hint">Click any node to explore it further</p>
      </div>
    </DataLLM>
  );
}

export default IlluminateDiagram;
mountWidget(<IlluminateDiagram />);
