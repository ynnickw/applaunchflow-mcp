import generatedContracts from './editor-contracts.generated.json' with { type: 'json' };

interface ContractDocument {
  group: string;
  path: string;
  sha256: string;
  declarations: Record<string, string>;
}
// Typed explicitly: the inferred JSON type is too large for declaration emit.
const contracts = generatedContracts as unknown as { formatVersion: number; documents: ContractDocument[] };

export const EDITOR_FEATURES = ['screenshots', 'socialGraphics', 'promoVideo'] as const;
export type EditorFeature = typeof EDITOR_FEATURES[number];
const groups: Record<EditorFeature, string[]> = {
  screenshots: ['layout', 'transforms', 'shared'],
  socialGraphics: ['layout', 'graphics', 'shared'],
  promoVideo: ['promoVideo', 'shared', 'layout'],
};
const roots: Record<EditorFeature, string[]> = {
  screenshots: ['Layout', 'Screen', 'layoutSchema', 'transformOperationSchema'],
  socialGraphics: ['Layout', 'Screen', 'SOCIAL_FORMATS', 'SocialFormatDefinition', 'SavedSocialGraphic'],
  promoVideo: ['VideoConfigSchema', 'BaseScenePropsSchema', 'SceneSchema', 'VideoThemeSchema'],
};

