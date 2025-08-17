import React, { useState } from 'react';
import { 
  Camera, User, Clock, MapPin, AlertTriangle, CheckCircle,
  Play, Pause, Square, Plus, Edit, Save, X, FileText,
  Wrench, Package, Timer, MessageSquare
} from 'lucide-react';
import { WorkOrder } from '../types';
import PhotoUpload from './PhotoUpload';
import AIChat from './AIChat';

interface TechnicianWorkOrderViewProps {
  workOrders: WorkOrder[];
  activeWorkOrder?: WorkOrder | null;
  onWorkOrderUpdate: (workOrder: WorkOrder) => void;
  onWorkOrderCreate: (workOrder: WorkOrder) => void;
  currentTechnician?: string;
  getAIResponse: (prompt: string, context?: string, workOrderId?: string) => Promise<string>;
}

const TechnicianWorkOrderView: React.FC<TechnicianWorkOrderViewProps> = ({
  workOrders,
  activeWorkOrder,
  onWorkOrderUpdate,
  onWorkOrderCreate,
  currentTechnician = 'Current Technician',
  getAIResponse
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(activeWorkOrder || null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  // Get technician's work orders and available unassigned orders
  const assignedWorkOrders = workOrders.filter(wo => 
    wo.assignedTo === currentTechnician || wo.technician === currentTechnician
  );
  
  const unassignedWorkOrders = workOrders.filter(wo => 
    !wo.assignedTo && wo.status !== 'completed' && wo.status !== 'cancelled'
  );

  const handleCheckIn = (workOrder: WorkOrder) => {
    const updatedWorkOrder = {
      ...workOrder,
      status: 'in-progress',
      startTime: new Date(),
      checkedInTechnician: {
        name: currentTechnician,
        checkedInAt: new Date().toISOString()
      }
    };
    onWorkOrderUpdate(updatedWorkOrder);
    setSelectedWorkOrder(updatedWorkOrder);
    setIsTimerRunning(true);
  };

  const handleCheckOut = (workOrder: WorkOrder) => {
    const endTime = new Date();
    const duration = workOrder.startTime ? 
      Math.round((endTime.getTime() - new Date(workOrder.startTime).getTime()) / 1000 / 60) : 0;

    const updatedWorkOrder = {
      ...workOrder,
      status: resolution ? 'completed' : 'on-hold',
      endTime,
      duration,
      resolution: resolution || workOrder.resolution,
      notes: [...(workOrder.notes || []), {
        id: Date.now().toString(),
        content: notes,
        createdBy: currentTechnician,
        createdAt: new Date().toISOString()
      }].filter(note => note.content.trim() !== '')
    };
    
    onWorkOrderUpdate(updatedWorkOrder);
    setIsTimerRunning(false);
    setNotes('');
    setResolution('');
  };

  const handleQuickUpdate = (workOrder: WorkOrder, field: string, value: any) => {
    const updatedWorkOrder = { ...workOrder, [field]: value };
    onWorkOrderUpdate(updatedWorkOrder);
    if (selectedWorkOrder?.id === workOrder.id) {
      setSelectedWorkOrder(updatedWorkOrder);
    }
  };

  const handleTakeWorkOrder = (workOrder: WorkOrder) => {
    const updatedWorkOrder = {
      ...workOrder,
      assignedTo: currentTechnician,
      status: 'assigned',
      notes: [
        ...(workOrder.notes || []),
        {
          id: `note-${Date.now()}`,
          content: `Work order picked up by ${currentTechnician}`,
          createdBy: currentTechnician,
          createdAt: new Date().toISOString(),
          type: 'assignment'
        }
      ]
    };
    onWorkOrderUpdate(updatedWorkOrder);
    setSelectedWorkOrder(updatedWorkOrder);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'on-hold': return 'bg-orange-100 text-orange-800';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
            <p className="text-gray-600">Welcome, {currentTechnician}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              My Work Orders: {assignedWorkOrders.length}
            </span>
            <span className="text-sm text-gray-500">
              Available: {unassignedWorkOrders.length}
            </span>
            <span className="text-sm text-gray-500">
              Active: {assignedWorkOrders.filter(wo => wo.status === 'in-progress').length}
            </span>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Work Order</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Work Orders List */}
        <div className="xl:col-span-1 space-y-6">
          {/* My Assigned Work Orders */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Work Orders</h2>
            
            {assignedWorkOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No work orders assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedWorkOrders.map((workOrder) => (
                <div
                  key={workOrder.id}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all ${
                    selectedWorkOrder?.id === workOrder.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedWorkOrder(workOrder)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {workOrder.title || workOrder.description || 'Untitled Work Order'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                      {workOrder.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <span>{workOrder.asset?.name || workOrder.assetName || 'No asset'}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{workOrder.asset?.location || workOrder.location || 'No location'}</span>
                    </div>
                    {workOrder.priority && (
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(workOrder.priority)}`}>
                        {workOrder.priority} priority
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-3 flex space-x-2">
                    {workOrder.status !== 'in-progress' && workOrder.status !== 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckIn(workOrder);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Check In</span>
                      </button>
                    )}
                    {workOrder.status === 'in-progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckOut(workOrder);
                        }}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 flex items-center space-x-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Check Out</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Available Work Orders */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Work Orders</h2>
            
            {unassignedWorkOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No unassigned work orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedWorkOrders.map((workOrder) => (
                  <div
                    key={workOrder.id}
                    className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {workOrder.title || workOrder.description || 'Untitled Work Order'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                        {workOrder.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>{workOrder.asset?.name || workOrder.assetName || 'No asset'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{workOrder.asset?.location || workOrder.location || 'No location'}</span>
                      </div>
                      {workOrder.priority && (
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(workOrder.priority)}`}>
                          {workOrder.priority} priority
                        </span>
                      )}
                    </div>

                    {/* Take Work Order Button */}
                    <div className="mt-3">
                      <button
                        onClick={() => handleTakeWorkOrder(workOrder)}
                        className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>Take This Work Order</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Work Order Details */}
        <div className="xl:col-span-2">
          {selectedWorkOrder ? (
            <div className="bg-white rounded-lg shadow-md">
              {/* Work Order Header */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedWorkOrder.title || selectedWorkOrder.description || 'Work Order Details'}
                    </h2>
                    <p className="text-gray-600">{selectedWorkOrder.id}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedWorkOrder.status)}`}>
                        {selectedWorkOrder.status}
                      </span>
                      {selectedWorkOrder.priority && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(selectedWorkOrder.priority)}`}>
                          {selectedWorkOrder.priority} priority
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {selectedWorkOrder.checkedInTechnician && (
                    <div className="text-right text-sm">
                      <p className="text-green-600 font-medium">✓ Checked In</p>
                      <p className="text-gray-500">
                        {new Date(selectedWorkOrder.checkedInTechnician.checkedInAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Order Content */}
              <div className="p-6 space-y-6">
                {/* Asset Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Asset Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Asset</label>
                      <p className="text-gray-900">{selectedWorkOrder.asset?.name || selectedWorkOrder.assetName || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Location</label>
                      <p className="text-gray-900">{selectedWorkOrder.asset?.location || selectedWorkOrder.location || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedWorkOrder.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedWorkOrder.description}</p>
                  </div>
                )}

                {/* Timer and Notes (for active work orders) */}
                {selectedWorkOrder.status === 'in-progress' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-blue-900">Work in Progress</h3>
                      <div className="flex items-center space-x-2 text-blue-700">
                        <Timer className="w-5 h-5" />
                        <span className="font-mono text-lg">
                          {selectedWorkOrder.startTime && 
                            Math.floor((Date.now() - new Date(selectedWorkOrder.startTime).getTime()) / 1000 / 60)
                          } min
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Describe the work performed, issues found, etc."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resolution (if complete)</label>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="How was the issue resolved?"
                        />
                      </div>
                      
                      <button
                        onClick={() => handleCheckOut(selectedWorkOrder)}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                      >
                        <Square className="w-4 h-4" />
                        <span>{resolution ? 'Complete Work Order' : 'Pause Work'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Photos Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Camera className="w-5 h-5" />
                    <span>Photos & Documentation</span>
                  </h3>
                  
                  <PhotoUpload
                    workOrderId={selectedWorkOrder.id}
                    attachments={selectedWorkOrder.attachments || []}
                    onPhotosChange={(attachments: any) => {
                      const updatedWorkOrder = { ...selectedWorkOrder, attachments };
                      onWorkOrderUpdate(updatedWorkOrder);
                      setSelectedWorkOrder(updatedWorkOrder);
                    }}
                    currentUser={currentTechnician}
                    readOnly={selectedWorkOrder.status === 'completed'}
                  />
                </div>

                {/* Previous Notes */}
                {selectedWorkOrder.notes && selectedWorkOrder.notes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Work History</h3>
                    <div className="space-y-2">
                      {selectedWorkOrder.notes.map((note: any) => (
                        <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900">{note.createdBy}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Work Order</h3>
              <p className="text-gray-500">Choose a work order from the list to view details and add photos</p>
            </div>
          )}
        </div>

        {/* AI Chat Assistant */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          <AIChat
            onWorkOrderCreate={onWorkOrderCreate}
            getAIResponse={getAIResponse}
            context={selectedWorkOrder ? `Current work order: ${selectedWorkOrder.description || selectedWorkOrder.title}` : 'Technician dashboard'}
            placeholder="Ask about maintenance, create work orders, or get help..."
            title="Maintenance Assistant"
          />
        </div>
      </div>
    </div>
  );
};

export default TechnicianWorkOrderView;
