import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, Camera, Upload, X, Search, Package,
  CheckCircle, AlertTriangle, Scan, History,
  Edit, Eye, Plus, Wrench, MapPin, Calendar
} from 'lucide-react';

interface BarcodeResult {
  barcode: string;
  type: 'asset' | 'inventory' | 'unknown';
  data?: any;
  scannedAt: string;
}

interface ScanHistory {
  id: string;
  barcode: string;
  type: 'asset' | 'inventory' | 'unknown';
  name?: string;
  action: 'view' | 'checkout' | 'checkin' | 'maintenance' | 'order';
  timestamp: string;
  user: string;
}

interface BarcodeScannerProps {
  mode: 'asset' | 'inventory' | 'all';
  onScanResult: (result: BarcodeResult) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ mode, onScanResult, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [lastScanResult, setLastScanResult] = useState<BarcodeResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock barcode database
  const barcodeDatabase = {
    // Assets
    '123456789012': {
      type: 'asset',
      data: {
        id: 'system-001',
        name: 'Conveyor System',
        type: 'system',
        location: 'Assembly Line 1, Station 1-5',
        status: 'operational',
        criticality: 'high',
        manufacturer: 'ConveyorTech Inc',
        model: 'CT-2000X',
        serialNumber: 'CT2000X-2018-001',
        lastMaintenance: '2025-08-01',
        nextPMDate: '2025-09-01'
      }
    },
    '789012345678': {
      type: 'asset',
      data: {
        id: 'equipment-001',
        name: 'Drive Motor',
        type: 'equipment',
        location: 'Conveyor System, Motor Housing 1',
        status: 'operational',
        criticality: 'critical',
        manufacturer: 'Siemens',
        model: 'SIMOTICS GP 1LE1',
        serialNumber: 'SIE-50HP-2018-001',
        lastMaintenance: '2025-07-15',
        nextPMDate: '2025-08-15'
      }
    },
    '345678901234': {
      type: 'asset',
      data: {
        id: 'component-001',
        name: 'Motor Bearings',
        type: 'component',
        location: 'Drive Motor, Bearing Housing',
        status: 'maintenance',
        criticality: 'high',
        manufacturer: 'SKF',
        model: 'SKF 6314',
        serialNumber: 'SKF-6314-2018-001',
        lastMaintenance: '2025-07-15',
        nextPMDate: '2025-08-20'
      }
    },
    '567890123456': {
      type: 'asset',
      data: {
        id: 'equipment-002',
        name: 'Air Compressor Unit 1',
        type: 'equipment',
        location: 'Utility Room, Section B',
        status: 'failed',
        criticality: 'critical',
        manufacturer: 'Atlas Copco',
        model: 'GA 75',
        serialNumber: 'AC-GA75-2018-002',
        lastMaintenance: '2025-06-15',
        nextPMDate: '2025-08-15'
      }
    },
    // Inventory Items
    '111222333444': {
      type: 'inventory',
      data: {
        id: 'bearing-001',
        name: 'SKF Deep Groove Ball Bearing 6205',
        category: 'Bearings',
        currentStock: 8,
        minThreshold: 10,
        maxThreshold: 50,
        unitCost: 45.50,
        supplier: 'Industrial Supply Co',
        location: 'Warehouse A-1',
        lastOrdered: '2025-07-15'
      }
    },
    '222333444555': {
      type: 'inventory',
      data: {
        id: 'filter-023',
        name: 'HEPA Air Filter 24x24x12',
        category: 'Filters',
        currentStock: 15,
        minThreshold: 8,
        maxThreshold: 30,
        unitCost: 89.99,
        supplier: 'FilterMax Pro',
        location: 'Warehouse B-2',
        lastOrdered: '2025-06-20'
      }
    },
    '333444555666': {
      type: 'inventory',
      data: {
        id: 'belt-045',
        name: 'V-Belt A43 Industrial Grade',
        category: 'Belts',
        currentStock: 3,
        minThreshold: 5,
        maxThreshold: 20,
        unitCost: 28.75,
        supplier: 'Belt & Pulley Supply',
        location: 'Warehouse A-3',
        lastOrdered: '2025-05-10'
      }
    }
  };

  // Mock scan history
  const mockScanHistory: ScanHistory[] = [
    {
      id: 'scan-001',
      barcode: '123456789012',
      type: 'asset',
      name: 'Conveyor System',
      action: 'maintenance',
      timestamp: '2025-08-17 14:30:00',
      user: 'John Smith'
    },
    {
      id: 'scan-002',
      barcode: '111222333444',
      type: 'inventory',
      name: 'SKF Bearing 6205',
      action: 'checkout',
      timestamp: '2025-08-17 13:15:00',
      user: 'Mike Johnson'
    },
    {
      id: 'scan-003',
      barcode: '789012345678',
      type: 'asset',
      name: 'Drive Motor',
      action: 'view',
      timestamp: '2025-08-17 11:45:00',
      user: 'Sarah Davis'
    }
  ];

