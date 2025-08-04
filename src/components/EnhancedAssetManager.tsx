import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit, Eye, Download,
  CheckCircle, AlertTriangle, XCircle, AlertCircle, Wrench, Clock,
  Calendar, BarChart3, Activity, TrendingUp,
  Package, DollarSign, Users, MapPin,
  PlayCircle, PauseCircle
} from 'lucide-react';

// Enhanced interfaces for comprehensive asset management
interface Asset {
  id: string;
  name: string;
  description: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  location: string;
  department: string;
  category: string;
  status: 'operational' | 'maintenance' | 'repair' | 'decommissioned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  purchaseDate: Date;
  warrantyExpiry: Date;
  lastMaintenanceDate: Date;
  nextMaintenanceDate: Date;
  purchaseCost: number;
  currentValue: number;
  assignedTo: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  totalWorkOrders?: number;
  completedWorkOrders?: number;
  avgRepairTime?: number;
  maintenanceCost?: number;
  reliability?: number;
}

interface WorkOrder {
  id: string;
  assetId: string;
  title: string;
  description: string;
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection' | 'calibration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  assignedTo: string;
  requestedBy: string;
  scheduledDate: Date;
  completedDate?: Date;
  estimatedHours: number;
  actualHours?: number;
  estimatedCost: number;
  actualCost?: number;
  notes: string;
  parts: Array<{ name: string; quantity: number; cost: number }>;
  createdAt: Date;
  updatedAt: Date;
}

interface KPIData {
  totalAssets: number;
  operationalAssets: number;
  maintenanceAssets: number;
  criticalAssets: number;
  totalValue: number;
  averageAge: number;
  maintenanceCompliance: number;
  avgResponseTime: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
  overdueWorkOrders: number;
  avgCompletionTime: number;
  maintenanceCostThisMonth: number;
  reliability: number;
  utilizationRate: number;
}

interface AssetManagerProps {
  onAssetSelected?: (asset: Asset) => void;
}

