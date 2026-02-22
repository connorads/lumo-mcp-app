import { render, screen, cleanup, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import IlluminateMindmap from "./illuminate-mindmap.js";

vi.mock("skybridge/web", async (importOriginal) => {
  const mod = await importOriginal<typeof import("skybridge/web")>();
  return { ...mod, mountWidget: vi.fn() };
});

// Use vi.hoisted so refs are available inside hoisted mock factories
const { MOCK_ROOT, mockTransformFn, mockFit, mockSetData, mockCreate } = vi.hoisted(() => {
  const MOCK_ROOT = { content: "Machine Learning", children: [] };
  const mockTransformFn = vi.fn().mockReturnValue({ root: MOCK_ROOT });
  const mockFit = vi.fn();
  const mockSetData = vi.fn();
  const mockCreate = vi.fn().mockReturnValue({ setData: mockSetData, fit: mockFit });
  return { MOCK_ROOT, mockTransformFn, mockFit, mockSetData, mockCreate };
});

vi.mock("markmap-lib", () => {
  class MockTransformer {
    transform = mockTransformFn;
  }
  return { Transformer: MockTransformer };
});

vi.mock("markmap-view", () => ({
  Markmap: { create: mockCreate },
}));

const mindmapInput = {
  title: "Machine Learning",
  markdown:
    "# Machine Learning\n## Supervised\n### Classification\n## Unsupervised\n### Clustering",
  explanation: "Overview of major ML paradigms.",
  stepInfo: { current: 2, total: 4 },
};

function stubOpenAI(overrides: Record<string, unknown> = {}) {
  const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
  const setWidgetState = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  vi.stubGlobal("openai", {
    toolInput: mindmapInput,
    toolOutput: {},
    toolResponseMetadata: { id: 1 },
    widgetState: { modelContent: {}, selectedNode: null },
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
  vi.useFakeTimers();
  mockTransformFn.mockReturnValue({ root: MOCK_ROOT });
  mockCreate.mockReturnValue({ setData: mockSetData, fit: mockFit });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("IlluminateMindmap", () => {
  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<IlluminateMindmap />);
    expect(container.querySelector(".ill-spinner")).toBeInTheDocument();
  });

  it("renders title and explanation", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(screen.getByText(mindmapInput.title)).toBeInTheDocument();
    expect(screen.getByText(mindmapInput.explanation)).toBeInTheDocument();
  });

  it("renders step badge when stepInfo is provided", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(screen.getByText("Step 2/4")).toBeInTheDocument();
  });

  it("omits step badge when stepInfo is absent", async () => {
    const { stepInfo: _, ...withoutStep } = mindmapInput;
    stubOpenAI({ toolInput: withoutStep });
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(screen.queryByText(/^Step \d+\/\d+$/)).not.toBeInTheDocument();
  });

  it("calls transformer.transform with markdown input", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(mockTransformFn).toHaveBeenCalledWith(mindmapInput.markdown);
  });

  it("calls Markmap.create with the SVG element and root data", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(SVGSVGElement),
      expect.objectContaining({ colorFreezeLevel: 2, color: expect.any(Function) }),
      MOCK_ROOT,
    );
  });

  it("applies markmap-dark class to container in dark theme", async () => {
    stubOpenAI({ theme: "dark" });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<IlluminateMindmap />));
    });
    expect(container.querySelector(".markmap-dark")).toBeInTheDocument();
  });

  it("does not apply markmap-dark class in light theme", async () => {
    stubOpenAI({ theme: "light" });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<IlluminateMindmap />));
    });
    expect(container.querySelector(".markmap-dark")).not.toBeInTheDocument();
  });

  it("renders hint text", async () => {
    stubOpenAI();
    await act(async () => {
      render(<IlluminateMindmap />);
    });
    expect(
      screen.getByText("Click any branch to explore it further"),
    ).toBeInTheDocument();
  });
});
