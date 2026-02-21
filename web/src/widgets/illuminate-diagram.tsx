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

function IlluminateDiagram() {
  const toolState = useToolInfo<"illuminate-diagram">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ selectedNodeId: string | null }>({
    selectedNodeId: null,
  });
  const { theme } = useLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef<string>(`mermaid-${crypto.randomUUID()}`);
  const [renderError, setRenderError] = useState<string | null>(null);

  const input = toolState.isSuccess ? toolState.input : null;

  useEffect(() => {
    if (!input || !containerRef.current) return;

    const mermaidTheme = theme === "dark" ? "dark" : "default";

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: "loose",
      flowchart: { htmlLabels: true, curve: "basis" },
    });

    const renderId = `mermaid-${crypto.randomUUID()}`;
    renderIdRef.current = renderId;

    mermaid
      .render(renderId, input.mermaid)
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

          (el as HTMLElement).style.cursor = "pointer";
          el.addEventListener("click", () => {
            setState({ selectedNodeId: nodeId });
            const description = input.nodeDescriptions?.[nodeId];
            void sendFollowUp(
              `Explain '${label}' in more detail with a new diagram. Context: '${label}' is a node in the "${input.title}" diagram.${description ? ` Description: ${description}` : ""}`,
            );
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
      <div className="ill-loading">
        <div className="ill-spinner" />
      </div>
    );
  }

  const { title, explanation, stepInfo } = input;

  const dataContent = `Diagram: "${title}" | Selected: ${state.selectedNodeId ?? "none"}`;

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

        <div className="ill-mermaid-container" ref={containerRef}>
          {renderError && (
            <p className="ill-hint">Failed to render diagram: {renderError}</p>
          )}
        </div>

        {explanation && <p className="ill-explanation">{explanation}</p>}
        <p className="ill-hint">Click any node to explore it further</p>
      </div>
    </DataLLM>
  );
}

export default IlluminateDiagram;
mountWidget(<IlluminateDiagram />);
