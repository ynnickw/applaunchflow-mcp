# promo-video tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## generate_promo_video

Starts or reuses background preparation of three transient promo-video scene/config candidates and returns the embedded picker or its URL. The picker updates when preparation finishes. Only an explicitly selected candidate becomes a saved variant. Optional replaceVariantId enables replacement after the new selection saves; selectedScreenshotPaths restricts candidate inputs.

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
    "message": {
      "description": "Optional creative direction applied to all three candidates.",
      "type": "string"
    },
    "replaceVariantId": {
      "description": "Existing promo-video variant to replace after the user chooses a candidate. Only pass with explicit user approval.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "selectedScreenshotPaths": {
      "description": "Optional project-relative screenshot paths (1–10) from list_source_screenshots, in story order. They must match deviceType (phone → mobile/…, tablet → tablet/…, desktop → desktop/…).",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "deviceType": {
      "description": "Device the video shows: phone (default; iPhone or Pixel by platform), tablet (iPad Pro, iPad App Store formats) or desktop (MacBook, 16:9). Uses that device's uploaded screenshots.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
      ]
    },
    "selectedScreenshotIndices": {
      "description": "Legacy screenshot positions. Prefer selectedScreenshotPaths.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## apply_promo_video_candidate

Saves the specified prepared promo-video candidate as a variant and returns its editor link. When replaceVariantId is supplied, the prior variant is retired only after the new variant saves successfully.

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
    "candidateKey": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "candidateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "replaceVariantId": {
      "description": "Existing promo-video variant to delete after saving the selected candidate. Only pass when the user explicitly approved replacing that variant.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "candidateKey",
    "candidateId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_promo_video

Returns a saved promo-video configuration, source/available languages and a same-target editing read receipt. Transition names are normalized to content-motion semantics. Reading a translation does not change it.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead. Project / generation UUID.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
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

## update_promo_video

Replaces a complete saved promo-video configuration for one variant/language. Hosted edits require a fresh same-target read receipt. Renderer-schema errors reject the entire update; missing editor defaults and derived values are reported. Device-model changes update the frame; music changes reset track start without re-cutting scenes. appName changes fallback copy; projectName renames the project.

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
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "config": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Full Remotion VideoConfig: the `config` from get_promo_video, mutated. theme (colors + typography) and scenes (≥1 visible; discriminated on `type`: hook | feature | text-only | closeup | multi-phone | cta, each with its `content` shape). Any scene may set `hidden: true` (kept and editable, excluded from playback/export/duration). Coordinates are percentages of the frame (0-100), never pixels. Keep `transitionNaming: \"content-motion\"`."
    },
    "appName": {
      "description": "App name shown by hook/CTA scenes that leave appName null.",
      "type": "string"
    },
    "projectName": {
      "description": "Renames the whole project (all content types). Omit unless asked.",
      "type": "string"
    },
    "readReceipt": {
      "description": "Hosted connector only: pass the readReceipt returned by the immediately preceding get_promo_video call.",
      "type": "string"
    }
  },
  "required": [
    "projectId",
    "config"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## clear_promo_video

Clears the specified promo-video variant's saved configuration. This removes its current video content rather than creating a new variant.

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
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## translate_promo_video

Translates saved promo-video scene text into requested languages. Re-translating an existing language replaces its edited translation. Returns per-language results and available languages; subject to translation allowances.

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
      "description": "Promo-video variant; defaults to the active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "targetLanguages": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 16
      },
      "description": "Language codes, e.g. ['de', 'ja']. Use el for Greek, he for Hebrew, fil for Filipino."
    }
  },
  "required": [
    "projectId",
    "targetLanguages"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## preview_promo_video

Renders one frame of a saved promo video as PNG for inspection. Selection supports a visible scene index plus relative position, or an absolute 30-fps frame. Defaults to the video's preview format. Unsaved changes are not included. Does not consume export allowance or modify the design.

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
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "sceneIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 99
    },
    "at": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "frame": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "format": {
      "description": "category:size — appStore:{default,6.9,6.7,6.5,6.3}, ipad:{12.9,11}, social:{9:16,1:1,16:9}, creative:{header,search}.",
      "type": "string"
    },
    "scale": {
      "description": "Output size relative to the full format (default 0.5).",
      "type": "number",
      "minimum": 0.1,
      "maximum": 1
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## export_promo_video

Starts an MP4/WebM export of a saved promo-video variant and language. Supports configured App Store, iPad, social and creative placements within renderer limits. Server duration must be under thirty seconds. An accepted job uses one API export allowance and returns exportId. The same idempotencyKey identifies the same request across retries.

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
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "category": {
      "type": "string",
      "enum": [
        "appStore",
        "ipad",
        "social",
        "creative"
      ]
    },
    "size": {
      "type": "string"
    },
    "format": {
      "type": "string",
      "enum": [
        "mp4",
        "webm"
      ]
    },
    "quality": {
      "type": "string",
      "enum": [
        "720p",
        "1080p"
      ]
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128,
      "description": "Unique per intended export; reuse on retries."
    }
  },
  "required": [
    "projectId",
    "idempotencyKey"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_promo_video_export

Returns the status and progress of a promo-video export. Completed jobs include a short-lived download URL; another status read can refresh the URL. Failed exports are refunded. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "exportId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "exportId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
