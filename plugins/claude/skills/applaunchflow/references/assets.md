Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Find before uploading

Use `list_assets` and `list_source_screenshots` to find reusable sources; `list_screenshots`/`view_screenshot` inspect uploaded screenshots, not the rendered marketing layout. `list_illustrations` lists illustration assets. Keep returned relative paths for edits; never invent storage paths or treat signed display URLs as durable references.

An ordinary upload stores a new asset. It doesn't put it into a screenshot, graphic, promo scene or mockup. After upload, bind it through that feature's edit workflow using the returned path and the correct target frame/scene. Explicit screenshot recapture/overwrite is a separate workflow below.

# Choose an upload path

Use `upload_screenshots` for ordered app captures and `upload_asset` for other supported file types. Fetch their current input schemas for accepted fileType, scope, mime/filename metadata and transfer mechanisms.

A hosted service can't read a local path on the user's machine. Use a supported HTTPS source, provided file bytes when the tool supports them, or the asset widget's upload action. A local stdio client can use local paths. `prepare_asset_upload` prepares a signed grant for a client able to transfer bytes; use precisely its returned upload fields and completion flow. Don't claim an upload completed because a grant was created.

The audited hosted fetch limit is 25MB. For recordings retain the returned duration/trim metadata. Use font upload to register supported font files, then `list_fonts` to resolve the exact family name.

For backgrounds, `search_stock_photos` supports Pexels/Unsplash and returns importInput for each result. Choose relevant imagery, call `import_stock_photo` with that input, then apply the owned path in the design. Preserve photographer attribution.

# Organize and localize

Use `list_asset_folders`, `create_asset_folder`, `rename_asset_folder`, `move_assets`, `set_asset_folder_locale` and `delete_asset_folder`. Device/platform scope and locale are explicit metadata; a folder named German does not by itself set de. Deleting a folder ungroups files; it is different from deleting the assets.

upload_screenshots can assign folderId during the batch. Resolve the folder's actual device/platform before uploading; don't place phone iOS captures into a tablet/Android folder or infer scope from its title. Inspect folderAssigned on each successful file; if only organization failed, move those paths instead of uploading again.

Moves/uploads don't replace media in saved designs. For localized screenshot assignment, use the screenshot skill's locale workflow; fonts, logos, illustrations and backgrounds bind through their own node fields.

# Replacement and cleanup

Resolve the exact target and existing design references before `replace_asset` or `delete_assets`. `replace_asset` takes an already uploaded replacement in the same category/device/platform, updates all saved-design references, preserves folder membership, then permanently deletes the old file. There is no restore. On partial failure both files are retained until cleanup succeeds; inspect the result and retry the same paths. Use a scoped design edit instead if the user wants to change just one reference. `delete_assets` permanently removes explicitly selected unused files and blocks saved references. Verify requested replacements before removing explicitly requested orphans.

For explicit recapture of screenshots already bound to stable paths, upload_screenshots supports overwrite:true; targetPath disambiguates exactly one existing path with exactly one source. This changes bytes used by ALL designs referencing that path; it is not a new unbound upload or a one-frame swap. Previous bytes are backed up, but do not promise a restoration tool. Reload open editors after success. Keep defaults append-only unless the user explicitly wants this broad replacement, and inspect pendingOverwrite before retrying uncertain writes.

For partial uploads, use per-file results and recovery fields (sourceIndex/fileIndex/pendingUpload/pendingOverwrite/folderAssigned where supplied). Don't replay the whole batch after uncertain success. On a conflict, inspect existing assets/references; on rate limits honor retry guidance; on quota/plan errors stop repeating and explain the account action required. Don't expose signed grants or credentials in ordinary replies.

See [the complete asset tool catalog](assets/tool-catalog.md) for file categories, scope fields and transfer inputs. The related [screenshot recipes](screenshots/edit-recipes.md) explain binding uploaded captures to existing frames.
