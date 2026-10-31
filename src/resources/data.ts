export const TRANSFORM_SCHEMA_RESOURCE = {
  operations: [
    "update_node",
    "delete_node",
    "add_node",
    "reorder",
    "replace_color",
    "bring_to_front",
    "send_to_back",
  ],
  nodeTypes: [
    "layout",
    "screen",
    "header",
    "panoramaBackground",
    "screenshot",
    "text",
    "pill",
    "badge",
    "blob",
    "rating",
    "logo",
    "illustration",
    "magnifier",
    "emoji",
    "backgroundImage",
  ],
  target: {
    nodeType: "required for precise updates",
    nodeId: "optional specific node identifier",
    selector: {
      format: "string — one of the following patterns",
      examples: [
        "screen:0 — target screen by index",
        "screen_1 — target screen by index (alternate syntax)",
        "screenId:my-screen-id — target screen by its id field (use this for newly added screens)",
        "all_headers — target all headers",
        "all_texts — target all texts",
      ],
      warning: "Do NOT use '#' prefix or any other format. Invalid selectors silently match ALL screens.",
    },
    screens: "array of screen indexes or 'all' — preferred way to target screens by index",
  },
  platform:
    "Operation-level, screenshot path changes only: 'ios' | 'android' stores changes.path as that platform's override (iosPath/androidPath). Omitted: the new path is the image on both platforms and existing overrides are cleared, like the editor's Replace.",
  unset: "A null value in changes removes that field (dot-notation too): {backgroundGradient:null}, {model3D:null} returns to the 2D frame, {shadow:null}, {iosPath:null}.",
  layoutTarget: {
    usage: "{type:'update_node', target:{nodeType:'layout'}, changes:{...}} edits layout-level fields of each selected layout size.",
    fields: [
      "backgroundColor",
      "backgroundGradient (null removes)",
      "colorRefs",
      "orientation: 'portrait' | 'landscape' — swaps the canvas and turns the devices like the editor",
      "screenshotGap: false removes the gap between screens in overflowing artwork",
      "phoneFormatImagesOnly (format layouts only)",
      "layerGroups",
      "themeColors: partial role map {primary|secondary|accent|text|textSecondary|background|panel|onPanel|onAccent|tile|onTile: '#hex'} — recolors every element linked to (or still matching) that role and re-derives dependent roles, like the Theme panel",
      "themePaletteMode: 'v1' | 'v2' — applies the layout's generated palette options (themePaletteOptions)",
    ],
    fixed: "template, platform, canvasWidth/Height and screens cannot be set here.",
  },
  stacking:
    "zIndex is ONE stacking order per screen shared by every node type (screenshots, texts, pills, illustrations, ...). reorder (changes.order = node ids back-to-front) permutes the zIndex values the listed nodes already hold; bring_to_front / send_to_back move the matched node(s) above / below everything else on the screen.",
  positioning: [
    "Coordinates are canvas pixels per screen (0..canvasWidth, 0..canvasHeight of each screen); overflow:true lets a node extend into the neighbouring screens.",
    "text / pill / badge / illustration / logo / emoji position is the top-left of the element box; a text's position.x is the LEFT edge of its box of `width`, and align positions the lines inside that box.",
    "screenshot position is the CENTRE of the device; ScreenshotNode.scale multiplies the device's natural size (for model3D devices too); rotation and tiltAngle are degrees, model3D.rotationX/Y/Z radians.",
  ],
  assets: [
    "Rendered (signed) asset fields: screenshot.path (and iosPath/androidPath overrides), illustration.path, logo.path, screen.backgroundImage.storagePath, panoramaBackground.storagePath. Use project-relative paths from upload_asset, upload_screenshots, import_stock_photo or list_assets.",
    "A relative path given in illustration/logo imageUrl, backgroundImage.url or panoramaBackground.imageUrl is moved into the signed field on save.",
    "phoneId is the 2D phone frame and follows the project platform at render (iphone17 for iOS, googlepixel for Android); choose another device with model3D.",
  ],
  validation:
    "Rejected with a specific message, nothing saved: unknown font families (list_fonts), model3D.modelId/finish not in applaunchflow://devices, model3D without numeric rotationX/Y/Z, magnifier.screenshotId not a screenshot on the same screen, asset paths that are not files of this project.",
  notes: [
    "Phone sizes edited separately live in get_layout.format_layouts. Use formatId (ios-6.5, ios-6.3, ios-6.1, ios-duo-inner, ios-duo-outer, android-play-high) instead of layouts to transform one format. Main/mobile edits preserve independent formats.",
    "To reset one phone format, use formatId with resetFormat:true and no operations after a fresh get_layout. save_layout accepts the full formatLayouts map; omit it to preserve formats, or {} to reset all.",
    "layouts defaults to ['mobile'] (phone only). Only include tablet/desktop if the user explicitly asks.",
    "Use get_layout first whenever the edit changes composition or should closely match the current styling.",
    "add_node expects changes.node or changes to contain a full node payload with an id.",
    "The backend validates the resulting layout before saving. Incomplete nodes such as text without position or screenshot without placement will be rejected.",
    "When adding screens and then populating them, use two separate transform_layout calls: first add the empty screens, then target them by id using selector 'screenId:<id>' to add text and screenshot nodes.",
    "Ensure added or moved elements do not overlap other elements on the same screen. Text must not cover screenshots and vice versa.",
    "Check the rendered result with preview_screenshots.",
  ],
};

