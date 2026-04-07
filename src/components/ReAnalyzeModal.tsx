import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ReAnalyzeResult {
  contractFile?: File;          // undefined = keep current
  bidFile?: File;               // undefined = keep current (or no bid)
  keepCurrentContract: boolean;
  removeBid: boolean;
}

interface ReAnalyzeModalProps {
  isOpen: boolean;
  bidFileName: string | null;   // Current bid file name (null = no bid attached)
  hasStoredContract: boolean;   // Whether contract PDF exists in storage (pre-v3.0 = false)
  onConfirm: (result: ReAnalyzeResult) => void;
  onCancel: () => void;
}

type ContractChoice = 'keep' | 'upload';
type BidChoice = 'none' | 'keep' | 'upload' | 'remove';

export function ReAnalyzeModal({
  isOpen,
  bidFileName,
  hasStoredContract,
  onConfirm,
  onCancel,
}: ReAnalyzeModalProps) {
  const [contractChoice, setContractChoice] = useState<ContractChoice>(
    hasStoredContract ? 'keep' : 'upload'
  );
  const [newContractFile, setNewContractFile] = useState<File | null>(null);
  const [bidChoice, setBidChoice] = useState<BidChoice>(
    bidFileName ? 'keep' : 'none'
  );
  const [newBidFile, setNewBidFile] = useState<File | null>(null);

  const cancelRef = useRef<HTMLButtonElement>(null);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const bidFileRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContractChoice(hasStoredContract ? 'keep' : 'upload');
      setNewContractFile(null);
      setBidChoice(bidFileName ? 'keep' : 'none');
      setNewBidFile(null);
    }
  }, [isOpen, hasStoredContract, bidFileName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab') {
        const focusable = document.querySelectorAll<HTMLElement>(
          '[data-reanalyze-modal] button, [data-reanalyze-modal] input'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    cancelRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const canStart = contractChoice === 'keep' || newContractFile !== null;

  const handleConfirm = () => {
    onConfirm({
      contractFile: contractChoice === 'upload' ? newContractFile! : undefined,
      bidFile: bidChoice === 'upload' ? newBidFile! : undefined,
      keepCurrentContract: contractChoice === 'keep',
      removeBid: bidChoice === 'remove',
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      data-reanalyze-modal
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2.5">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Re-Analyze Contract</h3>
        </div>

        <div className="border-t border-slate-100 my-4" />

        {/* Contract PDF section */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 mb-2">Contract PDF</legend>
          <div className="space-y-1">
            {hasStoredContract && (
              <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="contract-choice"
                  className="w-4 h-4 text-blue-600"
                  checked={contractChoice === 'keep'}
                  onChange={() => setContractChoice('keep')}
                />
                <span className="text-sm text-slate-600">Keep current contract</span>
              </label>
            )}
            <label className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="radio"
                name="contract-choice"
                className="w-4 h-4 text-blue-600"
                checked={contractChoice === 'upload'}
                onChange={() => setContractChoice('upload')}
              />
              <span className="text-sm text-slate-600">Upload new contract PDF</span>
            </label>
            {contractChoice === 'upload' && (
              <div className="ml-6 mt-1">
                {newContractFile ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="truncate max-w-[200px]">{newContractFile.name}</span>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => contractFileRef.current?.click()}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => contractFileRef.current?.click()}
                  >
                    Select PDF...
                  </button>
                )}
                <input
                  ref={contractFileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewContractFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>
        </fieldset>

        <div className="border-t border-slate-100 my-4" />

        {/* Bid / Estimate PDF section */}
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 mb-2">Bid / Estimate PDF</legend>
          <div className="space-y-1">
            <label className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="radio"
                name="bid-choice"
                className="w-4 h-4 text-blue-600"
                checked={bidChoice === 'none'}
                onChange={() => setBidChoice('none')}
              />
              <span className="text-sm text-slate-600">No bid attached</span>
            </label>
            {bidFileName && (
              <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bid-choice"
                  className="w-4 h-4 text-blue-600"
                  checked={bidChoice === 'keep'}
                  onChange={() => setBidChoice('keep')}
                />
                <span className="text-sm text-slate-600">
                  Keep current bid ({bidFileName})
                </span>
              </label>
            )}
            <label className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="radio"
                name="bid-choice"
                className="w-4 h-4 text-blue-600"
                checked={bidChoice === 'upload'}
                onChange={() => setBidChoice('upload')}
              />
              <span className="text-sm text-slate-600">Upload new bid PDF</span>
            </label>
            {bidChoice === 'upload' && (
              <div className="ml-6 mt-1">
                {newBidFile ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="truncate max-w-[200px]">{newBidFile.name}</span>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => bidFileRef.current?.click()}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => bidFileRef.current?.click()}
                  >
                    Select PDF...
                  </button>
                )}
                <input
                  ref={bidFileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewBidFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
            {bidFileName && (
              <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bid-choice"
                  className="w-4 h-4 text-blue-600"
                  checked={bidChoice === 'remove'}
                  onChange={() => setBidChoice('remove')}
                />
                <span className="text-sm text-red-500">Remove bid</span>
              </label>
            )}
          </div>
        </fieldset>

        <div className="border-t border-slate-100 my-4" />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
          >
            Keep Current Documents
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canStart}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Analysis
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
