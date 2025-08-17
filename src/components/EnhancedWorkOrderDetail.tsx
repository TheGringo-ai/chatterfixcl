import React, { useState } from 'react';
import { 
  ArrowLeft, Edit, Save, X, Clock, User, MapPin, 
  AlertTriangle, CheckCircle, DollarSign, Settings,
  FileText, Camera, MessageSquare
} from 'lucide-react';
import { WorkOrder } from '../types';
import FinancialManager from './FinancialManager';
import WorkflowManager from './WorkflowManager';
import PhotoUpload from './PhotoUpload';
import AIChat from './AIChat';

interface EnhancedWorkOrderDetailProps {
  workOrder: WorkOrder;
  onWorkOrderUpdate: (workOrder: WorkOrder) => void;
  onBack: () => void;
  currentUserId?: string;
  getAIResponse: (prompt: string, context?: string) => Promise<string>;
}

const EnhancedWorkOrderDetail: React.FC<EnhancedWorkOrderDetailProps> = ({
  workOrder,
  onWorkOrderUpdate,
  onBack,
  currentUserId = 'user1',
  getAIResponse
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'workflow' | 'photos' | 'chat'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: workOrder.title || '',
    description: workOrder.description || '',
    priority: workOrder.priority || 'medium'
  });

  const handleSave = () => {
    const updatedWorkOrder: WorkOrder = {
      ...workOrder,
      ...editData,
      updatedAt: new Date().toISOString()
    };
    onWorkOrderUpdate(updatedWorkOrder);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: workOrder.title || '',
      description: workOrder.description || '',
      priority: workOrder.priority || 'medium'
    });
    setIsEditing(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="text-2xl font-bold border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  workOrder.title || 'Untitled Work Order'
                )}
              </h1>
              <p className="text-gray-600">Work Order ID: {workOrder.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workOrder.status || 'pending')}`}>
              {workOrder.status || 'Pending'}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(workOrder.priority || 'medium')}`}>
              {workOrder.priority || 'Medium'} Priority
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {workOrder.assignedTo && (
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {workOrder.assignedTo}
              </div>
            )}
            {workOrder.asset?.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {workOrder.asset.location}
              </div>
            )}
            {workOrder.createdAt && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(workOrder.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'details', label: 'Details', icon: FileText },
          { id: 'financials', label: 'Costs', icon: DollarSign },
          { id: 'workflow', label: 'Workflow', icon: Settings },
          { id: 'photos', label: 'Photos', icon: Camera },
          { id: 'chat', label: 'AI Chat', icon: MessageSquare }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center px-6 py-3 font-medium transition-colors ${
              activeTab === id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Order Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    {isEditing ? (
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{workOrder.description || 'No description available'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    {isEditing ? (
                      <select
                        value={editData.priority}
                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(workOrder.priority || 'medium')}`}>
                        {workOrder.priority || 'Medium'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>
                {workOrder.asset ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Asset Name:</span>
                      <p className="text-gray-900">{workOrder.asset.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Location:</span>
                      <p className="text-gray-900">{workOrder.asset.location}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <p className="text-gray-900">{('status' in workOrder.asset) ? workOrder.asset.status : 'Unknown'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No asset assigned</p>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {workOrder.notes && workOrder.notes.length > 0 ? (
                  <div className="space-y-2">
                    {workOrder.notes.map((note: any, index: number) => (
                      <div key={index} className="text-gray-900">
                        {typeof note === 'string' ? note : note.content || note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No notes available</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                {workOrder.createdAt && (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium">Work Order Created</p>
                      <p className="text-sm text-gray-600">{new Date(workOrder.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {workOrder.startTime && (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                    <div>
                      <p className="font-medium">Work Started</p>
                      <p className="text-sm text-gray-600">{new Date(workOrder.startTime).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {workOrder.endTime && (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium">Work Completed</p>
                      <p className="text-sm text-gray-600">{new Date(workOrder.endTime).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <FinancialManager workOrderId={workOrder.id} />
        )}

        {activeTab === 'workflow' && (
          <WorkflowManager 
            workOrderId={workOrder.id}
            currentUserId={currentUserId}
            workOrderStatus={workOrder.status}
            assigneeId={workOrder.assignedTo}
          />
        )}

        {activeTab === 'photos' && (
          <div>
            <PhotoUpload
              onPhotoUploaded={(photoUrl) => {
                console.log('Photo uploaded:', photoUrl);
                // Handle photo upload
              }}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <AIChat
            onWorkOrderCreate={() => {}}
            getAIResponse={getAIResponse}
            context={`Work Order: ${workOrder.title} - ${workOrder.description}`}
            placeholder="Ask questions about this work order or get maintenance guidance..."
            title="Work Order AI Assistant"
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedWorkOrderDetail;