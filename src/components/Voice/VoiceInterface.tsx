import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { Asset, WorkOrder, ChatMessage } from '../../types';

interface VoiceInterfaceProps {
  assets: Record<string, Asset>;
  activeWorkOrder: WorkOrder | null;
  onWorkOrderCreate: (workOrder: WorkOrder) => void;
  onWorkOrderUpdate: (workOrder: WorkOrder) => void;
  onChatMessage: (message: ChatMessage) => void;
  getAIResponse: (prompt: string) => Promise<string>;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  assets,
  activeWorkOrder,
  onWorkOrderCreate,
  onWorkOrderUpdate,
  onChatMessage,
  getAIResponse,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceCommand = useCallback(async (message: string) => {
    setIsProcessing(true);
    onChatMessage({ type: 'user', message, timestamp: new Date() });

    try {
      // Check for "start work on..." command
      if (message.toLowerCase().startsWith('start work on')) {
        const assetName = message.substring('start work on'.length).trim();
        for (const assetKey in assets) {
          if (assets.hasOwnProperty(assetKey) && assets[assetKey].name.toLowerCase() === assetName.toLowerCase()) {
            const asset = assets[assetKey];
            const newWorkOrder: WorkOrder = {
              id: `WO-${Date.now()}`,
              title: `Work on ${asset.name}`,
              asset,
              status: 'in-progress',
              priority: 'medium',
              createdAt: new Date().toISOString(),
              assignedTo: 'Current User',
              startTime: new Date(),
            };
            onWorkOrderCreate(newWorkOrder);
            const aiResponse = await getAIResponse(`User is starting work on ${asset.name}. Message: "${message}". Provide troubleshooting guidance.`);
            onChatMessage({ type: 'ai', message: aiResponse, timestamp: new Date() });
            return;
          }
        }
      }

      // Default to general AI response
      const aiResponse = await getAIResponse(message);
      onChatMessage({ type: 'ai', message: aiResponse, timestamp: new Date() });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`AI processing failed: ${errorMessage}`);
      onChatMessage({ type: 'ai', message: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() });
    } finally {
      setIsProcessing(false);
    }
  }, [assets, getAIResponse, onChatMessage, onWorkOrderCreate]);

  useEffect(() => {
    const initializeSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const recognitionInstance = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onstart = () => {
          setIsListening(true);
        };
        
        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleVoiceCommand(transcript);
        };
        
        recognitionInstance.onerror = (event: any) => {
          setError(`Speech recognition error: ${event.error}`);
          setIsProcessing(false);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
        setIsVoiceSupported(true);
      } else {
        setIsVoiceSupported(false);
        setError('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      }
    };

    initializeSpeechRecognition();
  }, [handleVoiceCommand]);

  const toggleListening = () => {
    if (!recognition) {
      setError('Voice recognition not initialized. Please refresh the page.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setError(null);
      recognition.start();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Voice Commands</h2>
      
      {!isVoiceSupported && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Voice recognition is not supported in this browser. Please use Chrome or Edge for voice features.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleListening}
          disabled={!isVoiceSupported || isProcessing}
          className={`
            p-8 rounded-full transition-all duration-300 transform hover:scale-105
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${!isVoiceSupported || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isListening ? (
            <MicOff className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
        
        <div className="text-center min-h-[60px]">
          {isProcessing ? (
            <LoadingSpinner size="small" message="Processing..." />
          ) : (
            currentMessage && (
              <p className="text-gray-700 font-medium animate-fade-in">
                {currentMessage}
              </p>
            )
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 w-full">
          <h3 className="font-semibold text-gray-700 mb-2">Voice Commands:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• "I'm working on [equipment name]" - Start work order</li>
            <li>• "The [component] is broken/leaking" - Report issue</li>
            <li>• "Work complete" - Finish current work order</li>
            <li>• Ask any maintenance question for AI help</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;