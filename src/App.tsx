import React, { useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContractUpload } from './pages/ContractUpload';
import { ContractReview } from './pages/ContractReview';
import { AllContracts } from './pages/AllContracts';
import { Settings } from './pages/Settings';
import { useContractStore } from './hooks/useContractStore';
import { Contract } from './types/contract';
export function App() {
  const {
    contracts,
    activeContract,
    activeView,
    addContract,
    navigateTo,
    setActiveContractId
  } = useContractStore();
  const handleUploadComplete = (file: File) => {
    // Create a new mock contract from the uploaded file
    const newContract: Contract = {
      id: `c-${Date.now()}`,
      name: file.name.replace('.pdf', ''),
      client: 'New Client Inc.',
      type: 'Prime Contract',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'Reviewed',
      riskScore: 65,
      dates: [
      {
        label: 'Start Date',
        date: '2024-01-01',
        type: 'Start'
      },
      {
        label: 'Completion',
        date: '2024-12-31',
        type: 'Deadline'
      }],

      findings: [
      {
        id: `f-${Date.now()}-1`,
        severity: 'High',
        category: 'Legal Issues',
        title: 'Missing Termination Clause',
        description:
        'Contract does not specify termination for convenience terms.',
        recommendation: 'Add standard termination clause.',
        clauseReference: 'Section 12'
      },
      {
        id: `f-${Date.now()}-2`,
        severity: 'Medium',
        category: 'Insurance Requirements',
        title: 'High Deductible',
        description:
        'Insurance deductible requirement is higher than standard policy.',
        recommendation: 'Verify with broker.',
        clauseReference: 'Exhibit B'
      }]

    };
    addContract(newContract);
    navigateTo('review', newContract.id);
  };
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onNavigate={navigateTo} />;
      case 'upload':
        return <ContractUpload onUploadComplete={handleUploadComplete} />;
      case 'review':
        return activeContract ?
        <ContractReview
          contract={activeContract}
          onBack={() => navigateTo('dashboard')} /> :


        <Dashboard contracts={contracts} onNavigate={navigateTo} />;

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
        contractCount={contracts.length} />


      <main className="flex-1 h-full overflow-hidden relative">
        {renderContent()}
      </main>
    </div>);

}