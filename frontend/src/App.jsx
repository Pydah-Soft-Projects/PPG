import { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { OverviewView } from './views/OverviewView';
import { TransactionsView } from './views/TransactionsView';
import { ProvidersView } from './views/ProvidersView';
import { CollegesRoutingView } from './views/CollegesRoutingView';
import { ApplicationsView } from './views/ApplicationsView';
import { RefundsView } from './views/RefundsView';
import { ReconciliationView } from './views/ReconciliationView';
import { AuditLogsView } from './views/AuditLogsView';

function DashboardContent() {
  const { user, loading } = useAuth();
  const [currentTab, setTab] = useState('overview');
  const [selectedTx, setSelectedTx] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 text-sm font-semibold animate-pulse">
          Loading Pydah Payment Gateway...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const titles = {
    overview: 'Operational Dashboard',
    transactions: 'Transaction Ledger',
    providers: 'Payment Accounts',
    colleges: 'Colleges & Course Routing',
    applications: 'Registered Applications',
    refunds: 'Refunds & Returns',
    reconciliation: 'Reconciliation & Recovery',
    audit: 'Security & Audit Logs',
  };

  const handleSelectTransactionFromOverview = (tx) => {
    setSelectedTx(tx);
    setTab('transactions');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar currentTab={currentTab} setTab={setTab} />
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Navbar title={titles[currentTab] || 'Payment Gateway'} />
        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewView onSelectTransaction={handleSelectTransactionFromOverview} />
          )}
          {currentTab === 'transactions' && (
            <TransactionsView selectedTx={selectedTx} setSelectedTx={setSelectedTx} />
          )}
          {currentTab === 'providers' && <ProvidersView />}
          {currentTab === 'colleges' && <CollegesRoutingView />}
          {currentTab === 'applications' && <ApplicationsView />}
          {currentTab === 'refunds' && <RefundsView />}
          {currentTab === 'reconciliation' && <ReconciliationView />}
          {currentTab === 'audit' && <AuditLogsView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DashboardContent />
      </AuthProvider>
    </ToastProvider>
  );
}
