import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "create-project-wizard",
    {
      title: "Create Project Wizard",
      description:
        "Guide the user through quick project creation: ask app name + platform, then create immediately.",
      argsSchema: {
        userGoal: z
          .string()
          .optional()
          .describe("Optional user request or project idea to keep in view."),
      },
    },
    async ({ userGoal }) => ({
      description:
        "Use this prompt when the user wants to create a project through AppLaunchFlow MCP.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Create an AppLaunchFlow project quickly.",
              "Ask for the app name and platform (iOS or Android) using AskUserQuestion.",
              "Autofill category and description from context — do not ask the user for these.",
              "Call create_project immediately after getting the name and platform.",
              "After creation, recommend uploading screenshots as the next step.",
              userGoal ? `User goal: ${userGoal}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "direct-editing-workflow",
    {
      title: "Direct Editing Workflow",
      description:
        "Guide layout editing on an existing screenshot variant without inventing a new visual system.",
      argsSchema: {
        userGoal: z
          .string()
          .optional()
          .describe("Optional concrete editing request."),
      },
    },
    async ({ userGoal }) => ({
      description:
        "Use this prompt when the user wants to edit an existing layout or add screens while preserving the current design language.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Operate directly on the existing AppLaunchFlow screenshot layout.",
              "For small text-only edits to known nodes, transform_layout can be used directly.",
              "For any composition-sensitive edit, call get_layout first and inspect the relevant existing screens before building transform operations.",
              "Composition-sensitive edits include adding screens, reusing screenshots, changing screenshot placement, moving text, changing spacing, or any request that should match the current style.",
              "When preserving the current design, copy actual numeric values from nearby screens: text positions, widths, zIndex, screenshot position, scale, rotation, and typography attributes.",
              "Do not invent a fresh composition unless the user explicitly asks for a redesign.",
              "After applying composition-sensitive transforms, inspect the returned translation or fetch the layout again and verify that the new screens match the existing style and do not overlap key content.",
              userGoal ? `User goal: ${userGoal}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );
}
