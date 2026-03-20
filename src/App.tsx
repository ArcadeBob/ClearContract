import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
import { ContractComparison } from './pages/ContractComparison';
import { useContractStore } from './hooks/useContractStore';
import { useRouter } from './hooks/useRouter';
import { useToast } from './hooks/useToast';
import { Finding } from './types/contract';
import { supabase } from './lib/supabase';
import { analyzeContract } from './api/analyzeContract';
import { classifyError } from './utils/errors';
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
  } = useContractStore();
  const { activeView, activeContractId, compareIds, navigateTo } = useRouter();
  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const { showToast } = useToast();
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const activeViewRef = useRef(activeView);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);

  const pendingFileRef = useRef<File | null>(null);

  // Show error toast on fetch failure
  useEffect(() => {
    if (contractsError) {
      showToast({ type: 'error', message: contractsError });
    }
  }, [contractsError, showToast]);

  // 1C: Redirect to dashboard if review view has no active contract (avoids setState during render)
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

  const handleUploadComplete = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast({ type: 'error', message: 'Please sign in to analyze contracts.' });
      return;
    }

    pendingFileRef.current = file;
    setAnalyzingId('pending');

    try {
      const contract = await analyzeContract(file, session.access_token);
      addContract(contract);

      if (activeViewRef.current === 'upload') {
        // User still on upload page -- navigate to review
        navigateTo('review', contract.id);
      } else {
        // User navigated away -- show success toast with "View Contract" action
        showToast({
          type: 'success',
          message: 'Analysis complete',
          actionLabel: 'View Contract',
          onRetry: () => navigateTo('review', contract.id),
        });
      }
    } catch (err) {
      const classified = classifyError(err);
      showToast({
        type: 'error',
        message: classified.userMessage,
        ...(classified.retryable ? {
          onRetry: () => {
            if (pendingFileRef.current) {
              handleUploadComplete(pendingFileRef.current);
            }
          },
        } : {}),
      });
    } finally {
      setAnalyzingId(null);
      pendingFileRef.current = null;
    }
  };

  const handleReanalyze = async (contractId: string, file: File) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      showToast({ type: 'error', message: 'Please sign in to analyze contracts.' });
      return;
    }

    // Snapshot for rollback (REANA-03)
    const snapshot = structuredClone(contract);
    setReanalyzingId(contractId);

    try {
      const result = await analyzeContract(file, session.access_token, contractId);

      // Build lookup from old findings with user data (PORT-04)
      const oldByKey = new Map<string, Finding>();
      for (const f of contract.findings) {
        if (f.resolved || f.note) {
          const ref = f.clauseReference;
          if (ref && ref !== 'N/A' && ref !== 'Not Found') {
            oldByKey.set(`${ref}::${f.category}`, f);
          }
        }
      }

      // Carry over resolved/note to matching new findings
      let preservedResolved = 0;
      let preservedNotes = 0;
      const mergedFindings = result.findings.map((newFinding: Finding) => {
        const ref = newFinding.clauseReference;
        if (ref && ref !== 'N/A' && ref !== 'Not Found') {
          const old = oldByKey.get(`${ref}::${newFinding.category}`);
          if (old) {
            if (old.resolved) preservedResolved++;
            if (old.note) preservedNotes++;
            return { ...newFinding, resolved: old.resolved, note: old.note };
          }
        }
        return newFinding;
      });

      // Replace in-memory contract with server response + preserved user data
      updateContract(contractId, {
        ...result,
        findings: mergedFindings,
      });

      // Write preserved resolved/note values back to Supabase for matched findings
      // These findings have NEW IDs from the server response (old rows were deleted)
      const findingsToPreserve = mergedFindings.filter(
        (f: Finding) => f.resolved || (f.note && f.note !== '')
      );

      if (findingsToPreserve.length > 0) {
        const preserveWrites = await Promise.all(
          findingsToPreserve.map((f: Finding) =>
            supabase
              .from('findings')
              .update({ resolved: f.resolved, note: f.note || '' })
              .eq('id', f.id)
          )
        );

        const failures = preserveWrites.filter((r) => r.error);
        if (failures.length > 0) {
          console.error(
            'Some finding preservation writes failed:',
            failures.map((r) => r.error)
          );
          // Non-blocking: in-memory state is correct, and findings exist in DB from server write
          // Do NOT show user toast -- this is a silent degradation
        }
      }

      const preserveMsg =
        preservedResolved > 0 || preservedNotes > 0
          ? `Re-analysis complete. ${preservedResolved} resolved + ${preservedNotes} notes preserved.`
          : 'Analysis complete \u2014 findings updated.';

      showToast({ type: 'success', message: preserveMsg });
    } catch (err) {
      // Restore previous state completely (REANA-03)
      updateContract(contractId, snapshot);

      const classified = classifyError(err);
      showToast({
        type: 'error',
        message: classified.userMessage + ' Your previous findings are unchanged.',
        ...(classified.retryable ? {
          onRetry: () => handleReanalyze(contractId, file),
        } : {}),
      });
    } finally {
      setReanalyzingId(null);
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
            onRename={(id, name) => renameContract(id, name)}
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
