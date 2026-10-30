# Promo editing and visual checks

Always read the current target/language and the relevant schema symbols before changing the complete config. Preview changed scenes serially rather than launching many renderer calls together. Preserve export settings/quality when tuning previews.

| Request | Edit | Verify |
| --- | --- | --- |
| Change the opening promise | hook content copy/rich text only; preserve branding and duration | Settled hook frame, fit/contrast/logo |
| Highlight a different feature | Select a valid source/media index and truthful feature copy; retain device presentation | Correct UI source, legible copy, orientation/crop |
| Fix a closeup | Inspect source pixels first; set supported focus/zoom and recording trim, not an unrelated device transform | Representative frame inside the requested UI area, no blank/rotated media |
| Add an illustration/logo | Reuse/upload owned path; use typed illustration/branding fields | Asset actually loaded and placed, not just present in JSON |
| Use another device/finish | Use supported device/model catalog and relevant scene controls; global model doesn't rewrite added devices | Chassis, finish, content orientation and framing |
| Change the CTA | Edit the actual CTA text/store badge fields without rewriting scenes | Visible final copy/badge, spacing and logo |
| Slower or faster pacing | Adjust scene durations and transitions deliberately; keep relative story emphasis | Total visible duration, mid-scene poses, entrance/exit samples |
| Change camera/device motion | Use supported presets or authored normalized custom path | Several times along the path; no clipped/off-frame poses |
| Carry a device between scenes | Check compatible consecutive visible feature scenes, source media and minimum overlap | Boundary samples plus editor playback; no false claim from one still |
| Replace music | Preserve authored scene timing, audio settings and trim; musicId resets start | Editor playback for beat/audio; stills cannot establish it |
| Translate | translate_promo_video, then inspect each language through normal read/update/preview | Long copy, fonts, CTA language and screenshot language |

## Screen recordings and overlays

Keep SceneVideo duration and trim aligned to the owned recording. Don't assume a timestamp exists after the clip's end. Use mediaRotation for content rotation, not 3D chassis rotation. Multi-phone indexed media and independent added devices are separate structures; maintain slot alignment and IDs. Extra text/illustration overlays have their own placement and stacking and can invalidate device continuity.

## Quality, failure and completion

Start with one representative changed scene, at its settled midpoint. Request scale 1 when inspecting fine text/assets; this is a preview control and must not reduce final export quality. If the preview is blank, inspect media, source indexes, hidden state, trim, timing and renderer errors before asserting that the edit succeeded visually. A successful config save is not enough.

Inspect brand icon, device media, closeup source, logos/illustrations, text clipping, badges, transitions and hidden scenes. Test playback/audio in the editor for motion/audio claims. A mobile picker should not need three concurrent live renderers; use the product's lightweight previews and avoid forcing all candidates to play simultaneously.

On conflicts/timeouts, do not create another candidate or export to troubleshoot. Use returned retry/job guidance and a fresh state read. A known running export should be polled with its job ID; an uncertain export creation should retain its idempotency key. Clear a config or replace a variant only on explicit intent.

For store preview, social, tablet or App Store creative delivery, choose the supported category/size from the live input schema. Saved visible duration must satisfy the server limit. Creative header/search video uses MP4 at 1080p; don't silently change it to 720p to speed a preview. Deliver only after the export's terminal success and report any unsupported format or plan limitation plainly.
