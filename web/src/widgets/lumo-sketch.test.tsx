import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import LumoSketch from "./lumo-sketch.js";

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

const MOCK_SEQUENCE_SVG =
  '<svg>' +
  '<g><rect class="actor actor-top" name="API" x="0" y="0" width="100" height="40"></rect>' +
  '<text class="actor actor-box">API Gateway</text></g>' +
  '<g><rect class="actor actor-top" name="DB" x="200" y="0" width="100" height="40"></rect>' +
  '<text class="actor actor-box">Database</text></g>' +
  '<g><rect class="actor actor-bottom" name="API" x="0" y="300" width="100" height="40"></rect>' +
  '<text class="actor actor-box">API Gateway</text></g>' +
  '<g><rect class="actor actor-bottom" name="DB" x="200" y="300" width="100" height="40"></rect>' +
  '<text class="actor actor-box">Database</text></g>' +
  '</svg>';

const MOCK_STATE_SVG =
  '<svg><g class="node" id="state-Idle-1"><span class="nodeLabel">Idle</span></g>' +
  '<g class="node" id="state-Running-2"><span class="nodeLabel">Running</span></g></svg>';

const MOCK_CLASS_SVG =
  '<svg><g class="node" id="classId-Animal-1"><span class="nodeLabel">Animal</span></g>' +
  '<g class="node" id="classId-Dog-2"><span class="nodeLabel">Dog</span></g></svg>';

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

describe("LumoSketch", () => {
  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<LumoSketch />);
    expect(container.querySelector(".lumo-spinner")).toBeInTheDocument();
  });

  it("renders title and step badge", async () => {
    stubOpenAI();
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(screen.getByText(diagramInput.title)).toBeInTheDocument();
    expect(screen.getByText("Step 1/3")).toBeInTheDocument();
  });

  it("omits step badge when stepInfo is absent", async () => {
    const { stepInfo: _, ...withoutStep } = diagramInput;
    stubOpenAI({ toolInput: withoutStep });
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(screen.queryByText(/^Step \d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("renders explanation text", async () => {
    stubOpenAI();
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(screen.getByText(diagramInput.explanation)).toBeInTheDocument();
  });

  it("calls mermaid.initialize and mermaid.render on mount", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI();
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(mermaid.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: "loose" }),
    );
    expect(mermaid.default.render).toHaveBeenCalledWith(
      expect.stringContaining("mermaid-"),
      diagramInput.mermaid,
    );
  });

  it("calls mermaid.initialize with base theme and themeVariables", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI();
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(mermaid.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "base", themeVariables: expect.any(Object) }),
    );
  });

  it("calls mermaid.initialize with dark themeVariables when theme is dark", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI({ theme: "dark" });
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(mermaid.default.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: "base",
        themeVariables: expect.objectContaining({ background: "#1A1A2E" }),
      }),
    );
  });

  it("sanitises literal \\n in mermaid input before rendering", async () => {
    const mermaid = await import("mermaid");
    stubOpenAI({ toolInput: { ...diagramInput, mermaid: "graph TD\n  A[Line1\\nLine2] --> B" } });
    await act(async () => {
      render(<LumoSketch />);
    });
    expect(mermaid.default.render).toHaveBeenCalledWith(
      expect.stringContaining("mermaid-"),
      "graph TD\n  A[Line1<br/>Line2] --> B",
    );
  });

  it("clicking a rendered node calls sendFollowUpMessage", async () => {
    const { sendFollowUpMessage } = stubOpenAI();
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<LumoSketch />));
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
      render(<LumoSketch />);
    });
    expect(
      screen.getByText("Click any node to explore it further"),
    ).toBeInTheDocument();
  });

  it("clicking a sequence diagram actor calls sendFollowUpMessage with participant label", async () => {
    const mermaid = await import("mermaid");
    vi.mocked(mermaid.default.render).mockResolvedValue({
      svg: MOCK_SEQUENCE_SVG,
      bindFunctions: undefined,
      diagramType: "sequence",
    });
    const { sendFollowUpMessage } = stubOpenAI({
      toolInput: { ...diagramInput, nodeDescriptions: { API: "Why is the API a gateway?" } },
    });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<LumoSketch />));
    });
    const actorGroup = container.querySelector("g:has(rect.actor-top[name='API'])") as HTMLElement;
    fireEvent.click(actorGroup);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("API Gateway"),
      }),
    );
  });

  it("sequence diagram only makes top actors clickable, not bottom mirrors", async () => {
    const mermaid = await import("mermaid");
    vi.mocked(mermaid.default.render).mockResolvedValue({
      svg: MOCK_SEQUENCE_SVG,
      bindFunctions: undefined,
      diagramType: "sequence",
    });
    stubOpenAI();
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<LumoSketch />));
    });
    const topActors = container.querySelectorAll("g:has(rect.actor-top)");
    const bottomActors = container.querySelectorAll("g:has(rect.actor-bottom)");
    topActors.forEach((el) => expect(el).toHaveAttribute("role", "button"));
    bottomActors.forEach((el) => expect(el).not.toHaveAttribute("role", "button"));
  });

  it("clicking a state diagram node extracts correct nodeId (strips state- prefix)", async () => {
    const mermaid = await import("mermaid");
    vi.mocked(mermaid.default.render).mockResolvedValue({
      svg: MOCK_STATE_SVG,
      bindFunctions: undefined,
      diagramType: "stateDiagram",
    });
    const { sendFollowUpMessage } = stubOpenAI({
      toolInput: { ...diagramInput, nodeDescriptions: { Idle: "Why is Idle the initial state?" } },
    });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<LumoSketch />));
    });
    const node = container.querySelector(".node") as HTMLElement;
    fireEvent.click(node);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Idle"),
      }),
    );
  });

  it("clicking a class diagram node extracts correct nodeId (strips classId- prefix)", async () => {
    const mermaid = await import("mermaid");
    vi.mocked(mermaid.default.render).mockResolvedValue({
      svg: MOCK_CLASS_SVG,
      bindFunctions: undefined,
      diagramType: "classDiagram",
    });
    const { sendFollowUpMessage } = stubOpenAI({
      toolInput: { ...diagramInput, nodeDescriptions: { Animal: "What does Animal define?" } },
    });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<LumoSketch />));
    });
    const node = container.querySelector(".node") as HTMLElement;
    fireEvent.click(node);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Animal"),
      }),
    );
  });
});
