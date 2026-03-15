import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type FlowDownMeta = Extract<LegalMeta, { clauseType: 'flow-down' }>;

interface FlowDownBadgeProps {
  meta: FlowDownMeta;
}

export function FlowDownBadge({ meta }: FlowDownBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.flowDownScope === 'blanket'
              ? 'bg-red-100 text-red-700'
              : meta.flowDownScope === 'specific-sections'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {meta.flowDownScope === 'blanket'
            ? 'Blanket Flow-Down'
            : meta.flowDownScope === 'specific-sections'
              ? 'Specific Sections'
              : meta.flowDownScope === 'targeted-with-exceptions'
                ? 'Targeted with Exceptions'
                : meta.flowDownScope}
        </span>
        <span
          className={`${pillBase} ${
            meta.primeContractAvailable
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {meta.primeContractAvailable
            ? 'Prime Contract Available'
            : 'Prime Contract Not Available'}
        </span>
      </div>
      {meta.problematicObligations.length > 0 && (
        <ul className="mt-1 ml-3 list-disc text-xs text-slate-600">
          {meta.problematicObligations.map((obligation, i) => (
            <li key={i}>{obligation}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
