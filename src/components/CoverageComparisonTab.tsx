import { Finding, InsuranceCoverageItem } from '../types/contract';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { CompanyProfile } from '../knowledge/types';

interface CoverageComparisonTabProps {
  findings: Finding[];
}

interface ComparisonRow {
  requirement: string;
  contractRequires: string;
  yourCoverage: string;
  status: 'met' | 'exceeds' | 'gap' | 'na';
  gapAmount?: string;
}

/** Map coverage type string to the matching CompanyProfile field */
function getProfileValue(coverageType: string, profile: CompanyProfile): string {
  const ct = coverageType.toLowerCase();
  if (ct.includes('general liability') || ct === 'gl') return profile.glPerOccurrence;
  if (ct.includes('aggregate') && !ct.includes('umbrella')) return profile.glAggregate;
  if (ct.includes('umbrella') || ct.includes('excess')) return profile.umbrellaLimit;
  if (ct.includes('auto') || ct.includes('automobile')) return profile.autoLimit;
  if (ct.includes('worker') || ct === 'wc') return profile.wcEmployerLiability;
  return '';
}

/** Parse a dollar string like "$1,000,000" to a number */
function parseDollar(s: string): number | null {
  const cleaned = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function compareAmounts(required: string, yours: string): Pick<ComparisonRow, 'status' | 'gapAmount'> {
  if (!yours) return { status: 'na' };
  const reqNum = parseDollar(required);
  const yourNum = parseDollar(yours);
  if (reqNum === null || yourNum === null) return { status: 'na' };
  if (yourNum > reqNum) return { status: 'exceeds' };
  if (yourNum >= reqNum) return { status: 'met' };
  const gap = reqNum - yourNum;
  return { status: 'gap', gapAmount: `$${gap.toLocaleString()}` };
}

function buildInsuranceRows(items: InsuranceCoverageItem[], profile: CompanyProfile): ComparisonRow[] {
  return items.map((item) => {
    const yours = getProfileValue(item.coverageType, profile);
    const comparison = compareAmounts(item.requiredLimit, yours);
    return {
      requirement: item.coverageType,
      contractRequires: item.requiredLimit,
      yourCoverage: yours || 'Not set',
      ...comparison,
    };
  });
}

function buildBondingRows(findings: Finding[], profile: CompanyProfile): ComparisonRow[] {
  const bondingFindings = findings.filter(
    (f) => f.sourcePass === 'risk-overview' && /bond/i.test(`${f.title} ${f.description}`)
  );
  if (bondingFindings.length === 0) return [];

  // Try to extract a dollar amount from bonding findings
  const rows: ComparisonRow[] = [];
  for (const f of bondingFindings) {
    const match = f.description.match(/\$[\d,]+(?:\.\d{2})?/);
    if (match) {
      const required = match[0];
      const comparison = compareAmounts(required, profile.bondingSingleProject);
      rows.push({
        requirement: 'Performance Bond',
        contractRequires: required,
        yourCoverage: profile.bondingSingleProject || 'Not set',
        ...comparison,
      });
    }
  }

  // If no dollar amount found, still show a row
  if (rows.length === 0 && bondingFindings.length > 0) {
    rows.push({
      requirement: 'Bonding',
      contractRequires: 'Required (see findings)',
      yourCoverage: profile.bondingSingleProject || 'Not set',
      status: profile.bondingSingleProject ? 'met' : 'na',
    });
  }

  return rows;
}

const statusStyles: Record<ComparisonRow['status'], { label: string; className: string }> = {
  met: { label: 'Met', className: 'text-emerald-700 bg-emerald-50' },
  exceeds: { label: 'Exceeds', className: 'text-emerald-700 bg-emerald-50' },
  gap: { label: 'GAP', className: 'text-red-700 bg-red-50' },
  na: { label: 'N/A', className: 'text-slate-500 bg-slate-50' },
};

export function CoverageComparisonTab({ findings }: CoverageComparisonTabProps) {
  const { profile } = useCompanyProfile();

  // Extract insurance coverage items from findings with insurance legalMeta
  const insuranceItems: InsuranceCoverageItem[] = findings
    .filter((f) => f.legalMeta && f.legalMeta.clauseType === 'insurance')
    .flatMap((f) => {
      if (f.legalMeta && f.legalMeta.clauseType === 'insurance') {
        return f.legalMeta.coverageItems;
      }
      return [];
    });

  const insuranceRows = buildInsuranceRows(insuranceItems, profile);
  const bondingRows = buildBondingRows(findings, profile);
  const allRows = [...insuranceRows, ...bondingRows];

  if (allRows.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
        <p className="text-slate-500 font-medium">
          No insurance or bonding requirements found in this contract.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Requirement</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Contract Requires</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Your Coverage</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, i) => {
            const style = statusStyles[row.status];
            return (
              <tr key={i} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3 font-medium text-slate-900">{row.requirement}</td>
                <td className="px-4 py-3 text-slate-600">{row.contractRequires}</td>
                <td className="px-4 py-3 text-slate-600">{row.yourCoverage}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
                    {row.status === 'gap' && row.gapAmount ? `GAP: ${row.gapAmount}` : style.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Comparison based on profile at time of analysis. Re-analyze after profile changes to update.
        </p>
      </div>
    </div>
  );
}
