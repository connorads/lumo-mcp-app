import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useEffect, useRef } from "react";
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

function IlluminateMindmap() {
  const toolState = useToolInfo<"illuminate-mindmap">();
  const sendFollowUp = useSendFollowUpMessage();
  const [state, setState] = useWidgetState<{ selectedNode: string | null }>({
    selectedNode: null,
  });
  const { theme } = useLayout();
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const transformerRef = useRef<Transformer | null>(null);

  const input = toolState.isSuccess ? toolState.input : null;

  const lightPalette = ["#6366f1", "#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];
  const darkPalette = ["#818cf8", "#60a5fa", "#a78bfa", "#4ade80", "#fbbf24", "#f87171"];

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

    // Attach click handlers after render settles
    const timer = setTimeout(() => {
      if (!svgRef.current) return;
      svgRef.current.querySelectorAll(".markmap-node").forEach((el) => {
        const textEl = el.querySelector("text, .markmap-foreign span");
        const label = textEl?.textContent?.trim() ?? "";
        (el as HTMLElement).style.cursor = "pointer";
        el.addEventListener("click", () => {
          setState({ selectedNode: label });
          void sendFollowUp(
            `Explain '${label}' in more detail. Context: '${label}' is a topic in the "${input.title}" mind map.`,
          );
        });
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [input, theme]);

  if (!toolState.isSuccess || !input) {
    return (
      <div className="ill-loading">
        <div className="ill-spinner" />
      </div>
    );
  }

  const { title, explanation, stepInfo } = input;

  const dataContent = `Mind Map: "${title}" | Selected: ${state.selectedNode ?? "none"}`;

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

        <div className={`ill-mindmap-container${theme === "dark" ? " markmap-dark" : ""}`}>
          <svg
            ref={svgRef}
            className="ill-mindmap-svg"
          />
        </div>

        {explanation && <p className="ill-explanation">{explanation}</p>}
        <p className="ill-hint">Click any branch to explore it further</p>
      </div>
    </DataLLM>
  );
}

export default IlluminateMindmap;
mountWidget(<IlluminateMindmap />);
