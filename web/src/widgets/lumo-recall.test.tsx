import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import IlluminateFillBlank from "./illuminate-fill-blank.js";

vi.mock("skybridge/web", async (importOriginal) => {
  const mod = await importOriginal<typeof import("skybridge/web")>();
  return { ...mod, mountWidget: vi.fn() };
});

const fillBlankInput = {
  prompt: "In OAuth2, the {{role}} issues access tokens to {{recipient}}.",
  blanks: [
    { id: "role", answer: "authorisation server", hint: "It validates credentials" },
    { id: "recipient", answer: "client" },
  ],
  explanation:
    "The authorisation server is the trusted party that issues tokens to the client.",
  topic: "OAuth2 Roles",
};

function stubOpenAI(overrides: Record<string, unknown> = {}) {
  const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
  const setWidgetState = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  vi.stubGlobal("openai", {
    toolInput: fillBlankInput,
    toolOutput: {},
    toolResponseMetadata: { id: 1 },
    // widgetState.modelContent is what useWidgetState reads as current state
    widgetState: { modelContent: null },
    setWidgetState,
    sendFollowUpMessage,
    theme: "light",
    maxHeight: 600,
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    ...overrides,
  });
  return { sendFollowUpMessage, setWidgetState };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("IlluminateFillBlank", () => {
  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<IlluminateFillBlank />);
    expect(container.querySelector(".ill-spinner")).toBeInTheDocument();
  });

  it("renders the prompt text split around blank inputs", () => {
    stubOpenAI();
    render(<IlluminateFillBlank />);
    expect(screen.getByText(/In OAuth2, the/)).toBeInTheDocument();
    expect(screen.getByText(/issues access tokens to/)).toBeInTheDocument();
  });

  it("renders an input for each blank", () => {
    stubOpenAI();
    render(<IlluminateFillBlank />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(fillBlankInput.blanks.length);
  });

  it("does not show explanation before all blanks are correct", () => {
    stubOpenAI();
    render(<IlluminateFillBlank />);
    expect(
      screen.queryByText(fillBlankInput.explanation),
    ).not.toBeInTheDocument();
  });

  it("correct answer on Enter calls setWidgetState with correct:true", () => {
    const { setWidgetState } = stubOpenAI();
    render(<IlluminateFillBlank />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "authorisation server" } });
    fireEvent.keyDown(inputs[0]!, { key: "Enter" });
    // The adaptor wraps state in { modelContent: ... }
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({
        modelContent: expect.objectContaining({
          answers: expect.objectContaining({
            role: expect.objectContaining({ correct: true }),
          }),
        }),
      }),
    );
  });

  it("wrong answer on blur calls setWidgetState with correct:false", () => {
    const { setWidgetState } = stubOpenAI();
    render(<IlluminateFillBlank />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "wrong answer" } });
    fireEvent.blur(inputs[0]!);
    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({
        modelContent: expect.objectContaining({
          answers: expect.objectContaining({
            role: expect.objectContaining({ correct: false }),
          }),
        }),
      }),
    );
  });

  it("sends follow-up when Continue is clicked after allCorrect", () => {
    const { sendFollowUpMessage } = stubOpenAI({
      widgetState: {
        modelContent: {
          answers: {
            role: { value: "authorisation server", correct: true },
            recipient: { value: "client", correct: true },
          },
          allCorrect: true,
        },
      },
    });
    render(<IlluminateFillBlank />);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(fillBlankInput.topic),
      }),
    );
  });

  it("does not send follow-up twice", () => {
    const { sendFollowUpMessage } = stubOpenAI({
      widgetState: {
        modelContent: {
          answers: {
            role: { value: "authorisation server", correct: true },
            recipient: { value: "client", correct: true },
          },
          allCorrect: true,
        },
      },
    });
    render(<IlluminateFillBlank />);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    // Continue button replaced by sending text after first click
    expect(screen.queryByRole("button", { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Continuing the lesson/)).toBeInTheDocument();
    expect(sendFollowUpMessage).toHaveBeenCalledTimes(1);
  });

  it("shows hint after wrong answer when hint is provided", () => {
    stubOpenAI({
      widgetState: {
        modelContent: {
          answers: {
            role: { value: "wrong", correct: false },
          },
          allCorrect: false,
        },
      },
    });
    render(<IlluminateFillBlank />);
    expect(
      screen.getByText(fillBlankInput.blanks[0].hint!),
    ).toBeInTheDocument();
  });
});
