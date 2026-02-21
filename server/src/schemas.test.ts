import { describe, it, expect } from "vitest";
import { diagramInputSchema, quizInputSchema } from "./schemas.js";

const validNode = { id: "client", label: "Client App", type: "actor" as const };
const validEdge = { from: "client", to: "auth" };

const validDiagram = {
  title: "OAuth2 Flow",
  nodes: [validNode, { id: "auth", label: "Auth Server", type: "process" as const }],
  edges: [validEdge],
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

  it("rejects invalid node type enum", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        nodes: [{ id: "a", label: "A", type: "invalid" }],
      }).success,
    ).toBe(false);
  });

  it("allows optional layout field", () => {
    expect(
      diagramInputSchema.safeParse({ ...validDiagram, layout: "hierarchical" })
        .success,
    ).toBe(true);
  });

  it("rejects invalid layout value", () => {
    expect(
      diagramInputSchema.safeParse({ ...validDiagram, layout: "circular" })
        .success,
    ).toBe(false);
  });

  it("allows optional stepInfo", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        stepInfo: { current: 2, total: 5 },
      }).success,
    ).toBe(true);
  });

  it("allows optional node description", () => {
    expect(
      diagramInputSchema.safeParse({
        ...validDiagram,
        nodes: [{ ...validNode, description: "The client application" }],
      }).success,
    ).toBe(true);
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
});
