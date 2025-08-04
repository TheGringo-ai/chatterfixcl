import React, { useState } from 'react';
import { 
  Save, X, Clock, User, MapPin, AlertTriangle, 
  FileText, Plus, Edit, Camera
} from 'lucide-react';
import { WorkOrder } from '../types';
import PhotoUpload from './PhotoUpload';

interface SimpleWorkOrderFormProps {
  workOrder?: WorkOrder;
  onSave: (workOrder: WorkOrder) => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'view';
}

const SimpleWorkOrderForm: React.FC<SimpleWorkOrderFormProps> = ({
  workOrder,
  onSave,
  onCancel,
  mode
}) => {
  const [formData, setFormData] = useState({
    id: workOrder?.id || `WO-${Date.now()}`,
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    assetName: workOrder?.assetName || workOrder?.asset?.name || '',
    location: workOrder?.location || workOrder?.asset?.location || '',
    priority: workOrder?.priority || 'medium',
    status: workOrder?.status || 'pending',
    assignedTo: workOrder?.assignedTo || workOrder?.technician || '',
    estimatedHours: workOrder?.estimatedHours || 0,
    createdAt: workOrder?.createdAt || new Date().toISOString(),
    attachments: workOrder?.attachments || [],
  });

  const [isEditing, setIsEditing] = useState(mode === 'create');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Convert back to WorkOrder format
    const workOrderData: WorkOrder = {
      ...formData,
      asset: {
        id: formData.assetName,
        name: formData.assetName,
        location: formData.location
      },
      technician: formData.assignedTo,
      startTime: new Date(),
      createdAt: formData.createdAt,
      attachments: formData.attachments
    };

    onSave(workOrderData);
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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{formData.title || 'Work Order'}</h1>
            <p className="text-blue-100 mt-1">{formData.id}</p>
            <div className="flex items-center space-x-4 mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(formData.priority)}`}>
                {formData.priority} priority
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                {formData.status}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {!isEditing && mode !== 'create' && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Work order title"
                />
              ) : (
                <p className="text-gray-900">{formData.title || 'No title'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed description of the work to be performed"
                />
              ) : (
                <p className="text-gray-900">{formData.description || 'No description'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              {isEditing ? (
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(formData.priority)}`}>
                  {formData.priority}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              {isEditing ? (
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                  {formData.status}
                </span>
              )}
            </div>
          </div>

          {/* Asset and Assignment */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.assetName}
                  onChange={(e) => handleInputChange('assetName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Asset name"
                />
              ) : (
                <p className="text-gray-900 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  {formData.assetName || 'No asset assigned'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Asset location"
                />
              ) : (
                <p className="text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  {formData.location || 'No location specified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Technician name"
                />
              ) : (
                <p className="text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  {formData.assignedTo || 'Unassigned'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.5"
                />
              ) : (
                <p className="text-gray-900 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  {formData.estimatedHours} hours
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Camera className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Photos & Attachments</h3>
          </div>
          
          <PhotoUpload
            workOrderId={formData.id}
            attachments={formData.attachments}
            onPhotosChange={(attachments) => handleInputChange('attachments', attachments)}
            readOnly={!isEditing}
            currentUser={formData.assignedTo || 'Current User'}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Work Order
        </button>
      </div>
    </div>
  );
};

export default SimpleWorkOrderForm;
