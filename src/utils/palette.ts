import type { Severity } from '../types/contract';

/**
 * Complete Tailwind class strings for severity badge styling.
 * Uses full string literals (no interpolation) to survive Tailwind JIT purge.
 */
export const SEVERITY_BADGE_COLORS: Record<Severity, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
  Info: 'bg-slate-100 text-slate-700 border-slate-200',
};

/**
 * Returns a Tailwind text color class for a risk score value.
 * Thresholds: >70 = red, >40 = amber, otherwise emerald.
 */
export function getRiskScoreColor(score: number): string {
  if (score > 70) return 'text-red-600';
  if (score > 40) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Returns Tailwind badge classes (background + text) for a risk score value.
 * Thresholds: >=70 = red, >=40 = amber, otherwise emerald.
 */
export function getRiskBadgeColor(score: number): string {
  if (score >= 70) return 'bg-red-100 text-red-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}
