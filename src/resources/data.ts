export const LAYOUT_SCHEMA_RESOURCE = {
  layout: {
    description: "Root layout object. One per device size (mobile, tablet, desktop).",
    fields: {
      template: { type: "string", description: "Template id used to generate this layout." },
      platform: { type: '"ios" | "android" | "both"', description: "Target platform." },
      canvasWidth: { type: "number", description: "Canvas width in pixels for a single screen." },
      canvasHeight: { type: "number", description: "Canvas height in pixels for a single screen." },
      backgroundColor: { type: "hex color", description: "Default background color for all screens." },
      backgroundGradient: { type: "Gradient?", description: "Optional default gradient for all screens. Has type ('linear'|'radial'), colors[] and optional direction (degrees)." },
      panoramaBackground: { type: "PanoramaBackground?", description: "A single wide image that spans across all screens as a continuous backdrop. Has imageUrl, optional storagePath, verticalOffset (0-100, 50=center), fitMode ('cover'|'contain'), blur (0-20)." },
      themeColors: { type: "ThemeColors?", description: "Template color palette: primary, secondary, background, text, textSecondary. Used by the renderer for consistent styling." },
      headers: { type: "HeaderNode[]?", description: "Shared header bars across screens (rare). Each has id, position, width, height, backgroundColor, zIndex." },
      screens: { type: "Screen[]", description: "Ordered array of screens. Each screen is one App Store screenshot." },
    },
  },

  screen: {
    description: "A single screenshot frame. Contains all visual elements for one App Store screenshot.",
    fields: {
      id: { type: "string", required: true, description: "Unique screen identifier." },
      index: { type: "number", required: true, description: "Display order (0-based)." },
      screenType: { type: "number", required: true, description: "Determines render variation (0-4 typically). Preserved on reorder." },
      screenshots: { type: "ScreenshotNode[]", required: true, description: "Device mockups showing the app. Usually 1, sometimes 2+ for multi-phone compositions." },
      texts: { type: "TextNode[]", required: true, description: "Text elements (headlines, subtitles, body copy)." },
      pills: { type: "PillNode[]?", description: "Tag/button-style labels." },
      badges: { type: "BadgeNode[]?", description: "Circular seals or count badges." },
      blobs: { type: "BlobNode[]?", description: "Organic decorative shapes." },
      ratings: { type: "RatingNode[]?", description: "Star rating displays with optional label." },
      logo: { type: "LogoNode?", description: "App logo (image or text-based)." },
      illustrations: { type: "IllustrationNode[]?", description: "Decorative images/stickers." },
      magnifiers: { type: "MagnifierNode[]?", description: "Zoomed-in insets of a screenshot region." },
      emojis: { type: "EmojiNode[]?", description: "Decorative emoji characters." },
      backgroundColor: { type: "hex color?", description: "Per-screen background color override." },
      backgroundGradient: { type: "Gradient?", description: "Per-screen gradient override." },
      backgroundImage: { type: "object?", description: "Per-screen background image with url, optional blur (0-20), verticalOffset/horizontalOffset (0-100, 50=center)." },
    },
  },

  components: {
    ScreenshotNode: {
      description: "A device mockup displaying an app screenshot inside a phone/tablet/desktop frame.",
      visual: "The screenshot is rendered inside a realistic device bezel. The frame style is controlled by variant3D.",
      frameStyles: {
        description: "Available frame styles via the variant3D field. Each gives the phone a different 3D perspective.",
        options: {
          none: "No frame — raw screenshot without device bezel. Use for edge-to-edge or frameless designs.",
          flat: "Flat front-facing phone frame. Clean, straight-on view. This is the default.",
          left: "Phone angled to the left with subtle 3D perspective.",
          "left-2": "Phone angled more steeply to the left.",
          right: "Phone angled to the right with subtle 3D perspective.",
          "right-2": "Phone angled more steeply to the right.",
          handheld: "Phone held in a hand (dark/silhouette hand).",
          handheld2: "Phone held in a hand (medium skin tone, realistic).",
          handheld3: "Phone held in a hand (light skin tone, realistic).",
        },
      },
      overflow: {
        description: "When overflow is true, the device frame visually extends beyond the screen boundary into adjacent screens. " +
          "This creates a seamless multi-screen effect where a phone appears to span across two screenshots. " +
          "Commonly used with phones positioned at the edge of a screen so they partially appear on the neighboring screen.",
      },
      fields: {
        id: "string — unique node id",
        path: "string — relative storage path e.g. 'mobile/ios/1234-image.png'",
        position: "{ x, y } — pixel position on canvas",
        scale: "number — size multiplier (1.0 = natural size)",
        rotation: "number — degrees",
        zIndex: "number — stacking order",
        overflow: "boolean? — allow device to visually extend into adjacent screens (see overflow description above)",
        tiltAngle: "number? — tilts the entire device mockup (-30 to 30 degrees). Independent of variant3D.",
        phoneId: "string? — phone frame id: 'iphone17' or 'googlepixel'",
        tabletId: "string? — tablet frame id: 'ipad'",
        desktopId: "string? — desktop frame id: 'macbook-pro-16'",
        variant3D: "string? — frame style (see frameStyles above). Controls the 3D perspective of the device.",
        fitMode: "'stretch' | 'cover' — how the screenshot maps inside the device frame (default: stretch)",
        showCamera: "boolean? — show camera punch hole/notch (default true)",
        opacity: "number? — 0-100 (default 100)",
        shadow: "ShadowConfig? — drop shadow { color, blur, offsetX, offsetY }",
      },
    },

    TextNode: {
      description: "A text element — headline, subtitle, or body copy.",
      visual: "Rendered text with full rich-text support (bold, italic, colors, mixed fonts). Most templates use a large title + smaller subtitle per screen.",
      fields: {
        id: "string — unique node id",
        richContent: "TiptapJSON — rich text content (see richContent format below)",
        position: "{ x, y } — pixel position",
        zIndex: "number — stacking order",
        align: "'left' | 'center' | 'right'? — text alignment",
        type: "'title' | 'subtitle' | 'body' | 'brands'? — semantic role",
        lineHeight: "number? — line spacing multiplier (e.g. 1.2)",
        width: "number? — max width for text wrapping",
        overflow: "boolean? — allow overflow to adjacent screens",
        rotation: "number? — degrees",
        opacity: "number? — 0-100",
        shadow: "ShadowConfig? — drop shadow",
      },
    },

    PillNode: {
      description: "A rounded tag or button-style label.",
      visual: "Colored rounded rectangle with text inside. Looks like a tag, chip, or CTA button. Can have an arrow icon.",
      fields: {
        id: "string",
        richContent: "TiptapJSON — pill text content",
        position: "{ x, y }",
        zIndex: "number",
        backgroundColor: "hex color — pill background",
        textColor: "hex color — text inside the pill",
        width: "number — pill width",
        height: "number — pill height",
        cornerRadius: "number? — defaults to fully rounded",
        showArrow: "boolean? — show arrow icon on the right",
        fontSize: "number?",
        lineHeight: "number?",
      },
    },

    BadgeNode: {
      description: "A circular seal or count badge.",
      visual: "Round badge with text (e.g. '#1', '4.9★', 'NEW'). Often used for social proof.",
      fields: {
        id: "string",
        text: "string — main badge text",
        subtext: "string? — smaller secondary text",
        size: "number — badge diameter",
        position: "{ x, y }",
        zIndex: "number",
        backgroundColor: "hex color?",
        textColor: "hex color?",
      },
    },

    BlobNode: {
      description: "An organic decorative shape.",
      visual: "Soft, rounded organic blob shape. Used as a background accent or decorative element behind other nodes.",
      fields: {
        id: "string",
        width: "number",
        height: "number",
        color: "hex color",
        position: "{ x, y }",
        zIndex: "number",
      },
    },

    RatingNode: {
      description: "A star rating display.",
      visual: "Shows filled/partial stars (e.g. ★★★★★ 4.8). Can include a text label like '12K ratings'. Stars can appear below the label.",
      fields: {
        id: "string",
        rating: "number — star rating value (e.g. 4.8)",
        label: "string? — text label (e.g. '12,345 ratings')",
        labelColor: "hex color? — label text color",
        size: "number? — overall size scale",
        starsBelow: "boolean? — if true, stars appear below the label",
        position: "{ x, y }",
        zIndex: "number",
      },
    },

    LogoNode: {
      description: "The app logo.",
      visual: "Shows the app icon (from uploaded logo image) or text-based logo. Usually appears on the first or last screen.",
      fields: {
        id: "string",
        text: "string? — text-based logo fallback",
        path: "string? — stored logo image path",
        imageUrl: "string? — legacy URL field",
        fontSize: "number? — text logo font size",
        width: "number? — fixed width for logo box",
        cornerRadius: "number? — rounded corners for image logos",
        position: "{ x, y }",
        zIndex: "number",
      },
    },

    IllustrationNode: {
      description: "A decorative image or sticker.",
      visual: "An overlay image (PNG/SVG). Used for decorative elements like arrows, sparkles, stickers, or custom graphics.",
      fields: {
        id: "string",
        path: "string? — stored illustration path",
        imageUrl: "string? — legacy URL",
        scale: "number? — size multiplier",
        width: "number?",
        height: "number?",
        rotation: "number? — degrees",
        tiltAngle: "number? — 3D perspective tilt (-30 to 30)",
        primaryColor: "hex color? — SVG tint color",
        position: "{ x, y }",
        zIndex: "number",
      },
    },

    MagnifierNode: {
      description: "A zoomed-in inset of a screenshot region.",
      visual: "A rounded rectangle showing a magnified portion of a screenshot. Like a 'zoom bubble' highlighting a specific UI detail.",
      fields: {
        id: "string",
        screenshotId: "string — id of the screenshot node to magnify",
        sourceRegion: "{ x, y, width, height } — relative coordinates 0-1 defining the zoom area",
        scale: "number — zoom level (e.g. 2.0 = 200%)",
        cornerRadius: "number — rounded corner radius in px",
        borderWidth: "number — border thickness in px",
        borderColor: "hex color",
        shadowEnabled: "boolean? — drop shadow on the magnifier",
        position: "{ x, y }",
        zIndex: "number",
      },
    },

    EmojiNode: {
      description: "A decorative emoji character.",
      visual: "A single emoji rendered at a given size. Used as playful accents or decorative elements.",
      fields: {
        id: "string",
        emoji: "string — the emoji character(s) e.g. '🚀'",
        size: "number — font size in pixels",
        rotation: "number? — degrees",
        position: "{ x, y }",
        zIndex: "number",
      },
    },
  },

  richContentFormat: {
    description: "Text content uses TiptapJSON (ProseMirror-compatible rich text). This is the format for TextNode.richContent and PillNode.richContent.",
    structure: {
      type: '"doc"',
      attrs: "optional { defaultColor, defaultFontFamily, defaultFontSize, defaultFontWeight }",
      content: "TiptapParagraph[] — array of paragraphs",
    },
    paragraph: {
      type: '"paragraph"',
      content: "array of text runs and hard breaks",
    },
    textRun: {
      type: '"text"',
      text: "string — the actual text content",
      marks: "optional array of marks for styling",
    },
    marks: [
      { type: "bold", description: "Bold text" },
      { type: "italic", description: "Italic text" },
      { type: "underline", description: "Underlined text" },
      { type: "textStyle", attrs: "{ color?, fontFamily?, fontSize? }", description: "Inline style overrides" },
    ],
    example: {
      type: "doc",
      attrs: { defaultColor: "#ffffff", defaultFontFamily: "Inter", defaultFontSize: 64, defaultFontWeight: 800 },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Find Cheap", marks: [] },
            { type: "hardBreak" },
            { type: "text", text: "Flights", marks: [{ type: "textStyle", attrs: { color: "#00D4AA" } }] },
          ],
        },
      ],
    },
  },

  shadowConfig: {
    description: "Drop shadow applied to screenshots, text, or decorative nodes.",
    fields: {
      color: "hex color (e.g. '#000000')",
      blur: "number — blur radius 0-50",
      offsetX: "number — horizontal offset -50 to 50",
      offsetY: "number — vertical offset -50 to 50",
    },
  },

  gradient: {
    description: "Background gradient for layout or individual screens.",
    fields: {
      type: "'linear' | 'radial'",
      colors: "string[] — array of hex colors (min 2)",
      direction: "number? — angle in degrees (for linear gradients)",
    },
  },
};

