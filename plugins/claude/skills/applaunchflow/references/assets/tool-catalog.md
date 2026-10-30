# assets tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## list_assets

Browse an existing project's uploaded screenshots (all devices/platforms), illustrations, app icons, backgrounds, panoramas, recordings, music and clips (audio/video/images), and font files in an embedded asset list. Listing is read-only. The user can explicitly upload files using the widget's Upload button; opening the list does not upload, select or apply anything. Inspect existing assets before asking the user to upload again. Signed preview links are private widget data; use returned relative paths in editing tools. At most 100 newest files per folder; truncated indicates more exist. For just the app screenshots used as generation input use list_source_screenshots; for screenshot paths by device/platform use list_screenshots.

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

## prepare_asset_upload

App-only: authorize one explicitly selected file upload to the user's project. Does not upload bytes, replace existing files, apply designs or change the project icon. The upload permission is private widget metadata; never include it in a chat message.

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
    "kind": {
      "type": "string",
      "enum": [
        "screenshots",
        "appIcon",
        "recordings",
        "illustrations",
        "backgrounds",
        "panoramas",
        "fonts",
        "promoMedia"
      ]
    },
    "filename": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sizeBytes": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 26214400
    },
    "contentType": {
      "type": "string",
      "minLength": 1
    },
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    }
  },
  "required": [
    "projectId",
    "kind",
    "filename",
    "sizeBytes",
    "contentType"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## upload_screenshots

Upload screenshot images for screenshot generation workflows. Hosted connectors must use HTTPS URLs or base64 data; local file paths are available only to the npm/stdio connector. If a batch is incomplete, follow its recovery guidance and do not re-upload completed files.

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
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "sources": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "format": "uri"
          },
          "base64": {
            "type": "string"
          },
          "filename": {
            "type": "string"
          }
        }
      }
    },
    "overwrite": {
      "description": "Explicit opt-in: replace same-name screenshot bytes in place, updating ALL designs bound to that path. Previous bytes are backed up. Reload open editors afterwards.",
      "type": "boolean"
    },
    "targetPath": {
      "description": "Exact existing relative path to overwrite when legacy filenames are ambiguous. Requires overwrite=true and exactly one source.",
      "type": "string"
    },
    "folderId": {
      "description": "Existing screenshot folder in this device/platform scope. Assign each uploaded file to it; never changes saved designs.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "deviceType",
    "platform",
    "sources"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## upload_asset

Upload a project asset: illustration, logo, panorama, background, font file, mockup media (image/video recording, or audio for the mockup soundtrack: state.audio.storagePath), or promo media (image/video/audio). Maximum 25 MB per file. Use an HTTPS URL or base64 data with a filename including its extension; local paths are also available to the npm/stdio connector. Upload stores a file only: it does not replace the project's app icon or apply a design. Returns the stored project-relative path. Put it in the field the renderer signs: illustration/logo node path (add_node {id, path, position, zIndex, ...}); a screen's backgroundImage.storagePath; panoramaBackground.storagePath; or a screenshot node's path (images from upload_screenshots). Font uploads are registered as a project font family by default (registerFont) so texts can use it immediately; list_fonts shows the family name. For illustrations: list_illustrations first to show existing options, then upload only if the user wants a custom image. For panoramas: use an HTTPS URL or base64-encoded image. Video/audio uploads also return durationSeconds when it can be read from the file (MP4/MOV/M4V/M4A, WAV, MP3); WebM/OGG return no duration.

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
    "fileType": {
      "type": "string",
      "enum": [
        "illustration",
        "logo",
        "panorama",
        "background",
        "font",
        "mockup-media",
        "promo-media"
      ],
      "description": "Use mockup-media for mockup screens/recordings and mockup soundtracks, promo-media for promo video/audio footage, font for TTF/OTF/WOFF/WOFF2, or an image category. Mockup recordings are checked on upload (H.264, ≤1080 px short side, keyframe every ≤2 s, ≤60 fps) and rejected with an ffmpeg command when unsuitable."
    },
    "source": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "format": "uri"
        },
        "base64": {
          "type": "string"
        },
        "filename": {
          "type": "string"
        }
      },
      "description": "The file source — provide an HTTPS URL or base64 data, or a local file path for npm/stdio, with an appropriate filename."
    },
    "registerFont": {
      "description": "Font uploads only (default true): add the file to the project's custom fonts (metadata.customFonts) like the editor's font upload. Family, weight and style come from the filename (e.g. Inter-BoldItalic.ttf).",
      "type": "boolean"
    },
    "fontFamily": {
      "description": "Font uploads only: family name to register instead of the one derived from the filename. Upload each weight file with the same fontFamily.",
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    }
  },
  "required": [
    "projectId",
    "fileType",
    "source"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_source_screenshots

List the project's real uploaded app screenshots (the captures used as input for AI generation) with project-relative path, signed preview URL, platform and phone/tablet/desktop device type, across all devices and platforms. No sample fallback is added. Use the returned paths to choose 3-7 inputs for prepare_screenshot_styles or prepare_social_graphics_styles. Compare: list_screenshots = paths only, filtered by one device type/platform (may return sample screenshots when none are uploaded, flagged isSample); list_assets = every uploaded file (screenshots, illustrations, logos, backgrounds, media, fonts) as a browsable list.

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

## list_screenshots

List uploaded screenshot paths (project-relative) for one device type (mobile/tablet/desktop) and platform (ios/android). Returns sample screenshots flagged isSample when the project has none. Use the paths with view_screenshot or in layout screenshot nodes. For generation inputs with preview URLs and device types use list_source_screenshots; for every uploaded file type use list_assets.

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
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_illustrations

List available illustrations. Use 'shared' source to browse the shared library (icons, stickers, etc.). Use 'project' source to list illustrations uploaded to a specific project. When the user wants to add an illustration, list available options FIRST so they can pick one or choose to upload.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": [
        "shared",
        "project"
      ],
      "description": "'shared' for the shared library, 'project' for project-uploaded illustrations."
    },
    "projectId": {
      "description": "Required when source is 'project'.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "category": {
      "description": "Filter shared library by category (e.g. 'Icons', 'Sticker', 'Illustrations').",
      "type": "string"
    },
    "search": {
      "description": "Search term to filter by name.",
      "type": "string"
    }
  },
  "required": [
    "source"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## view_screenshot

Fetch a screenshot image and return it for visual analysis. Use this to inspect screenshots — extract colors, read UI text, understand layout context, or identify visual elements. Pass projectId and the relative path from list_screenshots or get_layout (e.g. 'mobile/ios/1234-image.PNG').

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "The project UUID."
    },
    "path": {
      "type": "string",
      "description": "Relative screenshot path (e.g. 'mobile/ios/1234-IMG.PNG') from list_screenshots or the layout's screenshot.path field."
    }
  },
  "required": [
    "projectId",
    "path"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## replace_asset

Replace an asset with an already uploaded file in the same category/device/platform. Explicitly updates all saved-design references and preserves folder membership, then permanently deletes the old file from storage. No restore. Upload the new file first. On partial failure both files are retained until cleanup succeeds; inspect the result and retry the same paths.

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
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "replacementPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "projectId",
    "path",
    "replacementPath"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_assets

Permanently delete explicitly selected unused assets from storage. Files referenced by any saved design are blocked. There is no restore.

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
    "paths": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    }
  },
  "required": [
    "projectId",
    "paths"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_asset_folders

List device/platform-scoped screenshot folders, their explicit locales and memberships. Shared by the dashboard and MCP. Does not modify anything.

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
    "offset": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## create_asset_folder

Create a screenshot folder within the specified device and platform. Optionally bind it to an explicit locale. Supply a new UUID folderId and reuse it for retries. Storage paths do not change.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    },
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "locale": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "folderId",
    "name",
    "deviceType",
    "platform"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## rename_asset_folder

