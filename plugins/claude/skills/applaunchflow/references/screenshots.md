Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Build a coherent screenshot story

For a new set, resolve the project and inspect `list_source_screenshots`. Reuse the user's existing uploads; don't request another upload merely because this chat has none. Select images in story order: the main benefit first, then distinct supporting features. Preserve requested copy and avoid inventing app capabilities.

Call `prepare_screenshot_styles` with 3–7 selected project-relative paths and the supported creative inputs. Immediately call `browse_templates` with its returned generationId and catalogKey plus the requested deviceType to display the cached picker; do not ask an extra question between those steps. Then stop and let the user choose. Reopen with `browse_templates` and the same catalogKey, never another preparation just to view the choices. Don't turn browsing into a saved variant or ask the user to relay an ID. Picker confirmation creates the variant itself: resolve that result instead of applying it twice. Use `apply_screenshot_style` only when the user/API supplies an explicit catalog/template/palette choice. Device families require appropriate source uploads; a phone source is not a tablet capture.

# Edit an existing design

Read `get_editing_reference(feature: "screenshots")`; fetch only symbols needed for the edit. Read `get_layout` for the exact variant and **explicit language** to obtain its receipt. Its response includes mobile/tablet/desktop layouts; it does not take a device selector.

Prefer `transform_layout` for targeted text, position, image, theme or node changes. Pass the same target and opaque receipt from the fresh read. Read again before a subsequent edit. Use `save_layout` for changes outside the operation vocabulary; preserve the complete untouched mobile and tablet layouts it requires, plus desktop where present. Don't reconstruct a whole design for a small change.

User screen numbers are usually one-based; tool screen indexes are zero-based. Inspect the screen/node ID before targeting. A target without a node ID or screen filter can affect every matching element.

Read [layout decisions](screenshots/layout-decisions.md) for coordinates, styling, media, 3D, screen additions and per-size edits.

# Localize without losing authored work

- `translate_layouts` creates translations from the source design. Check `list_translations` first when existing translations may contain edits. Re-running replaces their design from the source, retains localized images and reuses unchanged translated text; it can remove manual per-language design adjustments.
- `sync_layout` copies design to non-source translations while keeping their text/images. It affects all non-source translations; use only when that matches the request.
- `apply_locale_screenshots` assigns locale images to frames. Use explicit paths or locale folders; folder names alone do not define locale. Request `preview:true` to inspect document-order assignments, particularly screens with two devices. If the host's input schema advertises frameAssignments, copy each preview's variantId, language and layoutHash into frameAssignments and its frameAssignments map into frames. Keep the same source/device/platform/language scope. Set a frame to null to keep its current image. Customize paths only from the selected locale's sources. On a stale-layout conflict, preview again; never drop the hash to force a write. Older hosts without this input cannot apply exact guarded bulk mappings: use fresh scoped `transform_layout` frame edits instead, or the dashboard.
- Render the changed languages/sizes. Check longer copy and script-specific fonts rather than assuming translation preserves fit.

# Inspect and deliver

Call `preview_screenshots` for the changed screens and the actual device/platform/display size. Start with those screens, normally at 1024px long edge; use up to 1600 for small typography. It returns image content from the renderer, without an export package. Inspect legibility, cropping, frame fill, background continuity and overlap. Report an unavailable preview honestly; don't claim inspection from layout JSON.

For requested store files, discover `list_export_formats`, call `render_screenshots` with explicit formats/languages and a stable idempotency key, then poll `get_release_render`. Use its succeeded manifest and exact download URL. Check API export eligibility with `get_plan_usage`; editor credits and API export access differ. A 403/402 is not a reason to regenerate.

After an uncertain export response, keep the same key. Failed/indeterminate jobs need diagnosis before a new export. Do not call the package export just to inspect an edit.

See [edit recipes](screenshots/edit-recipes.md) for common requests and [the complete tool catalog](screenshots/tool-catalog.md) for supported inputs.
