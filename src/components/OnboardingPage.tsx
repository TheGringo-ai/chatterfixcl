import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, Package, Wrench, Bot, 
  CheckCircle, ArrowRight, ArrowLeft, 
  Lightbulb, MessageCircle, Sparkles,
  Database, Settings, Users, Calendar
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

interface OnboardingPageProps {
  onComplete?: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isAIMode, setIsAIMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Add initial AI welcome message
  useEffect(() => {
    setChatMessages([
      {
        id: '1',
        type: 'ai',
        content: `👋 Welcome to ChatterFix! I'm your AI assistant and I'm here to help you get started. 

I can help you:
• Set up your asset management system
• Upload and organize your documents
• Configure parts inventory
• Import existing data from spreadsheets or other systems
• Train the system with your specific requirements

Would you like me to guide you through the setup process step by step, or would you prefer to upload your existing data and let me organize it automatically?`,
        timestamp: new Date()
      }
    ]);
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to ChatterFix',
      description: 'Get started with AI-powered asset management',
      icon: <Sparkles className="w-6 h-6" />,
      component: <WelcomeStep />
    },
    {
      id: 'data-upload',
      title: 'Upload Your Data',
      description: 'Import existing spreadsheets, documents, and files',
      icon: <Upload className="w-6 h-6" />,
      component: <DataUploadStep 
        uploadedFiles={uploadedFiles} 
        setUploadedFiles={setUploadedFiles}
        uploadProgress={uploadProgress}
        setUploadProgress={setUploadProgress}
      />
    },
    {
      id: 'assets-setup',
      title: 'Configure Assets',
      description: 'Set up your asset categories and properties',
      icon: <Package className="w-6 h-6" />,
      component: <AssetsSetupStep />
    },
    {
      id: 'parts-inventory',
      title: 'Parts & Inventory',
      description: 'Organize your parts and inventory management',
      icon: <Wrench className="w-6 h-6" />,
      component: <PartsInventoryStep />
    },
    {
      id: 'documents',
      title: 'Document Management',
      description: 'Upload manuals, procedures, and documentation',
      icon: <FileText className="w-6 h-6" />,
      component: <DocumentsStep />
    },
    {
      id: 'team-setup',
      title: 'Team & Permissions',
      description: 'Set up users and access controls',
      icon: <Users className="w-6 h-6" />,
      component: <TeamSetupStep />
    },
    {
      id: 'completion',
      title: 'Setup Complete',
      description: 'Your system is ready to use!',
      icon: <CheckCircle className="w-6 h-6" />,
      component: <CompletionStep onComplete={onComplete} />
    }
  ];

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_LLAMA_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          context: 'onboarding',
          step: steps[currentStep].id,
          uploadedFiles: uploadedFiles.map(f => f.name),
          completedSteps: Array.from(completedSteps)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, aiMessage]);

        // Handle AI suggestions for auto-completion
        if (data.suggestions) {
          handleAISuggestions(data.suggestions);
        }
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I had trouble connecting. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggestions = (suggestions: any) => {
    // Handle AI suggestions for auto-filling forms, moving to next steps, etc.
    if (suggestions.completeStep) {
      markStepComplete(suggestions.completeStep);
    }
    if (suggestions.nextStep) {
      setCurrentStep(suggestions.nextStep);
    }
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      markStepComplete(steps[currentStep].id);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ChatterFix Setup
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Let our AI assistant guide you through setting up your asset management system
          </p>
          
          {/* AI Mode Toggle */}
          <div className="flex items-center justify-center mb-6">
            <button
              onClick={() => setIsAIMode(!isAIMode)}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                isAIMode 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Bot className="w-5 h-5 mr-2" />
              {isAIMode ? 'AI Assistant Active' : 'Enable AI Assistant'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Setup Progress</h2>
                <span className="text-sm text-gray-600">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-between">
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`flex flex-col items-center ${
                      index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      completedSteps.has(step.id) 
                        ? 'bg-green-500 text-white' 
                        : index === currentStep 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200'
                    }`}>
                      {completedSteps.has(step.id) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className="text-xs text-center">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Step Content */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                {steps[currentStep].icon}
                <h2 className="text-2xl font-bold text-gray-900 ml-3">
                  {steps[currentStep].title}
                </h2>
              </div>
              <p className="text-gray-600 mb-6">{steps[currentStep].description}</p>
              
              {steps[currentStep].component}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
                
                <button
                  onClick={nextStep}
                  disabled={currentStep === steps.length - 1}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* AI Chat Sidebar */}
          {isAIMode && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <Bot className="w-6 h-6 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.type === 'ai'
                            ? 'bg-purple-100 text-gray-900'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <span className="text-xs opacity-75 mt-1 block">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-purple-100 text-gray-900 px-4 py-2 rounded-lg">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                          AI is thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask me anything about setup..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !userInput.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Step Components
const WelcomeStep: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        <Database className="w-8 h-8 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Smart Data Import</h3>
        <p className="text-gray-600">
          Upload your existing spreadsheets, PDFs, or documents and let AI automatically organize and categorize everything.
        </p>
      </div>
      
      <div className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        <Settings className="w-8 h-8 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guided Setup</h3>
        <p className="text-gray-600">
          Follow our step-by-step process to manually configure your assets, parts, and workflows with AI assistance.
        </p>
      </div>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start">
        <Lightbulb className="w-6 h-6 text-blue-600 mr-3 mt-1" />
        <div>
          <h4 className="font-semibold text-blue-900 mb-2">Pro Tip</h4>
          <p className="text-blue-800">
            Enable the AI Assistant (toggle above) for real-time help throughout the setup process. 
            I can answer questions, provide suggestions, and even complete forms for you based on uploaded data.
          </p>
        </div>
      </div>
    </div>
  </div>
);

interface DataUploadStepProps {
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadProgress: { [key: string]: number };
  setUploadProgress: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
}

const DataUploadStep: React.FC<DataUploadStepProps> = ({ 
  uploadedFiles, 
  setUploadedFiles, 
  uploadProgress, 
  setUploadProgress 
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles([...uploadedFiles, ...files]);
    
    // Simulate upload progress
    files.forEach(file => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 200);
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Files</h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to browse. Supported: Excel, CSV, PDF, Word documents
        </p>
        <input
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Choose Files
        </label>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <div className="flex items-center">
                  {uploadProgress[file.name] && (
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      ></div>
                    </div>
                  )}
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Processing Options */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h4 className="font-semibold text-purple-900 mb-3">AI Processing Options</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-purple-800">Auto-extract asset information from spreadsheets</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-purple-800">Organize documents by type and category</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-purple-800">Create parts inventory from maintenance records</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const AssetsSetupStep: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Asset Categories */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Asset Categories</h4>
        {['Equipment', 'Infrastructure', 'Vehicles', 'IT Assets', 'Tools'].map((category) => (
          <label key={category} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <input type="checkbox" className="mr-3" defaultChecked />
            <Package className="w-5 h-5 text-blue-600 mr-2" />
            <span>{category}</span>
          </label>
        ))}
      </div>

      {/* Custom Fields */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Custom Fields</h4>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Field name (e.g., Warranty Provider)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Text</option>
            <option>Number</option>
            <option>Date</option>
            <option>Yes/No</option>
          </select>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Add Field
          </button>
        </div>
      </div>
    </div>
  </div>
);

const PartsInventoryStep: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h4 className="font-semibold text-green-900 mb-3">AI-Powered Parts Management</h4>
      <p className="text-green-800 mb-4">
        Let AI analyze your maintenance history and automatically suggest parts inventory based on usage patterns.
      </p>
      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
        Analyze & Suggest Parts
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Inventory Categories</h4>
        <div className="space-y-2">
          {['Filters', 'Belts', 'Bearings', 'Electrical', 'Fluids', 'Fasteners'].map((category) => (
            <label key={category} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50">
              <input type="checkbox" className="mr-3" />
              <Wrench className="w-4 h-4 text-orange-600 mr-2" />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Reorder Settings</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Reorder Point</label>
            <input
              type="number"
              placeholder="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
            <input
              type="number"
              placeholder="7"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DocumentsStep: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { name: 'Manuals', icon: <FileText className="w-8 h-8 text-blue-600" />, count: 0 },
        { name: 'Procedures', icon: <FileText className="w-8 h-8 text-green-600" />, count: 0 },
        { name: 'Certificates', icon: <FileText className="w-8 h-8 text-purple-600" />, count: 0 }
      ].map((docType) => (
        <div key={docType.name} className="p-6 border border-gray-200 rounded-lg text-center hover:shadow-md transition-shadow">
          {docType.icon}
          <h4 className="font-semibold mt-2">{docType.name}</h4>
          <p className="text-gray-600">{docType.count} documents</p>
          <button className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Upload {docType.name}
          </button>
        </div>
      ))}
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h4 className="font-semibold text-yellow-900 mb-3">AI Document Processing</h4>
      <p className="text-yellow-800 mb-4">
        Upload your manuals and procedures, and AI will automatically extract key information like part numbers, 
        maintenance schedules, and safety procedures.
      </p>
      <label className="flex items-center">
        <input type="checkbox" className="mr-3" defaultChecked />
        <span className="text-yellow-800">Enable automatic text extraction and indexing</span>
      </label>
    </div>
  </div>
);

const TeamSetupStep: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Team Roles</h4>
        <div className="space-y-3">
          {[
            { role: 'Administrator', permissions: 'Full system access' },
            { role: 'Maintenance Manager', permissions: 'Manage work orders, assets' },
            { role: 'Technician', permissions: 'View assets, update work orders' },
            { role: 'Viewer', permissions: 'Read-only access' }
          ].map((roleInfo) => (
            <div key={roleInfo.role} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{roleInfo.role}</span>
                  <p className="text-sm text-gray-600">{roleInfo.permissions}</p>
                </div>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Add Team Members</h4>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select Role</option>
            <option>Administrator</option>
            <option>Maintenance Manager</option>
            <option>Technician</option>
            <option>Viewer</option>
          </select>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface CompletionStepProps {
  onComplete?: () => void;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ onComplete }) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
      <CheckCircle className="w-12 h-12 text-green-600" />
    </div>
    
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h3>
      <p className="text-gray-600 mb-6">
        Your ChatterFix system is now ready to use. You can always return to add more data or modify settings.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="p-4 bg-blue-50 rounded-lg">
        <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
        <h4 className="font-semibold mb-1">Next Steps</h4>
        <p className="text-sm text-gray-600">Schedule your first maintenance tasks</p>
      </div>
      <div className="p-4 bg-green-50 rounded-lg">
        <Database className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h4 className="font-semibold mb-1">Start Using</h4>
        <p className="text-sm text-gray-600">Begin managing your assets and work orders</p>
      </div>
      <div className="p-4 bg-purple-50 rounded-lg">
        <Bot className="w-8 h-8 text-purple-600 mx-auto mb-2" />
        <h4 className="font-semibold mb-1">AI Support</h4>
        <p className="text-sm text-gray-600">Get ongoing help from your AI assistant</p>
      </div>
    </div>

    <button
      onClick={onComplete}
      className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700"
    >
      Start Using ChatterFix
    </button>
  </div>
);

export default OnboardingPage;
