import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contract, Severity, CATEGORIES } from '../types/contract';
import { sanitizeFilename } from './exportContractCsv';

type RGB = [number, number, number];

const severityColors: Record<Severity, RGB> = {
  Critical: [239, 68, 68],
  High: [245, 158, 11],
  Medium: [234, 179, 8],
  Low: [59, 130, 246],
  Info: [100, 116, 139],
};

const priorityColors: Record<string, RGB> = {
  'pre-bid': [249, 115, 22],
  'pre-sign': [59, 130, 246],
  monitor: [100, 116, 139],
};

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function getRiskColor(score: number): RGB {
  if (score >= 70) return [239, 68, 68]; // red
  if (score >= 40) return [245, 158, 11]; // amber
  return [34, 197, 94]; // green
}

function getDateTypeColor(type: string): RGB {
  switch (type) {
    case 'Start': return [16, 185, 129]; // emerald
    case 'Milestone': return [59, 130, 246]; // blue
    case 'Deadline': return [245, 158, 11]; // amber
    case 'Expiry': return [239, 68, 68]; // red
    default: return [100, 116, 139]; // slate
  }
}

export function exportContractPdf(contract: Contract): void {
  const doc = new jsPDF({ format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  let y = 20;

  // --- Header ---
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Contract Analysis Report', marginLeft, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(contract.name, marginLeft, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Client: ${contract.client}  |  Type: ${contract.type}  |  Date: ${contract.uploadDate}`,
    marginLeft,
    y
  );
  y += 8;

  // Risk score
  const riskColor = getRiskColor(contract.riskScore);
  doc.setFontSize(11);
  doc.setTextColor(...riskColor);
  doc.text(`Risk Score: ${contract.riskScore}/100`, marginLeft, y);

  // Bid signal on same line
  if (contract.bidSignal) {
    const bidX = marginLeft + 60;
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Bid Signal: ${contract.bidSignal.label} (${contract.bidSignal.score}/100)`,
      bidX,
      y
    );
  }
  y += 6;

  // Separator line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // --- Findings by category ---
  const headFill: RGB = [30, 41, 59]; // slate-800

  for (const category of CATEGORIES) {
    const catFindings = contract.findings
      .filter((f) => f.category === category)
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
      );
    if (catFindings.length === 0) continue;

    // Check page space
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }

    // Category header
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(category, marginLeft, y);
    y += 4;

    const tableData = catFindings.map((f) => {
      const titleCell = f.clauseText
        ? `${f.title}\n${truncate(f.clauseText, 200)}`
        : f.title;
      return [
        titleCell,
        f.severity,
        f.actionPriority ?? '-',
        f.recommendation ?? '',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      head: [['Title', 'Severity', 'Action', 'Recommendation']],
      body: tableData,
      headStyles: {
        fillColor: headFill,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 60 },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        // Severity column color
        if (data.column.index === 1) {
          const sev = data.cell.raw as string;
          const color = severityColors[sev as Severity];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Action priority column color
        if (data.column.index === 2) {
          const pri = data.cell.raw as string;
          const color = priorityColors[pri];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    y = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 10;
  }

  // --- Negotiation positions (Critical/High only) ---
  const negotiationFindings = contract.findings.filter(
    (f) =>
      (f.severity === 'Critical' || f.severity === 'High') &&
      f.negotiationPosition
  );

  if (negotiationFindings.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Negotiation Points', marginLeft, y);
    y += 4;

    const negData = negotiationFindings.map((f) => [
      f.title,
      f.severity,
      f.negotiationPosition ?? '',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      head: [['Finding', 'Severity', 'Negotiation Position']],
      body: negData,
      headStyles: {
        fillColor: headFill,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        if (data.column.index === 1) {
          const sev = data.cell.raw as string;
          const color = severityColors[sev as Severity];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    y = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 10;
  }

  // --- Dates section ---
  if (contract.dates.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Dates', marginLeft, y);
    y += 4;

    const dateData = contract.dates.map((d) => [d.label, d.date, d.type]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      head: [['Label', 'Date', 'Type']],
      body: dateData,
      headStyles: {
        fillColor: headFill,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
      didParseCell(data) {
        if (data.section !== 'body') return;
        if (data.column.index === 2) {
          const type = data.cell.raw as string;
          const color = getDateTypeColor(type);
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.text(
      `Generated by ClearContract on ${new Date().toLocaleDateString()}`,
      marginLeft,
      footerY
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginRight - 25, footerY);
  }

  doc.save(`${sanitizeFilename(contract.name)}-report.pdf`);
}
