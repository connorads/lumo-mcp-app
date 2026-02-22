import { z } from "zod";

export const diagramInputSchema = z.object({
  title: z.string().describe("Title of the diagram"),
  mermaid: z
    .string()
    .describe(
      "Raw Mermaid syntax (flowchart, sequenceDiagram, stateDiagram-v2, classDiagram). IMPORTANT: Max 8 nodes per diagram. Node labels must be 2-5 words — never full sentences. Never use \\n in labels. Use meaningful node IDs (e.g. 'AuthServer', 'ClientApp'). If a concept needs more nodes, split across multiple diagrams using stepInfo.",
    ),
  explanation: z
    .string()
    .describe(
      "1-3 sentence narrative explanation shown below the diagram",
    ),
  nodeDescriptions: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      "Node ID → description for drill-down tooltips and follow-up context. Keys must match node IDs in the Mermaid syntax.",
    ),
  stepInfo: z
    .object({
      current: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional()
    .describe(
      "Optional step counter badge, e.g. { current: 2, total: 5 }",
    ),
});

export const quizInputSchema = z.object({
  question: z.string().describe("The quiz question (one sentence)"),
  options: z
    .array(
      z.object({
        id: z
          .string()
          .describe("Option letter, e.g. 'A', 'B', 'C', 'D'"),
        text: z.string().describe("The answer option text"),
      }),
    )
    .min(2)
    .max(4)
    .describe("2-4 answer options"),
  correctId: z
    .string()
    .describe("The id of the correct option, e.g. 'B'"),
  explanation: z
    .string()
    .describe(
      "Explanation revealed after answering — clarify why the correct answer is right (1-2 sentences)",
    ),
  topic: z
    .string()
    .describe(
      "Short topic label used in follow-up messages, e.g. 'OAuth2 Authorisation Code'",
    ),
});

export const mindmapInputSchema = z.object({
  title: z.string().describe("Title of the mind map"),
  markdown: z
    .string()
    .describe(
      "Markdown with # to #### headings. Each heading becomes a node. IMPORTANT: Max 3-5 top-level branches (## headings), each with 2-4 sub-items. Keep all labels to 2-5 words — no full sentences as headings. Use **bold** for key terms, `code` for technical terms, *italics* for examples. If a topic has more branches, split across multiple mind maps using stepInfo.",
    ),
  explanation: z
    .string()
    .describe("1-3 sentence narrative shown below the mind map"),
  stepInfo: z
    .object({
      current: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional()
    .describe(
      "Optional step counter badge, e.g. { current: 2, total: 5 }",
    ),
});

export const fillBlankInputSchema = z.object({
  prompt: z
    .string()
    .describe(
      "Sentence with {{BLANK_ID}} placeholders. Example: 'In OAuth2, the {{role}} issues access tokens to {{recipient}}.'",
    ),
  blanks: z
    .array(
      z.object({
        id: z.string().describe("Matches {{ID}} placeholder in prompt"),
        answer: z.string().describe("Correct answer text"),
        hint: z
          .string()
          .optional()
          .describe("Optional clue shown after a wrong attempt"),
      }),
    )
    .min(1)
    .max(5)
    .describe("1-5 blanks corresponding to {{BLANK_ID}} placeholders in prompt"),
  explanation: z
    .string()
    .describe(
      "Revealed when all blanks are correct — reinforce why these are the correct answers.",
    ),
  topic: z
    .string()
    .describe("Short topic label for follow-up context, e.g. 'OAuth2 Roles'"),
});
