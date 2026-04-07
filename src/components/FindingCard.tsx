import { useState } from 'react';
import { Finding } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
import { ActionPriorityBadge } from './ActionPriorityBadge';
import { ClauseQuote } from './ClauseQuote';
import { LegalMetaBadge } from './LegalMetaBadge';
import { ScopeMetaBadge } from './ScopeMetaBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertTriangle, Check, CheckCircle2, Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { categoryIcons } from '../utils/categoryIcons';
import { useInlineEdit } from '../hooks/useInlineEdit';

interface FindingCardProps {
  finding: Finding;
  index: number;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
}

export function FindingCard({ finding, index, onToggleResolved, onUpdateNote }: FindingCardProps) {
  const { isEditing: isEditingNote, editValue: editText, setEditValue: setEditText, startEditing, commitEdit, cancelEdit } = useInlineEdit({
    initialValue: finding.note,
    validate: (v) => v.trim(),
    onSave: (text) => onUpdateNote?.(finding.id, text),
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const Icon = categoryIcons[finding.category] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      layout
      className={`bg-white rounded-lg border border-slate-200 p-5 hover:shadow-sm transition-shadow ${finding.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-slate-100 rounded-md text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-slate-600">
            {finding.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleResolved?.(finding.id)}
            title={finding.resolved ? 'Mark unresolved' : 'Mark resolved'}
            className="p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            {finding.resolved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Check className="w-5 h-5 text-slate-300 hover:text-emerald-400" />
            )}
          </button>
          <SeverityBadge
            severity={finding.severity}
            downgradedFrom={finding.downgradedFrom}
          />
          {finding.actionPriority && <ActionPriorityBadge priority={finding.actionPriority} />}
        </div>
      </div>

      <h4 className={`text-lg font-semibold text-slate-900 mb-2 ${finding.resolved ? 'line-through' : ''}`}>
        {finding.title}
      </h4>
      <p className="text-slate-600 mb-4 text-sm leading-relaxed">
        {finding.description}
      </p>

      {finding.recommendation && (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Recommendation
          </p>
          <p className="text-sm text-blue-800">{finding.recommendation}</p>
        </div>
      )}

      {finding.clauseText &&
        finding.clauseText !== 'N/A - Protective clause absent' && (
          <ClauseQuote
            text={finding.clauseText}
            reference={finding.clauseReference || ''}
          />
        )}

      {finding.scopeMeta &&
        finding.scopeMeta.passType === 'exclusion-stress-test' &&
        finding.scopeMeta.tensionQuote && (
          <ClauseQuote
            text={finding.scopeMeta.tensionQuote}
            reference={finding.scopeMeta.specSection}
            borderColor="border-amber-300"
            label="Inferred Requirement"
          />
        )}

      {finding.scopeMeta &&
        finding.scopeMeta.passType === 'bid-reconciliation' && (
          <>
            {finding.scopeMeta.contractQuote && (
              <ClauseQuote
                text={finding.scopeMeta.contractQuote}
                reference={finding.clauseReference || ''}
                borderColor="border-slate-300"
                label="Contract Language"
              />
            )}
            {finding.scopeMeta.bidQuote && (
              <ClauseQuote
                text={finding.scopeMeta.bidQuote}
                reference="Bid Document"
                borderColor="border-emerald-300"
                label="Bid Language"
              />
            )}
          </>
        )}

      {finding.explanation && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Why This Matters
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            {finding.explanation}
          </p>
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

      {finding.note && !isEditingNote && (
        <div className="bg-violet-50 border border-violet-100 rounded-md p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Your Note</p>
            <div className="flex items-center gap-1">
              <button onClick={startEditing} title="Edit note" className="p-0.5 rounded hover:bg-violet-100 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-violet-400 hover:text-violet-600" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} title="Delete note" className="p-0.5 rounded hover:bg-violet-100 transition-colors">
                <X className="w-3.5 h-3.5 text-violet-400 hover:text-violet-600" />
              </button>
            </div>
          </div>
          <p className="text-sm text-violet-800">{finding.note}</p>
        </div>
      )}

      {finding.legalMeta && <LegalMetaBadge meta={finding.legalMeta} />}
      {finding.scopeMeta && <ScopeMetaBadge meta={finding.scopeMeta} />}

      {finding.crossReferences && finding.crossReferences.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-2 mb-2">
          <span className="text-xs font-medium text-slate-500">See also:</span>
          {finding.crossReferences.map((ref, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600"
            >
              {ref}
            </span>
          ))}
        </div>
      )}

      {finding.clauseReference && (
        <div className="flex items-center text-xs text-slate-400 mt-2">
          <span className="font-medium mr-1">Reference:</span>{' '}
          {finding.clauseReference}
        </div>
      )}

      {!finding.note && !isEditingNote && (
        <button
          onClick={startEditing}
          className="text-sm text-slate-400 hover:text-violet-600 transition-colors mt-2"
        >
          + Add note
        </button>
      )}

      {isEditingNote && (
        <div className="mt-3">
          <textarea
            className="w-full border border-slate-200 rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
            rows={3}
            maxLength={1000}
            placeholder="Add your note..."
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={commitEdit}
              disabled={!editText.trim()}
              className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message="Are you sure you want to delete this note? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          onUpdateNote?.(finding.id, undefined);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
}
