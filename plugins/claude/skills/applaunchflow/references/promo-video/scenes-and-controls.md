# Promo scene and configuration decisions

Use the live `get_editing_reference` index to retrieve full validators and catalogs. This guide explains which control serves which request; it doesn't replace the schema.

| User goal | Configuration and reference |
| --- | --- |
| Hook with branding | hook content (HookContentSchema): title/copy, app branding/logo controls; preserve the generated language. |
| Demonstrate one feature | feature content (FeatureContentSchema): screenshotIndex, supported media, text and model animation. Feature scenes render real 3D devices. |
| Make a statement | text-only content (TextOnlyContentSchema): headline/subheadline, centered or statement layout, emphasis and text styles. |
| Zoom into UI | closeup content (CloseupContentSchema): focus region and zoom; inspect the actual selected source/recording frame. |
| Compare several screens | multi-phone content (MultiPhoneContentSchema): layout and indexed media slots, up to six devices. Preserve slot alignment when changing media. |
| End with next step | cta content (CTAContentSchema): requested copy/branding and store badge; don't substitute an unsupported claim. |
| Add a device overlay | SceneDeviceSchema; up to twelve added devices outside the multi-phone arrangement. Optional deviceModelId uses a 3D model; otherwise configure a 2D frame. |
| Add illustration or extra text | IllustrationOverlaySchema / TextOverlaySchema; use owned storagePath, not an invented signed URL. |
| Adjust color/light/fonts | VideoThemeSchema: colors, backgroundGradient, ambient none/subtle/rich and typography. Legacy scene atmosphere no longer renders. |
| Change device/finish/lid | VideoConfigSchema.deviceModelId, feature modelFinish/modelLidOpen; added devices have their own presentation. Changing the theme device does not rewrite those models. |
| Animate a feature device | Current PROMO_MOTION_IDS or modelAnimation custom + modelCustomMotion with at least two keyframes. Fetch the actual catalog from the index. |
| Keep the same 3D device between scenes | transition.carryDevice for compatible consecutive visible feature scenes with media and no added overlays/devices; overlap at least 18 frames. Otherwise it may be ignored. |
| Use a screen recording | SceneVideoSchema with owned storagePath and trim/duration metadata; keep the video's reported duration. mediaRotation rotates content, not the chassis. |
| Music and effects | AudioTrackSchema / AudioDesignSchema: uploaded audio overrides bundled musicId. Keep musicVolume, effectsEnabled/effectsVolume and trim/start as intended. |
| Hide versus delete a scene | hidden:true preserves editing content while removing it from playback/export duration. At least one visible scene is required. |
| Name a scene | label is editor-only (up to 80 characters), not rendered headline copy. |

## Units and timing

- Scene duration is seconds (1–15); transition.duration is frames at 30fps and overlaps the next visible scene.
- transitionNaming must remain content-motion. Transition options: none, cross-fade, slide-left/right, wipe-left/right, push-up/down, zoom. Horizontal names describe how the content moves.
- Layout positions/focus are percentages (0–100), ordinary rotations degrees; 3D presentation/custom-motion rotations radians.
- Custom 3D keyframe time is normalized 0–1; x/y are scene units, not frame percentages, and scale is model-relative. Consult modelCustomMotion fields before constructing a path.
- Changing musicId resets the music start to 0, but doesn't recut scene timings. Generated candidates are beat-synced; direct edits retain authored timing.
- Hidden scenes contribute no duration. previewFormat selects the default output frame shape; it doesn't automatically re-author every scene for a new aspect ratio.
- Retain rich-text style marks and font size reference fields. Theme font names must be from PROMO_FONT_FAMILIES or supported script/custom families. Generic list_fonts availability doesn't prove a font is supported by promo's narrower catalog.
