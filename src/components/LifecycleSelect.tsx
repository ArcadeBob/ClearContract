import type { LifecycleStatus } from '../types/contract';
import { LIFECYCLE_TRANSITIONS } from '../types/contract';

interface LifecycleSelectProps {
  current: LifecycleStatus;
  onChange: (status: LifecycleStatus) => void;
}

export function LifecycleSelect({ current, onChange }: LifecycleSelectProps) {
  const validTransitions = LIFECYCLE_TRANSITIONS[current];
  const isTerminal = validTransitions.length === 0;

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as LifecycleStatus)}
      disabled={isTerminal}
      className={`text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isTerminal ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <option value={current}>{current}</option>
      {validTransitions.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
