Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Understand the video request

Resolve project, promo variant, source language and intended output: store preview, social video, tablet/desktop or App Store creative. Decide whether the user wants new concepts or edits to saved work. Reuse source captures and recordings; edits don't need a new generation.

For new concepts, inspect `list_source_screenshots` and call `generate_promo_video` with creative direction, deviceType and selectedScreenshotPaths in story order. It prepares/reuses exactly three transient candidates and displays the picker or its URL. Stop for the user's choice; widget confirmation persists the selected option, so don't apply twice. `apply_promo_video_candidate` is for an explicit candidate choice supplied directly in chat or by an API. Don't generate again merely to reopen the candidates or replace saved work. Pass replaceVariantId only for an explicitly requested replacement.

For an existing video, use `get_editing_reference(feature: "promoVideo")` and `get_promo_video` for the exact variant/language. Inspect its config and availableLanguages. Fetch the necessary scene/schema/catalog symbols from the index.

# Make a focused edit

`update_promo_video` replaces the **whole config**. Mutate the fresh config, retaining IDs, screenshots, scenes, theme, media, typography, sound, hidden scenes and unrequested settings. Pass the readReceipt for the same project/variant/language. Every next update needs a new read. appName changes fallback branding; projectName renames the entire project.

Read [scene and configuration decisions](promo-video/scenes-and-controls.md) for the editor's creative options and unit differences. Prefer one coherent change batch to many full-config rewrites. On validation failure, use the returned field paths; don't rebuild the config or retry an unchanged request. Inspect filledDefaults/derived to understand server normalization.

Keep the story clear: a hook states the benefit, feature scenes demonstrate it, a closeup draws attention to a specific interaction, and a CTA supplies the requested next step. Match density and pacing to the user's brief. Don't invent metrics, testimonials, awards or app capabilities. Keep saved copy in the chosen language, including hooks and CTAs.

# Check the result

After saving, call `preview_promo_video` for a changed visible scene at its settled middle (sceneIndex with at:0.5). It returns a real PNG image to inspect. Use scale:1 if small type needs scrutiny; preview scale doesn't change export quality. Request another time/frame when checking entrances, closeup focus or transitions. Scene indexes refer to the config, including hidden entries; hidden scenes themselves don't render.

Check the scene's readable copy, correct screenshot, logo, badge, crop, device pose and overlays. A few stills don't establish continuous animation, audio sync or every frame; use the editor playback for those checks. Tell the user what was changed and observed in plain language, without discussing receipts or waiting for an internal tool.

A conflict can mean a render is already running: avoid firing several renders or regenerating the video. Re-read current state/status and honor returned retry guidance.

# Translate and export

Use `translate_promo_video` for new target languages. Each is independently editable through the same read/update/preview flow. Re-translating an existing language overwrites its localized copy edits; use a targeted edit for a correction.

Check `get_plan_usage` when export access is relevant. `export_promo_video` uses server rendering with API export entitlement and a stable idempotency key. The saved visible duration must be strictly under 30s. Don't shorten an authored video just to satisfy that limit without matching the user's intent; the dashboard offers on-device export for longer work.

Exports support category appStore, ipad, social or creative with the sizes advertised by the tool. Creative header/search video uses MP4/1080p only. Default quality is 1080p; don't reduce it because previews are small. Poll `get_promo_video_export` until completed and deliver the exact download URL. Preserve the key after an uncertain response. A failed job is not a reason to create another paid export automatically.

See [edit recipes and review checkpoints](promo-video/edit-recipes.md), plus [the complete tool catalog](promo-video/tool-catalog.md), for specific requests and supported inputs.
