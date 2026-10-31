import { McpServer } from "@modelcontextprotocol/server";
import { createRequire } from "node:module";
import { AppLaunchFlowClient, type McpCredentials } from "./client/api.js";
import { registerPrompts } from "./prompts/register.js";
import { registerResources } from "./resources/register.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerAssetManagementTools } from "./tools/asset-management.js";
import { registerLayoutTools } from "./tools/layouts.js";
import { registerReviewSnapshotTools } from "./tools/review-snapshot.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerScreenshotTools } from "./tools/screenshots.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerGraphicsTools } from "./tools/graphics.js";
import { registerPromoVideoTools } from "./tools/promovideo.js";
import { registerMockupTools } from "./tools/mockups.js";
import { registerEditingReferenceTool } from "./tools/editing-reference.js";
import { registerLocalizationTools } from "./tools/localization.js";
import { registerReleaseTools } from "./tools/releases.js";
import { registerVariantTools } from "./tools/variants.js";
import { registerKeywordTools } from "./tools/keywords.js";
import { registerStoreListingTools } from "./tools/store-listing.js";
import { registerCapabilityTools } from "./tools/capabilities.js";
import { installToolMetadataPolicy } from "./tool-metadata.js";
import { registerScreenshotPicker } from "./ui/screenshot-picker.js";
import { registerSocialGraphicsPicker } from "./ui/social-graphics-picker.js";
import { registerPromoVideoPicker } from "./ui/promo-video-picker.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

