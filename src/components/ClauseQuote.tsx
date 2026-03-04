import React from 'react';

interface ClauseQuoteProps {
  text: string;
  reference: string;
}

export function ClauseQuote({ text, reference }: ClauseQuoteProps) {
  return (
    <div className="bg-slate-50 border-l-4 border-slate-300 rounded-r-md p-4 my-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Contract Language &mdash; {reference}
      </p>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
        {text}
      </p>
    </div>
  );
}
