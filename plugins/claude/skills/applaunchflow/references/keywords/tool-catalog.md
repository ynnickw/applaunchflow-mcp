# keywords tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## list_keywords

Fetch the keywords tracked for a project in one store: rows with current rank, 7d/30d deltas, difficulty/traffic estimates, sparkline and competitor positions, plus a summary (tracked count, ranked count, average position, top-10 share), the plan's keyword limit, and trackedKeywords (every keyword × country row across all stores, with the row id used by remove_keywords and get_keyword_history). Use this as the first read for any keyword conversation.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## add_keywords

Track keywords for a project, in one or more storefronts. The store and app resolve on the server from the project's linked app (get_project: primaryStoreProvider, appleAppId / googlePlayPackageName); pass storeProvider only to track in the other store. If the project has no linked store app, keywords are still tracked and show search results, but the user's own rank stays empty until an app is linked in the dashboard keyword page (or the project was created with create_project appStore). Each keyword × country counts against the plan's keyword limit; a batch over the limit is rejected as a whole (error keyword_limit, nothing added). Rankings appear after the background scrape (usually within minutes).

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
    "keywords": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "description": "Keyword strings to track. Normalized server-side."
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    },
    "country": {
      "description": "Single storefront country. Defaults to \"us\". Ignored when countries is given.",
      "type": "string",
      "pattern": "^[A-Za-z]{2}$"
    },
    "lang": {
      "description": "Language for the single country. Defaults to \"en-US\".",
      "type": "string",
      "minLength": 2,
      "maxLength": 16
    },
    "countries": {
      "description": "Track every keyword in each of these storefronts (keywords × countries ≤ 250).",
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "country": {
            "type": "string",
            "pattern": "^[A-Za-z]{2}$",
            "description": "ISO country code, e.g. us, de."
          },
          "lang": {
            "type": "string",
            "minLength": 2,
            "maxLength": 16,
            "description": "BCP-47 storefront language, e.g. en-US, de-DE."
          }
        },
        "required": [
          "country",
          "lang"
        ],
        "additionalProperties": false
      }
    },
    "appId": {
      "description": "Rarely needed: the linked store app id. Must match the project's linked app; omit to use it.",
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "projectId",
    "keywords"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## remove_keywords

Stop tracking keywords and delete their rank history. Only call when the user asked to remove these keywords. Select by trackedKeywordIds (row ids from list_keywords trackedKeywords) and/or by keyword text; keyword text matches every store and country unless storeProvider/countries narrow it. All-or-nothing: unknown ids are reported and nothing is deleted.

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
    "keywords": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "trackedKeywordIds": {
      "maxItems": 500,
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid",
        "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
      }
    },
    "storeProvider": {
      "description": "Only remove keyword text in this store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    },
    "countries": {
      "description": "Only remove keyword text in these countries.",
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[A-Za-z]{2}$"
      }
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## suggest_keywords

AI keyword ideas for the project (from its name, category and description), excluding keywords already tracked in that store. Suggestions are not tracked until you call add_keywords with the ones the user wants.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_keyword_history

Fetch the rank time series for a single tracked keyword. Returns up to 30 days on Free and up to 365 days on Unlimited. Pass appId to compute the history for a competitor app instead of the user's own app; defaults to the tracked keyword's owner app.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "trackedKeywordId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "The tracked-keyword row id (from list_keywords). Not the keyword string."
    },
    "appId": {
      "description": "Optional store app id to compute history for. Defaults to the tracked keyword's app.",
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "trackedKeywordId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_keyword_competitors

List the competitor apps configured for keyword tracking in one store (appId, name, developer, icon) plus the plan's competitor limit. These are the apps shown next to the user's app in the keyword monitor's competitor columns.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## suggest_keyword_competitors

Suggest competitor apps for one store: apps that rank high for many of the project's tracked keywords, plus apps found by searching the app's own name, each with a reason. Empty when nothing is tracked yet. Add the chosen ones with add_keyword_competitors.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## add_keyword_competitors

Add competitor apps to the project's keyword tracking in one store, keeping existing ones. appIds are Apple numeric ids for app_store or package names for google_play (from suggest_keyword_competitors or the store). Rejected as a whole (competitor_limit) if the plan's competitor limit would be exceeded.

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
    "appIds": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 255
      }
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId",
    "appIds"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## remove_keyword_competitors

Remove competitor apps from the project's keyword tracking in one store. Only call when the user asked to remove them. Unknown appIds are reported and nothing changes.

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
    "appIds": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 255
      }
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId",
    "appIds"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
