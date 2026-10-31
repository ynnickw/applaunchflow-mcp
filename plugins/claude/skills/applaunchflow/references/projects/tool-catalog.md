# projects tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## get_editing_reference

Returns the built-in editing reference for screenshots, social graphics, promo videos or mockups. Includes a symbol index and complete field, enum, coordinate, validator and catalog definitions. Read-only and available without project access or external resource browsing.

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

Lists the authenticated user's existing AppLaunchFlow projects and returns an embedded project list with icons. Choosing a project supplies its ID to the chat without creating or changing a design.

Input schema:

```json
{
  "type": "object",
  "properties": {}
}
```

## get_project

Returns a project's app metadata, linked store-app identifiers, source screenshot counts, content-type variants, active variants and dashboard/editor links. projectId and generationId identify the same project. Read-only.

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

Creates a project from an app name or imports metadata and the icon from a published Apple App Store listing. Platform defaults to iOS. Returns the project ID and hub URL. Does not generate a design or publish to a store.

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

Deletes the specified project. This is a destructive project operation.

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

Lists variants for one project content type, newest first, including active, ready and has_content status. Read-only.

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

Creates an empty, named, inactive content-type variant. Does not generate or copy a design and counts against the plan's variant limit.

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

Copies a variant's saved content and translations into a new inactive variant with a copy label. Preserves the original and counts against the plan's variant limit. Returns the copy and editor link.

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

Sets the project's active variant for the specified content type. Does not delete or rewrite the other variants.

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

Permanently deletes the specified variant and all of its content and translations. Cannot be undone. Deleting the active variant promotes the newest remaining variant, which is returned as promotedVariant.

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

Returns supported MCP feature areas and tools, dashboard/editor links and features available only in the dashboard. An optional project ID supplies project-specific links. Read-only.

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

Returns the account's API-export access, monthly export usage/limit/reset information and, with a project ID, its keyword and competitor limits. Includes a plan-management URL. Does not change the plan or purchase credits.

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