  useEffect(() => {
    setScanHistory(mockScanHistory);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions or use manual entry.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const captureAndScan = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        
        // Simulate barcode detection (in real implementation, use a library like QuaggaJS or ZXing)
        // For demo, we'll use a random barcode from our database
        const barcodes = Object.keys(barcodeDatabase);
        const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
        
        processBarcodeResult(randomBarcode);
      }
    }
  };

  const processBarcodeResult = (barcode: string) => {
    const dbEntry = barcodeDatabase[barcode as keyof typeof barcodeDatabase];
    
    let result: BarcodeResult;
    
    if (dbEntry) {
      result = {
        barcode,
        type: dbEntry.type as 'asset' | 'inventory',
        data: dbEntry.data,
        scannedAt: new Date().toISOString()
      };
    } else {
      result = {
        barcode,
        type: 'unknown',
        scannedAt: new Date().toISOString()
      };
    }
    
    setLastScanResult(result);
    onScanResult(result);
    
    // Add to scan history
    const historyEntry: ScanHistory = {
      id: `scan-${Date.now()}`,
      barcode,
      type: result.type,
      name: result.data?.name || 'Unknown Item',
      action: 'view',
      timestamp: new Date().toLocaleString(),
      user: 'Current User'
    };
    
    setScanHistory(prev => [historyEntry, ...prev]);
    
    stopCamera();
  };

  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      processBarcodeResult(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'checkout': return <Package className="w-4 h-4" />;
      case 'checkin': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'order': return <Plus className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'inventory': return 'bg-green-100 text-green-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <QrCode className="w-6 h-6 mr-2" />
            Barcode Scanner
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {mode === 'all' ? 'Assets & Inventory' : mode === 'asset' ? 'Assets Only' : 'Inventory Only'}
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Scan History"
            >
              <History className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Scanner Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera Scanner */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Camera Scanner
              </h3>
              
              {!isScanning ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Scan barcodes using your camera</p>
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover rounded-lg bg-black"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-red-500 w-48 h-32 rounded-lg opacity-75">
                        <div className="absolute inset-0 border border-red-300 m-2 rounded"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                      <button
                        onClick={captureAndScan}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Scan className="w-4 h-4 mr-2" />
                        Scan
                      </button>
                      <button
                        onClick={stopCamera}
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Position the barcode within the red frame and click Scan
                  </p>
                </div>
              )}
            </div>

            {/* Manual Entry */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Manual Entry
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Barcode Number
                  </label>
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="e.g., 123456789012"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
                  />
                </div>
                <button
                  onClick={handleManualEntry}
                  disabled={!manualBarcode.trim()}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Lookup Barcode
                </button>
                
                {/* Quick Test Barcodes */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quick Test (Demo):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(barcodeDatabase).slice(0, 4).map(([barcode, item]) => (
                      <button
                        key={barcode}
                        onClick={() => setManualBarcode(barcode)}
                        className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs"
                      >
                        <div className="font-mono">{barcode}</div>
                        <div className="text-gray-600 truncate">{item.data.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scan Result */}
          {lastScanResult && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                {lastScanResult.type === 'unknown' ? (
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                )}
                Scan Result
              </h3>
              
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="font-mono text-lg">{lastScanResult.barcode}</span>
                    <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getTypeColor(lastScanResult.type)}`}>
                      {lastScanResult.type}
                    </span>
                  </div>
                  
                  {lastScanResult.data ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{lastScanResult.data.name}</h4>
                        <p className="text-sm text-gray-600">{lastScanResult.data.location}</p>
                        {lastScanResult.type === 'asset' && (
                          <div className="mt-2 space-y-1 text-sm">
                            <div><span className="text-gray-600">Type:</span> {lastScanResult.data.type}</div>
                            <div><span className="text-gray-600">Status:</span> {lastScanResult.data.status}</div>
                            <div><span className="text-gray-600">Manufacturer:</span> {lastScanResult.data.manufacturer}</div>
                            <div><span className="text-gray-600">Model:</span> {lastScanResult.data.model}</div>
                          </div>
                        )}
                        {lastScanResult.type === 'inventory' && (
                          <div className="mt-2 space-y-1 text-sm">
                            <div><span className="text-gray-600">Category:</span> {lastScanResult.data.category}</div>
                            <div><span className="text-gray-600">Stock:</span> {lastScanResult.data.currentStock}</div>
                            <div><span className="text-gray-600">Cost:</span> ${lastScanResult.data.unitCost}</div>
                            <div><span className="text-gray-600">Supplier:</span> {lastScanResult.data.supplier}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-yellow-600">
                      <p>Barcode not found in database</p>
                      <p className="text-sm">This may be a new item that needs to be registered.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scan History */}
          {showHistory && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Recent Scans
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-auto">
                {scanHistory.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getActionIcon(scan.action)}
                      <div>
                        <div className="font-medium text-gray-900">{scan.name}</div>
                        <div className="text-sm text-gray-600 font-mono">{scan.barcode}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 text-xs rounded-full ${getTypeColor(scan.type)}`}>
                        {scan.type}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{scan.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default BarcodeScanner;