# mockups tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## create_mockup_animation

Creates a new mockup-animation variant from a scene preset and a project screenshot or recording. A dedicated mockup upload is not required. Supports phone, dual-screen phone, tablet and laptop devices, with model-fitted motion and finishes. Existing variants are preserved. Returns the new variant and editor link.

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

Returns a saved mockup animation state, its resolved variant ID and a same-target editing read receipt. Omitting variantId reads the active variant. Read-only.

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

Replaces a complete saved mockup animation state. Hosted edits require a fresh same-target read receipt. The server sorts keyframes, derives legacy primary-device fields, validates model/finish and motion bounds, and reports ignored unknown fields. Whole-state replacement is the supported save contract.

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

Renders up to four frames of a saved mockup animation as PNG inspection images. times are timeline seconds within motionDuration, not normalized keyframe fractions. Does not modify the design.

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

Starts an MP4/WebM export of a saved mockup animation and returns exportJobId. Server exports require an opaque background, duration strictly under thirty seconds and available API export allowance. An accepted job uses one allowance. The same idempotencyKey identifies the same request across retries.

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

Returns mockup export progress and a short-lived download URL when complete. Supports a bounded waitSeconds. Failed exports are refunded. Read-only.

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

Drafts mockup keyframe data from a motion description. Returns configuration data without saving an animation or rendering video pixels.

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

Lists image and video assets in the project's mockups storage folder, with available duration, dimensions, frame rate and export-safety metadata. General project screenshots outside that folder are not included. Read-only.

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

Returns supported device models/finishes, fitted scene presets, motions, bundled music, output ratios, transitions, easing values, validation bounds, export limits and recording requirements. An optional project also supplies its screenshot theme colors. Read-only.

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
