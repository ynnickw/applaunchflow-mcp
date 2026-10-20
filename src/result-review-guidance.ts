export const RESULT_REVIEW_GUIDANCE =
  "The result widget automatically prepares a visual review after rendering. " +
  "When its message supplies a snapshotId, call view_review_snapshot and inspect the returned image before giving a visual assessment. " +
  "Do not claim visual verification based only on layout JSON or a successful save. " +
  "Keep customer-facing responses short and natural: describe the edit and any visible issues, not tool names, receipts, IDs, or waiting for the widget. " +
  "If image review is unavailable, acknowledge that briefly; never repeat the edit just to get a preview.";
