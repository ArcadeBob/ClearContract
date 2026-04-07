interface ClauseQuoteProps {
  text: string;
  reference: string;
  borderColor?: string;
  label?: string;
}

export function ClauseQuote({ text, reference, borderColor = 'border-slate-300', label = 'Contract Language' }: ClauseQuoteProps) {
  return (
    <div className={`bg-slate-50 border-l-4 ${borderColor} rounded-r-md p-4 my-3`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label} &mdash; {reference}
      </p>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
        {text}
      </p>
    </div>
  );
}
