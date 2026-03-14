import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
import { Toast, ToastData } from './components/Toast';
import { useContractStore } from './hooks/useContractStore';
import { useRouter } from './hooks/useRouter';
import { Contract } from './types/contract';
import { analyzeContract } from './api/analyzeContract';
export function App() {
  const {
    contracts,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    storageWarning,
    dismissStorageWarning,
  } = useContractStore();
  const { activeView, activeContractId, navigateTo } = useRouter();
  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // 1C: Redirect to dashboard if review view has no active contract (avoids setState during render)
  useEffect(() => {
    if (activeView === 'review' && !activeContract) {
      window.history.replaceState(null, '', '/');
      navigateTo('dashboard');
    }
  }, [activeView, activeContract, navigateTo]);

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
    setAnalyzingId(id);
    navigateTo('review', id);

    // Run analysis in background
    analyzeContract(file)
      .then((result) => {
        updateContract(id, {
          status: 'Reviewed',
          client: result.client,
          type: result.contractType,
          riskScore: result.riskScore,
          scoreBreakdown: result.scoreBreakdown,
          bidSignal: result.bidSignal,
          findings: result.findings,
          dates: result.dates,
          passResults: result.passResults,
        });
      })
      .catch((err) => {
        // Remove the failed placeholder instead of leaving a zombie contract
        deleteContract(id);

        // Navigate to dashboard (not upload) on initial analysis failure
        if (activeView === 'review' && activeContractId === id) {
          navigateTo('dashboard');
        }

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
      })
      .finally(() => {
        setAnalyzingId(null);
      });
  };

  const handleCancelAnalysis = () => {
    if (analyzingId) {
      deleteContract(analyzingId);
      setAnalyzingId(null);
    }
  };

  const handleReanalyze = (contractId: string, file: File) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    // Snapshot for rollback (REANA-03)
    const snapshot = structuredClone(contract);

    setReanalyzingId(contractId);

    analyzeContract(file)
      .then((result) => {
        updateContract(contractId, {
          status: 'Reviewed',
          name: file.name.replace(/\.pdf$/i, ''),
          client: result.client,
          type: result.contractType,
          riskScore: result.riskScore,
          scoreBreakdown: result.scoreBreakdown,
          bidSignal: result.bidSignal,
          findings: result.findings,
          dates: result.dates,
          passResults: result.passResults,
          uploadDate: new Date().toISOString().split('T')[0],
        });
        setToast({
          type: 'success',
          message: 'Analysis complete \u2014 findings updated.',
          onDismiss: () => setToast(null),
        });
      })
      .catch((err) => {
        // Restore previous state completely (REANA-03)
        updateContract(contractId, snapshot);

        if (isNetworkError(err)) {
          setToast({
            type: 'error',
            message: 'Connection failed. Your previous findings are unchanged.',
            onRetry: () => {
              setToast(null);
              handleReanalyze(contractId, file);
            },
            onDismiss: () => setToast(null),
          });
        } else {
          setToast({
            type: 'error',
            message: err instanceof Error
              ? `Analysis failed: ${err.message}. Your previous findings are unchanged.`
              : 'Analysis failed. Your previous findings are unchanged.',
            onDismiss: () => setToast(null),
          });
        }
      })
      .finally(() => {
        setReanalyzingId(null);
      });
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onNavigate={navigateTo} />;
      case 'upload':
        return (
          <ContractUpload
            onUploadComplete={handleUploadComplete}
            isAnalyzing={analyzingId !== null}
            onCancel={handleCancelAnalysis}
          />
        );
      case 'review':
        if (!activeContract) {
          // useEffect above will redirect to dashboard
          return null;
        }
        return (
          <ContractReview
            contract={activeContract}
            onBack={() => navigateTo('dashboard')}
            onDelete={handleDeleteContract}
            onToggleResolved={(findingId) => toggleFindingResolved(activeContract.id, findingId)}
            onUpdateNote={(findingId, note) => updateFindingNote(activeContract.id, findingId, note)}
            onReanalyze={(file) => handleReanalyze(activeContract.id, file)}
            isReanalyzing={reanalyzingId === activeContract.id}
            onShowToast={({ type, message }) => setToast({ type, message, onDismiss: () => setToast(null) })}
            onRename={(id, name) => updateContract(id, { name })}
          />
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
