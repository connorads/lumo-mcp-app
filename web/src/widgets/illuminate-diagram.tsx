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
import {
  type NodeType,
  type DiagramNode,
  type DiagramEdge,
  NODE_W,
  NODE_H,
  PAD,
  computeLayout,
  rectEdge,
  svgBounds,
} from "../layout.js";

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
            {edges.map((edge: DiagramEdge, i: number) => {
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
            {nodes.map((node: DiagramNode, i: number) => {
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
