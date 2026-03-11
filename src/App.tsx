import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
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
    navigateTo,
  } = useContractStore();
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
        updateContract(id, {
          status: 'Reviewed',
          client: 'Unknown',
          riskScore: 0,
          findings: [
            {
              id: `f-${Date.now()}-err`,
              severity: 'Critical',
              category: 'Risk Assessment',
              title: 'Analysis Failed',
              description:
                err instanceof Error
                  ? err.message
                  : 'An unexpected error occurred during analysis.',
              recommendation: 'Please try uploading the contract again.',
            },
          ],
        });
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
          />
        ) : (
          <Dashboard contracts={contracts} onNavigate={navigateTo} />
        );

      case 'contracts':
        return <AllContracts contracts={contracts} onNavigate={navigateTo} />;
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

      <main className="flex-1 h-full overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
}