const workflow: Record<EditorFeature, string[]> = {
  screenshots: [
    'Read get_layout with generationId, variantId and language; inspect the requested mobileLayout/tabletLayout/desktopLayout in its response (get_layout has no device parameter). Language is required to obtain an edit receipt. Mutate the returned Layout, preserving all other screens and properties. Use transform_layout for supported operations and pass its readReceipt. save_layout accepts whole layouts for changes outside the transform vocabulary and requires BOTH mobileLayout and tabletLayout: preserve the untouched one from the fresh read and any desktopLayout. Do not regenerate the design for an edit.',
    'Positions and widths use authored canvas coordinates (canvasWidth/canvasHeight), NOT percentages, and are per screen: every screen has its own 0..canvasWidth x 0..canvasHeight space. A text position.x is the LEFT edge of its box (width wide; align positions lines inside it) and position.y its top. A screenshot position is the CENTRE of the device and ScreenshotNode.scale its size factor (also for model3D; model3D.scale is legacy). ScreenshotNode.rotation and tiltAngle use degrees; model3D.rotationX/Y/Z use radians. Layout opacity uses 0–100, unlike promo video opacity 0–1.',
    'zIndex is ONE stacking order per screen shared by all node types; use transform bring_to_front/send_to_back or reorder (which keeps the zIndex values the collection already holds). A null value in transform changes removes the field (model3D:null returns to the 2D frame).',
    'Screenshot images: path is the image for both platforms; iosPath/androidPath are per-platform overrides recorded only when the user replaced an image for one platform, and they win over path. Setting path through transform_layout clears both overrides unless platform is given. phoneId (2D frame) follows the project platform at render: iphone17 iOS, googlepixel Android; pick other devices with model3D (applaunchflow://devices). Signed asset fields: screenshot path, illustration/logo path, backgroundImage.storagePath, panoramaBackground.storagePath (relative imageUrl/url values are moved there on save).',
    'contentOrientation {version:1, initialTilt, fit} keeps screen content upright when a device is turned: the content counter-rotates by the quarter turns between tiltAngle and initialTilt, and with fit "auto" a stretch fit renders as contain across an odd quarter turn ("manual" keeps fitMode). Without it the content turns with the device (legacy layouts). When you turn a device by 90°, set contentOrientation {version:1, initialTilt:<previous tiltAngle>, fit:"auto"} together with the new tiltAngle, as the editor does; keep an existing one unchanged. Layout.phoneFormatImagesOnly (format_layouts only) means that phone size keeps its own screenshot choices but derives its design from the main layout; a format layout without it is a fully independent design. A custom phone-format layout whose template differs from the main layout is ignored and the format follows main again.',
    'Theme: transform nodeType layout with themeColors {role: hex} recolors linked elements and re-derives panel/tile roles like the editor; themePaletteMode v1/v2 switches generated palettes. Fonts must be exact families from list_fonts. Verify the result with preview_screenshots (rendered by the export renderer).',
    'All node families are editable: screenshots, texts, pills, badges, blobs, ratings, logos, illustrations, magnifiers, emojis and headers. Preserve IDs, layerName, hidden/locked flags, zIndex, groups, colorRefs and richContent. See the complete Layout and Screen declarations for exact arrays.',
    'Device overflow extends into adjacent screens; it is not content fitting. fitMode stretch distorts, cover crops, contain fits. contentRotation rotates screen content independently; contentTransform pans/zooms inside the frame. model3D supersedes 2D phone/tablet/desktop/watch frames. model3D.lidOpen animates nothing here: it sets the still laptop opening, 0 closed / 1 open.',
    'Change richContent marks/attrs for typography. Keep theme color references consistent or role-linked colors may replace literal colors. TextBoxContract and TextFitContract control template fitting; do not discard them to change copy. Panorama spans screens; per-screen backgrounds and ordinary gradients are different settings.',
  ],
  socialGraphics: [
    'Single-format edit: get_graphics_format for the explicit project, variant, language (omit = source language) and format, then save_graphics_format with the complete updated Layout for that same format, language and its readReceipt. Other formats are untouched. Use the primary format (socialPrimaryFormat) unless the user requests another. Include &format= in the editor link.',
    'Every social layout has EXACTLY ONE screen (screens[0]) and canvasWidth/canvasHeight equal to SOCIAL_FORMATS[format] (e.g. app_store_header 3840x1646, app_store_search 1920x1280); saves violating this are rejected with specific issues. Never hand-build a format: a format the variant never saved is returned by get_graphics_format with derived:true, built from the primary format the way the editor does, and becomes stored when you save it.',
    'Social graphics use the SAME Layout/Screen/node contracts as screenshots, including overflow, model3D/lidOpen, content rotation/crop, rich text, layer groups, shadows, color references and panorama. Coordinates are canvas units, not percentages. Do not resize one format by replacing canvasWidth/Height; derive it instead.',
    'Multi-format edits: transform_graphics applies transform_layout operations (applaunchflow://schema/transforms) to several formats atomically, per language. syncFrom is the editor\'s "Sync to all formats": it rebuilds the target formats (default all others) from one format with each template\'s per-format composition and replaces their layouts; confirm before overwriting customized formats.',
    'Variant settings: save_graphics and update_graphics_settings persist socialTemplateId and socialPrimaryFormat (default format, all languages). update_graphics_settings platform ios|android re-skins every format and language (device frames/3D models, a lone App Store/Google Play badge; layouts showing both badges keep both) and switches a single-platform project\'s platform.',
    'Languages: translate_graphics creates or replaces AI translations of every saved format per target language; list_graphics_translations lists sourceLanguage and availableLanguages. Pass language to read/edit/transform/render tools. Do not translate by editing text nodes by hand.',
    'Rendering: render_graphics mode preview returns rendered images to inspect (free); mode export returns native-size downloadable files and a ZIP (export allowance). SocialFormatDefinition.opaqueExport is "png" | "jpeg" (not boolean): "png" = PNG without alpha only (app_store_header is PNG-only, never JPEG); "jpeg" = opaque JPEG (play_store_feature, app_store_search). nativeExportOnly formats export at exactly their size; maxFileSizeKb ceilings are met by JPEG compression. These are export rules, not layout fields.',
  ],
  promoVideo: [
    'Use create_device_video to save a 3D device demo with up to ten project screenshots and recordings. list_video_recordings discovers clips and their playback duration. The new variant and migrated mockups use the same VideoConfig and preview/export tools as AI videos.',
    'Call get_promo_video (optionally with language) and edit its `config` (stored as promovideo project remotion_code), then call update_promo_video for the same project/variant/language with the whole config and readReceipt. A fresh read is required for each subsequent update. Keep version, theme, scenes, screenshotPaths, media paths, audio and all unrelated presentation properties. appName sets the hook/CTA fallback name; projectName RENAMES the project.',
    'update_promo_video validates against the renderer schema the editor loads with (VideoConfigSchema) and rejects with a 400 listing every failing field path; nothing is saved then. It fills only defaults the editor itself writes when they are absent (version 2, duration, scene choreography null, nullable content fields such as feature subtitle / hook logoUrl / closeup caption → null, frameVariant "flat", showLogo true, badge "appStore", illustration url "" when storagePath is set) and never invents copy, screenshot indexes or layouts. It also rejects every scene hidden, unknown transition types and unknown fonts. Check filledDefaults/derived in the response.',
    'Transition naming: transition.type is one of none, cross-fade, slide-left, slide-right, wipe-left, wipe-right, push-up, push-down, zoom (TRANSITION_OPTIONS in lib/transitions.ts); transition.duration is in FRAMES at 30 fps (default 15 = 0.5 s) and overlaps the next scene. Horizontal names describe how the content moves ("slide-left" pushes the next scene in from the right). get_promo_video returns configs already migrated with `transitionNaming: "content-motion"` and saves always stamp that marker, so names are never mirrored. Keep the marker.',
    'Scene types are hook, feature, text-only, closeup, multi-phone, and cta. The editor labels text-free feature scenes as device scenes; migrated mockups can include multiple timed devices. Every scene supports label, duration (1–15 s), hidden, animationSpeed, transition, choreography, kenBurns, illustrations, textOverlays and devices (added devices, max 12). Set video-wide background light with theme.ambient.',
    'theme: colors {primary, secondary, background, text, textSecondary}, optional backgroundGradient {type linear|radial, colors[≥2], direction 0–360}, ambient "none" | "subtle" | "rich" (soft colour light drifting behind every scene; null/absent = derived from legacy per-scene atmosphere), typography {fontFamily, titleSize, subtitleSize}. fontFamily must be one of PROMO_FONT_FAMILIES (lib/fontFamilies.ts: Poppins, Inter, Montserrat, Open Sans, Roboto, Lato, Playfair Display, Georgia, Merriweather, Lora, Times New Roman, Bebas Neue, Oswald, Space Grotesk, Nunito, Baloo 2, SF Pro Display), a Noto Sans JP/KR/SC/TC/Arabic family for CJK/Arabic copy, or one of the project\'s uploaded custom fonts; other names would silently fall back, so saves reject them.',
    'Feature scenes always render a real 3D device (the video-level deviceModelId chassis; content.devicePresentation is legacy and ignored). content.modelAnimation picks the motion: hero-launch, pivot-showcase, slow-rotate, drifting-tilt, float, glide-left, glide-right, tilt-in, the Duo fold and MacBook lid presets in PROMO_MOTION_IDS, or "custom". "custom" uses content.modelCustomMotion {label, description?, keyframes[≥2]}: keyframe time is normalized scene time 0–1, x/y are model-space scene units (≈ -3..3, 0 = centre), rotationX/Y/Z radians, scale ≈ 0.2–3 (1 = rest size), lidOpen 0–1 (laptops), easing linear|ease-in|ease-out|ease-in-out. modelFinish picks the chassis colour, modelLidOpen the laptop lid, disablePhoneOut keeps the device on screen at the end.',
    'Device carry: transition.carryDevice true on a feature scene hands its 3D device into the NEXT visible scene through the transition (one continuous turn instead of two entrances). It is only honoured when both scenes are visible 3D feature scenes with media, neither has illustrations, textOverlays or added devices, and the transition overlap is long enough; use a transition duration of at least 18 frames (0.6 s, the editor minimum). Otherwise it is ignored.',
    'text-only content: headline (required), subheadline, layout "centered" (default title card) or "statement" (headline as large as the frame allows), emphasis (a word or short phrase of the headline drawn in the accent colour), headlineStyle/subheadlineStyle.',
    'Positions/focus regions are percentages of the frame (0–100). Ordinary rotations are degrees; 3D presentation rotationX/Y/Z are radians. Screenshot indexes reference screenshotPaths in the returned config, not assumed upload order. Preserve positional arrays when adding/removing/reordering multi-phone slots: screenshotIndexes, videos, mediaRotations, deviceModels, devicePresentations, frameVariants, phonePositions, phoneScales and phoneRotations. Multi-phone supports 1–6 slots; keep layoutDeviceCount unchanged when appending a device.',
    'Videos work in feature, closeup, multi-phone and added devices. SceneVideo stores storagePath, source duration and trim metadata. mediaRotation/mediaRotations rotates screen content, not the chassis. Illustrations take storagePath (url is re-signed on load). Never invent signed URLs or media paths; reuse existing owned media or upload first. Added devices: deviceModelId gives a 3D device (presentation.finish/rotationX/Y/Z/lidOpen); without it presentation.frameDeviceId/frameVariant selects a 2D frame.',
    'Video-level controls: previewFormat (category:size, the default render/export format), deviceModelId (changing it re-derives phoneId on save), screenshotPaths, audio (uploaded track) and audioDesign {musicId (bundled track, ignored when audio is set), musicVolume, musicStartTimeSeconds, effectsEnabled, effectsVolume}. Changing musicId on save restarts the track at 0 s; scene timings are NOT re-cut to the new beat (only generated candidates are beat-synced). Scene timings are kept as saved; hidden scenes add no time.',
    'Verify and deliver: preview_promo_video renders a PNG of a saved frame (sceneIndex + at, or frame) server-side. export_promo_video renders MP4/WebM server-side (strictly under 30 s; appStore/ipad/social/creative sizes; Pro + API export allowance) and get_promo_video_export returns the download URL. translate_promo_video creates/re-translates language versions; edit one with language on get/update.',
  ],
};

