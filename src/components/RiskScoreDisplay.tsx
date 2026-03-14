interface RiskScoreDisplayProps {
  riskScore: number;
  scoreBreakdown?: Array<{ name: string; points: number }>;
  className?: string;
}

export function RiskScoreDisplay({
  riskScore,
  scoreBreakdown,
  className = '',
}: RiskScoreDisplayProps) {
  const colorClass =
    riskScore > 70
      ? 'text-red-600'
      : riskScore > 40
        ? 'text-amber-600'
        : 'text-emerald-600';

  return (
    <div className={`relative group inline-flex items-center ${className}`}>
      <span className={`text-sm font-bold cursor-default ${colorClass}`}>
        {riskScore}/100
      </span>

      {/* Tooltip on hover */}
      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
        <div className="bg-slate-800 text-white rounded-lg shadow-lg px-3 py-2 whitespace-nowrap">
          {scoreBreakdown && scoreBreakdown.length > 0 ? (
            <ul className="space-y-0.5">
              {scoreBreakdown.map((cat) => (
                <li key={cat.name} className="text-xs">
                  <span className="text-slate-300">{cat.name}:</span>{' '}
                  <span className="font-medium">{cat.points} pts</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-slate-400">
              No category data available
            </span>
          )}
        </div>
        {/* Caret pointing down */}
        <div className="flex justify-center">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
        </div>
      </div>
    </div>
  );
}
