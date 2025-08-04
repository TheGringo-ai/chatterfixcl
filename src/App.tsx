import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import './App.css';

// Components
import LandingPage from './LandingPage';
import DocumentManager from './components/DocumentManager';
import AssetManager from './components/AssetManager';
import OnboardingPage from './components/OnboardingPage';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import VoiceInterface from './components/Voice/VoiceInterface';
import OCRScanner from './components/OCR/OCRScanner';
import ChatInterface from './components/Chat/ChatInterface';
import WorkOrderList from './components/WorkOrder/WorkOrderList';

// Contexts and Hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useErrorHandler } from './hooks/useErrorHandler';

// Types
import { Asset, WorkOrder, ChatMessage, InventoryItem, CompanyData } from './types';

// Main App Component
const ChatterFixApp: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { error, handleError, clearError, withErrorHandler } = useErrorHandler();
  
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentView, setCurrentView] = useState<string>('voice');
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Demo Company',
    location: 'Demo Location',
    setupDate: new Date().toISOString().split('T')[0]
  });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

    // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const storageApiUrl = process.env.REACT_APP_STORAGE_API_URL || process.env.REACT_APP_LLAMA_API_URL;
        if (storageApiUrl) {
          // Load data from API
        }
      } catch (err) {
        handleError(err);
        loadDemoData();
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    } else {
      // For unauthenticated users, set loading to false immediately
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  // Save data whenever it changes
  useEffect(() => {
    if (isAuthenticated && !isLoadingData) {
      const data: CompanyData = {
        assets,
        inventory,
        workOrders,
        companyInfo
      };
      try {
        localStorage.setItem('chatterfix-data', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save data:', err);
      }
    }
  }, [assets, inventory, workOrders, companyInfo, isAuthenticated, isLoadingData]);

  const loadDemoData = () => {
    const demoAssets: Record<string, Asset> = {
      'multivac ais': {
        id: 'MV-AIS-001',
        name: 'Multivac AIS Packaging Line',
        location: 'Production Floor A',
        status: 'Running',
        lastMaintenance: '2024-07-15'
      },
      'conveyor belt 3': {
        id: 'CB-003',
        name: 'Conveyor Belt #3',
        location: 'Assembly Line B',
        status: 'Warning',
        lastMaintenance: '2024-07-20'
      }
    };

    const demoInventory: Record<string, InventoryItem> = {
      'vacuum pump seal': { stock: 5, location: 'Shelf A-12', cost: 45.50 },
      'heating element': { stock: 2, location: 'Shelf B-08', cost: 120.00 },
      'sealing bar': { stock: 0, location: 'Shelf A-15', cost: 89.99, orderNeeded: true },
      'conveyor roller': { stock: 8, location: 'Shelf C-03', cost: 25.30 }
    };

    setAssets(demoAssets);
    setInventory(demoInventory);
  };

  // AI Response Handler (wrapped with error handler)
  const getAIResponse = withErrorHandler(async (prompt: string): Promise<string> => {
    const llamaApiUrl = process.env.REACT_APP_LLAMA_API_URL;
    
    if (!llamaApiUrl) {
      return "Llama API URL not configured. Please set REACT_APP_LLAMA_API_URL environment variable.";
    }

    setIsProcessingAI(true);
    
    try {
      const response = await fetch(`${llamaApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: `Current assets: ${Object.keys(assets).join(', ')}. Current inventory: ${Object.keys(inventory).join(', ')}.`
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || 'Sorry, I could not process your request.';
    } finally {
      setIsProcessingAI(false);
    }
  });

  // Work Order Handlers
  const handleWorkOrderCreate = (workOrder: WorkOrder) => {
    setActiveWorkOrder(workOrder);
    setWorkOrders(prev => [workOrder, ...prev]);
  };

  const handleWorkOrderUpdate = (updatedWorkOrder: WorkOrder) => {
    setWorkOrders(prev => 
      prev.map(wo => wo.id === updatedWorkOrder.id ? updatedWorkOrder : wo)
    );
    if (activeWorkOrder?.id === updatedWorkOrder.id) {
      setActiveWorkOrder(updatedWorkOrder.status === 'Completed' ? null : updatedWorkOrder);
    }
  };

  const handleChatMessage = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message]);
  };

  const handleLogout = async () => {
    await logout();
    setShowLandingPage(true);
  };

  // Show loading spinner while checking auth
  if (authLoading || isLoadingData) {
    return <LoadingSpinner fullScreen message="Loading ChatterFix..." />;
  }

  // Show landing page if not authenticated and landing page is active
  if (!isAuthenticated && showLandingPage) {
    return (
      <ErrorBoundary>
        <LandingPage onEnterApp={() => setShowLandingPage(false)} />
      </ErrorBoundary>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onSuccess={() => setShowOnboarding(true)} />
      </ErrorBoundary>
    );
  }

  // Show onboarding for new users
  if (showOnboarding && !localStorage.getItem('chatterfix-onboarded')) {
    return (
      <ErrorBoundary>
        <OnboardingPage 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('chatterfix-onboarded', 'true');
          }} 
        />
      </ErrorBoundary>
    );
  }

  // Main app interface
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">ChatterFix</h1>
                <span className="ml-3 text-sm text-gray-500">
                  Welcome, {user?.name || 'User'}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('settings')}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {['voice', 'ocr', 'assets', 'documents'].map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    currentView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {view === 'ocr' ? 'OCR Scanner' : view}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Error Display */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error.message}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'voice' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <VoiceInterface
                  assets={assets}
                  activeWorkOrder={activeWorkOrder}
                  onWorkOrderCreate={handleWorkOrderCreate}
                  onWorkOrderUpdate={handleWorkOrderUpdate}
                  onChatMessage={handleChatMessage}
                  getAIResponse={getAIResponse}
                />
                <WorkOrderList
                  workOrders={workOrders}
                  activeWorkOrderId={activeWorkOrder?.id}
                  onSelectWorkOrder={setActiveWorkOrder}
                />
              </div>
              <ChatInterface 
                messages={chatHistory} 
                isProcessing={isProcessingAI}
              />
            </div>
          )}

          {currentView === 'ocr' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OCRScanner
                onChatMessage={handleChatMessage}
                getAIResponse={getAIResponse}
              />
              <ChatInterface 
                messages={chatHistory} 
                isProcessing={isProcessingAI}
              />
            </div>
          )}

          {currentView === 'assets' && (
            <AssetManager onAssetSelected={(asset) => console.log('Asset selected:', asset)} />
          )}

          {currentView === 'documents' && (
            <DocumentManager assets={assets} />
          )}

          {currentView === 'settings' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Company Information</h3>
                  <p className="text-sm text-gray-600">{companyInfo.name}</p>
                  <p className="text-sm text-gray-600">{companyInfo.location}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">User Profile</h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                  <p className="text-sm text-gray-600">Role: {user?.role}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

// Root App with Providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatterFixApp />
    </AuthProvider>
  );
};

export default App;