#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  clearStoredCredentials,
  getCredentialsPath,
  loadStoredCredentials,
  resolveCredentials,
} from "./auth/credentials.js";
import { login } from "./auth/login.js";
import { AppLaunchFlowClient } from "./client/api.js";
import { registerPrompts } from "./prompts/register.js";
import { registerResources } from "./resources/register.js";
import { TemplateSelectionCoordinator } from "./template-selection.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerLayoutTools } from "./tools/layouts.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerScreenshotTools } from "./tools/screenshots.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerGraphicsTools } from "./tools/graphics.js";
import { registerPromoVideoTools } from "./tools/promovideo.js";
import { registerMockupTools } from "./tools/mockups.js";
import { registerLocalizationTools } from "./tools/localization.js";
import { registerVariantTools } from "./tools/variants.js";
import { registerKeywordTools } from "./tools/keywords.js";

const SERVER_INSTRUCTIONS = `
AppLaunchFlow MCP supports four content types: app store screenshots, social graphics, promo videos, and mockup animations.
Use it for project setup, screenshot uploads, AI generation of screenshots/graphics/videos, mockup animation editing, variant management, direct layout editing, and translation.
Do not treat this MCP as an ASO or generic graphics-design assistant — every tool is scoped to one of those four content types.

Use AppLaunchFlow MCP as an execution tool, not a questionnaire.

Default behavior:
- When the user wants help and no project has been selected yet, the first branch is always: create a new app or edit an existing app.
- Do not start with template browsing before that project choice is resolved.
- For concrete requests on an existing project, act directly instead of asking follow-up questions.
- Only ask when a missing detail is required to avoid a materially wrong result, or when the request is genuinely ambiguous.
- Do not force menu-style "what would you like to do next?" steps after each tool call.
- The user can edit layouts in natural language. Translate those requests into direct MCP actions.
- If a tool returns a user-facing URL, repeat the exact URL in the assistant reply. Do not say "link above" or assume tool output is visible to the user.
- The MCP opens the editor in the user's browser automatically on INITIAL CREATION ONLY: generate_layouts, generate_graphics, generate_promo_video, create_mockup_animation, create_variant, duplicate_variant. For these, if the MCP's elicitation-based browser open fails, fall back ONCE to: open "<url>" (macOS) / xdg-open "<url>" (Linux).
- For edit tools (transform_layout, save_graphics_format, update_promo_video, update_mockup_animation, save_layout, save_graphics), DO NOT run open / xdg-open. The user already has the editor open from the initial creation; popping a new tab on every edit is annoying. Just include the editor URL in the reply text as a reference link.

Screenshot workflows:
- Entry point without a known project: ask whether the user wants to create a new app or edit an existing project. If they want existing, list/select projects. If they want new, create the project first.
- Before generating screenshot layouts, ALWAYS call browse_templates first so the user can pick a template. Never skip template browsing or offer to generate layouts automatically without it.
- New screenshot direction or template on an existing project: call browse_templates, then immediately call generate_layouts with the selected template WITHOUT a variantId — do not ask for confirmation between template selection and generation. A new variant is always created automatically. Never overwrite existing variants.
- For small, precise edits to existing known nodes, transform_layout can be used directly.
- For any composition-sensitive edit, inspect the current layout first with get_layout. This includes adding screens, reusing screenshots, changing screenshot placement, moving text, changing spacing, or anything that should match the existing visual system.
- Use transform_layout as the primary tool for editing current screens once you have enough layout context.
- Default to layouts: ["mobile"] for transform_layout. Only include tablet/desktop if the user explicitly asks.
- When editing a single screen, scope the transform to just that screen using the screens parameter (e.g. screens: [2]). Do not transform the entire layout when only one screen needs changes.
- For adding new screens to an existing layout, prefer direct layout editing when the user wants to keep the current design. Only generate a fresh variant when the user asks for a new AI-generated layout/template.
- When adding or editing elements, ensure text and screenshots do not overlap. Verify that positions place elements in distinct, non-conflicting areas of the canvas.
- After composition-sensitive edits, inspect the returned translation or re-fetch the layout before reporting success. If elements overlap or are poorly positioned, fix them before telling the user the edit is done.
- get_layout is mandatory before every direct transform_layout call. Do not edit a layout without a fresh read of the current state first.
- ALWAYS use browse_templates when a screenshot template choice is needed. Never offer templates via text bullet points or AskUserQuestion. The gallery opens in the browser and returns the user's selection automatically.
- When you need visual context about a screenshot (e.g. to extract colors, understand the app UI, or make context-specific edits), use view_screenshot to look at the actual image.
- After generating a new variant, the editor URL is opened automatically in the browser. Also include the URL in the reply as a fallback.

Social graphics workflows (mirror the screenshot flow):
- Use browse_social_templates BEFORE generate_graphics so the user can pick a social template via the gallery. Never offer social templates via text or AskUserQuestion.
- generate_graphics produces all six social formats (OG, X post, Instagram story, Play Store feature, X header, LinkedIn banner) in one call. Omit variantId so a new variant is always created — never overwrite an existing graphics variant.
- For edits to existing social graphics, ALWAYS call get_graphics_format first, then save_graphics_format. Mutate JSON for exactly one format in memory and save only that one format. The same get-before-edit receipt rule applies as for screenshots.
- Default to the variant's primary format unless the user explicitly asks to edit another format.
- Do not edit multiple formats in one pass. The user can sync the design to other formats later in the graphics editor UI.
- When sharing or returning a graphics editor URL after an edit, include \`&format=<format>\` so the browser shows the format that was changed.
- Use create_variant with contentType:"socialGraphics" or duplicate_variant to create a copy / fresh take without overwriting the current graphics variant.

Promo video workflows:
- generate_promo_video runs the AI generation pipeline against the project's screenshots and produces a complete Remotion video config. Omit variantId to create a new variant.
- For edits to an existing promo video, ALWAYS call get_promo_video first to fetch the current config, mutate the config object in memory, then call update_promo_video with the full updated config. There is no granular transform tool for promo videos at this stage — full-config replace is the supported edit path. The same get-before-edit receipt rule as graphics applies: update_promo_video is locked until a fresh get_promo_video has been called for the same project/variant.
- Use clear_promo_video to wipe a variant's video config when the user wants to start over.
- Use create_variant with contentType:"promoVideo" or duplicate_variant for copies / A-B tests. duplicate_variant clones the source promo-video variant, including its config.
- Promo video has no template gallery — the LLM produces the full config end-to-end. Do NOT call browse_templates / browse_social_templates for promo videos.

Mockup animation workflows:
- create_mockup_animation seeds a fresh mockup variant from a SCENE_PRESETS preset and a specific screenshot/recording path. Always omit variantId; a new variant is always created. Call list_mockup_media first to pick a screenshotPath, and list_mockup_presets to pick a presetId and learn the valid enum + bound values. Editor opens automatically.
- For edits to an existing mockup animation, ALWAYS call get_mockup_animation first to fetch the current state, mutate the MockupProjectState object in memory, then call update_mockup_animation with the full updated state. There is no granular per-keyframe transform — full-state replace is the supported edit path. The same get-before-edit receipt rule applies: update_mockup_animation is locked until a fresh get_mockup_animation has been called for the same project/variant. Edits propagate live to any open mockup editor tab via realtime — do not open the editor again.
- Use create_variant with contentType:"mockups" or duplicate_variant for additional A/B variants. duplicate_variant clones the source mockup variant, including its state. To start a variant over, call create_mockup_animation for a fresh variant instead.
- Mockup animation has no template gallery — the LLM constructs the MockupProjectState end-to-end using values from list_mockup_presets. Do NOT call browse_templates / browse_social_templates for mockup animations.

Translation and localization (screenshots only):
- When the user asks to translate, localize, or create a version in another language for screenshots, ALWAYS use translate_layouts. Do NOT manually edit text nodes via transform_layout for translation.
- translate_layouts uses AI to translate all text while preserving layout, positioning, and styling.
- To apply the same transform across all screens, use transform_layout with screens: "all" in the target.
- Translation is not currently exposed for social graphics or promo videos.

Project creation should be fast and simple:
1. Ask for the app name and platform (iOS or Android) using AskUserQuestion. Default platform to iOS.
2. Autofill category and description from context (e.g. "Skyscanner" → category "Travel"). Do not ask the user for these.
3. Call create_project immediately. Do not ask for confirmation or optional fields unless the user volunteers them.
4. After creation, recommend uploading screenshots as the next step (screenshots are the input for both social graphics and promo video generation too).
`.trim();

