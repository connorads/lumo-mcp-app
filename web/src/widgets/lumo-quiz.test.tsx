import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import LumoQuiz from "./lumo-quiz.js";

vi.mock("skybridge/web", async (importOriginal) => {
  const mod = await importOriginal<typeof import("skybridge/web")>();
  return { ...mod, mountWidget: vi.fn() };
});

const question = "What does OAuth2 stand for?";
const options = [
  { id: "A", text: "Open Authorisation" },
  { id: "B", text: "Open Authentication" },
  { id: "C", text: "Object Authorisation" },
];
const correctId = "A";
const explanation = "OAuth2 stands for Open Authorisation, version 2.";
const topic = "OAuth2 Basics";

function stubOpenAI(overrides: Record<string, unknown> = {}) {
  const sendFollowUpMessage = vi.fn().mockResolvedValue(undefined);
  const setWidgetState = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
  vi.stubGlobal("openai", {
    toolInput: { question, options, correctId, explanation, topic },
    toolOutput: {},
    toolResponseMetadata: { id: 1 },
    widgetState: { modelContent: {} },
    setWidgetState,
    sendFollowUpMessage,
    theme: "light",
    maxHeight: 600,
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    ...overrides,
  });
  // sendFollowUpMessage receives { prompt: "..." } — Skybridge wraps the string in an object
  return { sendFollowUpMessage };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("LumoQuiz", () => {
  it("renders question text and all option buttons", () => {
    stubOpenAI();
    render(<LumoQuiz />);
    expect(screen.getByText(question)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(options.length);
  });

  it("option markers show letters before answering", () => {
    stubOpenAI();
    render(<LumoQuiz />);
    for (const opt of options) {
      expect(screen.getByText(opt.id)).toBeInTheDocument();
    }
  });

  it("clicking the correct answer shows Correct! and explanation", () => {
    stubOpenAI();
    render(<LumoQuiz />);
    const buttons = screen.getAllByRole("button");
    const correctBtn = buttons.find((b) =>
      b.textContent?.includes(options[0].text),
    )!;
    fireEvent.click(correctBtn);
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getByText(explanation)).toBeInTheDocument();
  });

  it("clicking the correct answer disables all option buttons", () => {
    stubOpenAI();
    render(<LumoQuiz />);
    const correctBtn = screen.getByRole("button", { name: /Open Authorisation/ });
    fireEvent.click(correctBtn);
    for (const opt of options) {
      expect(screen.getByRole("button", { name: new RegExp(opt.text) })).toBeDisabled();
    }
  });

  it("clicking a wrong answer shows Not quite — label", () => {
    stubOpenAI();
    render(<LumoQuiz />);
    const buttons = screen.getAllByRole("button");
    const wrongBtn = buttons.find((b) =>
      b.textContent?.includes(options[1].text),
    )!;
    fireEvent.click(wrongBtn);
    expect(screen.getByText("Not quite —")).toBeInTheDocument();
  });

  it("sendFollowUpMessage called on Continue click after correct answer", () => {
    const { sendFollowUpMessage } = stubOpenAI();
    render(<LumoQuiz />);
    const correctBtn = screen.getByRole("button", { name: /Open Authorisation/ });
    fireEvent.click(correctBtn);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(topic),
      }),
    );
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("correct"),
      }),
    );
  });

  it("sendFollowUpMessage called on Continue click after wrong answer with chosen text", () => {
    const { sendFollowUpMessage } = stubOpenAI();
    render(<LumoQuiz />);
    const buttons = screen.getAllByRole("button");
    const wrongBtn = buttons.find((b) =>
      b.textContent?.includes(options[1].text),
    )!;
    fireEvent.click(wrongBtn);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("wrong"),
      }),
    );
    expect(sendFollowUpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(options[1].text),
      }),
    );
  });

  it("shows spinner when tool state is pending", () => {
    stubOpenAI({ toolOutput: null, toolResponseMetadata: null });
    const { container } = render(<LumoQuiz />);
    expect(container.querySelector(".lumo-spinner")).toBeInTheDocument();
  });

  it("does not send follow-up message twice", () => {
    const { sendFollowUpMessage } = stubOpenAI();
    render(<LumoQuiz />);
    const correctBtn = screen.getByRole("button", { name: /Open Authorisation/ });
    fireEvent.click(correctBtn);
    const continueBtn = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(continueBtn);
    // Continue button replaced by sending text after first click
    expect(screen.queryByRole("button", { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Continuing the lesson/)).toBeInTheDocument();
    expect(sendFollowUpMessage).toHaveBeenCalledTimes(1);
  });
});