const EnhancedAssetManager: React.FC<AssetManagerProps> = ({ onAssetSelected }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'workorders' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Load data from API
  useEffect(() => {
    const initializeData = async () => {
      await loadAssets();
      await loadWorkOrders();
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate KPIs when data changes
  useEffect(() => {
    if (assets.length > 0 && workOrders.length > 0) {
      calculateKPIs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, workOrders]);

  const loadAssets = async () => {
    const storageApiUrl = process.env.REACT_APP_STORAGE_API_URL || process.env.REACT_APP_LLAMA_API_URL;
    
    if (storageApiUrl) {
      try {
        const response = await fetch(`${storageApiUrl}/assets`);
        if (response.ok) {
          const data = await response.json();
          const apiAssets = (data.assets || []).map((apiAsset: any) => ({
            id: apiAsset.id,
            name: apiAsset.name,
            description: apiAsset.description,
            model: apiAsset.model,
            manufacturer: apiAsset.manufacturer,
            serialNumber: apiAsset.serial_number,
            location: apiAsset.location,
            department: apiAsset.department,
            category: apiAsset.category,
            status: apiAsset.status,
            priority: apiAsset.priority,
            purchaseDate: new Date(apiAsset.purchase_date),
            warrantyExpiry: new Date(apiAsset.warranty_expiry),
            lastMaintenanceDate: new Date(apiAsset.last_maintenance_date),
            nextMaintenanceDate: new Date(apiAsset.next_maintenance_date),
            purchaseCost: apiAsset.purchase_cost,
            currentValue: apiAsset.current_value,
            assignedTo: apiAsset.assigned_to,
            tags: apiAsset.tags || [],
            createdAt: new Date(apiAsset.created_at),
            updatedAt: new Date(apiAsset.updated_at)
          }));
          setAssets(apiAssets);
        } else {
          loadMockAssets();
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
        loadMockAssets();
      }
    } else {
      loadMockAssets();
    }
  };

  const loadMockAssets = () => {
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'Industrial Printer A1',
        description: 'Main production line printer',
        model: 'HP LaserJet Pro 4000',
        manufacturer: 'HP',
        serialNumber: 'HP-2024-001',
        location: 'Production Floor A',
        department: 'Manufacturing',
        category: 'equipment',
        status: 'operational',
        priority: 'high',
        purchaseDate: new Date('2023-01-15'),
        warrantyExpiry: new Date('2026-01-15'),
        lastMaintenanceDate: new Date('2024-12-01'),
        nextMaintenanceDate: new Date('2025-03-01'),
        purchaseCost: 15000,
        currentValue: 12000,
        assignedTo: 'John Smith',
        tags: ['critical', 'production'],
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2024-12-01'),
        totalWorkOrders: 12,
        completedWorkOrders: 10,
        avgRepairTime: 2.5,
        maintenanceCost: 2400,
        reliability: 95.2
      },
      {
        id: '2',
        name: 'HVAC Unit B2',
        description: 'Main building climate control',
        model: 'Trane XL20i',
        manufacturer: 'Trane',
        serialNumber: 'TR-2023-456',
        location: 'Building B - Roof',
        department: 'Facilities',
        category: 'infrastructure',
        status: 'maintenance',
        priority: 'critical',
        purchaseDate: new Date('2022-06-10'),
        warrantyExpiry: new Date('2025-06-10'),
        lastMaintenanceDate: new Date('2024-11-15'),
        nextMaintenanceDate: new Date('2025-02-15'),
        purchaseCost: 25000,
        currentValue: 18000,
        assignedTo: 'Sarah Johnson',
        tags: ['hvac', 'climate'],
        createdAt: new Date('2022-06-10'),
        updatedAt: new Date('2024-11-15'),
        totalWorkOrders: 18,
        completedWorkOrders: 16,
        avgRepairTime: 4.2,
        maintenanceCost: 4800,
        reliability: 87.5
      },
      {
        id: '3',
        name: 'Forklift C3',
        description: 'Warehouse material handling',
        model: 'Toyota 8FGU25',
        manufacturer: 'Toyota',
        serialNumber: 'TY-2024-789',
        location: 'Warehouse C',
        department: 'Logistics',
        category: 'vehicle',
        status: 'operational',
        priority: 'medium',
        purchaseDate: new Date('2024-03-20'),
        warrantyExpiry: new Date('2027-03-20'),
        lastMaintenanceDate: new Date('2024-12-10'),
        nextMaintenanceDate: new Date('2025-01-10'),
        purchaseCost: 35000,
        currentValue: 32000,
        assignedTo: 'Mike Wilson',
        tags: ['warehouse', 'material-handling'],
        createdAt: new Date('2024-03-20'),
        updatedAt: new Date('2024-12-10'),
        totalWorkOrders: 6,
        completedWorkOrders: 6,
        avgRepairTime: 1.8,
        maintenanceCost: 1200,
        reliability: 98.1
      }
    ];
    setAssets(mockAssets);
  };

  const loadWorkOrders = async () => {
    const storageApiUrl = process.env.REACT_APP_STORAGE_API_URL || process.env.REACT_APP_LLAMA_API_URL;
    
    if (storageApiUrl) {
      try {
        const response = await fetch(`${storageApiUrl}/workorders`);
        if (response.ok) {
          const data = await response.json();
          const apiWorkOrders = (data.work_orders || []).map((apiWO: any) => ({
            id: apiWO.id,
            assetId: apiWO.asset_id,
            title: apiWO.title,
            description: apiWO.description,
            type: apiWO.type,
            priority: apiWO.priority,
            status: apiWO.status,
            assignedTo: apiWO.assigned_to,
            requestedBy: apiWO.requested_by,
            scheduledDate: new Date(apiWO.scheduled_date),
            completedDate: apiWO.completed_date ? new Date(apiWO.completed_date) : undefined,
            estimatedHours: apiWO.estimated_hours,
            actualHours: apiWO.actual_hours,
            estimatedCost: apiWO.estimated_cost,
            actualCost: apiWO.actual_cost,
            notes: apiWO.notes,
            parts: apiWO.parts || [],
            createdAt: new Date(apiWO.created_at),
            updatedAt: new Date(apiWO.updated_at)
          }));
          setWorkOrders(apiWorkOrders);
        } else {
          loadMockWorkOrders();
        }
      } catch (error) {
        console.error('Failed to load work orders:', error);
        loadMockWorkOrders();
      }
    } else {
      loadMockWorkOrders();
    }
  };

  const calculateKPIs = useCallback(() => {
    const now = new Date();

    // Asset KPIs
    const totalAssets = assets.length;
    const operationalAssets = assets.filter(a => a.status === 'operational').length;
    const maintenanceAssets = assets.filter(a => a.status === 'maintenance' || a.status === 'repair').length;
    const criticalAssets = assets.filter(a => a.priority === 'critical').length;
    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const averageAge = assets.reduce((sum, a) => {
      const ageInYears = (now.getTime() - a.purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      return sum + ageInYears;
    }, 0) / totalAssets;

    // Work Order KPIs
    const totalWorkOrders = workOrders.length;
    const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length;
    const pendingWorkOrders = workOrders.filter(wo => wo.status === 'pending').length;
    const overdueWorkOrders = workOrders.filter(wo => 
      wo.status !== 'completed' && wo.scheduledDate < now
    ).length;

    // Calculate average completion time
    const completedWOs = workOrders.filter(wo => wo.status === 'completed' && wo.actualHours);
    const avgCompletionTime = completedWOs.length > 0 
      ? completedWOs.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) / completedWOs.length
      : 0;

    // Calculate maintenance costs for current month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const maintenanceCostThisMonth = workOrders
      .filter(wo => {
        const woDate = wo.completedDate || wo.createdAt;
        return woDate.getMonth() === currentMonth && 
               woDate.getFullYear() === currentYear &&
               wo.actualCost;
      })
      .reduce((sum, wo) => sum + (wo.actualCost || 0), 0);

    // Calculate overall metrics
    const maintenanceCompliance = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0;
    const avgResponseTime = 1.5; // This would be calculated from actual response times
    const reliability = assets.reduce((sum, a) => sum + (a.reliability || 90), 0) / totalAssets;
    const utilizationRate = 85; // This would be calculated from actual usage data

    setKpiData({
      totalAssets,
      operationalAssets,
      maintenanceAssets,
      criticalAssets,
      totalValue,
      averageAge,
      maintenanceCompliance,
      avgResponseTime,
      totalWorkOrders,
      completedWorkOrders,
      pendingWorkOrders,
      overdueWorkOrders,
      avgCompletionTime,
      maintenanceCostThisMonth,
      reliability,
      utilizationRate
    });
  }, [assets, workOrders]);

  const loadMockWorkOrders = () => {
    const mockWorkOrders: WorkOrder[] = [
      {
        id: '1',
        assetId: '1',
        title: 'Monthly Printer Maintenance',
        description: 'Replace toner, clean rollers, check paper feed',
        type: 'preventive',
        priority: 'medium',
        status: 'pending',
        assignedTo: 'Tech Team A',
        requestedBy: 'John Smith',
        scheduledDate: new Date('2025-01-15'),
        estimatedHours: 2,
        estimatedCost: 150,
        notes: 'Regular maintenance schedule',
        parts: [
          { name: 'Toner Cartridge', quantity: 1, cost: 80 },
          { name: 'Cleaning Kit', quantity: 1, cost: 25 }
        ],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      },
      {
        id: '2',
        assetId: '2',
        title: 'HVAC Filter Replacement',
        description: 'Replace air filters and check refrigerant levels',
        type: 'preventive',
        priority: 'high',
        status: 'in-progress',
        assignedTo: 'HVAC Specialist',
        requestedBy: 'Sarah Johnson',
        scheduledDate: new Date('2025-01-08'),
        estimatedHours: 4,
        estimatedCost: 300,
        notes: 'Quarterly maintenance',
        parts: [
          { name: 'HEPA Filter', quantity: 2, cost: 120 },
          { name: 'Refrigerant R410A', quantity: 1, cost: 85 }
        ],
        createdAt: new Date('2024-12-20'),
        updatedAt: new Date('2025-01-08')
      },
      {
        id: '3',
        assetId: '3',
        title: 'Brake System Inspection',
        description: 'Annual brake system safety check',
        type: 'inspection',
        priority: 'high',
        status: 'completed',
        assignedTo: 'Vehicle Mechanic',
        requestedBy: 'Mike Wilson',
        scheduledDate: new Date('2024-12-15'),
        completedDate: new Date('2024-12-16'),
        estimatedHours: 3,
        actualHours: 2.5,
        estimatedCost: 200,
        actualCost: 175,
        notes: 'All systems passed inspection',
        parts: [
          { name: 'Brake Fluid', quantity: 1, cost: 25 }
        ],
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-16')
      }
    ];
    setWorkOrders(mockWorkOrders);
  };

  // Helper functions
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
      case 'on-hold': return <PauseCircle className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filter functions
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || asset.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const filteredWorkOrders = workOrders.filter(wo => {
    const asset = assets.find(a => a.id === wo.assetId);
    const matchesSearch = wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset && asset.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Component render functions
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
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-600">
              Avg age: {kpiData?.averageAge.toFixed(1) || 0} years
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Work Orders</p>
              <p className="text-2xl font-bold text-gray-900">{kpiData?.totalWorkOrders || 0}</p>
            </div>
            <Wrench className="w-8 h-8 text-orange-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">
              {kpiData?.completedWorkOrders || 0} completed
            </span>
            <span className="text-red-600 ml-2">
              {kpiData?.overdueWorkOrders || 0} overdue
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

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Operational</span>
              </div>
              <span className="text-sm font-medium">{kpiData?.operationalAssets || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Maintenance</span>
              </div>
              <span className="text-sm font-medium">{kpiData?.maintenanceAssets || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Critical</span>
              </div>
              <span className="text-sm font-medium">{kpiData?.criticalAssets || 0}</span>
            </div>
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
            <h3 className="text-lg font-semibold text-gray-900">Avg Response Time</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {kpiData?.avgResponseTime.toFixed(1) || 0}h
          </div>
          <p className="text-sm text-gray-600">From request to start</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Cost</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            ${kpiData?.maintenanceCostThisMonth.toLocaleString() || 0}
          </div>
          <p className="text-sm text-gray-600">Maintenance expenses</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-600">Monitor assets, track maintenance, and analyze performance</p>
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
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'assets', label: 'Assets', icon: Package },
          { id: 'workorders', label: 'Work Orders', icon: Wrench },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
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
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="repair">Repair</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="equipment">Equipment</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="vehicle">Vehicle</option>
            <option value="it">IT Assets</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

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
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Next: {asset.nextMaintenanceDate.toLocaleDateString()}
                </div>
              </div>

              {asset.reliability && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Reliability</span>
                    <span className="font-medium">{asset.reliability.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${asset.reliability}%` }}
                    ></div>
                  </div>
                </div>
              )}

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

              {asset.tags && asset.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {asset.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
                    Assigned To
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
                {filteredWorkOrders.map((wo) => {
                  const asset = assets.find(a => a.id === wo.assetId);
                  const isOverdue = wo.status !== 'completed' && wo.scheduledDate < new Date();
                  
                  return (
                    <tr key={wo.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{wo.title}</div>
                          <div className="text-sm text-gray-500">{wo.type}</div>
                        </div>
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
                        {wo.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {wo.scheduledDate.toLocaleDateString()}
                        </div>
                        {isOverdue && (
                          <div className="text-xs text-red-500">Overdue</div>
                        )}
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
                          {wo.status === 'in-progress' && (
                            <button className="text-green-600 hover:text-green-900">
                              <CheckCircle className="w-4 h-4" />
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

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Cost Trends</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Cost analysis chart would appear here</p>
                </div>
              </div>
            </div>

            {/* Asset Performance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Performance</h3>
              <div className="space-y-4">
                {assets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">{asset.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {asset.reliability?.toFixed(1)}%
                      </p>
                      <div className="flex items-center text-xs text-green-600">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +2.1%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Work Order Completion Rate</h4>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {kpiData?.maintenanceCompliance.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Last 30 days</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Average Repair Time</h4>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {kpiData?.avgCompletionTime.toFixed(1)}h
              </div>
              <p className="text-sm text-gray-600">Per work order</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Equipment Utilization</h4>
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {kpiData?.utilizationRate}%
              </div>
              <p className="text-sm text-gray-600">Overall efficiency</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAssetManager;
