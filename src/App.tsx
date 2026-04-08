import { useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
import { ContractComparison } from './pages/ContractComparison';
import { useContractStore } from './hooks/useContractStore';
import { useContractAnalysis } from './hooks/useContractAnalysis';
import { useRouter } from './hooks/useRouter';
import { useToast } from './hooks/useToast';
import { countDeadlinesWithin7Days } from './utils/dateUrgency';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { LoadingScreen } from './components/LoadingScreen';

function AuthenticatedApp({ signOut }: { signOut: () => Promise<void> }) {
  const {
    contracts,
    isLoading: contractsLoading,
    error: contractsError,
    addContract,
    updateContract,
    deleteContract,
    toggleFindingResolved,
    updateFindingNote,
    renameContract,
    updateLifecycleStatus,
  } = useContractStore();
  const { activeView, activeContractId, compareIds, navigateTo } = useRouter();
  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const { showToast } = useToast();

  const deadlineCount = useMemo(() => {
    const allDates = contracts
      .filter(c => c.status === 'Reviewed' || c.status === 'Partial')
      .flatMap(c => c.dates);
    return countDeadlinesWithin7Days(allDates);
  }, [contracts]);

  const activeViewRef = useRef(activeView);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);

  const {
    analyzingId,
    analyzingHasBid,
    reanalyzingId,
    handleUploadComplete,
    handleReanalyze,
  } = useContractAnalysis({
    contracts,
    addContract,
    updateContract,
    navigateTo,
    activeViewRef,
  });

  // Show error toast on fetch failure
  useEffect(() => {
    if (contractsError) {
      showToast({ type: 'error', message: contractsError });
    }
  }, [contractsError, showToast]);

  // Redirect to dashboard if review view has no active contract
  useEffect(() => {
    if (activeView === 'review' && !activeContract) {
      window.history.replaceState(null, '', '/');
      navigateTo('dashboard');
    }
  }, [activeView, activeContract, navigateTo]);

  if (contractsLoading) {
    return <LoadingScreen />;
  }

  const handleDeleteContract = (id: string) => {
    const isDeletingActive = activeContract?.id === id;
    deleteContract(id);
    if (isDeletingActive) {
      navigateTo('dashboard');
    }
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
            hasBid={analyzingHasBid}
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
            onReanalyze={(result) => handleReanalyze(activeContract.id, result)}
            isReanalyzing={reanalyzingId === activeContract.id}
            onRename={(id, name) => renameContract(id, name)}
            onLifecycleChange={updateLifecycleStatus}
          />
        );

      case 'contracts':
        return <AllContracts contracts={contracts} onNavigate={navigateTo} onDelete={handleDeleteContract} />;

      case 'compare': {
        const a = contracts.find(c => c.id === compareIds?.[0]);
        const b = contracts.find(c => c.id === compareIds?.[1]);
        if (!a || !b) {
          // Missing contract(s), redirect to contracts list
          navigateTo('contracts');
          return null;
        }
        return <ContractComparison contractA={a} contractB={b} onBack={() => navigateTo('contracts')} />;
      }

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
        deadlineBadge={deadlineCount}
        onSignOut={signOut}
      />

      <main className="flex-1 h-full overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
}

export function App() {
  const { session, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return <AuthenticatedApp signOut={signOut} />;
}
