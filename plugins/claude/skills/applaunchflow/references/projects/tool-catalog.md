# projects tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## get_editing_reference

Read before editing screenshots, social graphics, promo videos or mockups. Returns workflow, coordinate units and an exhaustive index of current configuration types, validators and catalogs. Pass a symbol from the index to retrieve its complete fields, enums, bounds and defaults. Works even in MCP clients without resource browsing; read-only, no project or network access.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "enum": [
        "screenshots",
        "socialGraphics",
        "promoVideo",
        "mockups"
      ]
    },
    "symbol": {
      "description": "Exact type/schema/catalog name from the index, e.g. ScreenshotNode, Model3DConfig, SceneDeviceSchema, stateSchema or MockupDevice.",
      "type": "string"
    }
  },
  "required": [
    "feature"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_projects

List existing AppLaunchFlow projects for the authenticated user and show a simple project list with icons. Use this before asking for screenshots or a new upload. When the user has named a project, continue with that matching project; only ask them to select if the choice is ambiguous. Clicking Use project sends the chosen project ID to the chat, without creating a variant.

Input schema:

```json
{
  "type": "object",
  "properties": {}
}
```

## get_project

Get a project's hub state: app name/platform/category, the linked store app (appleAppId, googlePlayPackageName, primaryStoreProvider; absent when no store app is linked), source screenshot counts, and per content type (screenshots, socialGraphics, promoVideo, mockups, asoCopy, appIcon, website) the variants, active variant and an absolute editUrl. hubUrl opens the project overview. projectId is the same id that design tools call generationId.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
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

## create_project

Create a new AppLaunchFlow project. Provide appName (platform defaults to iOS), or appStore to import a published App Store app: name, category, description and icon are filled from the listing and the project is linked to that app (keyword tracking, store links). Autofill category and description from context when possible; do not ask the user for these unless genuinely ambiguous. Returns the project id (used as projectId, and as generationId by design tools) and hubUrl.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "appName": {
      "description": "The app name. Required unless appStore is given (then it overrides the store name).",
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "appStore": {
      "description": "Import from the App Store: numeric Apple app id (e.g. 284882215) or an apps.apple.com URL.",
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "country": {
      "description": "Storefront for the App Store import (ISO country, default us).",
      "type": "string",
      "pattern": "^[A-Za-z]{2}$"
    },
    "platform": {
      "description": "Target platform. Defaults to iOS.",
      "type": "string",
      "enum": [
        "ios",
        "android",
        "both"
      ]
    },
    "category": {
      "description": "App category. Infer from the app name/context when possible (e.g. 'Travel' for a flight app).",
      "type": "string",
      "maxLength": 120
    },
    "appDescription": {
      "description": "Brief app description. Infer from context when possible.",
      "type": "string",
      "maxLength": 4000
    },
    "defaultDeviceType": {
      "description": "Defaults to phone. Only set if the user explicitly asks.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "logoPath": {
      "description": "Optional stored logo path from upload_screenshots when fileType=logo.",
      "type": "string"
    },
    "metadata": {
      "description": "Advanced escape hatch for extra metadata fields.",
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {}
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_project

Delete a project

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
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

## list_variants

List the variants of one content type in a project, newest first, with the active one. has_content=false marks an empty variant (created but never designed); ready marks variants the user flagged as ready. The active variant is what the hub shows and what render_screenshots exports by default.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "contentType": {
      "type": "string",
      "enum": [
        "screenshots",
        "socialGraphics",
        "promoVideo",
        "mockups",
        "website"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "contentType"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## create_variant

Create an EMPTY variant: a blank, named slot with no design. It does not generate or copy anything and counts against the plan's variant limit. For a new AI-generated design use prepare_screenshot_styles, prepare_social_graphics_styles, generate_promo_video or create_mockup_animation instead (each creates its own variant). To try changes without touching the current design, use duplicate_variant. An empty variant is only useful when you will fill it yourself (e.g. save_layout / save_graphics / update_promo_video / update_mockup_animation with its variantId). It is never made active: activate it with set_active_variant after it has content.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "contentType": {
      "type": "string",
      "enum": [
        "screenshots",
        "socialGraphics",
        "promoVideo",
        "mockups",
        "website"
      ]
    },
    "label": {
      "type": "string"
    },
    "setActive": {
      "description": "Not supported: an empty active variant would replace what the hub shows and what render_screenshots exports. Fill the variant, then call set_active_variant.",
      "type": "boolean"
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "contentType"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## duplicate_variant

Copy an existing variant with all of its content (layouts and translations, graphics formats, promo config or mockup state) into a new inactive variant labelled '<label> (Copy)'. Use it to try changes without touching the original. Counts against the plan's variant limit. Returns the copy and its editorUrl.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "variantId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## set_active_variant

Make an existing variant the active one for its content type. The active variant is what the project hub shows, what editors open by default and what render_screenshots exports when no variantId is given. Refuses empty variants (has_content=false in list_variants).

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project id (list_projects/get_project); design tools call it generationId."
    },
    "contentType": {
      "type": "string",
      "enum": [
        "screenshots",
        "socialGraphics",
        "promoVideo",
        "mockups",
        "website"
      ]
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "contentType",
    "variantId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_variant

Permanently delete one variant and all of its content (layouts, translations, graphics, promo config or mockup state). Cannot be undone. Only call when the user explicitly asked to delete this specific variant; never to free a plan slot on your own. If it was active, the newest remaining variant becomes active (returned as promotedVariant).

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project id (list_projects/get_project); design tools call it generationId."
    },
    "contentType": {
      "type": "string",
      "enum": [
        "screenshots",
        "socialGraphics",
        "promoVideo",
        "mockups",
        "website"
      ]
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "confirm": {
      "type": "boolean",
      "const": true,
      "description": "Must be true: confirms the user explicitly asked to delete this variant."
    }
  },
  "required": [
    "projectId",
    "contentType",
    "variantId",
    "confirm"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_capabilities

What this MCP can and cannot do. Lists, per area (projects, assets, screenshots, social graphics, promo videos, mockups, store listing text, keywords, plan), the tools available and the editor URL, and lists features that exist only in the AppLaunchFlow dashboard (store publishing, store connections, custom product pages, A/B tests, reviews, app icon, website, export history, collaborators, QR codes, API keys, billing) with a dashboard link for each. Read-only; pass projectId for project-specific links.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_plan_usage

The user's plan allowances relevant to MCP work: whether exports through the API/MCP are enabled (Unlimited plan), the monthly API export allowance (used, limit, remaining, resetsAt) and, with projectId, the keyword and competitor limits for that project's owner. Use it before large exports or keyword batches, or after a limit error. upgradeUrl is where the user changes plan.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
