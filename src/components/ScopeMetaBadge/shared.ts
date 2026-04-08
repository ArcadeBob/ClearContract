export const pillBase = 'meta-pill';

export function formatLabel(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
