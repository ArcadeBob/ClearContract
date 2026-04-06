import type { SubmittalEntry, ContractDate } from '../src/types/contract';
import type { UnifiedFinding } from './merge';

const DEFAULTS = {
  resubmittalBuffer: 7,  // 7 calendar days
  leadTime: 0,           // 0 days (conservative: don't assume lead time)
};

/**
 * Deterministic schedule-conflict computation.
 *
 * Compares each submittal's total duration against extracted milestone dates.
 * When a submittal's total processing time exceeds the days available before
 * a milestone, generates a conflict Finding and a row annotation.
 *
 * Total duration formula (per CONTEXT.md):
 *   (reviewDuration x reviewCycles) + resubmittalBuffer + leadTime
 *
 * When buffer/leadTime are not stated in the contract (not in statedFields),
 * industry defaults are used and explicitly labeled in the warning text.
 *
 * Severity tiers (deterministic, per CONTEXT.md):
 *   Critical: >14 days overrun
 *   High: 7-14 days overrun
 *   Medium: 1-7 days overrun (inclusive of 1 and 7)
 */
export function computeScheduleConflicts(
  submittals: SubmittalEntry[],
  dates: ContractDate[]
): { findings: UnifiedFinding[]; annotations: Map<number, string> } {
  const findings: UnifiedFinding[] = [];
  const annotations = new Map<number, string>();

  // Filter to milestone dates only (per CONTEXT.md: extracted ContractDate milestones only)
  const milestones = dates
    .filter(d => d.type === 'Milestone')
    .map(d => ({ label: d.label, date: parseLocalDate(d.date) }))
    .filter((d): d is { label: string; date: Date } => d.date !== null);

  if (milestones.length === 0 || submittals.length === 0) {
    return { findings, annotations };
  }

  // Find the earliest start date as reference point for the submittal timeline.
  // If no start date exists, use the earliest milestone date minus 180 days
  // as a reasonable project-start assumption.
  const startDates = dates
    .filter(d => d.type === 'Start')
    .map(d => parseLocalDate(d.date))
    .filter((d): d is Date => d !== null);

  const referenceDate = startDates.length > 0
    ? startDates.reduce((a, b) => a < b ? a : b)
    : new Date(Math.min(...milestones.map(m => m.date.getTime())) - 180 * 86400000);

  for (let i = 0; i < submittals.length; i++) {
    const sub = submittals[i];
    const assumptions: string[] = [];

    const buffer = sub.statedFields.includes('resubmittalBuffer')
      ? sub.resubmittalBuffer
      : (assumptions.push(`${DEFAULTS.resubmittalBuffer}d resubmittal buffer (assumed, not in contract)`), DEFAULTS.resubmittalBuffer);

    const lead = sub.statedFields.includes('leadTime')
      ? sub.leadTime
      : (assumptions.push(`${DEFAULTS.leadTime}d lead time (assumed)`), DEFAULTS.leadTime);

    const totalDays = (sub.reviewDuration * sub.reviewCycles) + buffer + lead;

    for (const milestone of milestones) {
      const daysUntilMilestone = Math.floor(
        (milestone.date.getTime() - referenceDate.getTime()) / 86400000
      );
      const overrun = totalDays - daysUntilMilestone;

      if (overrun > 0) {
        const severity = overrun > 14 ? 'Critical' : overrun > 7 ? 'High' : 'Medium';
        const assumptionText = assumptions.length > 0
          ? ` Assumptions: ${assumptions.join('; ')}.`
          : '';

        findings.push({
          severity: severity as UnifiedFinding['severity'],
          category: 'Scope of Work' as UnifiedFinding['category'],
          title: `Schedule Conflict: ${sub.description} vs ${milestone.label}`,
          description: `${sub.description} requires ${totalDays} total days (${sub.reviewDuration}d review x ${sub.reviewCycles} cycles + ${buffer}d buffer + ${lead}d lead). This pushes ${overrun} days past the "${milestone.label}" milestone.${assumptionText}`,
          recommendation: `Negotiate extended review timeline or earlier submittal due date for ${sub.description}. Consider requesting ${overrun + 7} additional days of float.`,
          clauseReference: sub.clauseReference,
          sourcePass: 'schedule-conflict',
          actionPriority: 'pre-bid',
        });

        annotations.set(i, `${overrun}d overrun vs ${milestone.label}`);
      }
    }
  }

  return { findings, annotations };
}

/**
 * Parse a YYYY-MM-DD date string into a local Date (no UTC offset).
 * Uses split/Number approach per Phase 54 decision to avoid timezone issues.
 */
function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day);
}
