import { describe, it, expect } from "vitest";
import {
  diagramInputSchema,
  quizInputSchema,
  mindmapInputSchema,
  fillBlankInputSchema,
} from "./schemas.js";

const validDiagram = {
  title: "OAuth2 Flow",
  mermaid: "graph TD\n  Client -->|request| AuthServer\n  AuthServer -->|token| Client",
  explanation: "OAuth2 enables secure delegated access.",
};

describe("diagramInputSchema", () => {
  it("accepts valid input", () => {
    expect(diagramInputSchema.safeParse(validDiagram).success).toBe(true);
  });

  it("rejects missing title", () => {
    const { title: _, ...rest } = validDiagram;
    expect(diagramInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing mermaid", () => {
    const { mermaid: _, ...rest } = validDiagram;
    expect(diagramInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing explanation", () => {
    const { explanation: _, ...rest } = validDiagram;
    expect(diagramInputSchema.safeParse(rest).success).toBe(false);
  });

  it("allows optional nodeDescriptions", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        nodeDescriptions: { AuthServer: "Issues tokens to clients" },
      }).success,
    ).toBe(true);
  });

  it("allows optional stepInfo", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        stepInfo: { current: 2, total: 5 },
      }).success,
    ).toBe(true);
  });

  it("rejects stepInfo with non-positive current", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        stepInfo: { current: 0, total: 5 },
      }).success,
    ).toBe(false);
  });
});

const validQuiz = {
  question: "What is OAuth2?",
  options: [
    { id: "A", text: "An auth protocol" },
    { id: "B", text: "A database" },
  ],
  correctId: "A",
  explanation: "OAuth2 is an authorization framework.",
  topic: "OAuth2",
};

describe("quizInputSchema", () => {
  it("accepts valid input with 2 options", () => {
    expect(quizInputSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("accepts valid input with 4 options", () => {
    expect(
      quizInputSchema.safeParse({
        ...validQuiz,
        options: [
          { id: "A", text: "A" },
          { id: "B", text: "B" },
          { id: "C", text: "C" },
          { id: "D", text: "D" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects fewer than 2 options", () => {
    expect(
      quizInputSchema.safeParse({
        ...validQuiz,
        options: [{ id: "A", text: "Only one" }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 4 options", () => {
    expect(
      quizInputSchema.safeParse({
        ...validQuiz,
        options: [
          { id: "A", text: "A" },
          { id: "B", text: "B" },
          { id: "C", text: "C" },
          { id: "D", text: "D" },
          { id: "E", text: "E" },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects missing question", () => {
    const { question: _, ...rest } = validQuiz;
    expect(quizInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing correctId", () => {
    const { correctId: _, ...rest } = validQuiz;
    expect(quizInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing explanation", () => {
    const { explanation: _, ...rest } = validQuiz;
    expect(quizInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing topic", () => {
    const { topic: _, ...rest } = validQuiz;
    expect(quizInputSchema.safeParse(rest).success).toBe(false);
  });
});

const validMindmap = {
  title: "Machine Learning",
  markdown: "# Machine Learning\n## Supervised\n### Classification\n## Unsupervised\n### Clustering",
  explanation: "Overview of major ML paradigms.",
};

describe("mindmapInputSchema", () => {
  it("accepts valid input", () => {
    expect(mindmapInputSchema.safeParse(validMindmap).success).toBe(true);
  });

  it("rejects missing title", () => {
    const { title: _, ...rest } = validMindmap;
    expect(mindmapInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing markdown", () => {
    const { markdown: _, ...rest } = validMindmap;
    expect(mindmapInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing explanation", () => {
    const { explanation: _, ...rest } = validMindmap;
    expect(mindmapInputSchema.safeParse(rest).success).toBe(false);
  });

  it("allows optional stepInfo", () => {
    expect(
      mindmapInputSchema.safeParse({
        ...validMindmap,
        stepInfo: { current: 1, total: 3 },
      }).success,
    ).toBe(true);
  });
});

const validFillBlank = {
  prompt: "In OAuth2, the {{role}} issues access tokens to {{recipient}}.",
  blanks: [
    { id: "role", answer: "authorisation server" },
    { id: "recipient", answer: "client", hint: "Think: who requests the resource?" },
  ],
  explanation: "The authorisation server is the trusted party that issues tokens.",
  topic: "OAuth2 Roles",
};

describe("fillBlankInputSchema", () => {
  it("accepts valid input", () => {
    expect(fillBlankInputSchema.safeParse(validFillBlank).success).toBe(true);
  });

  it("rejects missing prompt", () => {
    const { prompt: _, ...rest } = validFillBlank;
    expect(fillBlankInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing blanks", () => {
    const { blanks: _, ...rest } = validFillBlank;
    expect(fillBlankInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects fewer than 1 blank", () => {
    expect(
      fillBlankInputSchema.safeParse({ ...validFillBlank, blanks: [] }).success,
    ).toBe(false);
  });

  it("rejects more than 5 blanks", () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`,
      answer: "x",
    }));
    expect(
      fillBlankInputSchema.safeParse({ ...validFillBlank, blanks: tooMany }).success,
    ).toBe(false);
  });

  it("allows blanks without hint", () => {
    expect(
      fillBlankInputSchema.safeParse({
        ...validFillBlank,
        blanks: [{ id: "role", answer: "authorisation server" }],
      }).success,
    ).toBe(true);
  });

  it("allows alternativeAnswers on a blank", () => {
    expect(
      fillBlankInputSchema.safeParse({
        ...validFillBlank,
        blanks: [
          {
            id: "role",
            answer: "authorisation server",
            alternativeAnswers: ["auth server", "authorization server"],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("allows blanks without alternativeAnswers", () => {
    expect(
      fillBlankInputSchema.safeParse({
        ...validFillBlank,
        blanks: [{ id: "role", answer: "authorisation server" }],
      }).success,
    ).toBe(true);
  });

  it("rejects missing explanation", () => {
    const { explanation: _, ...rest } = validFillBlank;
    expect(fillBlankInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing topic", () => {
    const { topic: _, ...rest } = validFillBlank;
    expect(fillBlankInputSchema.safeParse(rest).success).toBe(false);
  });
});
