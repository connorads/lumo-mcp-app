import { McpServer } from "skybridge/server";
import {
  diagramInputSchema,
  quizInputSchema,
  mindmapInputSchema,
  fillBlankInputSchema,
} from "./schemas.js";

const server = new McpServer(
  {
    name: "lumo",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .registerWidget(
    "lumo-sketch",
    {
      description:
        "Renders an interactive Mermaid diagram for visual exploration. Use to visualise flows, architectures, processes, sequences, or state machines. Serves the Explore/Interact phases of learning — helping learners see structure and relationships (Bloom's Remember/Understand). Keep to max 8 nodes with short labels for readability. Always provide nodeDescriptions for every node — frame them as questions ('Why does X connect to Y?') not just facts (elaborative interrogation). Do NOT use Mermaid style/classDef directives — the widget handles theming automatically. Each diagram should convey ONE idea. Tone: be encouraging, use analogies, celebrate progress. Pace: introduce one concept per diagram, check understanding before advancing.",
    },
    {
      description:
        "Display an interactive diagram using Mermaid syntax. Supports flowchart (graph TD/LR), sequenceDiagram, stateDiagram-v2, classDiagram. Provide nodeDescriptions for clickable drill-down nodes. After showing a diagram, check understanding with lumo-quiz (recognition) or lumo-recall (recall). Keep diagrams simple: max 8 nodes, 2-5 word labels. This is your primary 'worked example' tool. Walk through the diagram in the explanation. After showing a diagram, check understanding with quiz (recognition) or recall (recall). If a previous diagram didn't land, try a different diagram type (sequence instead of flowchart) — varying modality activates different mental models. IMPORTANT: In your text response, always tell the user they can click any node in the diagram to explore it deeper — users often don't realise the diagram is interactive.",
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
    "lumo-map",
    {
      description:
        "Renders a zoomable mind map from Markdown headings. Use for concept overviews, brainstorming, and showing how ideas connect — when there is no clear linear flow. Serves the Explore phase (Bloom's Remember) — building a mental model of a topic landscape. Keep maps concise (3-5 branches, short labels) so they are readable at default zoom. Use early in a topic to orient the learner (concept landscape). After exploring 2-3 branches, transition to quiz. Ideal for interleaving — show how concepts from across the session connect. Vary tool types — avoid consecutive mind maps.",
    },
    {
      description:
        "Display an interactive, zoomable mind map. Write Markdown with headings (# to ####) where each heading becomes a node. Users can pan, zoom, and click branches to explore deeper. Prefer this over diagrams when showing a concept hierarchy or topic overview without directional flow. Keep maps focused: 3-5 top-level branches, 2-4 items each, 2-5 word labels — no sentences. IMPORTANT: In your text response, always tell the user they can click any branch in the mind map to drill into that topic — users often don't realise the map is interactive.",
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
    "lumo-quiz",
    {
      description:
        "Multiple-choice quiz for checking understanding. Tests recognition (Bloom's Remember/Understand). Use lumo-recall for higher-order recall (Apply/Analyse). Space quizzes after every 2-3 new concepts — including revisiting earlier topics (micro-spacing strengthens retention). Make distractors plausible — they should represent common misconceptions. Frame questions as 'Why...' or 'How...' when possible (elaborative interrogation). If correct, accelerate — introduce harder material or move to fill-blank. If wrong, re-explain with a different visual before retesting. Never test unseen material.",
    },
    {
      description:
        "Display a quiz card with 2-4 options. The user's answer triggers an adaptive follow-up. Use for initial comprehension checks. For deeper understanding, prefer lumo-recall. In your text response, encourage the user to pick an answer.",
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
    "lumo-recall",
    {
      description:
        "Fill-in-the-blank exercise for active recall. Tests retrieval from memory (Bloom's Apply/Analyse) — more challenging than multiple choice. Use after a concept has been introduced and initially checked. Only use after the concept has been introduced AND initially checked with a quiz. This is the hardest exercise — reaching it is an achievement. Frame positively. Start with hints, remove hints as mastery grows (scaffold fading). Combine concepts from multiple topics in one fill-blank for interleaving. If the learner struggles, return to diagrams — do not repeat fill-blank on the same concept.",
    },
    {
      description:
        "Display a fill-in-the-blank exercise. Mark blanks as {{BLANK_ID}} in the prompt. The user types answers from memory. Use when testing deeper understanding — the learner must produce the answer, not just recognise it. In your text response, tell the user to type answers and press Enter to check. Mention they can reveal answers if stuck after a couple of attempts.",
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
