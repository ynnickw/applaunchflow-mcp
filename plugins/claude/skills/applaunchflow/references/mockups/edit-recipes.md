# Mockup motion and media recipes

Read the editing reference and fresh saved state. Apply changes to that complete state, preserving all unrelated devices, background, overlays, audio, model finishes and IDs.

## Slow exported motion

Editor speed is not exported timing. Increase motionDuration and adjust device start/end windows coherently, preserving normalized keyframe time 0–1. For a delayed entrance or early exit change the device's window, not every device. Sample preview times in seconds based on that window. Do not extend beyond the hosted export limit if an export is part of the task; explain the editor-only option or ask for the intended duration.

## Add or change a device

Use list_mockup_presets for supported model, finish, presets and fit behavior. devices[] is canonical: preserve existing devices and add a unique valid device with the desired source and motion. Device 0 mirrors legacy top-level fields, so changing only those mirrors may not edit a secondary device. Keep authored paths when switching models unless a refit is intended; inspect cropping/laptop lid and content aspect ratio.

For static phone/duo/tablet/laptop media, match the capture's actual aspect/device. For a recording preserve its duration/trim and upload-safe encoding. list_mockup_media's empty folder is not evidence that list_assets has no screenshots.

## Author a camera path

Use generate_mockup_motion for a proposal when creative motion is requested, not as a mandatory precondition to a simple edit. It saves nothing. Review 2–8 keyframes, normalized time ordering, model-relative scale and radians before applying through update_mockup_animation. Do not pass degree rotations or pixel coordinates into these fields. Sample start, middle and end poses and use playback for continuity.

## Presenter and background

Reuse an uploaded presenter recording; the MCP cannot capture a webcam. overlay placement is fractional 0–1, independent of device scene units. Preserve the presenter path/trim on unrelated edits. Set a supported color/gradient/image background; importing stock media must preserve attribution and use an owned path. An opaque background is required for hosted server export; don't silently change transparent artwork when only a motion edit was requested.

## Audio and export

Use one supported owned audio path or bundled track, not both as a guessed mix. Preserve start/volume and device media. Still previews confirm framing, not sound or codec playback. The export tool's advertised quality/fps/format options control delivery; the preview's dimensions must not alter them. Reuse an idempotency key and poll get_mockup_animation_export until completed. Longer work, transparency and still delivery may require the editor rather than the hosted exporter.
