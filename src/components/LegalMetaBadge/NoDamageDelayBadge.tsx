import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type NoDamageDelayMeta = Extract<LegalMeta, { clauseType: 'no-damage-delay' }>;

interface NoDamageDelayBadgeProps {
  meta: NoDamageDelayMeta;
}

export function NoDamageDelayBadge({ meta }: NoDamageDelayBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.waiverScope === 'absolute'
              ? 'bg-red-100 text-red-700'
              : meta.waiverScope === 'broad-with-exceptions'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {meta.waiverScope === 'absolute'
            ? 'Absolute Waiver'
            : meta.waiverScope === 'broad-with-exceptions'
              ? 'Broad with Exceptions'
              : meta.waiverScope === 'reasonable-exceptions'
                ? 'Reasonable Exceptions'
                : meta.waiverScope}
        </span>
      </div>
      {meta.exceptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {meta.exceptions.map((exception, i) => (
            <span
              key={i}
              className={`${pillBase} bg-green-100 text-green-700`}
            >
              {exception}
            </span>
          ))}
        </div>
      )}
      {meta.enforceabilityContext && (
        <p className="text-xs text-slate-500 mt-1 italic">
          {meta.enforceabilityContext}
        </p>
      )}
    </div>
  );
}