export const SERVER_INSTRUCTIONS = `
AppLaunchFlow MCP edits the four AppLaunchFlow content types (app store screenshots, social graphics, promo videos, mockup animations) and the work around them: projects, uploads and asset folders, variants, translation, store listing text and keyword tracking.
Call get_capabilities when unsure what is possible. Anything it lists under notAvailableViaMcp (App Store Connect / Google Play publishing, custom product pages, A/B tests, reviews, app icon, website, members, billing) cannot be done here: give the user its exact dashboardUrl instead of attempting or improvising it.
Before editing screenshots, social graphics, promo videos or mockups, call get_editing_reference with the corresponding feature. Read its index, then retrieve the root and nested symbols relevant to the change. This reference covers ALL current fields, not just those already present in the saved document. Do not guess configuration names or infer capability from permissive validation. Use this tool if your client cannot browse resources.

Use AppLaunchFlow MCP as an execution tool, not a questionnaire.

Default behavior:
- When the user wants help and no project has been selected yet, the first branch is always: create a new app or edit an existing app.
- Do not start with template browsing before that project choice is resolved.
- For concrete requests on an existing project, act directly instead of asking follow-up questions.
- Only ask when a missing detail is required to avoid a materially wrong result, or when the request is genuinely ambiguous.
- Do not force menu-style "what would you like to do next?" steps after each tool call.
- The user can edit layouts in natural language. Translate those requests into direct MCP actions.
- projectId and generationId are the same project id; tools accept either.
- If a tool returns a user-facing URL, repeat the exact URL in the assistant reply. Do not say "link above" or assume tool output is visible to the user.
- Initial creation tools return an editor URL. Include that exact URL in the reply so the user can open the result.
- For edit tools (transform_layout, save_layout, save_graphics_format, save_graphics, transform_graphics, update_promo_video, update_mockup_animation), include the editor URL as a reference without claiming a new browser tab was opened.
- Errors: when error.recovery.retryable is false (plan limits, quota, Pro required), do not retry. Explain the options and share error.recovery.upgradeUrl when present. get_plan_usage shows remaining allowances.

Look before you report, then deliver:
- After a visual edit, look at the rendered result before describing it: preview_screenshots (screenshots), render_graphics with mode "preview" (social graphics), preview_promo_video with sceneIndex or at (promo videos), preview_mockup_animation (mockups). Fix overlaps or misplacements before telling the user the edit is done. Re-reading the JSON is not a visual check.
- To deliver files: render_screenshots (store screenshot packages), render_graphics with mode "export" (social graphics), export_promo_video then get_promo_video_export (promo videos; under 30 s, reuse the idempotencyKey on retries), export_mockup_animation then get_mockup_animation_export (mockup videos). Show download URLs immediately; they expire.

Schema references (MCP resources — read them, they are not loaded automatically):
- applaunchflow://schema/layout — every field of the layout JSON: all 11 node types, their properties, and valid value ranges. Used by BOTH screenshots and social graphics (a social layout is the same shape with exactly one screen and the format's canvas size).
- applaunchflow://schema/transforms — the transform_layout operations, selector syntax, and the selector pitfalls that silently match every screen.
- applaunchflow://schema/video-config — the full Remotion VideoConfig: scene types and their content shapes, theme, text styles, ken burns, choreography preset ids, device/text overlays, audio.
- applaunchflow://editing/mockups — complete MockupProjectState, device timing, keyframes, model/finish/lid controls, backgrounds, presenter overlay, audio and validation. list_mockup_presets supplements it with models, finishes, music and scene presets.
- applaunchflow://editing/socialGraphics — shared Layout contract plus format IDs, dimensions and constraints.
- applaunchflow://guide/workflows — step-by-step tool sequences for common goals.
- Read the relevant resource before hand-writing or non-trivially editing JSON. A get_* response only shows what is currently set — it does not tell you what is possible.

Screenshot workflows:
- For new styles, prepare_screenshot_styles prepares the catalog; immediately call browse_templates with its generationId, catalogKey and requested deviceType to display the cached V1/V2 picker. Do not ask a question between these steps or narrate the tool mechanics. Then stop and let the user choose; do not call apply_screenshot_style yourself. To revisit choices, call browse_templates with that same catalogKey instead of preparing again. A galleryUrl remains available if the host cannot display the widget.
- Entry point without a known project: ask whether the user wants to create a new app or edit an existing project. If they want existing, list/select projects. If they want new, create the project first.
- For the normal style-choice flow, call list_source_screenshots, choose 3-7 real screenshots in story order, then call prepare_screenshot_styles. This generates or reuses one personalized catalog containing every template for phone, tablet, and desktop.
- browse_templates displays the personalized gallery after preparation. The user compares the real v1/v2 renders there; confirming a style creates a new variant from cache and opens the editor. Do not ask the user to paste a template id back into chat. Use apply_screenshot_style only when a template id was supplied directly in chat or by an API client. Never overwrite an existing variant.
- get_layout is mandatory before every direct transform_layout call. Do not edit a layout without a fresh read of the current state first.
- Use transform_layout as the primary tool for editing current screens once you have enough layout context. Inspect the layout first for any composition-sensitive edit (adding screens, reusing screenshots, moving text, spacing).
- transform_layout defaults to layouts: ["mobile"]. Only include tablet/desktop if the user explicitly asks. When editing a single screen, scope the transform with the screens parameter (e.g. screens: [2]).
- In transform_layout a null value removes a field. nodeType "layout" edits theme colors (themeColors, themePaletteMode v1/v2), orientation and backgrounds the way the editor does. zIndex is one stacking order per screen across all node types; use bring_to_front / send_to_back.
- Setting a screenshot node's path replaces the image on both platforms; pass platform only for a platform-specific replacement.
- Use exact font families from list_fonts. upload_asset with fileType "font" registers a custom font family. For background photos use search_stock_photos and import_stock_photo (keeps attribution).
- When adding or editing elements, ensure text and screenshots do not overlap, then check with preview_screenshots.
- For adding new screens to an existing layout, prefer direct layout editing when the user wants to keep the current design. Only generate a fresh variant when the user asks for a new AI-generated layout/template.
- Never offer screenshot templates via text bullet points. Display prepared choices with browse_templates. If widget display is unsupported, show the exact returned gallery URL.
- When you need visual context about a source screenshot (colors, app UI), use view_screenshot.
- After generating a new variant, include the editor URL in the reply.

Social graphics workflows (mirror the screenshot flow):
- For new styles, prepare_social_graphics_styles prepares the catalog; immediately call browse_social_templates with its generationId, catalogKey and primaryFormat as format to display the cached picker. Do not ask a question between these steps or narrate the tool mechanics. Then stop and let the user choose; do not call apply_social_graphics_style yourself. To revisit choices, call browse_social_templates with that same catalogKey instead of preparing again. A galleryUrl remains available if the host cannot display the widget.
- Call list_source_screenshots, select 3-7 real screenshots in story order, then call prepare_social_graphics_styles. This generates or reuses every social template across all supported social, store, and ad formats in one catalog.
- browse_social_templates displays the personalized gallery after preparation and can reopen it or list template names and format specifications. Confirming a style creates a fresh variant containing all supported formats and opens the graphics editor. Use apply_social_graphics_style only when a template id was supplied directly in chat or by an API client.
- For edits to one format, ALWAYS call get_graphics_format first, then save_graphics_format. get_graphics_format derives a format the variant never saved (derived: true); never hand-build a layout. Social layouts have exactly one screen at the format's canvas size.
- Default to the variant's primary format unless the user explicitly asks to edit another format.
- For the same change across several formats use transform_graphics. Its syncFrom option is the editor's "Sync to all formats": it rebuilds other formats from one, so confirm before overwriting customized formats.
- update_graphics_settings sets the default (primary) format or switches the graphics between iOS and Android.
- When sharing or returning a graphics editor URL after an edit, include \`&format=<format>\` so the browser shows the format that was changed.
- Use duplicate_variant for a copy of the current graphics variant and prepare_social_graphics_styles for a new design.

Promo video workflows:
- generate_promo_video starts background preparation and returns an interactive picker that updates to show three concepts when ready. Let the user choose; do not call apply_promo_video_candidate yourself. If no widget is available, get_promo_video_generation checks the returned generationJobId without generating again. To revisit prepared candidates, provide the exact pickerUrl. Do not generate new candidates just to reopen the picker.
- generate_promo_video prepares three transient, personalized candidates and opens the same dashboard picker used by the web app. No saved variant is created until the user chooses one. Do not summarize the three options in chat or ask for a candidate id.
- To replace an existing promo-video variant, pass replaceVariantId only after explicit user approval. The chosen candidate is created first and the old variant is retired only after the new one saves successfully, so replacement works safely at the plan limit.
- For edits to an existing promo video, ALWAYS call get_promo_video first, mutate the config in memory, then call update_promo_video with the full updated config. update_promo_video is locked until a fresh get_promo_video has been called for the same project/variant. The server validates the config against the renderer schema and lists every problem; fix them and retry.
- Edit the \`config\` returned by get_promo_video and send the whole object back. Keep \`transitionNaming: "content-motion"\` (transition names describe how the content moves). Fields the editor always writes are filled in when missing and reported as filledDefaults.
- Changing deviceModelId also updates the device frame; changing musicId restarts the track but does not re-cut scenes to the new beat.
- generate_promo_video takes deviceType (phone, tablet, desktop) for iPad and Mac promos.
- Use clear_promo_video to wipe a variant's video config when the user wants to start over.
- Use duplicate_variant for copies / A-B tests; it clones the source promo-video variant, including its config.
- Promo video has no template gallery — the LLM produces the full config end-to-end. Do NOT call browse_templates / browse_social_templates for promo videos.

Mockup animation workflows:
- create_mockup_animation takes device (phone, duo, tablet, laptop) and platform; pick the device that matches the screen content. A new variant is always created. Find existing screens with list_assets, mockup uploads and recordings with list_mockup_media, and models, finishes, music and presets with list_mockup_presets.
- For edits, ALWAYS call get_mockup_animation first (variantId optional; it returns the variantId), mutate the MockupProjectState in memory, then call update_mockup_animation with that variantId and the full updated state. Read the returned ignoredFields and warnings. Edits propagate live to any open mockup editor tab via realtime — do not open the editor again.
- After an edit, check the framing with preview_mockup_animation (server-rendered PNGs at timeline seconds).
- To deliver a file: export_mockup_animation, then poll get_mockup_animation_export and share the exact download URL. Server exports must be under 30 s with no transparent background and use one API export. Transparent WebM, PNG stills and longer videos are editor-only.
- generate_mockup_motion drafts custom keyframes from a prompt and saves nothing; apply them with get_mockup_animation + update_mockup_animation.
- Screen recordings must be export-safe (H.264, ≤1080 px short side, keyframes ≤2.5 s apart); upload_asset rejects others with an ffmpeg command to fix them.
- Mockup animation has no template gallery — the LLM constructs the MockupProjectState end-to-end using values from list_mockup_presets. Do NOT call browse_templates / browse_social_templates for mockup animations.

Translation and localization:
- Screenshots: ALWAYS use translate_layouts to translate or localize (never edit text nodes by hand for translation). Re-running it for an existing language re-syncs that language's design from the source. sync_layout re-syncs designs without translating; apply_locale_screenshots applies per-language screenshot folders (set_asset_folder_locale) to the translations.
- Social graphics: translate_graphics, then pass language to the graphics tools; list_graphics_translations lists languages.
- Promo videos: translate_promo_video creates or re-translates languages (re-translating overwrites edits). Pass language to get_promo_video / update_promo_video; read receipts are per language.
- Store listing text: get_store_listing, generate_store_listing, update_store_listing (only the fields you pass, store character limits enforced), translate_store_listing.
- To apply the same transform across all screens, use transform_layout with screens: "all" in the target.

Variants:
- create_variant makes an EMPTY variant (use it only when the user wants to build from scratch). For a copy use duplicate_variant; for a new AI design use the prepare_* / generate_* tools. set_active_variant switches the active variant. delete_variant only on the user's explicit request.

Keywords: list_keywords, add_keywords (the server resolves the linked app), remove_keywords, suggest_keywords, keyword competitors and get_keyword_history track App Store / Google Play rankings for the project's linked app.

Project creation should be fast and simple:
1. If the app is already on the App Store, call create_project with appStore (App Store id or URL); it imports name, category, description and icon and links the app.
2. Otherwise ask only for what you cannot infer: the app name and platform (iOS or Android, default iOS). Autofill category and description from context (e.g. "Skyscanner" → category "Travel").
3. Call create_project immediately. Do not ask for confirmation or optional fields unless the user volunteers them.
4. After creation, recommend uploading screenshots as the next step (screenshots are the input for screenshots, social graphics and promo video generation).
`.trim();

