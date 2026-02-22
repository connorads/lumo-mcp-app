import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import LumoRecall from "./lumo-recall.js";

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

describe("LumoRecall", () => {
  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<LumoRecall />);
    expect(container.querySelector(".lumo-spinner")).toBeInTheDocument();
  });

  it("renders the prompt text split around blank inputs", () => {
    stubOpenAI();
    render(<LumoRecall />);
    expect(screen.getByText(/In OAuth2, the/)).toBeInTheDocument();
    expect(screen.getByText(/issues access tokens to/)).toBeInTheDocument();
  });

  it("renders an input for each blank", () => {
    stubOpenAI();
    render(<LumoRecall />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(fillBlankInput.blanks.length);
  });

  it("does not show explanation before all blanks are correct", () => {
    stubOpenAI();
    render(<LumoRecall />);
    expect(
      screen.queryByText(fillBlankInput.explanation),
    ).not.toBeInTheDocument();
  });

  it("correct answer on Enter calls setWidgetState with correct:true", () => {
    const { setWidgetState } = stubOpenAI();
    render(<LumoRecall />);
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
    render(<LumoRecall />);
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
    render(<LumoRecall />);
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
    render(<LumoRecall />);
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
    render(<LumoRecall />);
    expect(
      screen.getByText(fillBlankInput.blanks[0].hint!),
    ).toBeInTheDocument();
  });

  it("Reveal button appears after 2 wrong attempts", () => {
    stubOpenAI();
    render(<LumoRecall />);
    const inputs = screen.getAllByRole("textbox");

    // No reveal button before any attempts
    expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();

    // First wrong attempt
    fireEvent.change(inputs[0]!, { target: { value: "wrong1" } });
    fireEvent.keyDown(inputs[0]!, { key: "Enter" });
    expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();

    // Second wrong attempt — button should appear
    fireEvent.change(inputs[0]!, { target: { value: "wrong2" } });
    fireEvent.keyDown(inputs[0]!, { key: "Enter" });
    expect(screen.getByRole("button", { name: /Reveal/ })).toBeInTheDocument();
  });

  it("clicking Reveal fills the answer and locks input with revealed:true", () => {
    const { setWidgetState } = stubOpenAI();
    render(<LumoRecall />);
    const inputs = screen.getAllByRole("textbox");

    // Two wrong attempts to show Reveal button
    fireEvent.change(inputs[0]!, { target: { value: "wrong1" } });
    fireEvent.keyDown(inputs[0]!, { key: "Enter" });
    fireEvent.change(inputs[0]!, { target: { value: "wrong2" } });
    fireEvent.keyDown(inputs[0]!, { key: "Enter" });

    const revealBtn = screen.getByRole("button", { name: /Reveal/ });
    fireEvent.click(revealBtn);

    expect(setWidgetState).toHaveBeenCalledWith(
      expect.objectContaining({
        modelContent: expect.objectContaining({
          answers: expect.objectContaining({
            role: expect.objectContaining({ revealed: true }),
          }),
        }),
      }),
    );
  });

  it("explanation shows 'Here are the answers:' when any blank was revealed", () => {
    stubOpenAI({
      widgetState: {
        modelContent: {
          answers: {
            role: { value: "authorisation server", correct: false, revealed: true },
            recipient: { value: "client", correct: true },
          },
          allCorrect: true,
        },
      },
    });
    render(<LumoRecall />);
    expect(screen.getByText("Here are the answers:")).toBeInTheDocument();
  });

  it("follow-up mentions revealed count when blanks were revealed", () => {
    const { sendFollowUpMessage } = stubOpenAI({
      widgetState: {
        modelContent: {
          answers: {
            role: { value: "authorisation server", correct: false, revealed: true },
            recipient: { value: "client", correct: true },
          },
          allCorrect: true,
        },
      },
    });
    render(<LumoRecall />);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringMatching(/reveal/i),
      }),
    );
  });
});
