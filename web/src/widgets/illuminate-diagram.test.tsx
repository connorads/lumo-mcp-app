import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import IlluminateDiagram from "./illuminate-diagram.js";

vi.mock("skybridge/web", async (importOriginal) => {
  const mod = await importOriginal<typeof import("skybridge/web")>();
  return { ...mod, mountWidget: vi.fn() };
});

// Mermaid mock: returns an SVG with two .node elements
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

const MOCK_SVG =
  '<svg><g class="node" id="flowchart-AuthServer-1"><span class="nodeLabel">Auth Server</span></g>' +
  '<g class="node" id="flowchart-ClientApp-2"><span class="nodeLabel">Client App</span></g></svg>';

const diagramInput = {
  title: "OAuth2 Authorisation Code Flow",
  mermaid:
    "graph TD\n  ClientApp[Client App] --> AuthServer[Auth Server]\n  AuthServer --> ClientApp",
  explanation: "OAuth2 enables secure delegated access to resources.",
  nodeDescriptions: {
    AuthServer: "Issues tokens to requesting clients",
    ClientApp: "The application requesting access",
  },
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

beforeEach(async () => {
  // Restore mock implementation after each vi.resetAllMocks()
  const mermaid = await import("mermaid");
  vi.mocked(mermaid.default.render).mockResolvedValue({
    svg: MOCK_SVG,
    bindFunctions: undefined,
    diagramType: "flowchart",
  });
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

  it("renders title and step badge", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(screen.getByText(diagramInput.title)).toBeInTheDocument();
    expect(screen.getByText("Step 1/3")).toBeInTheDocument();
  });

  it("omits step badge when stepInfo is absent", async () => {
    const { stepInfo: _, ...withoutStep } = diagramInput;
    stubOpenAI({ toolInput: withoutStep });
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(screen.queryByText(/^Step \d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("renders explanation text", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(screen.getByText(diagramInput.explanation)).toBeInTheDocument();
  });

  it("calls mermaid.initialize and mermaid.render on mount", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI();
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(mermaid.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: "loose" }),
    );
    expect(mermaid.default.render).toHaveBeenCalledWith(
      expect.stringContaining("mermaid-"),
      diagramInput.mermaid,
    );
  });

  it("calls mermaid.initialize with dark theme when theme is dark", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI({ theme: "dark" });
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(mermaid.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" }),
    );
  });

  it("clicking a rendered node calls sendFollowUpMessage", async () => {
    const { sendFollowUpMessage } = stubOpenAI();
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<IlluminateDiagram />));
    });
    const node = container.querySelector(".node") as HTMLElement;
    fireEvent.click(node);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(diagramInput.title),
      }),
    );
  });

  it("renders hint text", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateDiagram />);
    });
    expect(
      screen.getByText("Click any node to explore it further"),
    ).toBeInTheDocument();
  });
});
