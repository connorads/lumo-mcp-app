import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  useToolInfo,
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "../helpers.js";

/* ── Component ───────────────────────────────────────────── */

function LumoSketch() {
  const toolState = useToolInfo<"lumo-sketch">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ selectedNodeId: string | null }>({
    selectedNodeId: null,
  });
  const { theme } = useLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef<string>(`mermaid-${crypto.randomUUID()}`);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);

  const input = toolState.isSuccess ? toolState.input : null;

  useEffect(() => {
    if (!input || !containerRef.current) return;

    const isDark = theme === "dark";

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: isDark
        ? {
            primaryColor: "#1e293b",
            primaryTextColor: "#f1f5f9",
            primaryBorderColor: "#64748b",
            lineColor: "#475569",
            background: "#1A1A2E",
            mainBkg: "#1e293b",
            nodeBorder: "#64748b",
            nodeTextColor: "#f1f5f9",
            edgeLabelBackground: "#1e293b",
          }
        : {
            primaryColor: "#FFF3E0",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#F27D2A",
            lineColor: "#94a3b8",
            background: "#FFF8F0",
            mainBkg: "#ffffff",
            nodeBorder: "#F27D2A",
            nodeTextColor: "#1e293b",
            edgeLabelBackground: "#FFF8F0",
          },
      securityLevel: "loose",
      flowchart: { htmlLabels: true, curve: "basis" },
    });

    const renderId = `mermaid-${crypto.randomUUID()}`;
    renderIdRef.current = renderId;

    const sanitised = input.mermaid.replace(/\\n/g, "<br/>");

    mermaid
      .render(renderId, sanitised)
      .then(({ svg, bindFunctions }) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = svg;
        if (bindFunctions) bindFunctions(containerRef.current);

        // Attach click handlers to all node elements
        containerRef.current.querySelectorAll(".node").forEach((el) => {
          const nodeId = el.id?.replace(/^flowchart-/, "").replace(/-\d+$/, "") ?? "";
          const label =
            el.querySelector(".nodeLabel")?.textContent?.trim() ??
            el.querySelector("span")?.textContent?.trim() ??
            nodeId;
          const description = input.nodeDescriptions?.[nodeId];
          const htmlEl = el as HTMLElement;

          htmlEl.style.cursor = "pointer";
          htmlEl.setAttribute("tabindex", "0");
          htmlEl.setAttribute("role", "button");
          htmlEl.setAttribute(
            "aria-label",
            description ? `${label}: ${description}` : `Explore ${label}`,
          );
          if (description) {
            htmlEl.title = description;
          }

          const handleClick = () => {
            setState({ selectedNodeId: nodeId });
            setClickedLabel(label);
            htmlEl.classList.add("lumo-node-clicked");
            setTimeout(() => htmlEl.classList.remove("lumo-node-clicked"), 700);
            void sendFollowUp(
              `Explain '${label}' in more detail with a new diagram. Context: '${label}' is a node in the "${input.title}" diagram.${description ? ` Description: ${description}` : ""}`,
            );
          };

          el.addEventListener("click", handleClick);
          el.addEventListener("keydown", (e) => {
            const ke = e as KeyboardEvent;
            if (ke.key === "Enter" || ke.key === " ") {
              e.preventDefault();
              handleClick();
            }
          });
        });
        setRenderError(null);
      })
      .catch((err: unknown) => {
        setRenderError(String(err));
      });
  }, [input, theme]);

  if (!toolState.isSuccess || !input) {
    return (
      <div className="lumo-loading">
        <div className="lumo-spinner" />
      </div>
    );
  }

  const { title, explanation, stepInfo } = input;

  const dataContent = `Diagram: "${title}" | Selected: ${state.selectedNodeId ?? "none"}`;

  return (
    <DataLLM content={dataContent}>
      <div className="lumo-diagram-root" data-theme={theme}>
        <div className="lumo-diagram-header">
          <h2 className="lumo-title">{title}</h2>
          {stepInfo && (
            <span className="lumo-step-badge">
              Step {stepInfo.current}/{stepInfo.total}
            </span>
          )}
        </div>

        {stepInfo && (
          <div className="lumo-progress-track">
            <div
              className="lumo-progress-fill"
              style={{ width: `${(stepInfo.current / stepInfo.total) * 100}%` }}
            />
          </div>
        )}

        <div className="lumo-mermaid-container" ref={containerRef}>
          {renderError && (
            <p className="lumo-hint">Failed to render diagram: {renderError}</p>
          )}
        </div>

        {explanation && <p className="lumo-explanation">{explanation}</p>}
        <p className="lumo-hint">
          {clickedLabel ? `Exploring ${clickedLabel}…` : "Click any node to explore it further"}
        </p>
      </div>
    </DataLLM>
  );
}

export default LumoSketch;
mountWidget(<LumoSketch />);
