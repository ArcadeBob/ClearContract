import { useCallback } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}
export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  });
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
    >
      <input {...getInputProps()} />
      <div
        className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        <UploadCloud
          className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`}
        />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {isDragActive ? 'Drop contract here' : 'Upload Contract PDF'}
      </h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
        Drag and drop your PDF contract here, or click to browse files.
      </p>

      <div className="flex items-center space-x-4 text-xs text-slate-400">
        <span className="flex items-center">
          <FileText className="w-3 h-3 mr-1" /> PDF up to 10MB
        </span>
        <span>•</span>
        <span>Secure Encryption</span>
      </div>
    </div>
  );
}
