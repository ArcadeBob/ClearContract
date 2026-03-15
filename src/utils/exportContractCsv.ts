import { Contract, Finding, Severity } from '../types/contract';

interface ExportOptions {
  findings?: Finding[];
  filterDescriptions?: string[];
}

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

export function escapeCsv(value: string | undefined | boolean): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const str = String(value);
  if (/[,"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | undefined | boolean)[]): string {
  return fields.map(escapeCsv).join(',');
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function exportContractCsv(contract: Contract, options?: ExportOptions): string {
  const findings = options?.findings ?? contract.findings;
  const filterDescriptions = options?.filterDescriptions ?? [];
  const lines: string[] = [];

  // Metadata header rows
  lines.push(csvRow(['Contract Name', contract.name]));
  lines.push(csvRow(['Contract Type', contract.type]));
  lines.push(csvRow(['Risk Score', String(contract.riskScore)]));
  if (contract.bidSignal) {
    lines.push(csvRow(['Bid Signal', `${contract.bidSignal.label} (${contract.bidSignal.score})`]));
  }
  lines.push(csvRow(['Analysis Date', contract.uploadDate]));
  lines.push(csvRow(['Total Findings', String(contract.findings.length)]));
  if (filterDescriptions.length > 0) {
    lines.push(csvRow(['Exported Findings', String(findings.length)]));
    lines.push(csvRow(['Filters Applied', filterDescriptions.join(', ')]));
  }

  // Blank row separator
  lines.push('');

  // Findings column headers
  lines.push(csvRow([
    'Severity',
    'Action Priority',
    'Category',
    'Clause Reference',
    'Clause Text',
    'Explanation',
    'Recommendation',
    'Negotiation Position',
    'Resolved',
    'User Note',
  ]));

  // Finding data rows sorted by severity
  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  for (const f of sortedFindings) {
    lines.push(csvRow([
      f.severity,
      f.actionPriority ?? '',
      f.category,
      f.clauseReference ?? '',
      f.clauseText ?? '',
      f.explanation ?? '',
      f.recommendation ?? '',
      f.negotiationPosition ?? '',
      f.resolved ?? false,
      f.note ?? '',
    ]));
  }

  // Key Dates section
  if (contract.dates.length > 0) {
    lines.push('');
    lines.push(csvRow(['Key Dates']));
    lines.push(csvRow(['Date', 'Description', 'Type']));
    for (const d of contract.dates) {
      lines.push(csvRow([d.date, d.label, d.type]));
    }
  }

  return lines.join('\r\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
