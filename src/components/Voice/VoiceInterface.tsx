import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const initializeSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();
        
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onstart = () => {
          setIsListening(true);
          setCurrentMessage('🎤 Listening... Speak now!');
          setError(null);
        };
        
        recognitionInstance.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript = event.results[i][0].transcript;
              setCurrentMessage(`Heard: "${transcript}"`);
              handleVoiceCommand(transcript);
            } else {
              const interim = event.results[i][0].transcript;
              setCurrentMessage(`Hearing: "${interim}..."`);
            }
          }
        };
        
        recognitionInstance.onerror = (event: any) => {
          setIsListening(false);
          let errorMessage = 'Speech recognition error: ';
          switch(event.error) {
            case 'not-allowed':
              errorMessage += 'Microphone access denied. Please allow microphone permissions.';
              break;
            case 'no-speech':
              errorMessage += 'No speech detected. Please try again.';
              break;
            default:
              errorMessage += event.error + '. Please try again.';
          }
          setError(errorMessage);
          setCurrentMessage('');
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
  }, []);

  const handleVoiceCommand = async (message: string) => {
    setIsProcessing(true);
    const lowerMessage = message.toLowerCase();
    
    try {
      // Check if message mentions any asset
      for (const assetKey in assets) {
        if (lowerMessage.includes(assetKey)) {
          const asset = assets[assetKey];
          const newWorkOrder: WorkOrder = {
            id: `WO-${Date.now()}`,
            asset: asset,
            startTime: new Date(),
            status: 'In Progress',
            technician: 'Current User',
            description: message
          };
          
          onWorkOrderCreate(newWorkOrder);
          
          const aiResponse = await getAIResponse(`User is starting work on ${asset.name}. Message: "${message}". Provide troubleshooting guidance.`);
          
          onChatMessage({ type: 'user', message, timestamp: new Date() });
          onChatMessage({ type: 'ai', message: aiResponse, timestamp: new Date() });
          
          setCurrentMessage('Work order created successfully!');
          setIsProcessing(false);
          return;
        }
      }
      
      // Handle work order updates
      if (activeWorkOrder && (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('broken') || lowerMessage.includes('leak'))) {
        const assetName = activeWorkOrder.asset?.name || activeWorkOrder.assetName || 'unknown asset';
        const aiResponse = await getAIResponse(`User reported: "${message}" on ${assetName}.`);
        
        onChatMessage({ type: 'user', message, timestamp: new Date() });
        onChatMessage({ type: 'ai', message: aiResponse, timestamp: new Date() });
        
        setCurrentMessage('Issue logged!');
        setIsProcessing(false);
        return;
      }
      
      // Handle work order completion
      if (lowerMessage.includes('complete') || lowerMessage.includes('finished') || lowerMessage.includes('done')) {
        if (activeWorkOrder) {
          const startTime = activeWorkOrder.startTime || new Date();
          const duration = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
          const updatedWorkOrder: WorkOrder = {
            ...activeWorkOrder,
            endTime: new Date(),
            duration: duration,
            status: 'Completed',
            resolution: message
          };
          
          onWorkOrderUpdate(updatedWorkOrder);
          
          onChatMessage({ type: 'system', message: `✅ Work order completed! Duration: ${duration} minutes`, timestamp: new Date() });
          
          setCurrentMessage('Work order completed!');
          setIsProcessing(false);
          return;
        }
      }
      
      // General AI assistance
      const aiResponse = await getAIResponse(message);
      onChatMessage({ type: 'user', message, timestamp: new Date() });
      onChatMessage({ type: 'ai', message: aiResponse, timestamp: new Date() });
      
      setCurrentMessage('');
    } catch (error) {
      console.error('Voice command error:', error);
      setError('Failed to process voice command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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