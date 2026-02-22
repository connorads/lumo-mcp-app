import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useEffect, useRef, useState } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import {
  useToolInfo,
  useSendFollowUpMessage,
  useWidgetState,
  useLayout,
  DataLLM,
} from "../helpers.js";

/* ── Component ───────────────────────────────────────────── */

function LumoMap() {
  const toolState = useToolInfo<"lumo-map">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ selectedNode: string | null }>({
    selectedNode: null,
  });
  const { theme } = useLayout();
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const transformerRef = useRef<Transformer | null>(null);
  const [clickedLabel, setClickedLabel] = useState<string | null>(null);

  const input = toolState.isSuccess ? toolState.input : null;

  const lightPalette = ["#F27D2A", "#3b82f6", "#8b5cf6", "#3EBD7A", "#FFBA42", "#E8453C"];
  const darkPalette = ["#FFBA42", "#60a5fa", "#a78bfa", "#5ED99A", "#F27D2A", "#F27066"];

  useEffect(() => {
    if (!input || !svgRef.current) return;

    if (!transformerRef.current) {
      transformerRef.current = new Transformer();
    }
    const { root } = transformerRef.current.transform(input.markdown);

    const palette = theme === "dark" ? darkPalette : lightPalette;
    const colorFn = (node: { state: { depth: number } }) =>
      palette[node.state.depth % palette.length];

    // Recreate on each render so theme/colour changes take effect
    svgRef.current.innerHTML = "";
    markmapRef.current = Markmap.create(
      svgRef.current,
      { colorFreezeLevel: 2, color: colorFn },
      root,
    );

    const svgEl = svgRef.current;
    const capturedInput = input;

    const bindHandlers = (nodes: NodeListOf<Element>) => {
      nodes.forEach((el) => {
        const textEl = el.querySelector("text, .markmap-foreign span");
        const label = textEl?.textContent?.trim() ?? "";
        (el as HTMLElement).style.cursor = "pointer";
        el.addEventListener("click", () => {
          setState({ selectedNode: label });
          setClickedLabel(label);
          el.classList.add("lumo-node-clicked");
          setTimeout(() => el.classList.remove("lumo-node-clicked"), 700);
          void sendFollowUp(
            `Explain '${label}' in more detail. Context: '${label}' is a topic in the "${capturedInput.title}" mind map.`,
          );
        });
      });
    };

    // Check if nodes are already rendered; otherwise watch for them
    const existingNodes = svgEl.querySelectorAll(".markmap-node");
    if (existingNodes.length > 0) {
      bindHandlers(existingNodes);
      return;
    }

    const observer = new MutationObserver(() => {
      const nodes = svgEl.querySelectorAll(".markmap-node");
      if (nodes.length === 0) return;
      observer.disconnect();
      bindHandlers(nodes);
    });

    observer.observe(svgEl, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [input, theme]);

  if (!toolState.isSuccess || !input) {
    return (
      <div className="lumo-loading">
        <div className="lumo-spinner" />
      </div>
    );
  }

  const { title, explanation, stepInfo } = input;

  const dataContent = `Mind Map: "${title}" | Selected: ${state.selectedNode ?? "none"}`;

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

        <div className={`lumo-mindmap-container${theme === "dark" ? " markmap-dark" : ""}`}>
          <svg
            ref={svgRef}
            className="lumo-mindmap-svg"
          />
        </div>

        {explanation && <p className="lumo-explanation">{explanation}</p>}
        <p className="lumo-hint">
          {clickedLabel ? `Exploring ${clickedLabel}…` : "Click any branch to explore it further"}
        </p>
      </div>
    </DataLLM>
  );
}

export default LumoMap;
mountWidget(<LumoMap />);
