import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
import { Toast, ToastData } from './components/Toast';
import { useContractStore } from './hooks/useContractStore';
import { Contract } from './types/contract';
import { analyzeContract } from './api/analyzeContract';
export function App() {
  const {
    contracts,
    activeContract,
    activeView,
    addContract,
    updateContract,
    deleteContract,
    navigateTo,
    storageWarning,
    dismissStorageWarning,
  } = useContractStore();
  const [toast, setToast] = useState<ToastData | null>(null);

  const handleDeleteContract = (id: string) => {
    const isDeletingActive = activeContract?.id === id;
    deleteContract(id);
    if (isDeletingActive) {
      navigateTo('dashboard');
    }
  };

  const isNetworkError = (err: unknown): boolean => {
    if (err instanceof TypeError && err.message === 'Failed to fetch') return true;
    if (err instanceof Error && err.message.includes('NetworkError')) return true;
    return false;
  };

  const handleUploadComplete = (file: File) => {
    const id = `c-${Date.now()}`;

    // Create placeholder contract in Analyzing state
    const placeholder: Contract = {
      id,
      name: file.name.replace('.pdf', ''),
      client: 'Analyzing...',
      type: 'Prime Contract',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'Analyzing',
      riskScore: 0,
      findings: [],
      dates: [],
    };
    addContract(placeholder);
    navigateTo('review', id);

    // Run analysis in background
    analyzeContract(file)
      .then((result) => {
        updateContract(id, {
          status: 'Reviewed',
          client: result.client,
          type: result.contractType,
          riskScore: result.riskScore,
          bidSignal: result.bidSignal,
          findings: result.findings,
          dates: result.dates,
          passResults: result.passResults,
        });
      })
      .catch((err) => {
        // Mark the placeholder as failed and navigate back to upload
        updateContract(id, {
          status: 'Reviewed',
          client: 'Error',
          riskScore: 0,
          findings: [],
          dates: [],
        });
        navigateTo('upload');

        if (isNetworkError(err)) {
          setToast({
            type: 'error',
            message:
              'Connection failed. Check your internet and try again.',
            onRetry: () => {
              setToast(null);
              handleUploadComplete(file);
            },
            onDismiss: () => setToast(null),
          });
        } else {
          setToast({
            type: 'error',
            message:
              err instanceof Error
                ? err.message
                : 'Analysis failed. Please try again.',
            onDismiss: () => setToast(null),
          });
        }
      });
  };
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onNavigate={navigateTo} />;
      case 'upload':
        return <ContractUpload onUploadComplete={handleUploadComplete} />;
      case 'review':
        return activeContract ? (
          <ContractReview
            contract={activeContract}
            onBack={() => navigateTo('dashboard')}
            onDelete={handleDeleteContract}
          />
        ) : (
          <Dashboard contracts={contracts} onNavigate={navigateTo} />
        );

      case 'contracts':
        return <AllContracts contracts={contracts} onNavigate={navigateTo} onDelete={handleDeleteContract} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard contracts={contracts} onNavigate={navigateTo} />;
    }
  };
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeView={activeView}
        onNavigate={(view) => navigateTo(view)}
        contractCount={contracts.length}
      />

      {storageWarning && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg flex items-start gap-3">
          <span className="text-amber-600 text-sm flex-1">{storageWarning}</span>
          <button
            onClick={dismissStorageWarning}
            className="text-amber-400 hover:text-amber-600 text-lg leading-none"
            aria-label="Dismiss warning"
          >
            &times;
          </button>
        </div>
      )}

      <main className="flex-1 h-full overflow-hidden relative">
        <AnimatePresence>
          {toast && <Toast {...toast} />}
        </AnimatePresence>
        {renderContent()}
      </main>
    </div>
  );
}
