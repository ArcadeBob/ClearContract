import React, { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { FileText } from 'lucide-react';
interface ContractUploadProps {
  onUploadComplete: (file: File) => void;
}
export function ContractUpload({ onUploadComplete }: ContractUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setIsAnalyzing(true);
  };
  const handleAnalysisComplete = () => {
    if (file) {
      onUploadComplete(file);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
        {!isAnalyzing ?
        <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Upload Contract
              </h1>
              <p className="text-slate-500">
                Upload a PDF contract to start the AI analysis process.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} />
          </> :

        <div className="animate-in fade-in duration-500">
            {file &&
          <div className="flex items-center justify-center mb-8 p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-sm mx-auto">
                <FileText className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-sm font-medium text-slate-700 truncate">
                  {file.name}
                </span>
              </div>
          }
            <AnalysisProgress onComplete={handleAnalysisComplete} />
          </div>
        }
      </div>
    </div>);

}