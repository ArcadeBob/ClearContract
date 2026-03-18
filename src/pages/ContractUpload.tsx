import { UploadZone } from '../components/UploadZone';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContractUploadProps {
  onUploadComplete: (file: File) => void;
  isAnalyzing?: boolean;
}

export function ContractUpload({ onUploadComplete, isAnalyzing }: ContractUploadProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-12"
              >
                <div className="bg-blue-100 rounded-full p-4 mb-4">
                  <Loader2
                    className="w-8 h-8 text-blue-600 animate-spin"
                    aria-hidden="true"
                  />
                </div>
                <div role="status" aria-label="Analyzing contract">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    Analyzing Contract...
                  </h2>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-2">
                    AI is reviewing your contract. This usually takes 30-60 seconds.
                  </p>
                  <p className="text-slate-400 text-xs">
                    You can navigate away &mdash; we'll notify you when it's ready.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                    Upload Contract
                  </h1>
                  <p className="text-slate-500">
                    Upload a PDF contract to start the AI analysis process.
                  </p>
                </div>
                <UploadZone onFileSelect={onUploadComplete} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
