import type { Finding, BidSignal, BidFactor, BidSignalLevel } from '../types/contract.js';

// Severity penalties subtracted from each factor's starting score of 100
const SEVERITY_PENALTIES: Record<string, number> = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3,
  Info: 0,
};

/**
 * Determine whether a finding matches a specific bid factor.
 */
function matchesBonding(f: Finding): boolean {
  // Labor compliance pass tags bonding findings via scopeMeta
  if (f.sourcePass === 'labor-compliance' && f.scopeMeta) {
    const meta = f.scopeMeta as { requirementType?: string };
    if (meta.requirementType === 'bonding') return true;
  }
  // Risk overview pass may surface bonding via company profile comparison
  // These are downgraded findings from profile mismatch detection
  if (f.sourcePass === 'risk-overview' && f.downgradedFrom != null) {
    // Narrow fallback: only for downgraded findings in relevant categories
    if (f.category === 'Financial Terms' || f.category === 'Contract Compliance') {
      return f.title.toLowerCase().includes('bond');
    }
  }
  return false;
}

function matchesInsurance(f: Finding): boolean {
  return f.category === 'Insurance Requirements';
}

function matchesScope(f: Finding): boolean {
  return f.category === 'Scope of Work';
}

function matchesPayment(f: Finding): boolean {
  return f.sourcePass === 'legal-payment-contingency';
}

function matchesRetainage(f: Finding): boolean {
  return f.sourcePass === 'legal-retainage';
}

interface FactorDef {
  name: string;
  weight: number;
  match: (f: Finding) => boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};

export const FACTOR_DEFS: FactorDef[] = [
  { name: 'Bonding', weight: 0.25, match: matchesBonding },
  { name: 'Insurance', weight: 0.25, match: matchesInsurance },
  { name: 'Scope', weight: 0.2, match: matchesScope },
  { name: 'Payment', weight: 0.15, match: matchesPayment },
  { name: 'Retainage', weight: 0.15, match: matchesRetainage },
];

/**
 * Compute a deterministic bid/no-bid signal from analysis findings.
 *
 * Each factor starts at 100 and subtracts severity-based penalties for
 * matching findings. The weighted average of all factors produces the
 * final score (0-100).
 *
 * Thresholds:
 *   >= 70 = 'bid' / "Bid Recommended"
 *   >= 40 = 'caution' / "Proceed with Caution"
 *   <  40 = 'no-bid' / "Significant Concerns"
 */
export function computeBidSignal(findings: Finding[]): BidSignal {
  const factors: BidFactor[] = FACTOR_DEFS.map((def) => {
    let score = 100;
    for (const f of findings) {
      if (def.match(f)) {
        score -= SEVERITY_PENALTIES[f.severity] || 0;
      }
    }
    // Clamp to 0-100
    score = Math.min(100, Math.max(0, score));
    return { name: def.name, score, weight: def.weight };
  });

  const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  // Round to nearest integer
  const score = Math.round(weightedScore);

  let level: BidSignalLevel;
  let label: string;
  if (score >= 70) {
    level = 'bid';
    label = 'Bid Recommended';
  } else if (score >= 40) {
    level = 'caution';
    label = 'Proceed with Caution';
  } else {
    level = 'no-bid';
    label = 'Significant Concerns';
  }

  return { level, label, score, factors };
}

/**
 * Generate a one-line reason string per bid signal factor based on matched findings.
 * For each factor, returns the title of the worst-severity matched finding,
 * or a "no issues found" message if no findings match.
 */
export function generateFactorReasons(findings: Finding[]): Record<string, string> {
  const reasons: Record<string, string> = {};

  for (const def of FACTOR_DEFS) {
    const matched = findings.filter(def.match);

    if (matched.length === 0) {
      reasons[def.name] = `No ${def.name.toLowerCase()} issues found`;
    } else {
      matched.sort(
        (a, b) => (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4)
      );
      reasons[def.name] = matched[0].title;
    }
  }

  return reasons;
}
