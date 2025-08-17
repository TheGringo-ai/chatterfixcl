import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Scan, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import { OcrResults, ChatMessage } from '../../types';

interface OCRScannerProps {
  onChatMessage: (message: ChatMessage) => void;
  getAIResponse: (prompt: string) => Promise<string>;
}

const OCRScanner: React.FC<OCRScannerProps> = ({ onChatMessage, getAIResponse }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<OcrResults | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied or not available. Please allow camera permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
        processImageOCR(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Please upload an image smaller than 10MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          const imageData = e.target.result;
          setCapturedImage(imageData);
          processImageOCR(imageData);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageOCR = async (imageData: string) => {
    setIsProcessing(true);
    setOcrResults(null);
    setError(null);
    
    try {
      // TODO: Replace with real OCR API call
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock OCR results
      const mockResults: OcrResults = {
        rawText: "MULTIVAC\nModel: AIS 2000\nSerial: MV-2024-AIS-001\nPart No: 45.123.456\nVacuum Pump Assembly\nReplacement Date: 2024-07-15\nPressure Rating: 25 mbar\nTemperature: -20°C to +80°C",
        extractedInfo: {
          manufacturer: "MULTIVAC",
          model: "AIS 2000",
          serialNumber: "MV-2024-AIS-001",
          partNumbers: ["45.123.456"],
          equipmentType: "Vacuum Pump Assembly",
          specifications: {
            pressureRating: "25 mbar",
            temperatureRange: "-20°C to +80°C"
          }
        },
        confidence: 94
      };
      
      setOcrResults(mockResults);
      
      // Get AI analysis
      const aiResponse = await getAIResponse(
        `I scanned equipment with OCR and found: ${mockResults.rawText}. Please identify this equipment, check our inventory for related parts, and provide maintenance guidance.`
      );
      
      onChatMessage({ 
        type: 'system', 
        message: `📷 Scanned equipment: ${mockResults.extractedInfo?.manufacturer} ${mockResults.extractedInfo?.model}`, 
        timestamp: new Date() 
      });
      onChatMessage({ 
        type: 'ai', 
        message: aiResponse, 
        timestamp: new Date() 
      });
      
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process image. Please try again with a clearer image.');
      setOcrResults({ error: 'Processing failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setOcrResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">OCR Scanner</h2>
      
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
      
      {!showCamera && !capturedImage && (
        <div className="space-y-4">
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </button>
          
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Image</span>
            </button>
          </div>
        </div>
      )}
      
      {showCamera && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <button
              onClick={capturePhoto}
              className="bg-blue-500 text-white p-4 rounded-full hover:bg-blue-600 transition-colors"
            >
              <Camera className="w-6 h-6" />
            </button>
            <button
              onClick={stopCamera}
              className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      
      {capturedImage && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-lg"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <LoadingSpinner size="large" color="white" message="Processing image..." />
              </div>
            )}
          </div>
          
          {ocrResults && !ocrResults.error && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Extracted Information:</h3>
              {ocrResults.extractedInfo && (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Manufacturer:</dt>
                    <dd className="font-medium">{ocrResults.extractedInfo.manufacturer}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Model:</dt>
                    <dd className="font-medium">{ocrResults.extractedInfo.model}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Serial Number:</dt>
                    <dd className="font-medium">{ocrResults.extractedInfo.serialNumber}</dd>
                  </div>
                  {ocrResults.confidence && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Confidence:</dt>
                      <dd className="font-medium">{ocrResults.confidence}%</dd>
                    </div>
                  )}
                </dl>
              )}
              
              {ocrResults.rawText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    View raw text
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap">
                    {ocrResults.rawText}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          {!isProcessing && (
            <button
              onClick={resetScanner}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>Scan Another</span>
            </button>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default OCRScanner;