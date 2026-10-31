export function listPublicTemplateIds(
  templatePayloads: Record<string, unknown> | null | undefined,
  requestedIds?: string[],
): string[] {
  const available = Object.keys(templatePayloads ?? {})
    .filter((templateId) => !templateId.startsWith("__"))
    .sort();
  if (!requestedIds?.length) return available;
  const selected = available.filter((id) => requestedIds.includes(id));
  if (!selected.length)
    throw new Error(
      "None of the requested templates are in this prepared catalog.",
    );
  return selected;
}
