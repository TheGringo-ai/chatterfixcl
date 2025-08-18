import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Camera, Upload, Play, Square, CheckCircle,
  FileText, MapPin, User, Clock, AlertTriangle, Eye,
  Volume2, VolumeX, Loader, ScanLine, Image as ImageIcon
} from 'lucide-react';
import { WorkOrder } from '../types';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceWorkOrderManagerProps {
  workOrder?: WorkOrder;
  onWorkOrderUpdate: (workOrder: WorkOrder) => void;
  getAIResponse: (prompt: string, context?: string) => Promise<string>;
  currentUser: string;
  mode: 'create' | 'update' | 'complete';
}

const VoiceWorkOrderManager: React.FC<VoiceWorkOrderManagerProps> = ({
  workOrder,
  onWorkOrderUpdate,
  getAIResponse,
  currentUser,
  mode
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showOCR, setShowOCR] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Voice commands processing
  const processVoiceCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsProcessingAI(true);
    setAiProgress(0);
    
    // Progress simulation for user feedback
    const progressInterval = setInterval(() => {
      setAiProgress(prev => prev < 90 ? prev + 10 : prev);
    }, 6000); // Update every 6 seconds
    
    try {
      let prompt = '';
      let context = '';

      if (mode === 'create') {
        prompt = `Parse this voice command to create a work order: "${command}". Extract: title, description, asset name, location, priority (low/medium/high/critical), and any other relevant details. Return a JSON object with these fields.`;
      } else if (mode === 'update') {
        context = `Current work order: ${workOrder?.title} - ${workOrder?.description}. Asset: ${workOrder?.asset?.name}. Status: ${workOrder?.status}.`;
        prompt = `Process this work order update command: "${command}". This could be adding notes, changing status, reporting issues, or requesting parts. Provide a structured response.`;
      } else if (mode === 'complete') {
        context = `Completing work order: ${workOrder?.title} - ${workOrder?.description}`;
        prompt = `Parse this work completion report: "${command}". Extract: resolution summary, work performed, parts used, time taken, any issues found, and completion status. Format as JSON.`;
      }

      const response = await getAIResponse(prompt, context);
      
      // Speak the response if voice is enabled
      if (voiceEnabled && 'speechSynthesis' in window) {
        speakText(response);
      }

      // Try to parse AI response and update work order
      await handleAIResponse(response, command);
      
    } catch (error) {
      console.error('Error processing voice command:', error);
      speakText('Sorry, I had trouble processing that command. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsProcessingAI(false);
      setAiProgress(0);
    }
  };

  const handleAIResponse = async (aiResponse: string, originalCommand: string) => {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let parsedData = null;
      
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.log('Could not parse JSON from AI response');
        }
      }

      if (mode === 'create' && parsedData) {
        // Create new work order from voice command
        const newWorkOrder: WorkOrder = {
          id: `WO-${Date.now()}`,
          title: parsedData.title || 'Voice Created Work Order',
          description: parsedData.description || originalCommand,
          asset: {
            id: parsedData.assetId || `asset-${Date.now()}`,
            name: parsedData.assetName || parsedData.asset || 'Unknown Asset',
            location: parsedData.location || 'Unknown Location'
          },
          priority: parsedData.priority || 'medium',
          status: 'pending',
          createdBy: currentUser,
          createdAt: new Date().toISOString(),
          assignedTo: parsedData.assignedTo || '',
          notes: [{
            id: `note-${Date.now()}`,
            content: `Created via voice command: "${originalCommand}"`,
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
            type: 'voice_creation'
          }],
          attachments: [],
          parts: []
        };
        onWorkOrderUpdate(newWorkOrder);
        
      } else if (workOrder) {
        // Update existing work order
        const updatedWorkOrder: WorkOrder = {
          ...workOrder,
          notes: [
            ...(workOrder.notes || []),
            {
              id: `note-${Date.now()}`,
              content: mode === 'complete' 
                ? `Completion report: ${originalCommand}` 
                : `Voice update: ${originalCommand}`,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
              type: mode === 'complete' ? 'completion' : 'voice_update'
            }
          ]
        };

        // Update status if completing
        if (mode === 'complete') {
          updatedWorkOrder.status = 'completed';
          updatedWorkOrder.resolution = parsedData?.resolution || originalCommand;
          updatedWorkOrder.endTime = new Date();
        }

        onWorkOrderUpdate(updatedWorkOrder);
      }

    } catch (error) {
      console.error('Error handling AI response:', error);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      window.speechSynthesis.cancel(); // Stop any current speech
      synthesisRef.current = new SpeechSynthesisUtterance(text);
      synthesisRef.current.rate = 0.9;
      synthesisRef.current.pitch = 1;
      synthesisRef.current.volume = 0.8;
      window.speechSynthesis.speak(synthesisRef.current);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
      speakText('Listening for your command...');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript.trim()) {
        processVoiceCommand(transcript.trim());
      }
    }
  };

  // OCR Functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowOCR(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setShowOCR(false);
        
        // Process with OCR
        processOCR(imageData);
      }
    }
  };

  const processOCR = async (imageData: string) => {
    setIsProcessingOCR(true);
    try {
      // Simulate OCR processing - in real implementation, you'd call an OCR service
      // For now, we'll use the AI to help interpret what might be in the image
      const prompt = `I've captured an image in a maintenance context. This could contain:
      - Equipment nameplate/serial numbers
      - Part numbers
      - Error codes
      - Asset tags
      - Model numbers
      - Maintenance instructions
      
      Please provide guidance on what information I should look for and how to document it in the work order.`;
      
      const response = await getAIResponse(prompt, `Work Order: ${workOrder?.title || 'New Work Order'}`);
      setOcrResults(response);
      
      // Add OCR result to work order notes
      if (workOrder) {
        const updatedWorkOrder: WorkOrder = {
          ...workOrder,
          notes: [
            ...(workOrder.notes || []),
            {
              id: `note-${Date.now()}`,
              content: `OCR Scan Results: ${response}`,
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
              type: 'ocr_scan'
            }
          ],
          attachments: [
            ...(workOrder.attachments || []),
            {
              id: `att-${Date.now()}`,
              name: 'OCR_Scan.jpg',
              type: 'image',
              url: imageData,
              uploadedBy: currentUser,
              uploadedAt: new Date().toISOString(),
              description: 'OCR scan for equipment identification',
              size: 0
            }
          ]
        };
        onWorkOrderUpdate(updatedWorkOrder);
      }
      
      speakText('Image captured and processed. Check the results below.');
      
    } catch (error) {
      console.error('OCR processing error:', error);
      speakText('Error processing the image. Please try again.');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === 'create' && 'Voice Work Order Creation'}
          {mode === 'update' && 'Voice Work Order Update'}
          {mode === 'complete' && 'Voice Work Order Completion'}
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg ${voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
            title={voiceEnabled ? 'Voice feedback enabled' : 'Voice feedback disabled'}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Voice Control Section */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessingAI}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-lg font-medium transition-all ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            } ${isProcessingAI ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessingAI ? (
              <Loader className="w-8 h-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-gray-600">
            {isProcessingAI && (
              <div className="flex flex-col items-center space-y-3">
                <span className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processing with Llama AI... (may take 30-60 seconds)</span>
                </span>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${aiProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">{aiProgress}% complete</span>
              </div>
            )}
            {isListening && 'Listening... Tap to stop recording'}
            {!isListening && !isProcessingAI && 'Tap to start voice command'}
          </p>
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Voice Input:</h3>
            <p className="text-gray-700">{transcript}</p>
          </div>
        )}
      </div>

      {/* OCR Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Equipment Scanner</h3>
        
        <div className="flex space-x-4">
          <button
            onClick={startCamera}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>Scan Equipment Tag</span>
          </button>
          
          <button
            onClick={() => document.getElementById('ocr-file-input')?.click()}
            className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Image</span>
          </button>
        </div>

        <input
          id="ocr-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imageData = event.target?.result as string;
                setCapturedImage(imageData);
                processOCR(imageData);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>

      {/* Camera View */}
      {showOCR && (
        <div className="mb-6">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover rounded-lg bg-black"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed w-48 h-32 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-white" />
              </div>
            </div>
            <button
              onClick={captureImage}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-6 py-2 rounded-full font-medium"
            >
              Capture
            </button>
          </div>
        </div>
      )}

      {/* Captured Image & OCR Results */}
      {capturedImage && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Captured Image</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <img
                src={capturedImage}
                alt="Captured equipment"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">OCR Analysis</h4>
              {isProcessingOCR ? (
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-gray-600">Processing image...</span>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-700 text-sm">{ocrResults || 'No text detected'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Examples */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Voice Command Examples:</h3>
        <div className="text-sm text-blue-800 space-y-1">
          {mode === 'create' && (
            <>
              <p>• "Create work order for conveyor belt maintenance at production line A, high priority"</p>
              <p>• "Motor bearing replacement needed on pump 3 in building B"</p>
              <p>• "Schedule preventive maintenance for HVAC unit on second floor"</p>
            </>
          )}
          {mode === 'update' && (
            <>
              <p>• "Add note: replaced air filter, system running normally"</p>
              <p>• "Status update: waiting for parts delivery"</p>
              <p>• "Found additional issue with belt tensioner"</p>
            </>
          )}
          {mode === 'complete' && (
            <>
              <p>• "Work completed, replaced motor bearing, tested operation, all systems normal"</p>
              <p>• "Finished repair, used parts: bearing, gasket, lubricant, 2 hours total time"</p>
              <p>• "Maintenance complete, equipment operational, no issues found"</p>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VoiceWorkOrderManager;