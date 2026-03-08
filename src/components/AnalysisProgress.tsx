import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Category } from '../types/contract';

interface AnalysisProgressProps {
  isLoading?: boolean;
  onComplete?: () => void;
}

const STEPS: {
  label: string;
  category: Category;
}[] = [
  { label: 'Scanning Legal Terms...', category: 'Legal Issues' },
  { label: 'Analyzing Scope of Work...', category: 'Scope of Work' },
  { label: 'Checking Compliance...', category: 'Contract Compliance' },
  { label: 'Verifying Insurance...', category: 'Insurance Requirements' },
  { label: 'Extracting Dates...', category: 'Important Dates' },
  { label: 'Reviewing Financials...', category: 'Financial Terms' },
];

export function AnalysisProgress({ isLoading = false, onComplete }: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // Loop mode: cycle through steps continuously
      if (currentStep < STEPS.length) {
        const timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        // Reset to start looping again
        const timer = setTimeout(() => {
          setCurrentStep(0);
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      // Original behavior: complete once then call onComplete
      if (currentStep < STEPS.length) {
        const timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 800);
        return () => clearTimeout(timer);
      } else if (onComplete) {
        const timer = setTimeout(onComplete, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, isLoading, onComplete]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Analyzing Contract</h2>
        <p className="text-slate-500 mt-1">
          Our AI is reviewing every clause...
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-300'}`}>
                  {isCompleted ?
                    <CheckCircle2 className="w-3.5 h-3.5" /> :
                    isCurrent ?
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" /> :
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                  }
                </div>
                <span
                  className={`text-sm font-medium ${isCompleted || isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>

              {isCurrent &&
                <motion.div
                  className="h-1 bg-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: 60 }}
                  transition={{ duration: 0.8 }}
                  key={`bar-${currentStep}`} />
              }
            </div>);
        })}
      </div>
    </div>);
}
