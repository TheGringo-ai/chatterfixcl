import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Eye, Wrench, AlertTriangle, BarChart3,
  Activity, Clock, DollarSign, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Package, Users, MapPin, PlayCircle, QrCode, Scan
} from 'lucide-react';
import AssetHierarchyManager from './AssetHierarchyManager';
import BarcodeScanner from './BarcodeScanner';

interface Asset {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'operational' | 'maintenance' | 'repair' | 'decommissioned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  assignedTo: string;
}

interface WorkOrder {
  id: string;
  assetId: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: Date;
}

interface KPIData {
  totalAssets: number;
  operationalAssets: number;
  totalValue: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
  maintenanceCompliance: number;
  reliability: number;
}

interface AssetManagerProps {
  onAssetSelected?: (asset: Asset) => void;
}

const AssetManager: React.FC<AssetManagerProps> = ({ onAssetSelected }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'workorders' | 'hierarchy'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  useEffect(() => {
    // Load mock data
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'Industrial Printer A1',
        description: 'Main production line printer',
        location: 'Production Floor A',
        status: 'operational',
        priority: 'high',
        currentValue: 12000,
        assignedTo: 'John Smith'
      },
      {
        id: '2',
        name: 'HVAC Unit B2',
        description: 'Main building climate control',
        location: 'Building B - Roof',
        status: 'maintenance',
        priority: 'critical',
        currentValue: 18000,
        assignedTo: 'Sarah Johnson'
      },
      {
        id: '3',
        name: 'Forklift C3',
        description: 'Warehouse material handling',
        location: 'Warehouse C',
        status: 'operational',
        priority: 'medium',
        currentValue: 32000,
        assignedTo: 'Mike Wilson'
      }
    ];

    const mockWorkOrders: WorkOrder[] = [
      {
        id: '1',
        assetId: '1',
        title: 'Monthly Printer Maintenance',
        status: 'pending',
        priority: 'medium',
        scheduledDate: new Date('2025-01-15')
      },
      {
        id: '2',
        assetId: '2',
        title: 'HVAC Filter Replacement',
        status: 'in-progress',
        priority: 'high',
        scheduledDate: new Date('2025-01-08')
      },
      {
        id: '3',
        assetId: '3',
        title: 'Brake System Inspection',
        status: 'completed',
        priority: 'high',
        scheduledDate: new Date('2024-12-15')
      }
    ];

    setAssets(mockAssets);
    setWorkOrders(mockWorkOrders);

    // Calculate KPIs
    const totalAssets = mockAssets.length;
    const operationalAssets = mockAssets.filter(a => a.status === 'operational').length;
    const totalValue = mockAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const completedWorkOrders = mockWorkOrders.filter(wo => wo.status === 'completed').length;
    const pendingWorkOrders = mockWorkOrders.filter(wo => wo.status === 'pending').length;
    const maintenanceCompliance = (completedWorkOrders / mockWorkOrders.length) * 100;
    const reliability = 94.2;

    setKpiData({
      totalAssets,
      operationalAssets,
      totalValue,
      completedWorkOrders,
      pendingWorkOrders,
      maintenanceCompliance,
      reliability
    });
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-500" />;
      case 'repair': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'decommissioned': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in-progress': return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{kpiData?.totalAssets || 0}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {kpiData?.operationalAssets || 0} operational
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Asset Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${kpiData?.totalValue.toLocaleString() || 0}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Work Orders</p>
              <p className="text-2xl font-bold text-gray-900">{workOrders.length}</p>
            </div>
            <Wrench className="w-8 h-8 text-orange-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">
              {kpiData?.completedWorkOrders || 0} completed
            </span>
            <span className="text-yellow-600 ml-2">
              {kpiData?.pendingWorkOrders || 0} pending
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reliability</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData?.reliability.toFixed(1) || 0}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.3% this month
            </span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Compliance</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {kpiData?.maintenanceCompliance.toFixed(1) || 0}%
          </div>
          <p className="text-sm text-gray-600">Completed on schedule</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">1.5h</div>
          <p className="text-sm text-gray-600">Average response</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Cost</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">$3,200</div>
          <p className="text-sm text-gray-600">Maintenance expenses</p>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Work Orders</h3>
        <div className="space-y-3">
          {workOrders.slice(0, 5).map((wo) => {
            const asset = assets.find(a => a.id === wo.assetId);
            return (
              <div key={wo.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  {getWorkOrderStatusIcon(wo.status)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{wo.title}</p>
                    <p className="text-xs text-gray-500">{asset?.name}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                  {wo.priority}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Asset Management</h1>
          <p className="text-gray-600">Monitor assets, track maintenance, and analyze performance with advanced KPIs</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </button>
          <button 
            onClick={() => setShowBarcodeScanner(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Scan Barcode
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'assets', label: 'Assets', icon: Package },
          { id: 'hierarchy', label: 'Asset Tree', icon: MapPin },
          { id: 'workorders', label: 'Work Orders', icon: Wrench }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeTab !== 'dashboard' && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets, work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                  <p className="text-sm text-gray-600">{asset.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(asset.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(asset.priority)}`}>
                    {asset.priority}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {asset.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {asset.assignedTo}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Value: ${asset.currentValue.toLocaleString()}</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-gray-400 hover:text-blue-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-green-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-orange-600">
                    <Wrench className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'workorders' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrders.map((wo) => {
                  const asset = assets.find(a => a.id === wo.assetId);
                  
                  return (
                    <tr key={wo.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{wo.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{asset?.name}</div>
                        <div className="text-sm text-gray-500">{asset?.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getWorkOrderStatusIcon(wo.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{wo.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wo.scheduledDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          {wo.status === 'pending' && (
                            <button className="text-orange-600 hover:text-orange-900">
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <div className="h-96">
          <AssetHierarchyManager 
            onAssetSelected={(asset) => {
              console.log('Asset selected from hierarchy:', asset);
              if (onAssetSelected) {
                // Convert hierarchy asset to legacy format
                const legacyAsset = {
                  id: asset.id,
                  name: asset.name,
                  description: asset.description || '',
                  location: asset.location,
                  status: asset.status as 'operational' | 'maintenance' | 'repair' | 'decommissioned',
                  priority: asset.criticality as 'low' | 'medium' | 'high' | 'critical',
                  currentValue: asset.metadata.currentValue || 0,
                  assignedTo: 'Unassigned'
                };
                onAssetSelected(legacyAsset);
              }
            }}
          />
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          mode="asset"
          onScanResult={(result) => {
            console.log('Barcode scan result:', result);
            if (result.type === 'asset' && result.data) {
              // Auto-navigate to the scanned asset
              if (onAssetSelected) {
                const legacyAsset = {
                  id: result.data.id,
                  name: result.data.name,
                  description: result.data.description || '',
                  location: result.data.location,
                  status: result.data.status as 'operational' | 'maintenance' | 'repair' | 'decommissioned',
                  priority: result.data.criticality as 'low' | 'medium' | 'high' | 'critical',
                  currentValue: result.data.metadata?.currentValue || 0,
                  assignedTo: 'Unassigned'
                };
                onAssetSelected(legacyAsset);
              }
              setActiveTab('hierarchy'); // Switch to hierarchy view to show the asset
            }
            setShowBarcodeScanner(false);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default AssetManager;