Rename an existing logical asset folder. Does not rename or modify files.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "projectId",
    "folderId",
    "name"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_asset_folder

Remove an explicitly selected folder. Its files become ungrouped; no files are deleted.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "folderId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## move_assets

Move screenshot assets into a folder with the same device and platform, or pass null to ungroup them. Never changes storage paths or saved designs.

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
    "paths": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "folderId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid",
          "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "paths",
    "folderId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## set_asset_folder_locale

Bind a screenshot folder to an explicit language code, or pass null to clear the binding. Folder names do not determine language.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "locale": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "folderId",
    "locale"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## search_stock_photos

Search free Pexels or Unsplash photos for backgrounds (screenshot/social panoramas, per-screen backgrounds, mockup animation backgrounds) — the same libraries as the editor's background picker. Returns preview URLs to judge results and an importInput per photo; pass a chosen photo's importInput to import_stock_photo. Nothing is stored until import.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "provider": {
      "default": "pexels",
      "type": "string",
      "enum": [
        "pexels",
        "unsplash"
      ]
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "orientation": {
      "description": "portrait suits a single phone screen; landscape a panorama across screens.",
      "type": "string",
      "enum": [
        "landscape",
        "portrait",
        "square"
      ]
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "perPage": {
      "type": "integer",
      "minimum": 1,
      "maximum": 30
    }
  },
  "required": [
    "query"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## import_stock_photo

Copy a Pexels/Unsplash photo into the project's storage and return its project path plus photographer attribution, exactly like choosing it in the editor's background picker. Pass importInput from search_stock_photos unchanged. Does not change any design by itself. Use the returned path and attribution: screenshots/social panorama → transform_layout {nodeType:'panoramaBackground', changes:{imageUrl:<path>, storagePath:<path>, attribution}}; one screen → {nodeType:'screen', screens:[i], changes:{backgroundImage:{url:<path>, storagePath:<path>, attribution}}}; mockup animation → state.backgroundMode:'image' and state.backgroundImage:{url:<returned url>, storagePath:<path>, attribution} via update_mockup_animation (the mockup editor displays url as-is; layouts re-sign from storagePath). Keep attribution: the editor credits the photographer from it.

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
    "provider": {
      "type": "string",
      "enum": [
        "pexels",
        "unsplash"
      ]
    },
    "importInput": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "The importInput object of one search_stock_photos result."
    }
  },
  "required": [
    "projectId",
    "provider",
    "importInput"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_fonts

List the font families a screenshot or social layout can use: the editor's built-in fonts, the Google Fonts catalog (~770 families, loaded on demand) and the project's uploaded custom fonts, with available weights. Use an exact family name in richContent attrs.defaultFontFamily or a textStyle mark's fontFamily; unknown names are rejected by transform_layout/save_layout. To add a custom font, upload a TTF/OTF/WOFF/WOFF2 with upload_asset fileType 'font' (it is registered as a project font family automatically).

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
    "query": {
      "description": "Case-insensitive substring filter, e.g. 'serif' or 'grotesk'.",
      "type": "string",
      "maxLength": 100
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
