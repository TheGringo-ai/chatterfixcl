import React, { useState, useEffect, useCallback } from 'react';
import { Settings, HelpCircle } from 'lucide-react';
import './App.css';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import LandingPage from './LandingPage';
import DocumentManager from './components/DocumentManager';
import AssetManager from './components/AssetManager';
import PartsInventory from './components/PartsInventory';
import ManagerDashboard from './components/ManagerDashboard';
import OnboardingPage from './components/OnboardingPage';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import VoiceInterface from './components/Voice/VoiceInterface';
import OCRScanner from './components/OCR/OCRScanner';
import ChatInterface from './components/Chat/ChatInterface';
import TechnicianWorkOrderView from './components/TechnicianWorkOrderView';
import WorkOrderList from './components/WorkOrder/WorkOrderList';
import WorkOrderDashboard from './components/WorkOrderDashboard';
import AIChat from './components/AIChat';
import OnboardingGuide from './components/OnboardingGuide';
import EnhancedWorkOrderDetail from './components/EnhancedWorkOrderDetail';
import PreventiveMaintenanceManager from './components/PreventiveMaintenanceManager';
import PredictiveMaintenanceEngine from './components/PredictiveMaintenanceEngine';
import SmartInventoryManager from './components/SmartInventoryManager';
import NoCodeWorkflowEngine from './components/NoCodeWorkflowEngine';

// Contexts and Hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useErrorHandler } from './hooks/useErrorHandler';
import { useOnboarding } from './hooks/useOnboarding';

// Types
import { Asset, WorkOrder, ChatMessage, InventoryItem, CompanyData } from './types';

const onboardingSteps = [
    {
      title: 'Welcome to ChatterFix!',
      content: 'This guide will walk you through the key AI features. You can create work orders just by talking or typing.',
      targetId: 'voice-interface-container',
    },
    {
      title: 'AI-Powered Voice and Chat',
      content: 'Use this chat window to interact with our AI. Try creating a work order by typing something like: "Create a work order to fix the conveyor belt, it is making a loud noise."',
      targetId: 'ai-chat-container',
    },
    {
      title: 'Technician View',
      content: 'Technicians can view and manage their assigned work orders here. They can update the status, add notes, and upload photos.',
      targetId: 'technician-view-nav',
    },
    {
      title: 'Manager Dashboard',
      content: 'If you are a manager, you can get a full overview of all operations from the Manager Dashboard, accessible from the landing page.',
      targetId: 'back-to-landing-button',
    },
];

