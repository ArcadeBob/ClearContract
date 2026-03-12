import { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setUploadError(null);
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) return;
    const rejection = fileRejections[0];
    const errorCode = rejection.errors[0]?.code;

    switch (errorCode) {
      case 'file-invalid-type':
        setUploadError('Only PDF files are accepted');
        break;
      case 'file-too-large':
        setUploadError(
          `File exceeds 10MB limit (${(rejection.file.size / 1024 / 1024).toFixed(1)}MB)`
        );
        break;
      default:
        setUploadError('File could not be accepted');
    }
  }, []);

  const onDragEnter = useCallback(() => {
    setUploadError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    onDragEnter,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  });

  const hasError = uploadError !== null;

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
        hasError
          ? 'border-red-400 hover:border-red-500 hover:bg-red-50/30'
          : isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
      }`}
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

      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 text-red-600 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
