import { Finding } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
import { ClauseQuote } from './ClauseQuote';
import { LegalMetaBadge } from './LegalMetaBadge';
import { ScopeMetaBadge } from './ScopeMetaBadge';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { categoryIcons } from '../utils/categoryIcons';
interface FindingCardProps {
  finding: Finding;
  index: number;
}
export function FindingCard({ finding, index }: FindingCardProps) {
  const Icon = categoryIcons[finding.category] || AlertTriangle;
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        delay: index * 0.05
      }}
      className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-sm transition-shadow">

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-slate-100 rounded-md text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-slate-600">
            {finding.category}
          </span>
        </div>
        <SeverityBadge severity={finding.severity} downgradedFrom={finding.downgradedFrom} />
      </div>

      <h4 className="text-lg font-semibold text-slate-900 mb-2">
        {finding.title}
      </h4>
      <p className="text-slate-600 mb-4 text-sm leading-relaxed">
        {finding.description}
      </p>

      {finding.recommendation &&
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Recommendation
          </p>
          <p className="text-sm text-blue-800">{finding.recommendation}</p>
        </div>
      }

      {finding.clauseText && finding.clauseText !== 'N/A - Protective clause absent' && (
        <ClauseQuote text={finding.clauseText} reference={finding.clauseReference || ''} />
      )}

      {finding.explanation && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Why This Matters
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">{finding.explanation}</p>
        </div>
      )}

      {finding.negotiationPosition && finding.negotiationPosition !== '' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
            Negotiation Position
          </p>
          <p className="text-sm text-emerald-800 leading-relaxed">
            {finding.negotiationPosition}
          </p>
        </div>
      )}

      {finding.legalMeta && <LegalMetaBadge meta={finding.legalMeta} />}
      {finding.scopeMeta && <ScopeMetaBadge meta={finding.scopeMeta} />}

      {finding.crossReferences && finding.crossReferences.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-2 mb-2">
          <span className="text-xs font-medium text-slate-500">See also:</span>
          {finding.crossReferences.map((ref, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
              {ref}
            </span>
          ))}
        </div>
      )}

      {finding.clauseReference &&
      <div className="flex items-center text-xs text-slate-400 mt-2">
          <span className="font-medium mr-1">Reference:</span>{' '}
          {finding.clauseReference}
        </div>
      }
    </motion.div>);
}