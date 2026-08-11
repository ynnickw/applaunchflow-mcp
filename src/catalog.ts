export function listPublicTemplateIds(
  templatePayloads: Record<string, unknown> | null | undefined,
): string[] {
  return Object.keys(templatePayloads ?? {})
    .filter((templateId) => !templateId.startsWith("__"))
    .sort();
}