const HOSTED_SERVER_INSTRUCTIONS = `
HOSTED CONNECTOR SAFETY RULES:
- Never reveal, repeat, log, or place OAuth access tokens, refresh tokens, authorization codes, PKCE verifiers, or read receipts in user-facing text.
- A readReceipt returned in tool-result JSON (structuredContent or its text equivalent) is an opaque safety input, not prose to show the user. Pass it only to the matching edit tool, for the exact same project, variant, language, and format.
- Before deleting, clearing, overwriting, or replacing user content, require clear user intent for that exact action. Do not infer destructive intent from a broad request.
- Browser-opening language below describes the local connector. Stateless hosted connectors return clickable URLs without opening a browser; always show the exact returned URL and never claim it opened automatically. Personalized screenshot galleries apply the user's v1/v2 choice directly and open the new variant in the editor after the user follows the link. Do not ask the user to relay the template id.

${SERVER_INSTRUCTIONS}
`.trim();

export function createAppLaunchFlowServer(
  credentials: McpCredentials,
  options: { hosted?: boolean } = {},
): McpServer {
  const client = new AppLaunchFlowClient(credentials);
  const hosted = options.hosted ?? false;

  const server = new McpServer(
    {
      name: "applaunchflow-mcp",
      version: packageJson.version,
    },
    {
      instructions: hosted ? HOSTED_SERVER_INSTRUCTIONS : SERVER_INSTRUCTIONS,
    },
  );

  installToolMetadataPolicy(server, { hosted });

  registerPrompts(server);
  registerResources(server, client);
  registerEditingReferenceTool(server);
  registerProjectTools(server, client);
  registerAssetTools(server, client, { hosted });
  registerAssetManagementTools(server, client);
  registerScreenshotTools(server, client);
  registerLayoutTools(server, client);
  registerReviewSnapshotTools(server, client);
  registerTemplateTools(server, client);
  registerGraphicsTools(server, client);
  registerPromoVideoTools(server, client);
  registerMockupTools(server, client);
  registerLocalizationTools(server, client);
  registerVariantTools(server, client);
  registerReleaseTools(server, client);
  registerKeywordTools(server, client);
  registerStoreListingTools(server, client);
  registerCapabilityTools(server, client);
  registerScreenshotPicker(server, client);
  registerSocialGraphicsPicker(server, client);
  registerPromoVideoPicker(server, client);

  return server;
}
