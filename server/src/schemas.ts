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
      "1-3 sentence narrative. Reference nodes by label for spatial contiguity — don't make the learner search. Walk through the key relationship step by step (worked example).",
    ),
  nodeDescriptions: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      "IMPORTANT: Always provide for every node. Frame as questions for elaborative interrogation — e.g. 'Why must the auth server validate before issuing?' rather than just 'Validates credentials'. Keys must match node IDs in the Mermaid syntax.",
    ),
  stepInfo: z
    .object({
      current: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional()
    .describe(
      "Use when a concept needs more than one diagram/mindmap. Plan the total upfront (2-5 steps). Each step should be self-contained. Omit for standalone visuals.",
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
      "When the learner is wrong, address their specific misconception — explain why their choice was tempting but incorrect, not just why the right answer is right (error-driven learning). 1-2 sentences.",
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
      "Use when a concept needs more than one diagram/mindmap. Plan the total upfront (2-5 steps). Each step should be self-contained. Omit for standalone visuals.",
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
        answer: z
          .string()
          .describe(
            "Canonical correct answer — keep to 1-2 words where possible (shown on reveal). Shorter answers are fairer for recall.",
          ),
        alternativeAnswers: z
          .array(z.string())
          .optional()
          .describe(
            "Be VERY generous — include every reasonable phrasing a learner might type. For 'local constituency representative': ['representative', 'rep', 'local rep', 'constituency rep', 'local representative', 'constituency representative', 'local member']. For 'two': ['2']. For 'regional top-up': ['top-up', 'top up', 'topup', 'regional']. Include abbreviations, partial forms, informal variants, and numeric equivalents. Aim for 3-8 alternatives per blank.",
          ),
        hint: z
          .string()
          .optional()
          .describe(
            "Guide reasoning, don't give the answer. E.g. 'What entity verifies identity before granting access?' not 'Think about authorisation'.",
          ),
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
