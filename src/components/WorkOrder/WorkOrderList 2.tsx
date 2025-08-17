import React, { useState } from 'react';
import { 
  Clock, User, MapPin, AlertTriangle, CheckCircle, 
  Plus, Edit, Filter, Search, Calendar,
  Package, Camera, FileText, Timer
} from 'lucide-react';
import SimpleWorkOrderForm from '../SimpleWorkOrderForm';
import { EnhancedWorkOrderForm } from '../EnhancedWorkOrderForm';
import { WorkOrder } from '../../types';

interface WorkOrderListProps {
  workOrders: WorkOrder[];
  activeWorkOrderId?: string;
  onSelectWorkOrder: (workOrder: WorkOrder) => void;
  onCreateWorkOrder?: (workOrder: WorkOrder) => void;
  onUpdateWorkOrder?: (workOrder: WorkOrder) => void;
  getAIResponse?: (prompt: string) => Promise<string>;
}

const WorkOrderList: React.FC<WorkOrderListProps> = ({ 
  workOrders, 
  activeWorkOrderId, 
  onSelectWorkOrder,
  onCreateWorkOrder,
  onUpdateWorkOrder,
  getAIResponse
}) => {
  const [showWorkOrderManager, setShowWorkOrderManager] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | undefined>();
  const [managerMode, setManagerMode] = useState<'create' | 'edit' | 'view'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [useEnhancedForm, setUseEnhancedForm] = useState(false);

  // Mock data for enhanced form
  const mockTechnicians = [
    { id: '1', name: 'John Smith', status: 'available' },
    { id: '2', name: 'Sarah Johnson', status: 'busy' },
    { id: '3', name: 'Mike Davis', status: 'available' },
    { id: '4', name: 'Lisa Wong', status: 'available' }
  ];

  const mockParts = [
    { id: '1', name: 'Belt Drive', quantity: 15, location: 'A-1-3' },
    { id: '2', name: 'Motor Bearing', quantity: 8, location: 'B-2-1' },
    { id: '3', name: 'Control Panel', quantity: 3, location: 'C-1-2' },
    { id: '4', name: 'Safety Switch', quantity: 12, location: 'A-3-4' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
      case 'In Progress':
        return <Timer className="w-4 h-4 text-blue-600" />;
      case 'assigned':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'on-hold':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'on-hold':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateWorkOrder = () => {
    setSelectedWorkOrder(undefined);
    setManagerMode('create');
    setShowWorkOrderManager(true);
  };

  const handleEditWorkOrder = (workOrder: WorkOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorkOrder(workOrder);
    setManagerMode('edit');
    setShowWorkOrderManager(true);
  };

  const handleViewWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setManagerMode('view');
    setShowWorkOrderManager(true);
    onSelectWorkOrder(workOrder);
  };

  const handleSaveWorkOrder = (workOrder: WorkOrder) => {
    if (managerMode === 'create' && onCreateWorkOrder) {
      onCreateWorkOrder(workOrder);
    } else if (managerMode === 'edit' && onUpdateWorkOrder) {
      onUpdateWorkOrder(workOrder);
    }
    setShowWorkOrderManager(false);
    setSelectedWorkOrder(undefined);
  };

  const handleSaveEnhancedWorkOrder = (workOrder: Partial<WorkOrder>) => {
    // Convert partial to full WorkOrder with required fields
    const fullWorkOrder: WorkOrder = {
      id: workOrder.id || Date.now().toString(),
      status: workOrder.status || 'open',
      title: workOrder.title,
      description: workOrder.description,
      priority: workOrder.priority,
      assignedTo: workOrder.assignedTo,
      assetName: workOrder.assetName,
      estimatedHours: workOrder.estimatedHours,
      createdAt: workOrder.createdAt,
      dueDate: workOrder.dueDate,
      notes: workOrder.notes,
      attachments: workOrder.attachments,
      downtime: workOrder.downtime
    };
    
    if (managerMode === 'create' && onCreateWorkOrder) {
      onCreateWorkOrder(fullWorkOrder);
    } else if (managerMode === 'edit' && onUpdateWorkOrder) {
      onUpdateWorkOrder(fullWorkOrder);
    }
    setShowWorkOrderManager(false);
    setSelectedWorkOrder(undefined);
  };

  const handleCancel = () => {
    setShowWorkOrderManager(false);
    setSelectedWorkOrder(undefined);
  };

  // Filter work orders
  const filteredWorkOrders = workOrders.filter(workOrder => {
    const searchFields = [
      workOrder.title || '',
      workOrder.asset?.name || workOrder.assetName || '',
      workOrder.assignedTo || '',
      workOrder.id || ''
    ];
    
    const matchesSearch = searchTerm === '' || 
      searchFields.some(field => 
        field.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || 
      (workOrder.status && workOrder.status.toLowerCase() === statusFilter.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || 
      (workOrder.priority && workOrder.priority.toLowerCase() === priorityFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Show WorkOrderManager if open
  if (showWorkOrderManager) {
    return useEnhancedForm ? (
      <EnhancedWorkOrderForm
        workOrder={selectedWorkOrder}
        onSave={handleSaveEnhancedWorkOrder}
        onCancel={handleCancel}
        technicians={mockTechnicians}
        parts={mockParts}
      />
    ) : (
      <SimpleWorkOrderForm
        workOrder={selectedWorkOrder}
        onSave={handleSaveWorkOrder}
        onCancel={handleCancel}
        mode={managerMode}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
            <p className="text-sm text-gray-600">{filteredWorkOrders.length} of {workOrders.length} orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={useEnhancedForm}
                onChange={(e) => setUseEnhancedForm(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Enhanced Form</span>
            </label>
            <button
              onClick={handleCreateWorkOrder}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In Progress</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2 text-sm">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>
        </div>
      </div>
      
      {/* Work Orders List */}
      {filteredWorkOrders.length === 0 ? (
        <div className="p-6">
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {workOrders.length === 0 ? 'No Work Orders' : 'No work orders match your filters'}
            </h3>
            <p className="text-gray-600 mb-4">
              {workOrders.length === 0 
                ? 'Create your first work order using the voice interface or manual entry.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {workOrders.length === 0 && (
              <button
                onClick={handleCreateWorkOrder}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Work Order</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredWorkOrders.map((workOrder) => (
            <div
              key={workOrder.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                activeWorkOrderId === workOrder.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => handleViewWorkOrder(workOrder)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(workOrder.status)}
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {workOrder.title}
                    </h3>
                    {workOrder.checkedInTechnician && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{workOrder.asset?.name || workOrder.assetName} • {workOrder.asset?.location || workOrder.location}</span>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-600">
                      <User className="w-3 h-3 mr-1" />
                      <span>{workOrder.assignedTo || 'Unassigned'}</span>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>Due: {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : 'No due date'}</span>
                    </div>

                    {/* Additional Info Icons */}
                    <div className="flex items-center space-x-3 mt-2">
                      {workOrder.parts && workOrder.parts.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Package className="w-3 h-3 mr-1" />
                          <span>{workOrder.parts.length} parts</span>
                        </div>
                      )}
                      {workOrder.attachments && workOrder.attachments.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Camera className="w-3 h-3 mr-1" />
                          <span>{workOrder.attachments.length} files</span>
                        </div>
                      )}
                      {workOrder.notes && workOrder.notes.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <FileText className="w-3 h-3 mr-1" />
                          <span>{workOrder.notes.length} notes</span>
                        </div>
                      )}
                      {workOrder.downtime && workOrder.downtime.totalMinutes > 0 && (
                        <div className="flex items-center text-xs text-orange-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          <span>{workOrder.downtime.totalMinutes.toFixed(0)}min downtime</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(workOrder.priority || 'medium')}`}>
                      {workOrder.priority || 'medium'}
                    </span>
                    <button
                      onClick={(e) => handleEditWorkOrder(workOrder, e)}
                      className="text-gray-400 hover:text-blue-600 p-1"
                      title="Edit work order"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>

                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(workOrder.status)}`}>
                    {workOrder.status?.replace('-', ' ') || 'Unknown'}
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {workOrder.id}
                  </span>

                  <div className="text-xs text-gray-500 text-right">
                    <div>{workOrder.estimatedHours || 0}h est.</div>
                    <div>{(workOrder.actualHours || 0).toFixed(1)}h actual</div>
                  </div>
                </div>
              </div>
              
              {workOrder.description && (
                <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                  {workOrder.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkOrderList;
