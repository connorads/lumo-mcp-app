import { z } from "zod";

export const diagramInputSchema = z.object({
  title: z.string().describe("Title of the diagram"),
  nodes: z
    .array(
      z.object({
        id: z
          .string()
          .describe("Unique identifier for the node (e.g. 'auth-server')"),
        label: z
          .string()
          .describe("Short display label shown inside the node (2-4 words)"),
        description: z
          .string()
          .optional()
          .describe("Brief description shown on hover"),
        type: z
          .enum(["concept", "process", "actor", "data", "decision"])
          .describe(
            "Visual style: concept=blue idea/term, process=purple step/action, actor=green person/system, data=amber stored info, decision=red branch point",
          ),
      }),
    )
    .describe("Nodes in the diagram (4-8 recommended)"),
  edges: z
    .array(
      z.object({
        from: z.string().describe("Source node id"),
        to: z.string().describe("Target node id"),
        label: z
          .string()
          .optional()
          .describe("Short label on the edge (1-5 words)"),
        animated: z
          .boolean()
          .optional()
          .describe(
            "Animate with flowing dashes to show data/control flow direction",
          ),
      }),
    )
    .describe("Directed edges connecting nodes"),
  explanation: z
    .string()
    .describe(
      "1-3 sentence narrative explanation shown below the diagram",
    ),
  layout: z
    .enum(["hierarchical", "radial"])
    .optional()
    .describe(
      "Layout algorithm: 'hierarchical' (default) for top-to-bottom flows, 'radial' for concept maps with no clear hierarchy",
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
