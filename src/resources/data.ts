export const LAYOUT_SCHEMA_RESOURCE = {
  appliesTo:
    "Both App Store screenshots and social graphics use this exact Layout shape. " +
    "Screenshots: one layout per device size (mobile, tablet, desktop), with one screen per store screenshot. " +
    "Social graphics: one layout per format (og, twitter, instagram_post, instagram_story, linkedin, facebook), " +
    "each with exactly ONE screen and canvasWidth/canvasHeight set to that format's pixel dimensions. " +
    "Everything below applies identically to both; the tools differ (transform_layout / save_layout for screenshots, " +
    "save_graphics_format / save_graphics for social graphics), not the JSON.",

  layout: {
    description:
      "Root layout object. Screenshots: one per device size (mobile, tablet, desktop). Social graphics: one per format, holding a single screen.",
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
      screens: { type: "Screen[]", description: "Ordered array of screens. For screenshots, each screen is one App Store screenshot. For social graphics, this array always has exactly one screen (the graphic itself)." },
    },
  },

  screen: {
    description: "A single rendered frame and all visual elements on it — one App Store screenshot, or the whole social graphic.",
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

export const VIDEO_CONFIG_SCHEMA_RESOURCE = {
  description:
    "Remotion VideoConfig — the full promo video document returned by get_promo_video / generate_promo_video and " +
    "accepted by update_promo_video. update_promo_video is a whole-config replace: read the current config, mutate " +
    "the fields you need, send the entire object back. Unknown extra keys are stripped by validation, so never hand-build " +
    "a config from scratch when an existing one can be fetched.",

  videoConfig: {
    description: "Root object.",
    fields: {
      version: { type: "1 | 2 | null", description: "Config format version. Preserve whatever the fetched config has." },
      theme: { type: "VideoTheme", required: true, description: "Colors, optional background gradient, and typography. See theme below." },
      scenes: { type: "Scene[]", required: true, description: "Ordered scenes, at least one. Each scene is a discriminated union on `type`. See sceneTypes below." },
      duration: { type: "number | null", description: "Total video length in seconds. Normally the sum of scene durations; leave as-is unless changing pacing deliberately." },
      audio: { type: "AudioTrack? | null", description: "Single background music track spanning the whole video. See audio below." },
      phoneId: { type: "string? | null", description: 'Device frame model, e.g. "iphone17" or "googlepixel". Defaults to iphone17.' },
    },
  },

  theme: {
    description: "Global look. Individual scenes can override text colors per element via TextStyle.color.",
    fields: {
      "colors.primary": { type: "hex color", required: true },
      "colors.secondary": { type: "hex color", required: true },
      "colors.background": { type: "hex color", required: true },
      "colors.text": { type: "hex color", required: true },
      "colors.textSecondary": { type: "hex color", required: true },
      backgroundGradient: { type: "object? | null", description: 'type: "linear" | "radial", colors: string[] (min 2), direction?: number (0-360 degrees).' },
      "typography.fontFamily": { type: "string", required: true },
      "typography.titleSize": { type: "number", required: true, description: "Base title font size in px at 1080x1920." },
      "typography.subtitleSize": { type: "number", required: true },
    },
  },

  sceneCommon: {
    description: "Fields available on EVERY scene regardless of `type`. Sit at the scene root, next to `type` and `content`.",
    fields: {
      type: { type: '"hook" | "feature" | "text-only" | "closeup" | "multi-phone" | "cta"', required: true, description: "Discriminator. Determines the shape of `content`." },
      content: { type: "object", required: true, description: "Type-specific payload. See sceneTypes below — sending the wrong content shape for a type fails validation." },
      duration: { type: "number | null", description: "Scene length in seconds, 1-15." },
      choreography: { type: "string | null", description: "Choreography preset id. See choreographyPresets below." },
      kenBurns: { type: "KenBurnsConfig? | null", description: "Slow camera move on the scene. See kenBurns below." },
      atmosphere: { type: "object? | null", description: "particles, gradient, glare (each boolean|null) and intensity ('subtle'|'medium'|'dramatic'|null)." },
      transition: { type: "object? | null", description: "Transition INTO this scene: { type: choreography id, duration: frames|null }. Use a transition-category preset." },
      animationSpeed: { type: "number? | null", description: "Scene-wide animation speed multiplier, 0.5-2." },
      illustrations: { type: "IllustrationOverlay[]?", description: "Decorative images. Each: url, storagePath?, x/y (0-100, %), scale (0.1-4), opacity (0-1), rotation (-180..180)." },
      textOverlays: { type: "TextOverlay[]?", description: "Free-form rich text placed anywhere. Each: richContent (Tiptap doc JSON), text? (plain mirror), x/y (0-100), scale (0.1-4), rotation (-180..180), opacity (0-1), width (5-100, wrap width as % of frame), textAlign, fontSizeScale (0.2-4), textAnimation." },
      devices: { type: "SceneDevice[]?", description: "Extra device frames on any scene type, max 12. See sceneDevice below." },
      hiddenElements: { type: "string[]?", description: "Element ids to hide on this scene." },
    },
  },

  sceneTypes: {
    hook: {
      description: "Opening brand beat: logo + app name + tagline.",
      content: {
        appName: "string | null",
        appNameImageUrl: "string? | null — pre-rendered wordmark image, used instead of appName text when set.",
        tagline: "string | null",
        logoUrl: "string | null",
        showLogo: "boolean | null",
        appNameStyle: "TextStyle? | null",
        taglineStyle: "TextStyle? | null",
        logoPosition: "{ x, y } 0-100 | null",
        logoScale: "number 0.5-2 | null",
        logoPadding: "number 0-0.45 | null — padding inside the logo card; lower is tighter around the icon.",
        textAnimation: "TextAnimation | null",
      },
    },
    feature: {
      description: "One phone plus a title/subtitle — the workhorse scene.",
      content: {
        screenshotIndex: "number >= 0, required — index into the project's uploaded screenshots.",
        video: "SceneVideo? | null — plays inside the device frame instead of the still. See sceneVideo below.",
        frameVariant: '"flat" | "right" | "left" | null',
        title: "string, required",
        subtitle: "string | null",
        titleStyle: "TextStyle? | null",
        subtitleStyle: "TextStyle? | null",
        phonePosition: "{ x, y } 0-100 | null",
        phoneScale: "number 0.5-2.5 | null",
        textAnimation: "TextAnimation | null",
        disablePhoneOut: "boolean? | null — suppress the phone's zoom-through exit at the end of the scene.",
      },
    },
    "text-only": {
      description: "Full-frame statement card, no device.",
      content: {
        headline: "string, required",
        subheadline: "string | null",
        headlineStyle: "TextStyle? | null",
        subheadlineStyle: "TextStyle? | null",
        textAnimation: "TextAnimation | null",
      },
    },
    closeup: {
      description: "Zooms into a region of one screenshot to highlight a detail.",
      content: {
        screenshotIndex: "number >= 0, required",
        video: "SceneVideo? | null",
        focusRegion: "{ x, y (0-100), width, height (1-100) } | null — the region of the screenshot to magnify, in %.",
        focusPosition: "{ x, y } 0-100 | null — where the zoomed window sits on screen. Defaults to centered/lower-third.",
        caption: "string | null",
        captionStyle: "TextStyle? | null",
        frameVariant: '"flat" | "right" | "left" | null',
        phonePosition: "{ x, y } 0-100 | null",
        phoneScale: "number 0.5-2.5 | null",
        textAnimation: "TextAnimation | null",
      },
    },
    "multi-phone": {
      description: "2-6 phones arranged together. Per-phone arrays are positional — index i describes screenshotIndexes[i].",
      content: {
        screenshotIndexes: "number[], 1-6 entries, required",
        layout: '"cascade" | "fan" | "side-by-side" | "custom", required',
        title: "string | null",
        titleStyle: "TextStyle? | null",
        frameVariants: '("flat"|"left"|"right")[] max 6 | null',
        phonePositions: "({ x, y } | null)[] max 6 | null — manual overrides from dragging.",
        phoneScales: "number[] (0.4-2.5) max 6 | null",
        phoneRotations: "number[] (-45..45) max 6 | null",
        textAnimation: "TextAnimation | null",
      },
    },
    cta: {
      description: "Closing download call-to-action with store badges.",
      content: {
        appName: "string | null",
        appNameImageUrl: "string? | null",
        downloadText: "string | null",
        badge: '"appStore" | "googlePlay" | "both" | "none" | null',
        badgePosition: "{ x, y } 0-100 | null — centered in flow when unset.",
        badgeScale: "number 0.3-2 | null",
        logoUrl: "string? | null",
        showLogo: "boolean? | null",
        logoPosition: "{ x, y } 0-100 | null",
        logoScale: "number 0.5-2 | null",
        logoPadding: "number 0-0.45 | null",
        appNameStyle: "TextStyle? | null",
        downloadTextStyle: "TextStyle? | null",
        textAnimation: "TextAnimation | null",
      },
    },
  },

  textStyle: {
    description:
      "Per-text-element styling. Every field is optional; omit or null to inherit the theme. Applies to appNameStyle, taglineStyle, titleStyle, subtitleStyle, headlineStyle, subheadlineStyle, captionStyle, downloadTextStyle.",
    fields: {
      fontSizeScale: { type: "number 0.5-2", description: "Multiplier on the theme's title/subtitle size." },
      fontWeight: { type: '"light" | "regular" | "medium" | "bold" | "black"' },
      color: { type: "hex color" },
      textAlign: { type: '"left" | "center" | "right"' },
      position: { type: "{ x, y } 0-100", description: "Manual placement as a % of the frame." },
      animationSpeed: { type: "number 0.5-2" },
      richContent: { type: "Tiptap doc JSON?", description: "Rich version of this field's text. When it carries real formatting marks the renderer draws it statically with a fade; otherwise the plain string + animation path is used. The plain field stays canonical." },
      textAnimation: { type: 'TextAnimation | "none" | null', description: "Per-element override. null/absent inherits the scene's content.textAnimation; \"none\" forces no animation." },
    },
  },

  textAnimations: [
    "word-reveal",
    "fade",
    "character-cascade",
    "scale-emphasis",
    "typewriter",
    "word-highlight",
  ],

  sceneDevice: {
    description: "An extra device frame layered onto any scene (scene.devices[]). Independent of the scene type's own phone.",
    fields: {
      screenshotIndex: { type: "number >= 0", required: true },
      frameVariant: { type: '"flat" | "right" | "left"', description: "Default 'flat'." },
      position: { type: "{ x, y } 0-100", description: "Default { x: 50, y: 60 }." },
      scale: { type: "number 0.2-4", description: "Default 1." },
      rotation: { type: "number -180..180", description: "Default 0." },
      opacity: { type: "number 0-1", description: "Default 1." },
      animation: { type: '"none" | "fade" | "feature-pop" | "float-up" | "slide-left" | "slide-right" | "zoom-in" | "drift" | "pulse" | "cascade"', description: "Combined in/out preset. Default 'fade'." },
      animationDelay: { type: "number 0-3", description: "Seconds. Default 0." },
    },
    legacyFields:
      "outAnimation / outAnimationDelay exist only for configs saved before in/out were merged. Do not set them on new edits.",
  },

  sceneVideo: {
    description: "Optional clip that plays inside the device frame on feature/closeup scenes, replacing the still screenshot. Trimmed and looped to the scene duration.",
    fields: {
      storagePath: { type: "string? | null", description: 'Authoritative project-relative path, e.g. "promo-media/123-clip.webm".' },
      url: { type: "string? | null", description: "Ephemeral signed URL, re-signed on load/export. Do not fabricate." },
      durationSeconds: { type: "number? | null", description: "Source clip length, used to loop short clips." },
      trimStartSeconds: { type: "number? | null", description: "Start offset into the source clip." },
    },
  },

  audio: {
    description: "Single background music track for the whole video (videoConfig.audio).",
    fields: {
      storagePath: { type: "string", required: true, description: 'Project-relative path, e.g. "promo-media/123-track.mp3". Authoritative.' },
      url: { type: "string? | null", description: "Ephemeral signed URL, re-signed on load/export." },
      fileName: { type: "string? | null", description: "Original filename, shown in the editor." },
      volume: { type: "number 0-1", description: "Default 0.8." },
      fadeInSeconds: { type: "number 0-10", description: "Default 0." },
      fadeOutSeconds: { type: "number 0-10", description: "Default 0." },
    },
  },

  kenBurns: {
    description: "Slow camera drift over the scene. Set `preset` for a named move, or scaleStart/scaleEnd + pan* for a manual one.",
    fields: {
      enabled: { type: "boolean?" },
      preset: { type: '"slow-zoom-in" | "slow-zoom-out" | "pan-left" | "pan-right" | "zoom-in-pan-right" | "zoom-out-pan-left" | "subtle-drift" | null' },
      intensity: { type: '"subtle" | "moderate" | "dramatic" | null' },
      direction: { type: '"zoom-in" | "zoom-out" | "pan-left" | "pan-right" | null' },
      scaleStart: { type: "number | null" },
      scaleEnd: { type: "number | null" },
      panStartX: { type: "number | null" },
      panEndX: { type: "number | null" },
      panStartY: { type: "number | null" },
      panEndY: { type: "number | null" },
    },
  },

  choreographyPresets: {
    description: "Valid ids for scene.choreography and scene.transition.type. Use an entrance/multi-phone/kenBurns id for `choreography`; use a transition id for `transition.type`. Unknown ids fall back to the default motion.",
    entrance: ["hero-center", "slide-left", "slide-right", "drop-bounce", "zoom-through", "rotate-in", "float-up"],
    multiPhone: ["cascade-left", "cascade-right", "fan-out", "side-by-side"],
    kenBurns: ["slow-zoom-in", "slow-zoom-out", "pan-left", "pan-right"],
    transition: ["morph-scale", "cross-fade", "wipe-left", "push-up"],
  },

  notes: [
    "Coordinates (x, y, position, focusRegion) are percentages of the frame, 0-100, where 50 is centered — never pixels.",
    "screenshotIndex / screenshotIndexes point at the project's uploaded screenshots in upload order. Out-of-range indexes render blank.",
    "Do not invent storagePath or url values for video/audio/logo assets. Upload via upload_asset, or reuse the exact values from get_promo_video.",
    "Values outside the documented ranges are rejected by validation — the whole update fails, not just that field.",
    "Adding or removing scenes changes the total runtime. Update videoConfig.duration to match, or the export and the preview disagree.",
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
        "Use browse_templates for static discovery or to reopen a prepared catalog. It asks the MCP client to open the hosted visual gallery automatically. Keep the full template catalog available unless the user asks for a shortlist.",
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
      name: "Prepare and apply a personalized screenshot style",
      preferredSteps: [
        "list_source_screenshots",
        "prepare_screenshot_styles",
      ],
      notes:
        "Select 3-7 real screenshots in story order and prepare the personalized catalog once. Preparation opens the personalized v1/v2 gallery automatically; confirming there creates the cached selection as a new phone, tablet, and desktop variant without a second AI call.",
    },
    {
      name: "Prepare and apply personalized social graphics",
      preferredSteps: [
        "list_source_screenshots",
        "prepare_social_graphics_styles",
        "browse_social_templates",
        "apply_social_graphics_style",
      ],
      notes:
        "Prepare every social template across all supported formats once, let the user choose visually, and apply that cached selection as a new variant.",
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
    "Do not read template previews one by one when prepare_screenshot_styles or browse_templates can open the full gallery.",
    "Do not begin a screenshot session with template browsing before the user has chosen create new app or edit existing project.",
    "Do not use legacy generate_layouts or generate_graphics for the normal style chooser. Prepare a personalized catalog and let its gallery apply the selected cached screenshot style.",
    "Do not invent fresh x/y positions, widths, screenshot scale values, or headline styling for new screens when the user wants to preserve the current design language.",
    "Do not report success for new screens or composition edits without checking that the new nodes match the surrounding screens and do not overlap key content.",
  ],
};
