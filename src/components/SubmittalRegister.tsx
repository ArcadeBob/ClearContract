import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { SubmittalEntry, Finding } from '../types/contract';
import { SubmittalTypeBadge } from './SubmittalTypeBadge';

interface SubmittalRegisterProps {
  submittals: SubmittalEntry[];
  conflictFindings: Finding[];
}

function isNotStated(field: string, value: number, statedFields: string[]): boolean {
  return value === 0 && !statedFields.includes(field);
}

function NotStatedCell() {
  return <span className="text-slate-400 italic">---</span>;
}

/** Highlight "(assumed, not in contract)" text in amber */
function highlightAssumptions(text: string) {
  const parts = text.split(/(\(assumed(?:, not in contract)?\))/g);
  return parts.map((part, i) =>
    /^\(assumed/.test(part) ? (
      <span key={i} className="text-amber-600 text-xs">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SubmittalRegister({ submittals, conflictFindings }: SubmittalRegisterProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function getConflictsForRow(sub: SubmittalEntry): Finding[] {
    return conflictFindings.filter(
      f => f.sourcePass === 'schedule-conflict' && f.title.includes(sub.description)
    );
  }

  function toggleExpand(index: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">Submittal Register</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ width: 120 }}>Type</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ minWidth: 200 }}>Description</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ width: 80 }}>Duration</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ width: 64 }}>Cycles</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ width: 140 }}>Party</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-left px-3 py-2" style={{ width: 100 }}>Spec Section</th>
              <th className="text-xs font-semibold text-slate-500 uppercase text-center px-3 py-2" style={{ width: 48 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {submittals.map((sub, index) => {
              const conflicts = getConflictsForRow(sub);
              const isConflicted = conflicts.length > 0;

              return (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`border-b border-slate-100 ${
                    isConflicted
                      ? 'bg-amber-50 border-l-2 border-l-amber-400 cursor-pointer'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={isConflicted ? () => toggleExpand(index) : undefined}
                  is="tr"
                >
                  <td className="px-3 py-2"><SubmittalTypeBadge type={sub.type} /></td>
                  <td className="px-3 py-2 text-sm text-slate-900">{sub.description}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">
                    {isNotStated('reviewDuration', sub.reviewDuration, sub.statedFields)
                      ? <NotStatedCell />
                      : `${sub.reviewDuration}d`}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700">{sub.reviewCycles}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{sub.responsibleParty}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{sub.specSection}</td>
                  <td className="px-3 py-2 text-center">
                    {isConflicted && (
                      <span title="Schedule conflict">
                        <AlertTriangle
                          className="w-4 h-4 text-amber-500 inline-block"
                          aria-label="Schedule conflict"
                        />
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Expansion panels (rendered outside table rows for valid HTML) */}
        <AnimatePresence>
          {submittals.map((sub, index) => {
            const conflicts = getConflictsForRow(sub);
            if (!expanded.has(index) || conflicts.length === 0) return null;

            return (
              <motion.div
                key={`expand-${index}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.2, ease: 'easeOut' },
                  opacity: { duration: 0.15 },
                }}
                className="overflow-hidden"
              >
                <div className="bg-amber-50 px-3 py-2 text-sm text-slate-700 border-b border-amber-200">
                  {conflicts.map((conflict, ci) => (
                    <p key={ci} className={ci > 0 ? 'mt-1' : ''}>
                      {highlightAssumptions(conflict.description)}
                    </p>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-slate-100">
        {submittals.map((sub, index) => {
          const conflicts = getConflictsForRow(sub);
          const isConflicted = conflicts.length > 0;
          const isExpanded = expanded.has(index);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`p-3 ${
                isConflicted
                  ? 'bg-amber-50 border-l-2 border-l-amber-400 cursor-pointer'
                  : ''
              }`}
              onClick={isConflicted ? () => toggleExpand(index) : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <SubmittalTypeBadge type={sub.type} />
                {isConflicted && (
                  <span title="Schedule conflict">
                    <AlertTriangle
                      className="w-4 h-4 text-amber-500"
                      aria-label="Schedule conflict"
                    />
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">{sub.description}</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-500">Duration: </span>
                  {isNotStated('reviewDuration', sub.reviewDuration, sub.statedFields)
                    ? <NotStatedCell />
                    : `${sub.reviewDuration}d`}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Cycles: </span>
                  {sub.reviewCycles}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Party: </span>
                  {sub.responsibleParty}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Spec: </span>
                  {sub.specSection}
                </div>
              </div>

              {/* Mobile expansion */}
              <AnimatePresence>
                {isExpanded && conflicts.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.2, ease: 'easeOut' },
                      opacity: { duration: 0.15 },
                    }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="bg-amber-50 rounded px-3 py-2 text-sm text-slate-700 border border-amber-200">
                      {conflicts.map((conflict, ci) => (
                        <p key={ci} className={ci > 0 ? 'mt-1' : ''}>
                          {highlightAssumptions(conflict.description)}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
