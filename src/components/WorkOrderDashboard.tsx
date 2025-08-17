import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Users, Clock, AlertTriangle, CheckCircle, 
  Plus, Search, Filter, Edit, Trash2, UserPlus, Calendar,
  MapPin, Wrench, FileText, Star, Timer, Play, Square, Mic
} from 'lucide-react';
import { WorkOrder } from '../types';
import WorkOrderManager from './WorkOrderManager';
import VoiceWorkOrderManager from './VoiceWorkOrderManager';

interface WorkOrderDashboardProps {
  workOrders: WorkOrder[];
  onWorkOrderCreate: (workOrder: WorkOrder) => void;
  onWorkOrderUpdate: (workOrder: WorkOrder) => void;
  onWorkOrderDelete?: (workOrderId: string) => void;
  getAIResponse?: (prompt: string) => Promise<string>;
  currentUser?: string;
  userRole?: 'admin' | 'manager' | 'technician' | 'viewer';
}

// Mock technicians list - in real app this would come from API
const AVAILABLE_TECHNICIANS = [
  'John Smith',
  'Sarah Johnson', 
  'Mike Wilson',
  'Lisa Chen',
  'David Rodriguez',
  'Emma Thompson'
];

const WorkOrderDashboard: React.FC<WorkOrderDashboardProps> = ({
  workOrders,
  onWorkOrderCreate,
  onWorkOrderUpdate,
  onWorkOrderDelete,
  getAIResponse,
  currentUser = 'Current User',
  userRole = 'manager'
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showVoiceCreate, setShowVoiceCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');

  // Filter work orders based on search and filters
  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = !searchTerm || 
      wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.asset?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    
    const matchesAssignment = 
      assignmentFilter === 'all' ||
      (assignmentFilter === 'assigned' && wo.assignedTo) ||
      (assignmentFilter === 'unassigned' && !wo.assignedTo) ||
      (assignmentFilter === 'my-assignments' && wo.assignedTo === currentUser);

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignment;
  });

  // Statistics
  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'pending').length,
    inProgress: workOrders.filter(wo => wo.status === 'in-progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
    overdue: workOrders.filter(wo => wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'completed').length,
    unassigned: workOrders.filter(wo => !wo.assignedTo).length
  };

  const handleAssignTechnician = (workOrderId: string) => {
    const workOrder = workOrders.find(wo => wo.id === workOrderId);
    if (workOrder && selectedTechnician) {
      const updatedWorkOrder = {
        ...workOrder,
        assignedTo: selectedTechnician,
        status: workOrder.status === 'pending' ? 'assigned' : workOrder.status,
        notes: [
          ...(workOrder.notes || []),
          {
            id: `note-${Date.now()}`,
            content: `Assigned to ${selectedTechnician}`,
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
            type: 'assignment'
          }
        ]
      };
      onWorkOrderUpdate(updatedWorkOrder);
      setShowAssignModal(null);
      setSelectedTechnician('');
    }
  };

  const handleQuickStatusUpdate = (workOrder: WorkOrder, newStatus: string) => {
    const updatedWorkOrder = {
      ...workOrder,
      status: newStatus,
      notes: [
        ...(workOrder.notes || []),
        {
          id: `note-${Date.now()}`,
          content: `Status changed to ${newStatus}`,
          createdBy: currentUser,
          createdAt: new Date().toISOString(),
          type: 'status_change'
        }
      ]
    };
    onWorkOrderUpdate(updatedWorkOrder);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'on-hold': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (selectedWorkOrder && !showCreateForm) {
    return (
      <WorkOrderManager
        workOrder={selectedWorkOrder}
        onSave={(updatedWorkOrder) => {
          onWorkOrderUpdate(updatedWorkOrder);
          setSelectedWorkOrder(null);
        }}
        onCancel={() => setSelectedWorkOrder(null)}
        getAIResponse={getAIResponse}
        mode="edit"
      />
    );
  }

  if (showCreateForm) {
    return (
      <WorkOrderManager
        onSave={(newWorkOrder) => {
          onWorkOrderCreate(newWorkOrder);
          setShowCreateForm(false);
        }}
        onCancel={() => setShowCreateForm(false)}
        getAIResponse={getAIResponse}
        mode="create"
      />
    );
  }

  if (showVoiceCreate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Voice Work Order Creation</h1>
          <button
            onClick={() => setShowVoiceCreate(false)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
        
        <VoiceWorkOrderManager
          onWorkOrderUpdate={(newWorkOrder) => {
            onWorkOrderCreate(newWorkOrder);
            setShowVoiceCreate(false);
          }}
          getAIResponse={getAIResponse!}
          currentUser={currentUser}
          mode="create"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Work Order Management</h1>
            <p className="text-gray-600">Manage and track all maintenance work orders</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowVoiceCreate(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Mic className="w-4 h-4" />
              <span>Voice Create</span>
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Unassigned</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unassigned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search work orders..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Work Orders</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="my-assignments">My Assignments</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setAssignmentFilter('all');
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Work Orders ({filteredWorkOrders.length})
          </h2>
        </div>

        {filteredWorkOrders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assignmentFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first work order.'
              }
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Work Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset & Location
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
                {filteredWorkOrders.map((workOrder) => (
                  <tr key={workOrder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {workOrder.title || 'Untitled Work Order'}
                        </div>
                        <div className="text-sm text-gray-500">{workOrder.id}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {workOrder.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Wrench className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {workOrder.asset?.name || workOrder.assetName || 'No asset'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {workOrder.asset?.location || workOrder.location || 'No location'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(workOrder.status)}`}>
                        {workOrder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(workOrder.priority || 'medium')}`}>
                        {workOrder.priority || 'medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {workOrder.assignedTo || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {workOrder.dueDate 
                            ? new Date(workOrder.dueDate).toLocaleDateString()
                            : 'No due date'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedWorkOrder(workOrder)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        
                        {!workOrder.assignedTo && (userRole === 'admin' || userRole === 'manager') && (
                          <button
                            onClick={() => setShowAssignModal(workOrder.id)}
                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Assign</span>
                          </button>
                        )}

                        {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
                          <div className="flex space-x-1">
                            {workOrder.status === 'pending' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(workOrder, 'in-progress')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Start Work"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {workOrder.status === 'in-progress' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(workOrder, 'completed')}
                                className="text-green-600 hover:text-green-900"
                                title="Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Work Order</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a technician...</option>
                  {AVAILABLE_TECHNICIANS.map((tech) => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleAssignTechnician(showAssignModal)}
                  disabled={!selectedTechnician}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(null);
                    setSelectedTechnician('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderDashboard;