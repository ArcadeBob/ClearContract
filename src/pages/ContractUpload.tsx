import { UploadZone } from '../components/UploadZone';
import { ArrowLeft } from 'lucide-react';

interface ContractUploadProps {
  onUploadComplete: (file: File) => void;
  isAnalyzing?: boolean;
  onCancel?: () => void;
}
export function ContractUpload({ onUploadComplete, isAnalyzing, onCancel }: ContractUploadProps) {
  const handleBack = () => {
    if (isAnalyzing && onCancel) {
      onCancel();
    }
    window.history.back();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-2xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAnalyzing ? 'Cancel Analysis' : 'Back'}
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Upload Contract
            </h1>
            <p className="text-slate-500">
              Upload a PDF contract to start the AI analysis process.
            </p>
          </div>
          <UploadZone onFileSelect={onUploadComplete} />
        </div>
      </div>
    </div>
  );
}