// Main App Component
const ChatterFixApp: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { error, handleError, clearError } = useErrorHandler();
  
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showManagerDemo, setShowManagerDemo] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentView, setCurrentView] = useState<string>('voice');
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [companyInfo] = useState({
    name: 'Demo Company',
    location: 'Demo Location',
    setupDate: new Date().toISOString().split('T')[0]
  });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedWorkOrderDetail, setSelectedWorkOrderDetail] = useState<WorkOrder | null>(null);

  const {
    isOnboardingActive,
    currentStep,
    nextStep,
    prevStep,
    finishOnboarding,
    startOnboarding,
    hasCompletedOnboarding,
  } = useOnboarding(onboardingSteps.length);

  useEffect(() => {
    if (isAuthenticated && !hasCompletedOnboarding) {
      setTimeout(() => startOnboarding(), 500);
    }
  }, [isAuthenticated, hasCompletedOnboarding, startOnboarding]);

  const loadDemoData = useCallback(() => {
    const demoAssets: Record<string, Asset> = {
      'multivac ais': { id: 'MV-AIS-001', name: 'Multivac AIS Packaging Line', location: 'Production Floor A', status: 'Running', lastMaintenance: '2024-07-15' },
      'conveyor belt 3': { id: 'CB-003', name: 'Conveyor Belt #3', location: 'Assembly Line B', status: 'Warning', lastMaintenance: '2024-07-20' }
    };
    const demoInventory: Record<string, InventoryItem> = {
      'vacuum pump seal': { stock: 5, location: 'Shelf A-12', cost: 45.50 },
      'heating element': { stock: 2, location: 'Shelf B-08', cost: 120.00 },
      'sealing bar': { stock: 0, location: 'Shelf A-15', cost: 89.99, orderNeeded: true },
      'conveyor roller': { stock: 8, location: 'Shelf C-03', cost: 25.30 }
    };
    setAssets(demoAssets);
    setInventory(demoInventory);
    setWorkOrders([]);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const savedData = localStorage.getItem('chatterfix-data');
        if (savedData) {
          const parsedData: CompanyData = JSON.parse(savedData);
          setAssets(parsedData.assets || {});
          setInventory(parsedData.inventory || {});
          setWorkOrders(parsedData.workOrders || []);
        } else {
          loadDemoData();
        }
      } catch (err) {
        handleError(new Error('Failed to load application data.'));
        loadDemoData();
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    } else {
      setIsLoadingData(false);
    }
  }, [isAuthenticated, handleError, loadDemoData]);

  useEffect(() => {
    if (isAuthenticated && !isLoadingData) {
      const data: CompanyData = { assets, inventory, workOrders, companyInfo };
      try {
        localStorage.setItem('chatterfix-data', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save data:', err);
        handleError(new Error('Could not save your changes.'));
      }
    }
  }, [assets, inventory, workOrders, companyInfo, isAuthenticated, isLoadingData, handleError]);

  // Support multiple AI endpoints: local Llama, online Llama, or fallback
  const llamaApiUrl = process.env.REACT_APP_LLAMA_API_URL || 'https://chatterfix-llama-api-650169261019.us-central1.run.app';
  const backendApiUrl = process.env.REACT_APP_API_BASE || 'https://chatterfix-api-650169261019.us-central1.run.app';

  const getAIResponse = async (prompt: string, context?: string): Promise<string> => {
    setIsProcessingAI(true);
    try {
      // First try online Llama API (Ollama format)
      console.log('Attempting Llama API connection to:', llamaApiUrl);
      if (llamaApiUrl) {
        try {
          const fullPrompt = context 
            ? `You are a maintenance assistant for CMMS (Computerized Maintenance Management System). Context: ${context}\n\nUser request: ${prompt}\n\nProvide a helpful, structured response for maintenance work.`
            : `You are a maintenance assistant for CMMS. User request: ${prompt}\n\nProvide a helpful response for maintenance work.`;

          // Create AbortController for timeout handling
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 90000); // 90 second timeout

          const response = await fetch(`${llamaApiUrl}/api/generate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ 
              model: 'llama3.2:3b',
              prompt: fullPrompt,
              stream: false,
              options: {
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 300
              }
            }),
            signal: abortController.signal
          });

          clearTimeout(timeoutId);
          
          console.log('Llama API response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            console.log('Llama API success:', data);
            return data.response || 'AI response received successfully.';
          } else {
            const errorText = await response.text();
            console.warn('Llama API error:', response.status, errorText);
          }
        } catch (llamaError) {
          console.error('Llama API connection failed:', llamaError);
        }
      }

      // Fallback to backend AI service
      const response = await fetch(`${backendApiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: context ? `Context: ${context}\n\nQuery: ${prompt}` : prompt,
          context,
          model: 'maintenance-assistant'
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend AI error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.content || 'AI processing completed.';

    } catch (error: any) {
      console.error('AI Response error:', error);
      
      // Provide helpful fallback responses based on prompt content
      if (prompt.toLowerCase().includes('work order') || prompt.toLowerCase().includes('maintenance')) {
        return 'I understand you want to work with maintenance tasks. While I\'m having connectivity issues, you can still create and manage work orders using the interface.';
      } else if (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('new')) {
        return 'I can help you create new items. Please use the form fields to enter the details you mentioned.';
      } else if (prompt.toLowerCase().includes('problem') || prompt.toLowerCase().includes('issue')) {
        return 'I\'ve noted your concern. Please document the issue details in the work order description and assign appropriate priority level.';
      }
      
      return 'I\'m currently having trouble connecting to AI services. Please continue using the manual interface.';
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleWorkOrderCreate = (workOrder: WorkOrder) => {
    const newWorkOrder = { ...workOrder, id: `WO-${Date.now()}`};
    setWorkOrders(prev => [newWorkOrder, ...prev]);
    setActiveWorkOrder(newWorkOrder);
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
    setWorkOrders([]);
    setAssets({});
    setInventory({});
    setChatHistory([]);
    setActiveWorkOrder(null);
    setCurrentView('voice');
  };

  // Show landing page first - don't wait for auth loading
  if (showLandingPage) {
    return (
      <ErrorBoundary>
        <LandingPage
          onManagerDemo={() => {
            setShowLandingPage(false);
            setShowManagerDemo(true);
          }}
          onTechnicianDemo={() => {
            setShowLandingPage(false);
            setShowManagerDemo(false);
          }}
          onLogout={handleLogout}
          onEnterApp={() => {
            setShowLandingPage(false);
            setShowManagerDemo(false);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Show Manager Dashboard Demo (no auth required)
  if (showManagerDemo) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-100">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">ChatterFix Demo</h1>
                  <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Manager Dashboard Demo</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button id="back-to-landing-button" onClick={() => { setShowManagerDemo(false); setShowLandingPage(true); }} className="text-sm text-gray-500 hover:text-gray-700">
                    ← Back to Landing
                  </button>
                  <button onClick={() => { setShowManagerDemo(false); setShowLandingPage(false); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Try Full App with Chat
                  </button>
                </div>
              </div>
            </div>
          </header>
          <ManagerDashboard getAIResponse={getAIResponse} />
        </div>
      </ErrorBoundary>
    );
  }

  // Show loading spinner only if we're still checking auth AND user clicked enter app
  if (authLoading || isLoadingData) {
    return <LoadingSpinner fullScreen message={authLoading ? "Authenticating..." : "Loading your data..."} />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onSuccess={() => {
          const hasOnboarded = localStorage.getItem('chatterfix-onboarding-completed') === 'true';
          if (!hasOnboarded) {
              setShowOnboarding(true);
          }
        }} />
      </ErrorBoundary>
    );
  }

  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <OnboardingPage onComplete={() => { setShowOnboarding(false); localStorage.setItem('chatterfix-onboarding-completed', 'true'); }} />
      </ErrorBoundary>
    );
  }

  // Main app interface
  return (
    <ErrorBoundary>
       <OnboardingGuide
        steps={onboardingSteps}
        currentStep={currentStep}
        onNext={nextStep}
        onPrev={prevStep}
        onFinish={finishOnboarding}
        isActive={isOnboardingActive}
      />
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">ChatterFix</h1>
                <span className="ml-3 text-sm text-gray-500">Welcome, {user?.name || 'User'}</span>
              </div>
              <div className="flex items-center space-x-4">
                 <button onClick={startOnboarding} className="p-2 text-gray-500 hover:text-gray-700" title="Show help guide">
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentView('settings')} className="p-2 text-gray-500 hover:text-gray-700">
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {['voice', 'work-orders', 'technician', 'ocr', 'assets', 'inventory', 'documents', 'financials', 'preventive-maintenance', 'predictive-ai', 'smart-inventory', 'workflow-automation'].map((view) => (
                <button
                  key={view}
                  id={view === 'technician' ? 'technician-view-nav' : `${view}-nav`}
                  onClick={() => setCurrentView(view)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    currentView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {view === 'ocr' ? 'OCR Scanner' : 
                   view === 'inventory' ? 'Parts Inventory' : 
                   view === 'technician' ? 'Technician Dashboard' : 
                   view === 'work-orders' ? 'Work Orders' :
                   view === 'financials' ? 'Financials & Workflow' : 
                   view === 'preventive-maintenance' ? 'PM Schedule' : 
                   view === 'predictive-ai' ? 'AI Predictions' : 
                   view === 'smart-inventory' ? 'Smart Ordering' : 
                   view === 'workflow-automation' ? 'No-Code Rules' : view}
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div id="voice-interface-container" className="xl:col-span-1 space-y-6">
                <VoiceInterface assets={assets} activeWorkOrder={activeWorkOrder} onWorkOrderCreate={handleWorkOrderCreate} onWorkOrderUpdate={handleWorkOrderUpdate} onChatMessage={handleChatMessage} getAIResponse={getAIResponse} />
                <WorkOrderList workOrders={workOrders} activeWorkOrderId={activeWorkOrder?.id} onSelectWorkOrder={setActiveWorkOrder} onCreateWorkOrder={handleWorkOrderCreate} onUpdateWorkOrder={handleWorkOrderUpdate} getAIResponse={getAIResponse} />
              </div>
              <div className="xl:col-span-1">
                <ChatInterface messages={chatHistory} isProcessing={isProcessingAI} />
              </div>
              <div id="ai-chat-container" className="xl:col-span-1">
                <AIChat onWorkOrderCreate={handleWorkOrderCreate} getAIResponse={getAIResponse} context={activeWorkOrder ? `Active work order: ${activeWorkOrder.description || activeWorkOrder.title}` : 'Voice interface'} placeholder="Create work orders, ask questions, or get maintenance help..." title="Work Order Assistant" />
              </div>
            </div>
          )}

          {currentView === 'work-orders' && <WorkOrderDashboard workOrders={workOrders} onWorkOrderCreate={handleWorkOrderCreate} onWorkOrderUpdate={handleWorkOrderUpdate} getAIResponse={getAIResponse} currentUser={user?.name || 'Current User'} userRole={user?.role || 'manager'} />}

          {currentView === 'technician' && <TechnicianWorkOrderView workOrders={workOrders} activeWorkOrder={activeWorkOrder} onWorkOrderUpdate={handleWorkOrderUpdate} onWorkOrderCreate={handleWorkOrderCreate} currentTechnician={user?.name || 'Current Technician'} getAIResponse={getAIResponse} />}

          {currentView === 'ocr' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OCRScanner onChatMessage={handleChatMessage} getAIResponse={getAIResponse} />
              <ChatInterface messages={chatHistory} isProcessing={isProcessingAI} />
            </div>
          )}

          {currentView === 'assets' && <AssetManager onAssetSelected={(asset) => console.log('Asset selected:', asset)} />}
          {currentView === 'inventory' && <PartsInventory />}
          {currentView === 'documents' && <DocumentManager assets={assets} />}
          {currentView === 'financials' && (
            selectedWorkOrderDetail ? (
              <EnhancedWorkOrderDetail
                workOrder={selectedWorkOrderDetail}
                onWorkOrderUpdate={handleWorkOrderUpdate}
                onBack={() => {
                  setSelectedWorkOrderDetail(null);
                  setCurrentView('voice');
                }}
                currentUserId={user?.email || 'demo-user'}
                getAIResponse={getAIResponse}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Financial & Workflow Management</h2>
                <p className="text-gray-600 mb-6">Select a work order to view detailed financial and workflow information.</p>
                <div className="space-y-3">
                  {workOrders.slice(0, 5).map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => setSelectedWorkOrderDetail(wo)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{wo.title}</h3>
                          <p className="text-sm text-gray-600">{wo.description}</p>
                        </div>
                        <span className="text-sm text-blue-600">View Details →</span>
                      </div>
                    </div>
                  ))}
                  {workOrders.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No work orders available. Create one using the voice interface or work order form.</p>
                  )}
                </div>
              </div>
            )
          )}
          {currentView === 'preventive-maintenance' && (
            <PreventiveMaintenanceManager currentUserId={user?.email || 'demo-user'} />
          )}
          {currentView === 'predictive-ai' && (
            <PredictiveMaintenanceEngine getAIResponse={getAIResponse} />
          )}
          {currentView === 'smart-inventory' && (
            <SmartInventoryManager getAIResponse={getAIResponse} />
          )}
          {currentView === 'workflow-automation' && (
            <NoCodeWorkflowEngine getAIResponse={getAIResponse} />
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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <ChatterFixApp />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;