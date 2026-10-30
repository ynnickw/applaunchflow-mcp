import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  EDITOR_FEATURES,
  getEditorReference,
} from "../resources/editor-reference.js";
import { fail, ok } from "./utils.js";

export function registerEditingReferenceTool(server: McpServer) {
  server.registerTool(
    "get_editing_reference",
    {
      title: "Get Editor Configuration Reference",
      description:
        "Returns the built-in editing reference for screenshots, social graphics, promo videos or mockups. Includes a symbol index and complete field, enum, coordinate, validator and catalog definitions. Read-only and available without project access or external resource browsing.",
      inputSchema: z.object({
        feature: z.enum(EDITOR_FEATURES),
        symbol: z
          .string()
          .optional()
          .describe(
            "Exact type/schema/catalog name from the index, e.g. ScreenshotNode, Model3DConfig, SceneDeviceSchema, stateSchema or MockupDevice.",
          ),
      }),
    },
    async ({ feature, symbol }) => {
      try {
        return ok(
          getEditorReference(feature, symbol),
          "Editor configuration reference",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