export const TRANSFORM_SCHEMA_RESOURCE = {
  operations: [
    "update_node",
    "delete_node",
    "add_node",
    "reorder",
    "replace_color",
  ],
  nodeTypes: [
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
  notes: [
    "Default to layouts: ['mobile']. Only include tablet/desktop if the user explicitly asks.",
    "Use get_layout first whenever the edit changes composition or should closely match the current styling.",
    "add_node expects changes.node or changes to contain a full node payload with an id.",
    "The backend validates the resulting layout before saving. Incomplete nodes such as text without position or screenshot without placement will be rejected.",
    "When adding screens and then populating them, use two separate transform_layout calls: first add the empty screens, then target them by id using selector 'screenId:<id>' to add text and screenshot nodes.",
    "Ensure added or moved elements do not overlap other elements on the same screen. Text must not cover screenshots and vice versa.",
    "reorder expects changes.order or changes.nodeIds with node ids in the desired order.",
  ],
};

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "pt-BR",
  "ja",
  "ko",
  "zh-CN",
  "zh-TW",
  "nl",
  "ru",
  "ar",
  "tr",
  "pl",
  "sv",
  "no",
  "da",
  "fi",
  "cs",
  "hu",
  "ro",
  "uk",
];

export const SUPPORTED_DEVICES = {
  phone: [
    { id: "iphone17", label: "iPhone 17 Pro Max", aspectRatio: 1320 / 2868 },
    { id: "googlepixel", label: "Google Pixel", aspectRatio: 1080 / 2400 },
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
};

export const PROJECT_CREATION_WIZARD_RESOURCE = {
  title: "Create Project Wizard",
  matchesUi: "dashboard upload flow",
  steps: [
    {
      order: 0,
      id: "entry-branch",
      label: "Create Or Edit",
      required: true,
      prompt:
        "Before templates or screenshot generation, branch first: create a new app or edit an existing project.",
    },
    {
      order: 1,
      id: "platform",
      label: "Default Platform",
      required: true,
      prompt:
        "Ask whether the project should start on iOS or Android. Only offer both if the user explicitly asks for it.",
    },
    {
      order: 2,
      id: "store-import",
      label: "Import from App Store",
      required: false,
      prompt:
        "Offer optional App Store import by URL or numeric Apple app id before manual entry.",
    },
    {
      order: 3,
      id: "app-name",
      label: "App Name",
      required: true,
      prompt:
        "Confirm the final app name after import or manual entry. Do not create the project without this.",
    },
    {
      order: 4,
      id: "category",
      label: "App Category",
      required: false,
      prompt: "Offer the category field as optional.",
    },
    {
      order: 5,
      id: "logo",
      label: "Logo",
      required: false,
      prompt:
        "Offer an optional logo step. Store import can prefill the icon; manual flow can skip it.",
    },
    {
      order: 6,
      id: "app-context",
      label: "App Context",
      required: false,
      prompt:
        "Offer optional app context/description to improve downstream screenshot and ASO generation.",
    },
  ],
  defaults: {
    platform: "ios",
    defaultDeviceType: "phone",
  },
  createProjectRule:
    "Call create_project only after the user has chosen the create-new-app path, plus platform and app name are known.",
  nextStepAfterCreate: "Upload screenshots",
};

export const WORKFLOW_GUIDE_RESOURCE = {
  title: "Preferred MCP Workflows",
  principle:
    "Prefer direct execution for concrete requests. Ask follow-up questions only when needed to avoid a materially wrong result.",
  workflows: [
    {
      name: "Browse templates visually",
      preferredSteps: [
        "browse_templates",
      ],
      notes:
        "Use browse_templates when the user needs to pick a template from the hosted visual gallery. Keep the full template catalog available unless the user asks for a shortlist.",
    },
    {
      name: "Start screenshot work",
      preferredSteps: [
        "create_project",
        "list_projects",
        "get_project",
      ],
      notes:
        "If no project is in scope yet, start by branching to create a new app or edit an existing one. Do not begin with template browsing before a project path is chosen.",
    },
    {
      name: "New template on existing project",
      preferredSteps: [
        "create_variant",
        "generate_layouts",
      ],
      notes:
        "Use this when the user wants a fresh screenshot direction or a different template without overwriting the current variant.",
    },
    {
      name: "Edit current layout directly",
      preferredSteps: [
        "get_layout",
        "transform_layout",
      ],
      notes:
        "Use get_layout first for every direct layout edit. Treat the read as mandatory, then transform the layout, then return the editor URL so the user can review visually.",
    },
    {
      name: "Add new screens to current layout",
      preferredSteps: [
        "get_layout",
        "transform_layout",
      ],
      notes:
        "Prefer adding screens directly to the current layout when the user wants to keep the same design language. Inspect the existing screens first, then copy the nearest matching screen structure and numeric styling values so the new screens align with the established composition.",
    },
  ],
  avoid: [
    "Do not ask a generic 'what next' question after every successful operation.",
    "Do not force menu-based interaction when the user already gave a concrete natural-language edit request.",
    "Do not reduce the template catalog to a tiny recommendation list unless the user explicitly asks for that.",
    "Do not describe templates without showing preview resources when template previews are available.",
    "Do not read template previews one by one when browse_templates can show the full gallery in one step.",
    "Do not begin a screenshot session with template browsing before the user has chosen create new app or edit existing project.",
    "Do not invent fresh x/y positions, widths, screenshot scale values, or headline styling for new screens when the user wants to preserve the current design language.",
    "Do not report success for new screens or composition edits without checking that the new nodes match the surrounding screens and do not overlap key content.",
  ],
};
