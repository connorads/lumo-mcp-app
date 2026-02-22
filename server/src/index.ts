import { McpServer } from "skybridge/server";
import {
  diagramInputSchema,
  quizInputSchema,
  mindmapInputSchema,
  fillBlankInputSchema,
} from "./schemas.js";

const server = new McpServer(
  {
    name: "illuminate",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .registerWidget(
    "illuminate-diagram",
    {
      description:
        "Renders an interactive Mermaid diagram for visual exploration. Use to visualise flows, architectures, processes, sequences, or state machines. Serves the Explore/Interact phases of learning — helping learners see structure and relationships (Bloom's Remember/Understand). Keep to max 8 nodes with short labels for readability.",
    },
    {
      description:
        "Display an interactive diagram using Mermaid syntax. Supports flowchart (graph TD/LR), sequenceDiagram, stateDiagram-v2, classDiagram. Provide nodeDescriptions for clickable drill-down nodes. After showing a diagram, check understanding with illuminate-quiz (recognition) or illuminate-fill-blank (recall). Keep diagrams simple: max 8 nodes, 2-5 word labels.",
      inputSchema: diagramInputSchema.shape,
    },
    async (input) => ({
      structuredContent: input,
      content: [
        {
          type: "text" as const,
          text: `Diagram: ${input.title}\n\n${input.explanation}\n\n\`\`\`mermaid\n${input.mermaid}\n\`\`\``,
        },
      ],
      isError: false,
    }),
  )
  .registerWidget(
    "illuminate-mindmap",
    {
      description:
        "Renders a zoomable mind map from Markdown headings. Use for concept overviews, brainstorming, and showing how ideas connect — when there is no clear linear flow. Serves the Explore phase (Bloom's Remember) — building a mental model of a topic landscape. Keep maps concise (3-5 branches, short labels) so they are readable at default zoom.",
    },
    {
      description:
        "Display an interactive, zoomable mind map. Write Markdown with headings (# to ####) where each heading becomes a node. Users can pan, zoom, and click branches to explore deeper. Prefer this over diagrams when showing a concept hierarchy or topic overview without directional flow. Keep maps focused: 3-5 top-level branches, 2-4 items each, 2-5 word labels — no sentences.",
      inputSchema: mindmapInputSchema.shape,
    },
    async (input) => ({
      structuredContent: input,
      content: [
        {
          type: "text" as const,
          text: `Mind Map: ${input.title}\n\n${input.explanation}\n\n${input.markdown}`,
        },
      ],
      isError: false,
    }),
  )
  .registerWidget(
    "illuminate-quiz",
    {
      description:
        "Multiple-choice quiz for checking understanding. Tests recognition (Bloom's Remember/Understand). Use illuminate-fill-blank for higher-order recall (Apply/Analyse).",
    },
    {
      description:
        "Display a quiz card with 2-4 options. The user's answer triggers an adaptive follow-up. Use for initial comprehension checks. For deeper understanding, prefer illuminate-fill-blank.",
      inputSchema: quizInputSchema.shape,
    },
    async (input) => ({
      structuredContent: input,
      content: [
        {
          type: "text" as const,
          text: `Quiz: ${input.question}\n${input.options.map((o) => `${o.id}. ${o.text}`).join("\n")}\n\nAnswer: ${input.correctId} — ${input.explanation}`,
        },
      ],
      isError: false,
    }),
  )
  .registerWidget(
    "illuminate-fill-blank",
    {
      description:
        "Fill-in-the-blank exercise for active recall. Tests retrieval from memory (Bloom's Apply/Analyse) — more challenging than multiple choice. Use after a concept has been introduced and initially checked.",
    },
    {
      description:
        "Display a fill-in-the-blank exercise. Mark blanks as {{BLANK_ID}} in the prompt. The user types answers from memory. Use when testing deeper understanding — the learner must produce the answer, not just recognise it.",
      inputSchema: fillBlankInputSchema.shape,
    },
    async (input) => ({
      structuredContent: input,
      content: [
        {
          type: "text" as const,
          text: `Fill in the blank — ${input.topic}\n\n${input.prompt}\n\nAnswers: ${input.blanks.map((b) => `{{${b.id}}} = "${b.answer}"`).join(", ")}\n\n${input.explanation}`,
        },
      ],
      isError: false,
    }),
  );

server.run();

export type AppType = typeof server;
