import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { EDITOR_FEATURES, getEditorReference } from '../resources/editor-reference.js';
import { fail, ok } from './utils.js';

export function registerEditingReferenceTool(server: McpServer) {
  server.registerTool('get_editing_reference', {
    title: 'Get Editor Configuration Reference',
    description: 'Read before editing screenshots, social graphics, promo videos or mockups. Returns workflow, coordinate units and an exhaustive index of current configuration types, validators and catalogs. Pass a symbol from the index to retrieve its complete fields, enums, bounds and defaults. Works even in MCP clients without resource browsing; read-only, no project or network access.',
    inputSchema: z.object({
      feature: z.enum(EDITOR_FEATURES),
      symbol: z.string().optional().describe('Exact type/schema/catalog name from the index, e.g. ScreenshotNode, Model3DConfig, SceneDeviceSchema, stateSchema or MockupDevice.'),
    }),
  }, async ({ feature, symbol }) => {
    try { return ok(getEditorReference(feature, symbol), 'Editor configuration reference'); }
    catch (error) { return fail(error); }
  });
}
