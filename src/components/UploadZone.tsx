import { useCallback, useState } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  role?: 'contract' | 'bid';
  selectedFile?: File | null;
  onRemoveFile?: () => void;
}

const roleConfig = {
  contract: {
    maxSize: 10 * 1024 * 1024,
    maxLabel: '10MB',
    Icon: UploadCloud,
    heading: 'Upload Contract PDF',
    body: 'Drag and drop your PDF contract here, or click to browse files.',
    hint: 'PDF up to 10MB',
    border: 'border-slate-300',
    hoverBorder: 'hover:border-blue-400',
    bg: '',
    hoverBg: 'hover:bg-slate-50',
    padding: 'p-12',
  },
  bid: {
    maxSize: 5 * 1024 * 1024,
    maxLabel: '5MB',
    Icon: FileSpreadsheet,
    heading: 'Add Bid / Estimate PDF',
    body: 'Optional -- attach your bid to enable cross-document analysis.',
    hint: 'PDF up to 5MB',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-blue-400',
    bg: 'bg-slate-50/50',
    hoverBg: 'hover:bg-slate-50',
    padding: 'p-8',
  },
} as const;

export function UploadZone({ onFileSelect, role = 'contract', selectedFile, onRemoveFile }: UploadZoneProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const config = roleConfig[role];

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
          `File exceeds ${config.maxLabel} limit (${(rejection.file.size / 1024 / 1024).toFixed(1)}MB)`
        );
        break;
      default:
        setUploadError('File could not be accepted');
    }
  }, [config.maxLabel]);

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
    maxSize: config.maxSize,
  });

  const hasError = uploadError !== null;
  const Icon = config.Icon;

  // File-selected state: show file info + remove button
  if (selectedFile) {
    const fileName = selectedFile.name;
    const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(1);
    return (
      <div className={`relative border-2 rounded-xl ${config.padding} flex flex-col items-center justify-center text-center transition-all duration-200 border-slate-300 ${config.bg}`}>
        {role === 'bid' && (
          <span className="absolute top-3 right-3 text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Optional</span>
        )}
        <div className="p-4 rounded-full mb-4 bg-blue-100">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-sm font-medium text-slate-900 mb-1">{fileName} ({fileSizeMB}MB)</p>
        <button
          onClick={onRemoveFile}
          className="text-red-500 hover:text-red-600 text-xs font-medium"
          aria-label={`Remove ${fileName}`}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-xl ${config.padding} flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
        hasError
          ? 'border-red-400 hover:border-red-500 hover:bg-red-50/30'
          : isDragActive
            ? 'border-blue-500 bg-blue-50'
            : `${config.border} ${config.hoverBorder} ${config.bg} ${config.hoverBg}`
      }`}
    >
      <input {...getInputProps()} />
      {role === 'bid' && (
        <span className="absolute top-3 right-3 text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Optional</span>
      )}
      <div
        className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        <Icon
          className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`}
        />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {isDragActive ? 'Drop contract here' : config.heading}
      </h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
        {config.body}
      </p>

      <div className="flex items-center space-x-4 text-xs text-slate-400">
        <span className="flex items-center">
          <FileText className="w-3 h-3 mr-1" /> {config.hint}
        </span>
        <span>&bull;</span>
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
