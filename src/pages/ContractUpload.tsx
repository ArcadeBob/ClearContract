import { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContractUploadProps {
  onUploadComplete: (contractFile: File, bidFile?: File) => void;
  isAnalyzing?: boolean;
  hasBid?: boolean;
}

export function ContractUpload({ onUploadComplete, isAnalyzing, hasBid }: ContractUploadProps) {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [bidFile, setBidFile] = useState<File | null>(null);

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
                <div role="status" aria-label={hasBid ? 'Analyzing documents' : 'Analyzing contract'}>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    {hasBid ? 'Analyzing Contract + Bid...' : 'Analyzing Contract...'}
                  </h2>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-2">
                    {hasBid
                      ? 'AI is reviewing your documents. This may take up to 90 seconds.'
                      : 'AI is reviewing your contract. This usually takes 30-60 seconds.'}
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
                    Upload Documents
                  </h1>
                  <p className="text-slate-500">
                    Upload your contract PDF to start analysis. Optionally attach a bid for cross-document review.
                  </p>
                </div>
                <div className="space-y-6">
                  <UploadZone
                    role="contract"
                    onFileSelect={setContractFile}
                    selectedFile={contractFile}
                    onRemoveFile={() => setContractFile(null)}
                  />
                  <UploadZone
                    role="bid"
                    onFileSelect={setBidFile}
                    selectedFile={bidFile}
                    onRemoveFile={() => setBidFile(null)}
                  />
                </div>
                <AnimatePresence>
                  {contractFile && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => onUploadComplete(contractFile, bidFile || undefined)}
                      className="bg-blue-600 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full mt-6"
                    >
                      {bidFile ? 'Analyze Contract + Bid' : 'Analyze Contract'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
