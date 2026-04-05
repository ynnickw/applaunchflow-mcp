import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const transformOperationSchema = z.object({
  type: z.enum([
    "update_node",
    "delete_node",
    "add_node",
    "reorder",
    "replace_color",
  ]).describe(
    "Operation type. replace_color is a find-and-replace for colors across the layout — use it for bulk color changes instead of updating each text node individually. " +
    "Example: {type:'replace_color', target:{nodeType:'screen'}, changes:{find:'#F6EFE9', replace:'#7C3AED'}} replaces that color everywhere (text marks, icon colors, backgrounds). " +
    "Use screens:'all' to replace across all screens, or screens:[6] for a single screen.",
  ),
  target: z.object({
    nodeType: z
      .string()
      .describe(
        "REQUIRED. The node type to target: 'screen', 'text', 'screenshot', 'illustration', 'pill', 'badge', 'blob', 'rating', 'logo', 'emoji', 'header', 'panoramaBackground', 'backgroundImage'.",
      ),
    nodeId: z
      .string()
      .optional()
      .describe(
        "Optional. Target a specific node by id. If omitted, the operation applies to ALL nodes of nodeType in the target screens.",
      ),
    selector: z
      .string()
      .optional()
      .describe(
        "Optional. Target screens by id: 'screenId:<id>'. Do NOT use '#' prefix.",
      ),
    screens: z
      .union([z.literal("all"), z.array(z.number())])
      .optional()
      .describe(
        "Optional. Target specific screens by index array (e.g. [0, 1, 2]) or 'all' for every screen. If omitted, targets all screens.",
      ),
  }),
  changes: z.record(z.any()),
}).superRefine((operation, ctx) => {
  // Require nodeType for all operations except replace_color
  if (!operation.target.nodeType && operation.type !== "replace_color") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target", "nodeType"],
      message: "nodeType is required in target",
    });
    return;
  }

  const payload =
    operation.changes?.node &&
    typeof operation.changes.node === "object" &&
    !Array.isArray(operation.changes.node)
      ? operation.changes.node
      : operation.changes;

  if (operation.type === "add_node") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changes"],
        message: "add_node requires a node object in changes or changes.node",
      });
      return;
    }

    if (typeof payload.id !== "string" || payload.id.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changes", "id"],
        message: "add_node requires a non-empty id field",
      });
    }

    if (
      operation.target.nodeType === "screen" &&
      ("text" in payload || "screenshotPath" in payload)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changes"],
        message:
          "When adding a screen, only provide the screen container fields. Add screenshot and text nodes with separate add_node operations targeting that screen index.",
      });
    }
  }
});

export function registerLayoutTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "get_layout",
    {
      title: "Get Layout",
      description:
        "Get layout JSON for the current translation before editing or reviewing a variant.",
      inputSchema: {
        generationId: z.string().uuid(),
        language: z.string().optional(),
        variantId: z.string().uuid().optional(),
        sign: z.boolean().optional(),
      },
    },
    async ({ generationId, language, variantId, sign }) => {
      try {
        return ok(
          await client.getLayout({ generationId, language, variantId, sign }),
          "Fetched layout data",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_layout",
    {
      title: "Save Layout",
      description: "Persist a full translation layout payload",
      inputSchema: {
        generationId: z.string().uuid(),
        language: z.string(),
        variantId: z.string().uuid().optional(),
        mobileLayout: z.record(z.any()),
        tabletLayout: z.record(z.any()),
        desktopLayout: z.record(z.any()).nullable().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await client.saveLayout(args), "Saved layout");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "transform_layout",
    {
      title: "Transform Layout",
      description:
        "Apply transform operations to an existing layout. Primary editing tool for text, screenshots, colors, and structure changes. " +
        "IMPORTANT: Always call get_layout FIRST to inspect the current layout state before using this tool. Never transform blindly. " +
        "RULES: " +
        "1. nodeType is REQUIRED in every operation target. " +
        "2. Omit nodeId to update ALL nodes of that type in the target screens. " +
        "3. Use screens:'all' to target every screen at once. Do NOT send one operation per screen when the same change applies to all. " +
        "4. Dot-notation is supported for deep updates without replacing the whole object. Example: {'richContent.attrs.defaultFontSize': 96} updates only the font size inside richContent.attrs, preserving all other fields. Always use dot-notation for nested property changes. " +
        "5. For add_node, changes MUST include an 'id' field. " +
        "6. To add new screens, first add empty screen containers, then populate them in a SECOND call using selector 'screenId:<id>'. " +
        "7. Default to layouts:['mobile']. Only include tablet/desktop if the user asks.",
      inputSchema: {
        generationId: z.string().uuid(),
        language: z.string(),
        variantId: z.string().uuid().optional(),
        atomic: z.boolean().optional(),
        layouts: z
          .array(z.enum(["mobile", "tablet", "desktop"]))
          .optional()
          .describe("Which layout sizes to transform. Default to ['mobile'] unless the user explicitly asks for tablet or desktop."),
        operations: z.array(transformOperationSchema).min(1),
      },
    },
    async (args) => {
      try {
        return ok(await client.transformLayout(args), "Applied layout transform");
      } catch (error) {
        return fail(error);
      }
    },
  );

}
