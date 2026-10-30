# mockups tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## create_mockup_animation

Create a new mockup-animation variant seeded from a scene preset and a specific screenshot/recording path. Always omit variantId — this tool always creates a new variant. Never overwrites an existing mockup variant. Use list_assets to find existing project screenshots, or list_mockup_media to find dedicated mockup uploads and recordings. Both return valid project-relative screenshotPath values; an empty mockup-media list does not mean the project has no screenshots. Reuse the requested existing screenshot without re-uploading it. Pick device (phone, duo, tablet, laptop): the preset's keyframes are fitted to that model (less travel/zoom for iPad and MacBook, lid choreography for the MacBook, unfolded portrait for the iPhone Duo). phone resolves to iPhone or Pixel from platform, defaulting to the project's platform. Call list_mockup_presets for presets, models and finishes. The editor opens automatically after creation.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project / generation UUID."
    },
    "screenshotPath": {
      "type": "string",
      "minLength": 1,
      "description": "Project-relative path for the device screen content, e.g. \"mockups/1715191234567-clip.mp4\" from list_mockup_media or \"mobile/ios/1715191234567-home.png\" from list_assets. Use an existing asset from the same project."
    },
    "presetId": {
      "type": "string",
      "enum": [
        "hero-launch",
        "pivot-showcase",
        "slow-rotate",
        "drifting-tilt"
      ],
      "description": "Scene preset id: 'hero-launch' (cinematic swing), 'pivot-showcase' (spin reveal), 'slow-rotate' (drop & zoom), or 'drifting-tilt' (punch zoom)."
    },
    "device": {
      "default": "phone",
      "description": "Device kind: phone (iPhone 18 Pro / Pixel 10 Pro by platform), duo (iPhone Duo, unfolded), tablet (iPad Pro), laptop (MacBook Pro 14\"). Match the screen content's aspect: iPad screenshots on tablet, Mac/desktop captures on laptop.",
      "type": "string",
      "enum": [
        "phone",
        "duo",
        "tablet",
        "laptop"
      ]
    },
    "platform": {
      "description": "Only for device phone: ios = iPhone, android = Pixel. Defaults to the project's platform.",
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "outputRatio": {
      "description": "Optional output aspect ratio. Defaults to 4:3 (classic).",
      "type": "string",
      "enum": [
        "1:1",
        "4:3",
        "16:9",
        "9:16"
      ]
    },
    "motionDurationSeconds": {
      "description": "Optional animation length in seconds. For a video screenshotPath it defaults to the recording's length (read on the server) so the loop plays the recording once; otherwise the preset's length.",
      "type": "number",
      "minimum": 1,
      "maximum": 60
    },
    "label": {
      "description": "Optional variant label shown in the studio's variant dropdown.",
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    }
  },
  "required": [
    "projectId",
    "screenshotPath",
    "presetId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_mockup_animation

Fetch the current mockup animation state (MockupProjectState shape) for a project. Omit variantId to read the active mockup variant; the response's variantId is the one to provide to update_mockup_animation, preview_mockup_animation and export_mockup_animation. Required before update_mockup_animation so edits operate on fresh state. Read get_editing_reference(feature: mockups) for all supported configuration fields.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Mockup variant; omitted = the project's active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## update_mockup_animation

Persist a mockup animation state (the same MockupProjectState shape returned by get_mockup_animation). This is a full-state replace — fetch the current state with get_mockup_animation, mutate the parts you want to change, then call this tool with the updated object and the variantId it returned. There is no granular per-keyframe transform; whole-state replace is the supported edit path. ENFORCED: each call requires a fresh get_mockup_animation for the same projectId/variantId immediately beforehand. The server sorts keyframes by time, mirrors devices[0] into the legacy top-level fields, rejects a finish the device model doesn't offer (list_mockup_presets deviceModels[].finishes), and reports ignoredFields for unknown keys. Validation bounds: primaryKeyframes count 2–8, time 0–1, x/y -3..3, rotations -2π..2π (radians), scale 0.2..3, speed 0.7..1.4, motionDuration 1..60, deviceScale 0.7..1.3. Check the result with preview_mockup_animation.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "The variantId returned by get_mockup_animation."
    },
    "state": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Complete MockupProjectState from get_mockup_animation. devices[] is canonical when present (1–6 independent devices); preserve all devices (the server mirrors devices[0] into the legacy fields). Read get_editing_reference(feature: mockups) for the full contract, including names, timing, transitions, keyframe lidOpen, audio and presenter overlay."
    },
    "fitMotionToDevice": {
      "default": true,
      "description": "When a device's model changes kind (phone, duo, tablet, laptop) and its keyframes are still an unmodified scene preset, re-fit them to the new model like create_mockup_animation does (smaller travel/zoom on iPad/MacBook, laptop lid choreography). Authored keyframes are never changed; the result warns instead. false only reports.",
      "type": "boolean"
    },
    "readReceipt": {
      "description": "Hosted connector only: provide the readReceipt returned by the immediately preceding get_mockup_animation call.",
      "type": "string"
    }
  },
  "required": [
    "projectId",
    "variantId",
    "state"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## preview_mockup_animation

Render frames of a saved mockup animation on the server (the same renderer as the video export) and return them as PNG images, so you can check device poses, framing, cropping and background. times are timeline seconds (0 ≤ t < motionDuration; the clock used by device start/end, NOT keyframe time 0–1). To see a keyframe of a device, use device.start + keyframe.time × (device end − start). Defaults to the middle of the animation. Each frame is one server render (a few seconds); request at most 4.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Mockup variant; omitted = the project's active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "times": {
      "description": "Timeline seconds to render, e.g. [0, 2.5, 5].",
      "minItems": 1,
      "maxItems": 4,
      "type": "array",
      "items": {
        "type": "number",
        "minimum": 0,
        "maximum": 60
      }
    },
    "scale": {
      "default": 0.5,
      "description": "Size relative to the export resolution (4:3 exports are 1440×1080; 0.5 → 720×540).",
      "type": "number",
      "minimum": 0.25,
      "maximum": 1
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## export_mockup_animation

Start a server video export (MP4 or WebM) of a saved mockup animation, like the editor's Export > On our servers. The server reads video lengths itself. Limits: the animation must be strictly under 30 seconds; the background cannot be transparent (transparent WebM and PNG stills are editor-only); it uses one API export from the account's allowance (Unlimited subscription required). Returns exportJobId; poll get_mockup_animation_export until it is completed and share the download URL. Reuse the same idempotencyKey when retrying an uncertain request.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Mockup variant; omitted = the project's active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "format": {
      "default": "mp4",
      "type": "string",
      "enum": [
        "mp4",
        "webm"
      ]
    },
    "quality": {
      "default": "1080p",
      "description": "1080p = the output ratio's full size (e.g. 1440×1080 for 4:3); 720p renders at two-thirds.",
      "type": "string",
      "enum": [
        "1080p",
        "720p"
      ]
    },
    "fps": {
      "default": 30,
      "anyOf": [
        {
          "type": "number",
          "const": 30
        },
        {
          "type": "number",
          "const": 60
        }
      ]
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_mockup_animation_export

Check a mockup video export started with export_mockup_animation. When completed, returns a short-lived downloadUrl for the video file; share that exact URL. Optionally wait up to waitSeconds for it to finish. Failed exports are refunded; do not restart one automatically.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "exportJobId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "waitSeconds": {
      "default": 0,
      "description": "Poll for up to this many seconds before returning.",
      "type": "integer",
      "minimum": 0,
      "maximum": 50
    }
  },
  "required": [
    "exportJobId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## generate_mockup_motion

Turn a short motion direction (e.g. 'front flip, then zoom into the top half') into custom keyframes with AI, like the editor's Custom motion prompt. Returns {label, description, duration, keyframes}; it does NOT save anything. To apply: get_mockup_animation, then on the target device set motion 'custom', primaryKeyframes = keyframes (give them ids unique within the device), and for a single-device animation motionDuration = duration; then update_mockup_animation.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "prompt": {
      "type": "string",
      "minLength": 3,
      "maxLength": 600
    },
    "deviceKind": {
      "default": "phone",
      "description": "Kind of the device the motion is for (list_mockup_presets deviceModels[].presetDevice). Laptops get lidOpen per keyframe; tablets and laptops get smaller movements.",
      "type": "string",
      "enum": [
        "phone",
        "duo",
        "tablet",
        "laptop"
      ]
    }
  },
  "required": [
    "projectId",
    "prompt"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_mockup_media

List the screenshots and screen recordings uploaded under the project's mockups/ storage folder. For existing project screenshots outside mockups/, use list_assets instead. An empty result here does not prevent creating a mockup from an existing screenshot. Returns media items with { path, signedUrl, kind: 'image' | 'video' }; videos also carry durationSeconds, width, height, fps and exportSafe (+ issues) unless includeMetadata is false.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "includeMetadata": {
      "default": true,
      "description": "Read each video's length, size and cloud-render suitability (slower for many videos).",
      "type": "boolean"
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_mockup_presets

Return the valid mockup configuration values, generated from the editor's own constants: device choices and models (with each model's finishes, default finish, lid/fold and camera-hole support), all finishes, scene presets with keyframes fitted per device kind (phone, duo, tablet, laptop), motions, bundled music tracks, output ratios with export sizes, transitions, easings, validation bounds, server-export limits and the screen-recording profile. Use before constructing an update_mockup_animation payload. If projectId is supplied, also returns the active screenshots variant's themeColors so you can pick on-brand swatches for backgroundColor / gradient.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "description": "Optional generation UUID to also fetch theme colors.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
