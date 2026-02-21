import { McpServer } from "skybridge/server";
import { diagramInputSchema, quizInputSchema } from "./schemas.js";

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
        "Renders an interactive concept diagram for visual exploration. Use to visualise flows, architectures, processes, or relationships between concepts.",
    },
    {
      description:
        "Display an animated, clickable diagram. Users can click any node to drill deeper into that concept. Use layout='hierarchical' for flows/processes, 'radial' for concept maps.",
      inputSchema: diagramInputSchema.shape,
    },
    async (input) => ({
      structuredContent: input,
      content: [
        {
          type: "text" as const,
          text: `Diagram: ${input.title}\n\n${input.explanation}\n\nNodes: ${input.nodes.map((n) => `${n.label} (${n.type})`).join(", ")}`,
        },
      ],
      isError: false,
    }),
  )
  .registerWidget(
    "illuminate-quiz",
    {
      description:
        "Shows a multiple-choice quiz question to check understanding. Use after explaining a concept to reinforce learning and adapt based on the result.",
    },
    {
      description:
        "Display a quiz card. The user's answer is automatically sent back as a follow-up message so you can continue teaching adaptively.",
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
  );

server.run();

export type AppType = typeof server;
