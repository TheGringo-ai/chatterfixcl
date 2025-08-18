import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronRight, Plus, Edit, Trash2, Search,
  Factory, Cpu, Wrench, Settings, AlertTriangle, CheckCircle,
  MapPin, Calendar, DollarSign, Activity, QrCode, Eye,
  MoreVertical, Copy, Move, Folder, FolderOpen
} from 'lucide-react';

interface AssetNode {
  id: string;
  name: string;
  type: 'facility' | 'area' | 'line' | 'system' | 'equipment' | 'component';
  description?: string;
  location: string;
  status: 'operational' | 'maintenance' | 'failed' | 'offline';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  parentId?: string;
  children: AssetNode[];
  metadata: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    barcode?: string;
    installDate?: string;
    lastMaintenance?: string;
    nextPMDate?: string;
    warrantyExpiry?: string;
    purchaseCost?: number;
    currentValue?: number;
  };
  sensors?: {
    temperature?: number;
    vibration?: number;
    pressure?: number;
    runtime?: number;
    efficiency?: number;
  };
  workOrderCount: number;
  isExpanded?: boolean;
}

interface AssetHierarchyManagerProps {
  onAssetSelected?: (asset: AssetNode) => void;
}

const AssetHierarchyManager: React.FC<AssetHierarchyManagerProps> = ({ onAssetSelected }) => {
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Mock hierarchical asset data
  const mockAssets: AssetNode[] = [
    {
      id: 'facility-001',
      name: 'Manufacturing Plant A',
      type: 'facility',
      description: 'Primary manufacturing facility',
      location: 'Detroit, MI',
      status: 'operational',
      criticality: 'critical',
      workOrderCount: 45,
      metadata: {
        installDate: '2018-01-15',
        purchaseCost: 15000000,
        currentValue: 12000000
      },
      children: [
        {
          id: 'area-001',
          name: 'Production Floor',
          type: 'area',
          description: 'Main production area',
          location: 'Building A, Floor 1',
          status: 'operational',
          criticality: 'critical',
          parentId: 'facility-001',
          workOrderCount: 23,
          metadata: {
            installDate: '2018-01-15'
          },
          children: [
            {
              id: 'line-001',
              name: 'Assembly Line 1',
              type: 'line',
              description: 'Primary assembly line',
              location: 'Production Floor, Section A',
              status: 'operational',
              criticality: 'high',
              parentId: 'area-001',
              workOrderCount: 12,
              metadata: {
                installDate: '2018-02-01',
                lastMaintenance: '2025-08-10',
                nextPMDate: '2025-09-10'
              },
              children: [
                {
                  id: 'system-001',
                  name: 'Conveyor System',
                  type: 'system',
                  description: 'Main conveyor belt system',
                  location: 'Assembly Line 1, Station 1-5',
                  status: 'operational',
                  criticality: 'high',
                  parentId: 'line-001',
                  workOrderCount: 8,
                  metadata: {
                    manufacturer: 'ConveyorTech Inc',
                    model: 'CT-2000X',
                    serialNumber: 'CT2000X-2018-001',
                    barcode: '123456789012',
                    installDate: '2018-02-15',
                    lastMaintenance: '2025-08-01',
                    nextPMDate: '2025-09-01',
                    warrantyExpiry: '2023-02-15',
                    purchaseCost: 85000,
                    currentValue: 65000
                  },
                  sensors: {
                    temperature: 42,
                    vibration: 2.1,
                    runtime: 8760,
                    efficiency: 94
                  },
                  children: [
                    {
                      id: 'equipment-001',
                      name: 'Drive Motor',
                      type: 'equipment',
                      description: '50HP AC drive motor',
                      location: 'Conveyor System, Motor Housing 1',
                      status: 'operational',
                      criticality: 'critical',
                      parentId: 'system-001',
                      workOrderCount: 3,
                      metadata: {
                        manufacturer: 'Siemens',
                        model: 'SIMOTICS GP 1LE1',
                        serialNumber: 'SIE-50HP-2018-001',
                        barcode: '789012345678',
                        installDate: '2018-02-15',
                        lastMaintenance: '2025-07-15',
                        nextPMDate: '2025-08-15',
                        warrantyExpiry: '2021-02-15',
                        purchaseCost: 12500,
                        currentValue: 8500
                      },
                      sensors: {
                        temperature: 75,
                        vibration: 1.8,
                        runtime: 8760,
                        efficiency: 96
                      },
                      children: [
                        {
                          id: 'component-001',
                          name: 'Motor Bearings',
                          type: 'component',
                          description: 'Front and rear motor bearings',
                          location: 'Drive Motor, Bearing Housing',
                          status: 'maintenance',
                          criticality: 'high',
                          parentId: 'equipment-001',
                          workOrderCount: 2,
                          metadata: {
                            manufacturer: 'SKF',
                            model: 'SKF 6314',
                            serialNumber: 'SKF-6314-2018-001',
                            barcode: '345678901234',
                            installDate: '2018-02-15',
                            lastMaintenance: '2025-07-15',
                            nextPMDate: '2025-08-20',
                            warrantyExpiry: '2020-02-15',
                            purchaseCost: 450,
                            currentValue: 200
                          },
                          sensors: {
                            temperature: 85,
                            vibration: 4.2
                          },
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'area-002',
          name: 'Utility Room',
          type: 'area',
          description: 'HVAC and utility systems',
          location: 'Building A, Basement',
          status: 'operational',
          criticality: 'medium',
          parentId: 'facility-001',
          workOrderCount: 8,
          metadata: {
            installDate: '2018-01-15'
          },
          children: [
            {
              id: 'equipment-002',
              name: 'Air Compressor Unit 1',
              type: 'equipment',
              description: 'Primary air compressor',
              location: 'Utility Room, Section B',
              status: 'failed',
              criticality: 'critical',
              parentId: 'area-002',
              workOrderCount: 5,
              metadata: {
                manufacturer: 'Atlas Copco',
                model: 'GA 75',
                serialNumber: 'AC-GA75-2018-002',
                barcode: '567890123456',
                installDate: '2018-03-01',
                lastMaintenance: '2025-06-15',
                nextPMDate: '2025-08-15',
                warrantyExpiry: '2021-03-01',
                purchaseCost: 45000,
                currentValue: 28000
              },
              sensors: {
                temperature: 95,
                vibration: 6.1,
                pressure: 120,
                runtime: 15600,
                efficiency: 78
              },
              children: []
            }
          ]
        }
      ]
    }
  ];

  useEffect(() => {
    setAssets(mockAssets);
    // Expand top level by default
    setExpandedNodes(new Set(['facility-001', 'area-001', 'line-001', 'system-001']));
  }, []);

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'facility': return <Factory className="w-4 h-4" />;
      case 'area': return <MapPin className="w-4 h-4" />;
      case 'line': return <Activity className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      case 'equipment': return <Cpu className="w-4 h-4" />;
      case 'component': return <Wrench className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const searchAssets = (nodes: AssetNode[], term: string): AssetNode[] => {
    if (!term) return nodes;
    
    const filtered: AssetNode[] = [];
    
    for (const node of nodes) {
      const matches = node.name.toLowerCase().includes(term.toLowerCase()) ||
                     node.description?.toLowerCase().includes(term.toLowerCase()) ||
                     node.metadata.manufacturer?.toLowerCase().includes(term.toLowerCase()) ||
                     node.metadata.model?.toLowerCase().includes(term.toLowerCase()) ||
                     node.metadata.serialNumber?.toLowerCase().includes(term.toLowerCase()) ||
                     node.metadata.barcode?.toLowerCase().includes(term.toLowerCase());
      
      const filteredChildren = searchAssets(node.children, term);
      
      if (matches || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren
        });
      }
    }
    
    return filtered;
  };

  const renderAssetNode = (node: AssetNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indent = depth * 24;

    return (
      <div key={node.id} className="border-l border-gray-200">
        <div
          className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
            selectedAsset?.id === node.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => {
            setSelectedAsset(node);
            onAssetSelected?.(node);
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex items-center mr-3">
            {hasChildren ? (
              isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-600" />
            ) : (
              getTypeIcon(node.type)
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="font-medium text-gray-900 truncate">{node.name}</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(node.status)}`}>
                {node.status}
              </span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${getCriticalityColor(node.criticality)}`}>
                {node.criticality}
              </span>
              {node.metadata.barcode && (
                <QrCode className="w-4 h-4 ml-2 text-gray-400" />
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">{node.location}</div>
            {node.workOrderCount > 0 && (
              <div className="text-xs text-orange-600">{node.workOrderCount} open work orders</div>
            )}
          </div>
          
          <button className="ml-2 p-1 hover:bg-gray-200 rounded">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderAssetNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredAssets = searchAssets(assets, searchTerm);

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Factory className="w-6 h-6 mr-2" />
            Asset Hierarchy
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets, barcodes, serial numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Asset Tree */}
      <div className="flex-1 overflow-auto">
        {filteredAssets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Factory className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No assets found</p>
          </div>
        ) : (
          <div>
            {filteredAssets.map(asset => renderAssetNode(asset))}
          </div>
        )}
      </div>

      {/* Selected Asset Detail Panel */}
      {selectedAsset && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Asset Details</h3>
            <button
              onClick={() => setSelectedAsset(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-600">Type:</span> {selectedAsset.type}</div>
                <div><span className="text-gray-600">Location:</span> {selectedAsset.location}</div>
                <div><span className="text-gray-600">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status}
                  </span>
                </div>
                <div><span className="text-gray-600">Criticality:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs border ${getCriticalityColor(selectedAsset.criticality)}`}>
                    {selectedAsset.criticality}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
              <div className="space-y-2 text-sm">
                {selectedAsset.metadata.manufacturer && (
                  <div><span className="text-gray-600">Manufacturer:</span> {selectedAsset.metadata.manufacturer}</div>
                )}
                {selectedAsset.metadata.model && (
                  <div><span className="text-gray-600">Model:</span> {selectedAsset.metadata.model}</div>
                )}
                {selectedAsset.metadata.serialNumber && (
                  <div><span className="text-gray-600">Serial:</span> {selectedAsset.metadata.serialNumber}</div>
                )}
                {selectedAsset.metadata.barcode && (
                  <div className="flex items-center">
                    <span className="text-gray-600">Barcode:</span> 
                    <span className="ml-2 font-mono text-xs bg-gray-200 px-2 py-1 rounded flex items-center">
                      <QrCode className="w-3 h-3 mr-1" />
                      {selectedAsset.metadata.barcode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {selectedAsset.sensors && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Sensor Readings</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(selectedAsset.sensors).map(([key, value]) => (
                  <div key={key} className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-gray-600 capitalize">{key}</div>
                    <div className="text-lg font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetHierarchyManager;