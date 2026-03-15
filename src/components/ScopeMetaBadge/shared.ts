export const pillBase =
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2';

export function formatLabel(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
