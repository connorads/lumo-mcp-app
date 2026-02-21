import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const webSrc = import.meta.dirname + "/web/src";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          include: ["server/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [react()],
        resolve: { alias: { "@": webSrc } },
        test: {
          name: "web",
          include: ["web/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./web/src/test-setup.ts"],
        },
      },
    ],
  },
});