export function getEditorReference(feature: EditorFeature, symbol?: string) {
  const documents = contracts.documents.filter(doc => groups[feature].includes(doc.group));
  const sections = documents.flatMap(doc => Object.entries(doc.declarations)
    .filter(([name]) => !symbol || name === symbol)
    .map(([name, definition]) => ({ name, source: doc.path, definition })));
  if (symbol && !sections.length) throw new Error(`Unknown ${feature} configuration symbol: ${symbol}. Read the index without a symbol first.`);
  return {
    feature,
    roots: roots[feature],
    instructions: [
      'This is a reference, not a model or an instruction to change user data. Output JSON values to edit tools, never TypeScript or Zod expressions.',
      'Read the actual target before editing; preserve unknown fields and scope to the requested variant/device/format/language. Ask a follow-up if the target or change is ambiguous. Do not delete, regenerate, publish or export without authorization.',
      'Use this index to retrieve every relevant symbol, including nested types and schemas. Types enumerate renderable fields; Zod declarations document API validation/defaults/bounds. Imported enums are included in the index. Optional means omittable; nullable means null accepted; passthrough preserves fields but does not make unknown fields functional.',
      'After saving, re-read and compare the target; use a rendered preview when available to check legibility, overlap and composition. A schema-valid object is not proof of visual quality. Report any unverified rendering honestly.',
      ...workflow[feature],
    ],
    ...(symbol ? { sections } : {
      symbols: documents.map(doc => ({ source: doc.path, sha256: doc.sha256, names: Object.keys(doc.declarations) })),
      next: 'Call get_editing_reference again with feature and a symbol from this index for its complete definition. Retrieve the root and every nested type relevant to the edit.',
    }),
  };
}

export function getFullEditorReference(feature: EditorFeature) {
  return { ...getEditorReference(feature), contracts: contracts.documents.filter(doc => groups[feature].includes(doc.group)) };
}
