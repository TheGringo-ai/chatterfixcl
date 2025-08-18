import React, { useState, useEffect } from 'react';
import { 
  Package, TrendingUp, AlertTriangle, CheckCircle, 
  ShoppingCart, Clock, DollarSign, Truck, 
  Brain, Zap, BarChart3, Settings, Plus,
  Eye, Edit, Calendar, Target, Gauge, QrCode, Scan
} from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number;
  unitCost: number;
  supplier: string;
  leadTime: number; // days
  usageRate: number; // per month
  location: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  lastOrdered: string;
  nextPredictedNeed: string;
  aiPrediction: {
    probabilityOfNeed: number;
    recommendedOrderQuantity: number;
    predictedRunOutDate: string;
    confidence: number;
    reasoning: string;
  };
}

interface AutoOrder {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  supplier: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasonForOrder: string;
  estimatedDelivery: string;
  status: 'pending_approval' | 'approved' | 'ordered' | 'shipped' | 'delivered';
  aiConfidence: number;
  createdAt: string;
  triggeredBy: string; // 'predictive_ai' | 'threshold' | 'work_order'
}

interface SmartInventoryManagerProps {
  getAIResponse: (prompt: string, context?: string) => Promise<string>;
}

const SmartInventoryManager: React.FC<SmartInventoryManagerProps> = ({ getAIResponse }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [autoOrderingEnabled, setAutoOrderingEnabled] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Mock inventory data - in real implementation from database
  const mockInventory: InventoryItem[] = [
    {
      id: 'bearing-001',
      name: 'SKF Deep Groove Ball Bearing 6205',
      category: 'Bearings',
      currentStock: 8,
      minThreshold: 10,
      maxThreshold: 50,
      unitCost: 45.50,
      supplier: 'Industrial Supply Co',
      leadTime: 5,
      usageRate: 12,
      location: 'Warehouse A-1',
      criticality: 'high',
      lastOrdered: '2025-07-15',
      nextPredictedNeed: '2025-08-25',
      aiPrediction: {
        probabilityOfNeed: 95,
        recommendedOrderQuantity: 25,
        predictedRunOutDate: '2025-08-20',
        confidence: 88,
        reasoning: 'High usage rate in pump maintenance, below minimum threshold'
      }
    },
    {
      id: 'filter-023',
      name: 'HEPA Air Filter 24x24x12',
      category: 'Filters',
      currentStock: 15,
      minThreshold: 8,
      maxThreshold: 30,
      unitCost: 89.99,
      supplier: 'FilterMax Pro',
      leadTime: 3,
      usageRate: 6,
      location: 'Warehouse B-2',
      criticality: 'medium',
      lastOrdered: '2025-06-20',
      nextPredictedNeed: '2025-09-15',
      aiPrediction: {
        probabilityOfNeed: 70,
        recommendedOrderQuantity: 12,
        predictedRunOutDate: '2025-09-10',
        confidence: 75,
        reasoning: 'Seasonal increase in HVAC maintenance expected'
      }
    },
    {
      id: 'belt-045',
      name: 'V-Belt A43 Industrial Grade',
      category: 'Belts',
      currentStock: 3,
      minThreshold: 5,
      maxThreshold: 20,
      unitCost: 28.75,
      supplier: 'Belt & Pulley Supply',
      leadTime: 7,
      usageRate: 8,
      location: 'Warehouse A-3',
      criticality: 'critical',
      lastOrdered: '2025-05-10',
      nextPredictedNeed: '2025-08-18',
      aiPrediction: {
        probabilityOfNeed: 98,
        recommendedOrderQuantity: 15,
        predictedRunOutDate: '2025-08-15',
        confidence: 92,
        reasoning: 'Critical shortage detected, high failure rate in conveyor systems'
      }
    },
    {
      id: 'oil-012',
      name: 'Mobil DTE 25 Hydraulic Oil (5 Gal)',
      category: 'Lubricants',
      currentStock: 22,
      minThreshold: 12,
      maxThreshold: 40,
      unitCost: 156.00,
      supplier: 'Lubrication Systems Inc',
      leadTime: 4,
      usageRate: 4,
      location: 'Warehouse C-1',
      criticality: 'medium',
      lastOrdered: '2025-07-01',
      nextPredictedNeed: '2025-10-20',
      aiPrediction: {
        probabilityOfNeed: 45,
        recommendedOrderQuantity: 0,
        predictedRunOutDate: '2025-11-15',
        confidence: 82,
        reasoning: 'Adequate stock levels, no immediate need detected'
      }
    },
    {
      id: 'gasket-078',
      name: 'Rubber Gasket Set - Pump Seal Kit',
      category: 'Seals & Gaskets',
      currentStock: 2,
      minThreshold: 6,
      maxThreshold: 25,
      unitCost: 67.25,
      supplier: 'Seal-Pro Industries',
      leadTime: 6,
      usageRate: 5,
      location: 'Warehouse A-2',
      criticality: 'high',
      lastOrdered: '2025-04-15',
      nextPredictedNeed: '2025-08-22',
      aiPrediction: {
        probabilityOfNeed: 87,
        recommendedOrderQuantity: 18,
        predictedRunOutDate: '2025-08-20',
        confidence: 85,
        reasoning: 'Below threshold, upcoming pump maintenance cycle predicted'
      }
    }
  ];

  useEffect(() => {
    setInventory(mockInventory);
    runSmartAnalysis();
  }, []);

  const runSmartAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const newAutoOrders: AutoOrder[] = [];
    
    for (let i = 0; i < mockInventory.length; i++) {
      const item = mockInventory[i];
      setAnalysisProgress(((i + 1) / mockInventory.length) * 100);
      
      // AI-powered ordering decision
      const prompt = `
        Analyze this inventory item for smart auto-ordering:
        
        Item: ${item.name}
        Category: ${item.category}
        Current Stock: ${item.currentStock}
        Min Threshold: ${item.minThreshold}
        Max Threshold: ${item.maxThreshold}
        Unit Cost: $${item.unitCost}
        Monthly Usage Rate: ${item.usageRate}
        Lead Time: ${item.leadTime} days
        Criticality: ${item.criticality}
        Last Ordered: ${item.lastOrdered}
        Supplier: ${item.supplier}
        
        Current AI Prediction:
        - Probability of Need: ${item.aiPrediction.probabilityOfNeed}%
        - Predicted Run Out: ${item.aiPrediction.predictedRunOutDate}
        - Confidence: ${item.aiPrediction.confidence}%
        - Reasoning: ${item.aiPrediction.reasoning}
        
        Determine:
        1. Should we auto-order this item? (yes/no)
        2. If yes, recommended quantity
        3. Priority level (low/medium/high/urgent)
        4. Reason for ordering or not ordering
        5. Optimal timing for the order
        6. Cost-benefit analysis
        
        Format as JSON:
        {
          "shouldOrder": boolean,
          "quantity": number,
          "priority": "low|medium|high|urgent",
          "reasoning": "string",
          "costBenefit": "string",
          "timing": "immediate|within_week|within_month"
        }
      `;
      
      try {
        const aiResponse = await getAIResponse(prompt);
        
        // Parse AI response
        let decision = null;
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            decision = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse AI decision:', e);
        }
        
        // Create auto-order if AI recommends it
        if (decision && decision.shouldOrder) {
          const autoOrder: AutoOrder = {
            id: `auto-${item.id}-${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            quantity: decision.quantity || item.aiPrediction.recommendedOrderQuantity,
            totalCost: (decision.quantity || item.aiPrediction.recommendedOrderQuantity) * item.unitCost,
            supplier: item.supplier,
            priority: decision.priority || 'medium',
            reasonForOrder: decision.reasoning || item.aiPrediction.reasoning,
            estimatedDelivery: new Date(Date.now() + item.leadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending_approval',
            aiConfidence: item.aiPrediction.confidence,
            createdAt: new Date().toISOString(),
            triggeredBy: 'predictive_ai'
          };
          
          newAutoOrders.push(autoOrder);
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error('AI analysis failed for item:', item.name, error);
        
        // Fallback logic based on thresholds
        if (item.currentStock <= item.minThreshold || item.aiPrediction.probabilityOfNeed > 80) {
          const autoOrder: AutoOrder = {
            id: `auto-${item.id}-${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            quantity: item.aiPrediction.recommendedOrderQuantity,
            totalCost: item.aiPrediction.recommendedOrderQuantity * item.unitCost,
            supplier: item.supplier,
            priority: item.criticality === 'critical' ? 'urgent' : 'high',
            reasonForOrder: `Below threshold (${item.currentStock}/${item.minThreshold}) or high probability of need (${item.aiPrediction.probabilityOfNeed}%)`,
            estimatedDelivery: new Date(Date.now() + item.leadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending_approval',
            aiConfidence: item.aiPrediction.confidence,
            createdAt: new Date().toISOString(),
            triggeredBy: 'threshold'
          };
          
          newAutoOrders.push(autoOrder);
        }
      }
    }
    
    setAutoOrders(newAutoOrders);
    setIsAnalyzing(false);
    setAnalysisProgress(100);
  };

  const approveOrder = (orderId: string) => {
    setAutoOrders(orders => 
      orders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'approved' }
          : order
      )
    );
  };

  const processAllApprovedOrders = () => {
    setAutoOrders(orders => 
      orders.map(order => 
        order.status === 'approved' 
          ? { ...order, status: 'ordered' }
          : order
      )
    );
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'ordered': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const lowStockItems = inventory.filter(item => item.currentStock <= item.minThreshold);
  const pendingOrders = autoOrders.filter(order => order.status === 'pending_approval');
  const totalOrderValue = autoOrders.reduce((sum, order) => sum + order.totalCost, 0);
  const approvedOrders = autoOrders.filter(order => order.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Brain className="w-8 h-8 mr-3" />
              Smart Inventory Auto-Ordering
            </h1>
            <p className="text-green-100 mt-2">
              AI-powered predictive ordering that prevents stockouts before they happen
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={autoOrderingEnabled}
                onChange={(e) => setAutoOrderingEnabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-green-100">Auto-Ordering Enabled</span>
            </div>
            <button
              onClick={runSmartAnalysis}
              disabled={isAnalyzing}
              className="bg-white text-green-600 px-6 py-3 rounded-lg font-medium hover:bg-green-50 disabled:opacity-50 flex items-center"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Run AI Analysis
                </>
              )}
            </button>
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className="bg-white text-green-600 px-6 py-3 rounded-lg font-medium hover:bg-green-50 flex items-center"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Scan Inventory
            </button>
          </div>
        </div>
        
        {isAnalyzing && (
          <div className="mt-4">
            <div className="bg-white bg-opacity-20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-green-100 mt-2">
              AI analyzing inventory patterns... {Math.round(analysisProgress)}%
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <ShoppingCart className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-orange-600">{pendingOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Order Value</p>
              <p className="text-2xl font-bold text-green-600">${totalOrderValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Approved Orders</p>
              <p className="text-2xl font-bold text-blue-600">{approvedOrders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Generated Orders */}
      {autoOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Generated Purchase Orders</h2>
              <p className="text-gray-600">Smart ordering recommendations based on predictive analysis</p>
            </div>
            {approvedOrders.length > 0 && (
              <button
                onClick={processAllApprovedOrders}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Truck className="w-4 h-4 mr-2" />
                Process {approvedOrders.length} Orders
              </button>
            )}
          </div>
          
          <div className="divide-y divide-gray-200">
            {autoOrders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Package className="w-5 h-5 text-blue-500 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.itemName}
                      </h3>
                      <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Quantity</p>
                        <p className="font-medium text-gray-900">{order.quantity} units</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Cost</p>
                        <p className="font-medium text-gray-900">${order.totalCost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Supplier</p>
                        <p className="font-medium text-gray-900">{order.supplier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Est. Delivery</p>
                        <p className="font-medium text-gray-900">{order.estimatedDelivery}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <Brain className="w-4 h-4 mr-2" />
                        AI Reasoning
                      </h4>
                      <p className="text-blue-800">{order.reasonForOrder}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-blue-700">
                        <span>AI Confidence: {order.aiConfidence}%</span>
                        <span>Triggered by: {order.triggeredBy.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6 flex flex-col space-y-2">
                    {order.status === 'pending_approval' && (
                      <button
                        onClick={() => approveOrder(order.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Order
                      </button>
                    )}
                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Overview */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Inventory Overview</h2>
          <p className="text-gray-600">Real-time stock levels and AI predictions</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Prediction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Need</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.category} • {item.supplier}</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getCriticalityColor(item.criticality)}`}>
                        {item.criticality} priority
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {item.currentStock} / {item.maxThreshold}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              item.currentStock <= item.minThreshold ? 'bg-red-500' : 
                              item.currentStock <= item.minThreshold * 1.5 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(item.currentStock / item.maxThreshold) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Min: {item.minThreshold} • Usage: {item.usageRate}/month
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Gauge className="w-4 h-4 text-blue-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.aiPrediction.probabilityOfNeed}% need probability
                        </div>
                        <div className="text-xs text-gray-500">
                          Confidence: {item.aiPrediction.confidence}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.nextPredictedNeed}</div>
                    <div className="text-xs text-gray-500">
                      Run out: {item.aiPrediction.predictedRunOutDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          mode="inventory"
          onScanResult={(result) => {
            console.log('Inventory barcode scan result:', result);
            if (result.type === 'inventory' && result.data) {
              // Find and highlight the scanned inventory item
              const scannedItem = inventory.find(item => 
                item.name.toLowerCase().includes(result.data.name.toLowerCase()) ||
                item.id === result.data.id
              );
              if (scannedItem) {
                setSelectedItem(scannedItem);
              }
            }
            setShowBarcodeScanner(false);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default SmartInventoryManager;