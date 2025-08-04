import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, AlertTriangle, 
  TrendingDown, ShoppingCart, DollarSign, 
  Edit, Truck, CheckCircle, X, Save, ExternalLink, BarChart3, Filter
} from 'lucide-react';

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  location: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  vendor: string;
  assetIds: string[];
  lastOrderDate: string;
  leadTimeDays: number;
  status: 'active' | 'discontinued' | 'backordered';
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  orderDate: string;
  expectedDate: string;
  status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
  parts: { partId: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
}

const PartsInventory: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analytics'>('inventory');

  // Mock data
  useEffect(() => {
    const mockParts: Part[] = [
      {
        id: '1',
        partNumber: 'BRG-001',
        name: 'Motor Bearing',
        description: 'High-speed motor bearing for pumps',
        category: 'Bearings',
        location: 'Warehouse A-12',
        currentStock: 5,
        minStock: 10,
        maxStock: 50,
        unitPrice: 45.99,
        vendor: 'Industrial Supply Co',
        assetIds: ['pump-001', 'pump-003'],
        lastOrderDate: '2024-01-15',
        leadTimeDays: 7,
        status: 'active'
      },
      {
        id: '2',
        partNumber: 'FLT-208',
        name: 'Air Filter',
        description: 'HEPA air filter for HVAC systems',
        category: 'Filters',
        location: 'Warehouse B-05',
        currentStock: 25,
        minStock: 15,
        maxStock: 100,
        unitPrice: 23.50,
        vendor: 'FilterMax Ltd',
        assetIds: ['hvac-001', 'hvac-002'],
        lastOrderDate: '2024-01-20',
        leadTimeDays: 3,
        status: 'active'
      },
      {
        id: '3',
        partNumber: 'BLT-150',
        name: 'Drive Belt',
        description: 'V-belt for conveyor systems',
        category: 'Belts',
        location: 'Warehouse A-08',
        currentStock: 8,
        minStock: 12,
        maxStock: 30,
        unitPrice: 67.25,
        vendor: 'Belt Dynamics',
        assetIds: ['conv-001'],
        lastOrderDate: '2024-01-10',
        leadTimeDays: 5,
        status: 'active'
      },
      {
        id: '4',
        partNumber: 'SLV-304',
        name: 'Gate Valve',
        description: '6-inch stainless steel gate valve',
        category: 'Valves',
        location: 'Warehouse C-15',
        currentStock: 2,
        minStock: 5,
        maxStock: 20,
        unitPrice: 285.00,
        vendor: 'Valve Solutions Inc',
        assetIds: ['pipe-001', 'pipe-003'],
        lastOrderDate: '2023-12-15',
        leadTimeDays: 14,
        status: 'active'
      },
      {
        id: '5',
        partNumber: 'GSK-099',
        name: 'Pump Gasket',
        description: 'Rubber gasket for centrifugal pumps',
        category: 'Gaskets',
        location: 'Warehouse A-04',
        currentStock: 0,
        minStock: 8,
        maxStock: 40,
        unitPrice: 12.75,
        vendor: 'Seal-Tech Corp',
        assetIds: ['pump-001', 'pump-002', 'pump-003'],
        lastOrderDate: '2023-11-30',
        leadTimeDays: 10,
        status: 'backordered'
      }
    ];

    const mockPOs: PurchaseOrder[] = [
      {
        id: '1',
        poNumber: 'PO-2024-001',
        vendor: 'Industrial Supply Co',
        orderDate: '2024-01-22',
        expectedDate: '2024-01-29',
        status: 'ordered',
        parts: [
          { partId: '1', quantity: 20, unitPrice: 45.99 }
        ],
        totalAmount: 919.80
      },
      {
        id: '2',
        poNumber: 'PO-2024-002',
        vendor: 'Seal-Tech Corp',
        orderDate: '2024-01-20',
        expectedDate: '2024-01-30',
        status: 'pending',
        parts: [
          { partId: '5', quantity: 30, unitPrice: 12.75 }
        ],
        totalAmount: 382.50
      }
    ];

    setParts(mockParts);
    setPurchaseOrders(mockPOs);
  }, []);

  const categories = ['all', ...Array.from(new Set(parts.map(p => p.category)))];
  const lowStockParts = parts.filter(p => p.currentStock <= p.minStock);

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || part.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || part.status === filterStatus;
    const matchesLowStock = !showLowStock || part.currentStock <= part.minStock;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
  });

  const getStockStatus = (part: Part) => {
    if (part.currentStock === 0) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Out of Stock' };
    if (part.currentStock <= part.minStock) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Low Stock' };
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'In Stock' };
  };

  const calculateInventoryValue = () => {
    return parts.reduce((total, part) => total + (part.currentStock * part.unitPrice), 0);
  };

  const calculateReorderValue = () => {
    return lowStockParts.reduce((total, part) => total + ((part.minStock - part.currentStock + 5) * part.unitPrice), 0);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="mr-3 text-blue-600" />
            Parts Inventory
          </h1>
          <p className="text-gray-600 mt-1">Manage parts, track stock levels, and automate purchasing</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreatePO(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create PO
          </button>
          <button
            onClick={() => setShowAddPart(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Parts</p>
              <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">${calculateInventoryValue().toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockParts.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reorder Value</p>
              <p className="text-2xl font-bold text-orange-600">${calculateReorderValue().toLocaleString()}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {(['inventory', 'orders', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          {/* Filters and Search */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
                <option value="backordered">Backordered</option>
              </select>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Low Stock Only</span>
              </label>
            </div>
          </div>

          {/* Parts Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Levels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParts.map((part) => {
                    const stockStatus = getStockStatus(part);
                    return (
                      <tr key={part.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{part.name}</div>
                            <div className="text-sm text-gray-500">{part.partNumber}</div>
                            <div className="text-xs text-gray-400">{part.category} • {part.location}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            Current: <span className={`font-medium ${stockStatus.color}`}>{part.currentStock}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Min: {part.minStock} • Max: {part.maxStock}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${part.unitPrice}</div>
                          <div className="text-xs text-gray-500">
                            Value: ${(part.currentStock * part.unitPrice).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{part.vendor}</div>
                          <div className="text-xs text-gray-500">Lead: {part.leadTimeDays} days</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingPart(part.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(po.expectedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${po.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        po.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        po.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Levels by Category</h3>
            <div className="space-y-3">
              {categories.filter(cat => cat !== 'all').map(category => {
                const categoryParts = parts.filter(p => p.category === category);
                const lowStockCount = categoryParts.filter(p => p.currentStock <= p.minStock).length;
                const percentage = categoryParts.length ? (lowStockCount / categoryParts.length) * 100 : 0;
                
                return (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${percentage > 50 ? 'bg-red-500' : percentage > 25 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{lowStockCount}/{categoryParts.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800">Critical Stock Alert</span>
                </div>
                <span className="text-sm text-red-600">{parts.filter(p => p.currentStock === 0).length} items</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <TrendingDown className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Low Stock Warning</span>
                </div>
                <span className="text-sm text-yellow-600">{lowStockParts.length} items</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Avg Part Value</span>
                </div>
                <span className="text-sm text-blue-600">
                  ${parts.length ? (calculateInventoryValue() / parts.length).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsInventory;
