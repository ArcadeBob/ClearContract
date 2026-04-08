import type { Severity } from '../types/contract';

export type RGB = [number, number, number];

/** Severity → RGB color mapping shared across PDF export and any other non-Tailwind contexts. */
export const SEVERITY_COLORS: Record<Severity, RGB> = {
  Critical: [239, 68, 68],
  High: [245, 158, 11],
  Medium: [234, 179, 8],
  Low: [59, 130, 246],
  Info: [100, 116, 139],
};

/** Severity display order (most severe first). */
export const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

/** Action priority → RGB color mapping for PDF export. */
export const PRIORITY_COLORS: Record<string, RGB> = {
  'pre-bid': [249, 115, 22],
  'pre-sign': [59, 130, 246],
  monitor: [100, 116, 139],
};

/** Risk score → RGB color. */
export function getRiskColor(score: number): RGB {
  if (score >= 70) return [239, 68, 68];
  if (score >= 40) return [245, 158, 11];
  return [34, 197, 94];
}

/** Date type → RGB color for PDF export. */
export function getDateTypeColor(type: string): RGB {
  switch (type) {
    case 'Start': return [16, 185, 129];
    case 'Milestone': return [59, 130, 246];
    case 'Deadline': return [245, 158, 11];
    case 'Expiry': return [239, 68, 68];
    default: return [100, 116, 139];
  }
}
