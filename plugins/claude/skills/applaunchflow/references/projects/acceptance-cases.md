# Intent, action and completion checks

These are workflow examples, not claims of live validation. Resolve real IDs from the connected account; never use another user's project to test.

| Request | Correct path | Observable completion |
| --- | --- | --- |
| Show my existing apps | list_projects; select/get_project only as needed | Correct account's apps, icons/widget or exact returned links; no creation |
| Create an app from its App Store link | create_project using supported appStore input | Returned project ID, imported context and hub link |
| Make another version of this design | duplicate_variant for the selected content type | New ID retaining old work; no empty placeholder |
| Try a new screenshot/social style | list sources → prepare styles → stop for choice | Picker or exact link; a variant exists only after confirmation |
| Tweak an existing design | Read feature reference and saved target → scoped edit → rendered preview | Requested change persisted; no collateral edits; actual image inspected |
| Upload a screenshot | Upload to the selected device/platform | Per-file success/path; does not imply an existing frame was changed |
| Put this upload into screen 2 | Read screen 1's frame ID → bind its path → preview | Existing frame filled with the requested source |
| Use German captures | Explicit locale folder/sources → assignment preview → scoped apply | Correct language and multi-device mappings, with nulls retained |
| Export the edited design | Feature-specific export and status flow | Completed output and valid returned download, not just a job ID |
| Export times out | Recover using same idempotency key or known job | No duplicate charged jobs; honest terminal state |
| Quota/plan rejects an operation | Inspect get_plan_usage/recovery | Explain relevant account action; no unchanged retries |
| Delete old files | Resolve requested paths; inspect references and replacement status | Only the explicitly requested unused files removed; no implied restoration |
| Publish to App Store/Play | Return current scoped dashboard link | Explain publishing is separate; do not claim store publication |

## Host and presentation cases

- UI-capable hosts: use embedded pickers and returned result widgets, but don't assume the agent can see their pixels.
- Missing widget or failed follow-up message: provide the existing returned gallery/editor link, not another generation. Don't expose transport details in the normal reply.
- Missing preview tool: preserve the saved result and explain what remains unverified; do not substitute a paid export without a delivery request.
- Mobile: keep preview demands small and serialize rendering. Smaller previews must not lower saved media/export quality. Desktop browser success does not prove native WebKit playback or audio.
- Use available source media before asking for uploads. Never claim a project has no screenshots merely because this chat or a specialized media folder is empty.
- On a failed receipt/hash check, re-read/re-preview the exact target; do not omit guards or switch variants to get the write accepted.

## Ordinary replies

Prefer “Updated the second screen's headline and checked its preview. Open the design here: …” over a description of receipts, tool invocations, internal schemas or an indefinite promise to wait for a widget callback. If no image was inspected, say the edit was saved and the visual check remains unavailable.
