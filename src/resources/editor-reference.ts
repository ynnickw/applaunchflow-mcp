import contracts from './editor-contracts.generated.json' with { type: 'json' };

export const EDITOR_FEATURES = ['screenshots', 'socialGraphics', 'promoVideo', 'mockups'] as const;
export type EditorFeature = typeof EDITOR_FEATURES[number];
const groups: Record<EditorFeature, string[]> = {
  screenshots: ['layout', 'transforms', 'shared'],
  socialGraphics: ['layout', 'graphics', 'shared'],
  promoVideo: ['promoVideo', 'shared', 'layout'],
  mockups: ['mockups', 'shared', 'layout'],
};
const roots: Record<EditorFeature, string[]> = {
  screenshots: ['Layout', 'Screen', 'layoutSchema', 'transformOperationSchema'],
  socialGraphics: ['Layout', 'Screen', 'SOCIAL_FORMATS', 'SavedSocialGraphic'],
  promoVideo: ['VideoConfigSchema', 'BaseScenePropsSchema', 'SceneSchema', 'VideoThemeSchema'],
  mockups: ['MockupProjectState', 'MockupDevice', 'stateSchema', 'mockupDeviceSchema'],
};

const workflow: Record<EditorFeature, string[]> = {
  screenshots: [
    'Read get_layout with generationId, variantId and language; inspect the requested mobileLayout/tabletLayout/desktopLayout in its response (get_layout has no device parameter). Language is required to obtain an edit receipt. Mutate the returned Layout, preserving all other screens and properties. Use transform_layout for supported operations and pass its readReceipt. save_layout accepts whole layouts for changes outside the transform vocabulary and requires BOTH mobileLayout and tabletLayout: preserve the untouched one from the fresh read and any desktopLayout. Do not regenerate the design for an edit.',
    'Positions and widths use authored canvas coordinates (canvasWidth/canvasHeight), NOT percentages. ScreenshotNode.rotation and tiltAngle use degrees; model3D.rotationX/Y/Z use radians. Layout opacity uses 0–100, unlike promo video opacity 0–1.',
    'All node families are editable: screenshots, texts, pills, badges, blobs, ratings, logos, illustrations, magnifiers, emojis and headers. Preserve IDs, layerName, hidden/locked flags, zIndex, groups, colorRefs and richContent. See the complete Layout and Screen declarations for exact arrays.',
    'Device overflow extends into adjacent screens; it is not content fitting. fitMode stretch distorts, cover crops, contain fits. contentRotation rotates screen content independently; contentTransform pans/zooms inside the frame. model3D supersedes 2D phone/tablet/desktop/watch frames. model3D.lidOpen animates nothing here: it sets the still laptop opening, 0 closed / 1 open.',
    'Change richContent marks/attrs for typography. Keep theme color references consistent or role-linked colors may replace literal colors. TextBoxContract and TextFitContract control template fitting; do not discard them to change copy. Panorama spans screens; per-screen backgrounds and ordinary gradients are different settings.',
  ],
  socialGraphics: [
    'Read get_graphics_format for the explicit project, variant and format, then save_graphics_format with the complete updated Layout for that same format and its readReceipt. Preserve the other formats. Use the primary format unless the user requests another. Include &format= in the editor link.',
    'Social graphics use the SAME Layout/Screen/node contracts as screenshots, including overflow, model3D/lidOpen, content rotation/crop, rich text, layer groups, shadows, color references and panorama. Coordinates are canvas units, not percentages. Inspect SOCIAL_FORMATS for exact format IDs and dimensions; do not resize one format by blindly replacing canvasWidth/Height.',
    'Store and ad formats can have native-size, opaque-output and file-size requirements. These are export constraints, not new layout fields. Existing formats and variant metadata must survive edits.',
  ],
  promoVideo: [
    'Call get_promo_video first, edit the complete videoConfig, then update_promo_video for the same project/variant with readReceipt. Keep version, theme, scenes, media paths, audio and all unrelated presentation properties. A fresh read is required for each subsequent update.',
    'The six scene types are hook, feature, text-only, closeup, multi-phone and cta. The renderer schema is the complete configuration contract; the API persistence schema is intentionally more permissive and passthrough does NOT imply arbitrary fields render.',
    'Each scene supports duration/animationSpeed/hidden, transition, choreography, kenBurns, atmosphere, device overlays, illustrations and text overlays. Background belongs to the global theme. Inspect BaseScenePropsSchema and the selected content schema. Use nullable fields as specified; do not invent scene types or animations.',
    'Positions/focus regions are percentages. Ordinary rotations are degrees, model presentation rotationX/Y/Z are radians. Screenshot indexes reference screenshotPaths in the returned config, not assumed upload order. Preserve positional arrays when adding/removing/reordering multi-phone slots: screenshotIndexes, videos, mediaRotations, deviceModels, devicePresentations, frameVariants, phonePositions, phoneScales and phoneRotations.',
    'Multi-phone supports 1–6 native slots. scene.devices supports up to 12 added devices. Keep layoutDeviceCount unchanged when appending a device so existing arrangement does not shift; use explicit positions for the new device. Do not apply an automatic arrangement unless requested.',
    'Videos work in feature, closeup, multi-phone and added devices. SceneVideo stores storagePath, source duration and trim metadata. mediaRotation/mediaRotations rotates screen content, not the chassis. Never invent signed URLs or media paths; reuse existing owned media or upload first.',
    'For native feature content, devicePresentation selects frame or model-3d. For added devices, deviceModelId enables 3D; otherwise presentation.frameDeviceId/frameVariant selects the 2D frame. Multi-phone uses deviceModels[i]. DevicePresentationSchema holds frameDeviceId, frameVariant, finish, rotationX/Y/Z and lidOpen; it has no mode/type property. Added devices use presentation.lidOpen, multi-phone uses devicePresentations[i].lidOpen, native feature uses modelLidOpen. TextStyle includes richContent and per-element animation; preserve promoFontSizeReferenceWidth in rich-text attrs.',
    'Theme, previewFormat, deviceModelId, screenshotPaths, uploaded audio and audioDesign are separate global controls. Scene timing is normalized by the renderer; hidden scenes are excluded from export runtime. A top-level duration is not a substitute for editing scene timings. Server export must be strictly under 30 seconds; on-device export has no total-duration cap, subject to browser resources. MCP does not control browser-only export settings.',
  ],
  mockups: [
    'Call get_mockup_animation then update_mockup_animation with the entire state and fresh readReceipt for the same project/variant. list_mockup_media discovers real project images/recordings; list_mockup_presets lists seed motions. New creation and editing an existing variant are different operations.',
    'state.devices is canonical when present: 1–6 devices with unique IDs, name, media, model, finish, motion, deviceScale, showDynamicIsland, primaryKeyframes, start/end, entrance/exit and transitionDuration. Mirror the first device into the legacy top-level selectedMediaPath/deviceModelId/motion/finish/deviceScale/showDynamicIsland/primaryKeyframes fields. Do not change devices[0] merely because another device is selected.',
    'Add or duplicate with fresh device/keyframe IDs and preserve all other positions and timing. No automatic arrangement. Names may be edited independently. Each device needs a project-relative selectedMediaPath. null end means composition end; each visibility window must fit motionDuration and last at least 0.1 seconds. start/end are timeline seconds, not normalized progress.',
    'Keyframe time is 0–1 within that device visibility window. x/y are model-space positions in -3..3, rotations radians in -2π..2π, scale 0.2..3. Use 2–8 keyframes, unique IDs and increasing times, preferably endpoints 0 and 1. motion custom uses your keyframes. Animate laptop lidOpen per keyframe (0 closed, 1 open), not the deprecated top-level lidOpen.',
    'entrance/exit can be none, fade, slide or scale. transitionDuration is 0.1–3 seconds and is clamped to the window by the renderer. Fade must composite the finished opaque device, not make individual meshes translucent. For a staged reveal, set different start/end windows and authored keyframes on each device.',
    'Shared controls are speed, motionDuration (1–60), outputRatio, background preset/mode/color/gradient/image, overlay presenter camera and audio. Background image includes pan/blur/attribution. Overlay coordinates and size are fractions 0–1, NOT the 3D keyframe coordinate system. Audio references exactly one of storagePath or bundledMusicId, with volume and startTimeSeconds.',
    'Actual playback/export seconds depend on motionDuration and speed. Composition authoring bounds still apply even though local video export has no total-duration cap. Server export requires strictly under 30 seconds; transparent WebM/PNG are browser-only. Do not promise an MCP server export can use local rendering.',
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
