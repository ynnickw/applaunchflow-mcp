import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "first-run",
    {
      title: "Check Connection and Get Started",
      description:
        "Confirm the AppLaunchFlow connection works, show what this account can access, and choose a next step without changing anything.",
      argsSchema: z.object({
        projectId: z
          .string()
          .optional()
          .describe("Optional project to focus on after the check."),
      }),
    },
    async ({ projectId }) => ({
      description:
        "Use this prompt right after connecting AppLaunchFlow to confirm it works.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Check my AppLaunchFlow connection. Call list_projects and get_plan_usage, then tell me in two lines which projects you can see and what I have left this month.",
              projectId
                ? `Then call get_project for project ${projectId} and suggest the most useful next step based on what it already has.`
                : "Then ask one question: create a new app or work on an existing one? For an existing one, suggest the most useful next step based on what it already has.",
              "Make no changes until I choose.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "create-project-wizard",
    {
      title: "Create Project Wizard",
      description:
        "Guide the user through quick project creation: import from the App Store or ask app name + platform, then create immediately.",
      argsSchema: z.object({
        userGoal: z
          .string()
          .optional()
          .describe("Optional user request or project idea to keep in view."),
      }),
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
              "If no project is selected yet, the first branching question is whether the user wants to create a new app or edit an existing one.",
              "If the app is already on the App Store, pass its id or apps.apple.com URL as appStore: name, category, description and icon are imported.",
              "Otherwise ask for the app name and platform (iOS or Android) in one short question, unless both are already known. Default platform to iOS.",
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
      argsSchema: z.object({
        userGoal: z
          .string()
          .optional()
          .describe("Optional concrete editing request."),
      }),
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
              "Call get_editing_reference with feature screenshots, then retrieve the Layout and relevant nested node/schema symbols before constructing edits.",
              "Call get_layout first and inspect the relevant existing screens before every transform_layout call.",
              "This read-before-edit rule is mandatory even for small direct edits.",
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
