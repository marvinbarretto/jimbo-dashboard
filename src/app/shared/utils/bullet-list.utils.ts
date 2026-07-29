// Bridges a markdown bullet string ("- one\n- two") and a plain string[] so
// a field stored as one string (readable by anything that already renders
// or greps it as markdown) can be edited as discrete, independently
// addressable rows — e.g. via UiChecklist with `checkable: false`. The
// storage format never changes; only the editing experience does.

export function parseBulletLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map(line => line.replace(/^\s*[-*]\s?/, '').trim())
    .filter(Boolean);
}

export function serializeBulletLines(lines: readonly string[]): string | null {
  const cleaned = lines.map(l => l.trim()).filter(Boolean);
  return cleaned.length ? cleaned.map(l => `- ${l}`).join('\n') : null;
}