export const SUPPORTED_DEVICES = {
  note: "2D frames: phoneId/tabletId/desktopId/watchId on a ScreenshotNode. The 2D phone frame follows the project platform when rendered. model3D (a real 3D device) overrides the 2D frame on phone, tablet and desktop screens; watches have no 3D model. The complete registries, 3D models and finishes are in get_editing_reference (feature screenshots or mockups).",
  phone: [
    // id stays iphone17 for saved layouts; the frame shows the iPhone 18 Pro Max.
    { id: "iphone17", label: "iPhone 18 Pro Max", platform: "ios", aspectRatio: 1320 / 2868 },
    { id: "googlepixel", label: "Google Pixel", platform: "android", aspectRatio: 1080 / 2400 },
  ],
  tablet: [
    { id: "ipad", label: 'iPad Pro 12.9"', aspectRatio: 2048 / 2732 },
  ],
  desktop: [
    {
      id: "macbook-pro-16",
      label: 'MacBook Pro 16"',
      aspectRatio: 2880 / 1800,
    },
  ],
  watch: [
    { id: "apple-watch-41", label: "Apple Watch 41 mm" },
    { id: "apple-watch-42", label: "Apple Watch 42 mm" },
    { id: "apple-watch-46", label: "Apple Watch 46 mm" },
  ],
  models3D: [
    {
      modelId: "iphone-17-pro",
      label: "iPhone 18 Pro",
      kind: "phone",
      finishes: ["silver", "black", "glacier", "burgundy", "cosmic-orange", "deep-blue"],
      defaultFinish: "black",
    },
    {
      modelId: "google-pixel-10-pro",
      label: "Google Pixel 10 Pro",
      kind: "phone",
      finishes: ["pixel-obsidian", "pixel-porcelain", "pixel-moonstone"],
      defaultFinish: "pixel-obsidian",
    },
    {
      modelId: "iphone-duo",
      label: "iPhone Duo (foldable)",
      kind: "phone",
      finishes: ["duo-night-sky", "duo-star-white"],
      defaultFinish: "duo-night-sky",
      notes: "lidOpen 0 folded .. 1 unfolded",
    },
    { modelId: "ipad-pro", label: "iPad Pro", kind: "tablet", finishes: ["silver"], defaultFinish: "silver" },
    {
      modelId: "macbook-pro-14",
      label: "MacBook Pro 14",
      kind: "laptop",
      finishes: ["silver"],
      defaultFinish: "silver",
      notes: "lidOpen 0 closed .. 1 open",
    },
  ],
  model3DFields:
    "model3D {modelId, finish, rotationX, rotationY, rotationZ (radians, required), lidOpen?, devicesByPlatform?: {ios|android: {modelId, finish}}}. Device size is ScreenshotNode.scale.",
};

