import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import IlluminateDiagram from "./illuminate-diagram.js";

vi.mock("skybridge/web", async (importOriginal) => {
  const mod = await importOriginal<typeof import("skybridge/web")>();
  return { ...mod, mountWidget: vi.fn() };
});

const diagramInput = {
  title: "OAuth2 Authorisation Code Flow",
  nodes: [
    { id: "client", label: "Client App", type: "actor" as const },
    { id: "auth", label: "Auth Server", type: "process" as const },
    { id: "resource", label: "Resource Server", type: "data" as const },
  ],
  edges: [
    { from: "client", to: "auth", animated: true },
    { from: "auth", to: "resource" },
  ],
  explanation: "OAuth2 enables secure delegated access to resources.",
  stepInfo: { current: 1, total: 3 },
};

function stubOpenAI(overrides: Record<string, unknown> = {}) {
  const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
  const setWidgetState = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  vi.stubGlobal("openai", {
    toolInput: diagramInput,
    toolOutput: {},
    toolResponseMetadata: { id: 1 },
    widgetState: { modelContent: {}, selectedNodeId: null },
    setWidgetState,
    sendFollowUpMessage,
    theme: "light",
    maxHeight: 600,
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    ...overrides,
  });
  return { sendFollowUpMessage };
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", (_id: number) => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("IlluminateDiagram", () => {
  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<IlluminateDiagram />);
    expect(container.querySelector(".ill-spinner")).toBeInTheDocument();
  });

  it("renders title, explanation and hint text", () => {
    stubOpenAI();
    render(<IlluminateDiagram />);
    expect(screen.getByText(diagramInput.title)).toBeInTheDocument();
    expect(screen.getByText(diagramInput.explanation)).toBeInTheDocument();
    expect(
      screen.getByText("Click any node to explore it further"),
    ).toBeInTheDocument();
  });

  it("renders step badge when stepInfo is provided", () => {
    stubOpenAI();
    render(<IlluminateDiagram />);
    expect(
      screen.getByText(
        `Step ${diagramInput.stepInfo.current}/${diagramInput.stepInfo.total}`,
      ),
    ).toBeInTheDocument();
  });

  it("omits step badge when stepInfo is absent", () => {
    const { stepInfo: _, ...withoutStep } = diagramInput;
    stubOpenAI({ toolInput: withoutStep });
    render(<IlluminateDiagram />);
    expect(screen.queryByText(/^Step \d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("renders the correct number of node groups", () => {
    stubOpenAI();
    const { container } = render(<IlluminateDiagram />);
    expect(container.querySelectorAll(".ill-node-group")).toHaveLength(
      diagramInput.nodes.length,
    );
  });

  it("renders all node labels", () => {
    stubOpenAI();
    render(<IlluminateDiagram />);
    for (const node of diagramInput.nodes) {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    }
  });

  it("node rects use the correct fill CSS variable for each type", () => {
    stubOpenAI();
    const { container } = render(<IlluminateDiagram />);
    const rects = container.querySelectorAll(".ill-node-rect");
    expect(rects[0].getAttribute("fill")).toBe("var(--node-actor)");
    expect(rects[1].getAttribute("fill")).toBe("var(--node-process)");
    expect(rects[2].getAttribute("fill")).toBe("var(--node-data)");
  });

  it("animated edges have the ill-edge-animated class", () => {
    stubOpenAI();
    const { container } = render(<IlluminateDiagram />);
    expect(
      container.querySelectorAll(".ill-edge-animated").length,
    ).toBeGreaterThan(0);
  });

  it("clicking a node calls sendFollowUpMessage with drill-down prompt", () => {
    const { sendFollowUpMessage } = stubOpenAI();
    const { container } = render(<IlluminateDiagram />);
    const nodeGroups = container.querySelectorAll(".ill-node-group");
    fireEvent.click(nodeGroups[0]!);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Client App"),
      }),
    );
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(diagramInput.title),
      }),
    );
  });

  it("selected node rect gets a white stroke", () => {
    stubOpenAI();
    const { container } = render(<IlluminateDiagram />);
    const nodeGroups = container.querySelectorAll(".ill-node-group");
    fireEvent.click(nodeGroups[0]!);
    const rects = container.querySelectorAll(".ill-node-rect");
    expect(rects[0].getAttribute("stroke")).toBe("#fff");
  });
});
