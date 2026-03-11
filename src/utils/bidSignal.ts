import type { Finding } from '../types/contract';

export type BidSignalLevel = 'bid' | 'caution' | 'no-bid';

export interface BidFactor {
  name: string;
  score: number;
  weight: number;
}

export interface BidSignal {
  level: BidSignalLevel;
  label: string;
  score: number;
  factors: BidFactor[];
}

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
  return (
    f.title.toLowerCase().includes('bond') ||
    f.description.toLowerCase().includes('bond')
  );
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

const FACTOR_DEFS: FactorDef[] = [
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
