Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Pick content and motion

A mockup showcases media on animated devices; a promo video is a sequence of marketing scenes. Resolve that distinction from the brief.

Use `list_assets` to find existing screenshots across the project. `list_mockup_media` only lists the mockups folder; an empty response doesn't mean the project has no usable captures. Upload a recording only when needed. Select `list_mockup_presets` for actual motion presets, models, finishes, backgrounds and music; it can return project theme colors.

`create_mockup_animation` takes a selected screenshotPath, device kind (phone, duo, tablet, laptop) and motion choices. It fits preset motion to the model. Use an iPad capture for tablet and desktop capture for laptop; don't stretch a phone capture to simulate another platform. A recording can determine duration from its metadata.

`generate_mockup_motion` proposes keyframes from creative direction; it doesn't save them. Inspect the result before applying it to state. There is no dedicated mockup template-choice widget in the audited tool set; use catalogs/previews/editor links.

# Edit the composition

Read `get_editing_reference(feature: "mockups")`, then `get_mockup_animation`. Pass its returned variantId, complete mutated state and readReceipt to `update_mockup_animation`. Read again before another update.

- devices[] is canonical when present, with 1–6 devices. Preserve the others and their IDs. devices[0] mirrors legacy top-level fields; don't rewrite the primary device because another is selected.
- Each device has its own media/model/finish/motion, authored primaryKeyframes, start/end window, entrance/exit and transitionDuration.
- Keyframes: 2–8, normalized time 0–1, x/y scene units -3..3, rotations radians, scale 0.2..3; lidOpen 0–1. Timeline windows are seconds. Read MockupDevice/stateSchema for the current full fields.
- motionDuration (1–60s) sets the actual duration; speed (0.7–1.4) changes editor playback only. To make the exported motion slower, adjust duration/timing, not just speed.
- Changing model kind refits untouched presets when fitMotionToDevice is enabled; authored paths are retained and may need manual framing. Check ignoredFields and warnings.
- Background mode selects color, gradient or image. Use returned storage paths or supported attributed stock-photo input.
- Presenter overlay needs an uploaded video; MCP cannot record a camera. Its x/y/size are fractions 0–1, separate from 3D coordinates.
- Audio uses one owned storagePath or bundledMusicId plus volume/start. Preserve media trimming and audio selection on unrelated motion edits.

# Inspect and export

Use `preview_mockup_animation` at timeline seconds, at most four frames. To inspect a keyframe, use device.start + normalizedTime × (device.end − device.start), staying below motionDuration. Inspect crop, model finish, framing, background and multi-device overlap. Stills don't verify playback/audio continuity.

`export_mockup_animation` accepts the tool's advertised format/quality/fps choices. Supply a stable idempotency key even where optional. Poll **get_mockup_animation_export** (not get_mockup_export) until completed; use the returned download link. Don't change export quality to match a low-resolution preview. Explain plan/format failures and avoid duplicate export jobs.

Hosted server exports require less than 30 seconds and an opaque background. Transparent WebM, PNG stills and longer animations require the editor. Recordings must satisfy the upload tool's export-safe codec/dimension/keyframe checks; when rejected, explain the supplied conversion guidance instead of repeatedly uploading the same file.

See [motion and media recipes](mockups/edit-recipes.md) and [the complete tool catalog](mockups/tool-catalog.md) for implementation details.