/**
 * What create_project actually supports. Replaces the old 7-step UI wizard
 * description: the MCP has no store-import step UI, logo step or category step.
 */
export const PROJECT_CREATION_RESOURCE = {
  title: "Create a project",
  steps: [
    {
      id: "create-or-edit",
      prompt:
        "If no project is in scope, first resolve whether the user wants a new app or an existing project (list_projects).",
    },
    {
      id: "create",
      tool: "create_project",
      prompt:
        "Published iOS app: pass appStore (numeric Apple id or apps.apple.com URL); name, category, description and icon are imported and the project is linked to the app. Otherwise pass appName (ask only if unknown) and platform (default ios); infer category and appDescription from context instead of asking.",
    },
    {
      id: "inputs",
      tool: "upload_screenshots",
      prompt:
        "Upload real app screenshots next. They are the input for screenshots, social graphics and promo videos. A custom logo can be uploaded with upload_asset fileType logo.",
    },
  ],
  defaults: { platform: "ios", defaultDeviceType: "phone" },
  notSupportedViaMcp: [
    "Linking a store app to an existing project (dashboard keyword page or project settings)",
    "Google Play import (create with appName and platform android)",
  ],
};

export const WORKFLOW_GUIDE_RESOURCE = {
  title: "Preferred MCP workflows",
  principle:
    "Prefer direct execution for concrete requests. Ask follow-up questions only when needed to avoid a materially wrong result. Call get_capabilities to see what is possible and what only the dashboard can do.",
  conventions: [
    "projectId and generationId are the same project id; tools that take generationId also accept projectId.",
    "Every edit tool needs a fresh read of the same target first (get_layout, get_graphics_format, get_promo_video, get_mockup_animation).",
    "Read get_editing_reference for the feature before writing JSON; a get_* response only shows fields currently set.",
    "Always repeat returned editor/gallery/picker URLs verbatim to the user.",
    "Plan-limit errors carry error.recovery (retryable false + upgradeUrl): do not retry; tell the user the options.",
  ],
  workflows: [
    {
      name: "Start: create or pick a project",
      preferredSteps: ["list_projects", "get_project", "create_project"],
      notes:
        "Branch first on new app vs existing project. Do not begin with template browsing. get_project shows variants per content type, the linked store app and absolute editor URLs.",
    },
    {
      name: "New screenshot design (picker)",
      preferredSteps: ["list_source_screenshots", "prepare_screenshot_styles"],
      notes:
        "Pick 3-7 real screenshots in story order. prepare_screenshot_styles shows the personalized V1/V2 picker in its result; stop and let the user choose there. The choice creates a new variant and opens the editor. Do not call apply_screenshot_style yourself; use it only when a template id was given directly by the user or an API client. browse_templates only reopens the gallery.",
    },
    {
      name: "Edit screenshots",
      preferredSteps: ["get_editing_reference", "get_layout", "transform_layout"],
      notes:
        "get_layout is mandatory before every transform_layout. Default layouts ['mobile']; scope with screens. Use formatId for one phone size. save_layout replaces the whole layout; prefer transform_layout. Re-read after composition edits and check for overlaps. In widget hosts the edit-result widget renders the change; view_review_snapshot returns its PNG when the widget provides a snapshotId.",
    },
    {
      name: "New social graphics (picker)",
      preferredSteps: [
        "list_source_screenshots",
        "prepare_social_graphics_styles",
      ],
      notes:
        "prepare_social_graphics_styles shows the picker in its result; stop and let the user choose. Choosing creates a variant with every format. Do not call apply_social_graphics_style yourself; it is only for a template id supplied directly by the user or an API client. browse_social_templates only reopens the gallery.",
    },
    {
      name: "Edit social graphics",
      preferredSteps: [
        "get_editing_reference",
        "get_graphics_format",
        "save_graphics_format",
      ],
      notes:
        "Edit one format per pass (default: the variant's primary format). Share the editor URL with &format=<format>.",
    },
    {
      name: "Promo video",
      preferredSteps: [
        "generate_promo_video",
        "get_promo_video_generation",
        "get_editing_reference",
        "get_promo_video",
        "update_promo_video",
      ],
      notes:
        "generate_promo_video shows three candidates in a picker; stop and let the user choose (no variant exists until then). Edit by reading the full config with get_promo_video, changing it in memory and sending the whole config to update_promo_video. clear_promo_video wipes a variant only on explicit request. There is no template gallery.",
    },
    {
      name: "Mockup animation",
      preferredSteps: [
        "list_mockup_media",
        "list_mockup_presets",
        "create_mockup_animation",
        "get_editing_reference",
        "get_mockup_animation",
        "update_mockup_animation",
      ],
      notes:
        "Upload a recording or screenshot first if needed (upload_asset fileType mockup-media; video uploads return durationSeconds). create_mockup_animation always makes a new variant. Edits are full-state replaces after a fresh get_mockup_animation.",
    },
    {
      name: "Localization",
      preferredSteps: ["list_translations", "translate_layouts", "translate_store_listing"],
      notes:
        "Translate screenshot text with translate_layouts, never by hand-editing text nodes. Store listing text translates with translate_store_listing. New languages count against the plan's translation limit.",
    },
    {
      name: "Export and render",
      preferredSteps: [
        "list_export_formats",
        "render_screenshots",
        "get_release_render",
      ],
      notes:
        "render_screenshots exports the saved screenshots for chosen store formats and languages (Unlimited plan; monthly API allowance, see get_plan_usage). Reuse the idempotencyKey on retries and poll get_release_render. Exports for other content types are listed in get_capabilities when available; otherwise export from the editor.",
    },
    {
      name: "Assets",
      preferredSteps: ["list_assets", "upload_asset", "upload_screenshots"],
      notes:
        "list_source_screenshots = generation inputs; list_screenshots = paths by device/platform; list_assets = every uploaded file. Uploading stores a file; apply it by editing a design with the returned path.",
    },
    {
      name: "Store listing text",
      preferredSteps: [
        "get_store_listing",
        "generate_store_listing",
        "update_store_listing",
      ],
      notes:
        "update_store_listing merges only the fields you pass and enforces store character limits. Publishing the text to the stores happens in the dashboard.",
    },
    {
      name: "Keywords",
      preferredSteps: [
        "get_project",
        "list_keywords",
        "suggest_keywords",
        "add_keywords",
        "get_keyword_history",
      ],
      notes:
        "Store and app resolve from the project's linked app. Competitors: suggest_keyword_competitors, add_keyword_competitors, remove_keyword_competitors. remove_keywords only on explicit request.",
    },
    {
      name: "Variants",
      preferredSteps: [
        "list_variants",
        "duplicate_variant",
        "set_active_variant",
      ],
      notes:
        "duplicate_variant copies a design to experiment safely. create_variant makes an EMPTY slot. delete_variant is permanent and needs the user's explicit request (confirm: true).",
    },
  ],
  avoid: [
    "Do not ask a generic 'what next' question after every successful operation.",
    "Do not offer templates as text bullet lists; the pickers show them.",
    "Do not regenerate styles or promo candidates just to reopen a picker; reuse the previous galleryUrl/pickerUrl.",
    "Do not invent fresh positions or styling for new screens when the user wants to keep the current design; copy values from neighbouring screens.",
    "Do not report success for composition edits without re-reading the result.",
    "Do not attempt store publishing, A/B tests, custom product pages, reviews, app icon, website or billing through other tools; send the dashboard link from get_capabilities.",
  ],
};