async function runAuthCommand(args: string[]) {
  const [subcommand, ...rest] = args;

  if (subcommand === "login") {
    const baseUrlFlagIndex = rest.findIndex((value) => value === "--base-url");
    const baseUrl =
      baseUrlFlagIndex >= 0
        ? rest[baseUrlFlagIndex + 1]
        : process.env.APPLAUNCHFLOW_BASE_URL || "https://dashboard.applaunchflow.com";
    await login(baseUrl);
    return;
  }

  if (subcommand === "logout") {
    await clearStoredCredentials();
    console.error(`Removed credentials at ${getCredentialsPath()}`);
    return;
  }

  if (subcommand === "status") {
    const credentials = await loadStoredCredentials();
    if (!credentials) {
      console.error("No stored AppLaunchFlow MCP credentials");
      process.exitCode = 1;
      return;
    }

    console.error(`Base URL: ${credentials.baseUrl}`);
    console.error(`Cookie name: ${credentials.cookieName}`);
    if (credentials.expiresAt) {
      console.error(`Expires at: ${credentials.expiresAt}`);
    }
    console.error(`Credentials file: ${getCredentialsPath()}`);
    return;
  }

  console.error("Usage: applaunchflow-mcp auth <login|logout|status> [--base-url <url>]");
  process.exitCode = 1;
}

async function startServer() {
  const credentials = await resolveCredentials();
  const client = new AppLaunchFlowClient(credentials);
  const templateSelectionCoordinator = new TemplateSelectionCoordinator();

  const server = new McpServer({
    name: "applaunchflow-mcp",
    version: "0.1.0",
  }, {
    instructions: SERVER_INSTRUCTIONS,
  });

  registerPrompts(server);
  registerResources(server, client);
  registerProjectTools(server, client);
  registerAssetTools(server, client);
  registerScreenshotTools(server, client);
  registerLayoutTools(server, client);
  registerTemplateTools(server, client, templateSelectionCoordinator);
  registerGraphicsTools(server, client, templateSelectionCoordinator);
  registerPromoVideoTools(server, client);
  registerMockupTools(server, client);
  registerLocalizationTools(server, client);
  registerVariantTools(server, client);
  registerKeywordTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (command === "auth") {
    await runAuthCommand(args);
    return;
  }

  try {
    await startServer();
  } catch (error) {
    console.error(
      error instanceof Error ? error.stack || error.message : String(error),
    );
    process.exitCode = 1;
  }
}

void main();
