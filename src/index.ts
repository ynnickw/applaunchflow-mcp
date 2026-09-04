import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "node:module";
import { AppLaunchFlowClient, type McpCredentials } from "./client/api.js";
import { registerPrompts } from "./prompts/register.js";
import { registerResources } from "./resources/register.js";
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
import { installToolMetadataPolicy } from "./tool-metadata.js";
import { registerScreenshotPicker } from "./ui/screenshot-picker.js";
import { registerSocialGraphicsPicker } from "./ui/social-graphics-picker.js";
import { registerPromoVideoPicker } from "./ui/promo-video-picker.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

export const SERVER_INSTRUCTIONS = `
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
- Initial creation tools return an editor URL. Include that exact URL in the reply so the user can open the result.
- For edit tools (transform_layout, save_graphics_format, update_promo_video, update_mockup_animation, save_layout, save_graphics), include the editor URL as a reference without claiming a new browser tab was opened.

Schema references (MCP resources — read them, they are not loaded automatically):
- applaunchflow://schema/layout — every field of the layout JSON: all 11 node types, their properties, and valid value ranges. Used by BOTH screenshots and social graphics (a social layout is the same shape with exactly one screen and the format's canvas size).
- applaunchflow://schema/transforms — the transform_layout operations, selector syntax, and the selector pitfalls that silently match every screen.
- applaunchflow://schema/video-config — the full Remotion VideoConfig: six scene types and their content shapes, theme, text styles, ken burns, choreography preset ids, device/text overlays, audio.
- For mockup animations the equivalent is the list_mockup_presets TOOL, not a resource.
- Read the relevant resource before hand-writing or non-trivially editing JSON. A get_* response only shows what is currently set — it does not tell you what is possible.

Screenshot workflows:
- After prepare_screenshot_styles, call render_screenshot_picker with the returned generationId and catalogKey to show real V1/V2 previews inline in MCP Apps-compatible hosts. The widget calls apply_screenshot_style only after the user explicitly selects a palette. If the host cannot display the widget, provide the returned galleryUrl. Do not regenerate the catalog just to render it.
- Entry point without a known project: ask whether the user wants to create a new app or edit an existing project. If they want existing, list/select projects. If they want new, create the project first.
- For the normal style-choice flow, call list_source_screenshots, choose 3-7 real screenshots in story order, then call prepare_screenshot_styles. This generates or reuses one personalized catalog containing every template for phone, tablet, and desktop.
- prepare_screenshot_styles opens the personalized gallery automatically. The user compares the real v1/v2 renders there; confirming a style creates a new variant from cache and opens the editor. Do not ask the user to paste a template id back into chat. Use browse_templates only to reopen the gallery, and apply_screenshot_style only when a template id was supplied directly in chat or by an API client. Never overwrite an existing variant.
- For small, precise edits to existing known nodes, transform_layout can be used directly.
- For any composition-sensitive edit, inspect the current layout first with get_layout. This includes adding screens, reusing screenshots, changing screenshot placement, moving text, changing spacing, or anything that should match the existing visual system.
- Use transform_layout as the primary tool for editing current screens once you have enough layout context.
- Default to layouts: ["mobile"] for transform_layout. Only include tablet/desktop if the user explicitly asks.
- When editing a single screen, scope the transform to just that screen using the screens parameter (e.g. screens: [2]). Do not transform the entire layout when only one screen needs changes.
- For adding new screens to an existing layout, prefer direct layout editing when the user wants to keep the current design. Only generate a fresh variant when the user asks for a new AI-generated layout/template.
- When adding or editing elements, ensure text and screenshots do not overlap. Verify that positions place elements in distinct, non-conflicting areas of the canvas.
- After composition-sensitive edits, inspect the returned translation or re-fetch the layout before reporting success. If elements overlap or are poorly positioned, fix them before telling the user the edit is done.
- get_layout is mandatory before every direct transform_layout call. Do not edit a layout without a fresh read of the current state first.
- Never offer screenshot templates via text bullet points. prepare_screenshot_styles opens the personalized picker automatically. If browser opening is unsupported, show its exact fallback gallery URL. Do not wait for a selected template id because the picker applies the choice directly.
- When you need visual context about a screenshot (e.g. to extract colors, understand the app UI, or make context-specific edits), use view_screenshot to look at the actual image.
- After generating a new variant, include the editor URL in the reply.

Social graphics workflows (mirror the screenshot flow):
- After prepare_social_graphics_styles, call render_social_graphics_picker with the returned generationId, catalogKey, and primaryFormat to show the existing dashboard social-template studio inline in MCP Apps-compatible hosts. If the host cannot display it, provide the exact returned galleryUrl.
- Call list_source_screenshots, select 3-7 real screenshots in story order, then call prepare_social_graphics_styles. This generates or reuses every social template across all supported social, store, and ad formats in one catalog.
- prepare_social_graphics_styles opens the personalized gallery automatically. Confirming a style creates a fresh variant containing all supported formats and opens the graphics editor. Do not ask the user to paste a template id back into chat. Use browse_social_templates only to reopen the gallery, and apply_social_graphics_style only when a template id was supplied directly in chat or by an API client.
- For edits to existing social graphics, ALWAYS call get_graphics_format first, then save_graphics_format. Mutate JSON for exactly one format in memory and save only that one format. The same get-before-edit receipt rule applies as for screenshots.
- Default to the variant's primary format unless the user explicitly asks to edit another format.
- Do not edit multiple formats in one pass. The user can sync the design to other formats later in the graphics editor UI.
- When sharing or returning a graphics editor URL after an edit, include \`&format=<format>\` so the browser shows the format that was changed.
- Use create_variant with contentType:"socialGraphics" or duplicate_variant to create a copy / fresh take without overwriting the current graphics variant.

Promo video workflows:
- After generate_promo_video, call render_promo_video_picker with the returned projectId and candidateKey (and the same replaceVariantId, if present) to show all three concepts inline in MCP Apps-compatible hosts. If the host cannot display it, provide the exact returned pickerUrl.
- generate_promo_video prepares three transient, personalized candidates and opens the same dashboard picker used by the web app. No saved variant is created until the user chooses one. Do not summarize the three options in chat or ask for a candidate id.
- To replace an existing promo-video variant, pass replaceVariantId only after explicit user approval. The chosen candidate is created first and the old variant is retired only after the new one saves successfully, so replacement works safely at the plan limit.
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

const HOSTED_SERVER_INSTRUCTIONS = `
HOSTED CONNECTOR SAFETY RULES:
- Never reveal, repeat, log, or place OAuth access tokens, refresh tokens, authorization codes, PKCE verifiers, or read receipts in user-facing text.
- A readReceipt returned inside structured tool data is an opaque safety input. Pass it only to the matching edit tool, for the exact same project, variant, language, and format.
- Before deleting, clearing, overwriting, or replacing user content, require clear user intent for that exact action. Do not infer destructive intent from a broad request.
- Browser-opening language below describes the local connector. Stateless hosted connectors return clickable URLs without opening a browser; always show the exact returned URL and never claim it opened automatically. Personalized screenshot galleries apply the user's v1/v2 choice directly and open the new variant in the editor after the user follows the link. Do not ask the user to relay the template id.

${SERVER_INSTRUCTIONS}
`.trim();

export function createAppLaunchFlowServer(
  credentials: McpCredentials,
): McpServer {
  const client = new AppLaunchFlowClient(credentials);

  const server = new McpServer(
    {
      name: "applaunchflow-mcp",
      version: packageJson.version,
    },
    {
      instructions: HOSTED_SERVER_INSTRUCTIONS,
    },
  );

  installToolMetadataPolicy(server, { hosted: true });

  registerPrompts(server);
  registerResources(server, client);
  registerProjectTools(server, client);
  registerAssetTools(server, client);
  registerScreenshotTools(server, client);
  registerLayoutTools(server, client);
  registerTemplateTools(server, client);
  registerGraphicsTools(server, client);
  registerPromoVideoTools(server, client);
  registerMockupTools(server, client);
  registerLocalizationTools(server, client);
  registerVariantTools(server, client);
  registerKeywordTools(server, client);
  registerScreenshotPicker(server, client);
  registerSocialGraphicsPicker(server, client);
  registerPromoVideoPicker(server, client);

  return server;
}
