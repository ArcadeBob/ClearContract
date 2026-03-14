// Severity weights for deterministic risk score computation
const SEVERITY_WEIGHTS: Record<string, number> = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3,
  Info: 0,
};

// Category weights: two tiers per user decision
// Legal/financial at 1.0x, scope/compliance at 0.75x
const CATEGORY_WEIGHTS: Record<string, number> = {
  'Legal Issues': 1.0,
  'Financial Terms': 1.0,
  'Insurance Requirements': 1.0,
  'Risk Assessment': 1.0,
  'Scope of Work': 0.75,
  'Contract Compliance': 0.75,
  'Labor Compliance': 0.75,
  'Important Dates': 0.75,
  'Technical Standards': 0.75,
  'Compound Risk': 0, // Excluded -- for Plan 03's synthesis findings
};

export interface ScoreBreakdown {
  score: number;
  categories: Array<{ name: string; points: number }>;
}

export function computeRiskScore(
  findings: Array<{ severity: string; category: string; title: string }>
): ScoreBreakdown {
  const categoryPoints = new Map<string, number>();

  for (const f of findings) {
    // Skip synthetic error findings
    if (f.title.startsWith('Analysis Pass Failed:')) continue;

    const catWeight = CATEGORY_WEIGHTS[f.category];
    // Skip categories with 0 weight (Compound Risk) or unknown categories
    if (catWeight == null || catWeight === 0) continue;

    const sevWeight = SEVERITY_WEIGHTS[f.severity] || 0;
    const weighted = sevWeight * catWeight;

    if (weighted > 0) {
      categoryPoints.set(
        f.category,
        (categoryPoints.get(f.category) || 0) + weighted
      );
    }
  }

  // Sum all category points for rawScore
  let rawScore = 0;
  for (const pts of categoryPoints.values()) {
    rawScore += pts;
  }

  // Logarithmic scaling for better discrimination above 60
  // rawScore ~25 => ~50, ~75 => ~72, ~150 => ~87, ~250 => ~96
  const score = Math.min(
    100,
    Math.max(0, Math.round(50 * Math.log2(1 + rawScore / 25)))
  );

  // Build categories array sorted by points descending, rounded to 1 decimal
  const categories = Array.from(categoryPoints.entries())
    .filter(([, pts]) => pts > 0)
    .map(([name, pts]) => ({
      name,
      points: Math.round(pts * 10) / 10,
    }))
    .sort((a, b) => b.points - a.points);

  return { score, categories };
}

// CA void-by-law severity guard (post-processing)
// Silently upgrades findings referencing void-by-law statutes to Critical.
// Risk score uses original severity (display-only upgrade).
const VOID_BY_LAW_PATTERNS = [
  /\bCC\s*8814\b/i,
  /\bCC\s*2782\b/i,
  /\bCC\s*8122\b/i,
  /\bCivil\s+Code\s*(?:(?:Section|Sec\.?|[Ss])\s*)?8814\b/i,
  /\bCivil\s+Code\s*(?:(?:Section|Sec\.?|[Ss])\s*)?2782\b/i,
  /\bCivil\s+Code\s*(?:(?:Section|Sec\.?|[Ss])\s*)?8122\b/i,
];

export interface SeverityGuardTarget {
  severity: string;
  clauseText?: string;
  explanation?: string;
}

export function applySeverityGuard(finding: SeverityGuardTarget): void {
  if (finding.severity === 'Critical') return;
  const textToScan = [finding.clauseText, finding.explanation]
    .filter(Boolean)
    .join(' ');
  const hasVoidStatute = VOID_BY_LAW_PATTERNS.some((re) => re.test(textToScan));
  if (hasVoidStatute) {
    finding.severity = 'Critical';
  }
}
