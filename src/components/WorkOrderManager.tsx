import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, FileText, Package, Clock, User, 
  CheckCircle, XCircle, Edit, Save, X, Plus,
  MapPin, AlertTriangle, Star, Video, Image,
  Download, Eye, Trash2, PlayCircle, Paperclip,
  ShoppingCart, CheckSquare, Square, Timer,
  LogIn, LogOut, Wrench, MessageSquare, Send
} from 'lucide-react';
import { WorkOrder } from '../types';

interface WorkOrderManagerProps {
  workOrder?: WorkOrder;
  onSave: (workOrder: WorkOrder) => void;
  onCancel: () => void;
  getAIResponse?: (prompt: string) => Promise<string>;
  mode: 'create' | 'edit' | 'view';
}

const WorkOrderManager: React.FC<WorkOrderManagerProps> = ({ 
  workOrder, 
  onSave, 
  onCancel, 
  getAIResponse,
  mode 
}) => {
  const [formData, setFormData] = useState<WorkOrder>(
    workOrder || {
      id: `WO-${Date.now()}`,
      title: '',
      description: '',
      asset: { id: '', name: '', location: '' },
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      dueDate: '',
      estimatedHours: 0,
      actualHours: 0,
      downtime: { started: null, ended: null, totalMinutes: 0 },
      checkedInTechnician: null,
      parts: [],
      attachments: [],
      notes: [],
      procedures: [],
      safetyNotes: []
    }
  );

  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments' | 'notes' | 'timeline'>('details');
  const [isEditing, setIsEditing] = useState(mode === 'create');
  const [newNote, setNewNote] = useState('');
  const [newAttachmentDescription, setNewAttachmentDescription] = useState('');
  const [downtimeActive, setDowntimeActive] = useState(false);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Mock available parts for checkout
  const [availableParts] = useState([
    { id: '1', name: 'Motor Bearing', partNumber: 'BRG-001', stock: 15, cost: 45.99 },
    { id: '2', name: 'Air Filter', partNumber: 'FLT-208', stock: 25, cost: 23.50 },
    { id: '3', name: 'Drive Belt', partNumber: 'BLT-150', stock: 8, cost: 67.25 },
    { id: '4', name: 'Gate Valve', partNumber: 'SLV-304', stock: 2, cost: 285.00 },
    { id: '5', name: 'Pump Gasket', partNumber: 'GSK-099', stock: 12, cost: 12.75 }
  ]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAssetChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      asset: {
        id: field === 'id' ? value : prev.asset?.id ?? '',
        name: field === 'name' ? value : prev.asset?.name ?? '',
        location: field === 'location' ? value : prev.asset?.location ?? ''
      }
    }));
  };

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'video' | 'document') => {
    if (!files) return;
    
    const newAttachments = Array.from(files).map(file => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type,
      url: URL.createObjectURL(file), // In real app, this would be uploaded to server
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString(),
      description: newAttachmentDescription || `${type} uploaded for work order`,
      size: file.size
    }));

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments ?? []), ...newAttachments]
    }));
    
    setNewAttachmentDescription('');
    
    // Add note about upload
    addNote(`Uploaded ${newAttachments.length} ${type}(s): ${newAttachments.map(a => a.name).join(', ')}`, 'note');
  };

  const addNote = (text: string, type: 'note' | 'status_change' | 'part_checkout' | 'checkin_checkout' = 'note') => {
    const note = {
      id: `note-${Date.now()}`,
      text,
      author: 'Current User',
      timestamp: new Date().toISOString(),
      type
    };

    setFormData(prev => ({
      ...prev,
      notes: [...(prev.notes || []), note]
    }));
  };

    const handleAddNote = () => {
    if (newNote.trim()) {
      const note = {
        id: `note-${Date.now()}`,
        content: newNote,
        createdBy: 'Current User',
        createdAt: new Date().toISOString()
      };
      setFormData(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
      setNewNote('');
    }
  };

  const handleTechnicianCheckIn = () => {
    const technicianName = 'Current User'; // In real app, get from auth context
    
    if (formData.checkedInTechnician) {
      // Check out
      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(formData.checkedInTechnician.checkedInAt);
      const hoursWorked = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      setFormData(prev => ({
        ...prev,
        checkedInTechnician: null,
        actualHours: (prev.actualHours ?? 0) + hoursWorked
      }));
      
      addNote(`${technicianName} checked out. Worked ${hoursWorked.toFixed(2)} hours.`, 'checkin_checkout');
    } else {
      // Check in
      setFormData(prev => ({
        ...prev,
        checkedInTechnician: {
          name: technicianName,
          checkedInAt: new Date().toISOString()
        }
      }));
      
      addNote(`${technicianName} checked in to work order.`, 'checkin_checkout');
    }
  };

  const handleDowntimeToggle = () => {
    const now = new Date().toISOString();
    
    if (downtimeActive) {
      // End downtime
      if (formData.downtime && formData.downtime.started) {
        const startTime = new Date(formData.downtime.started);
        const endTime = new Date(now);
        const minutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        setFormData(prev => ({
          ...prev,
          downtime: {
            started: typeof prev.downtime?.started === 'undefined' ? null : prev.downtime.started,
            ended: now,
            totalMinutes: (typeof prev.downtime?.totalMinutes === 'undefined' ? 0 : prev.downtime.totalMinutes) + minutes
          }
        }));

        addNote(`Downtime ended. Duration: ${minutes.toFixed(1)} minutes.`, 'note');
      }
      setDowntimeActive(false);
    } else {
      // Start downtime
      setFormData(prev => ({
        ...prev,
        downtime: {
          started: now,
          ended: prev.downtime?.ended ?? null,
          totalMinutes: prev.downtime?.totalMinutes ?? 0
        }
      }));
      
      addNote('Downtime started.', 'note');
      setDowntimeActive(true);
    }
  };

  const handleCheckoutParts = () => {
    const partsToCheckout = availableParts
      .filter(part => selectedParts.includes(part.id))
      .map(part => ({
        id: part.id,
        name: part.name,
        partNumber: part.partNumber,
        quantityNeeded: 1, // Default, could be made configurable
        quantityUsed: 0,
        checkedOut: true,
        checkedOutBy: 'Current User',
        checkedOutAt: new Date().toISOString(),
        cost: part.cost
      }));

    setFormData(prev => ({
      ...prev,
      parts: [...(prev.parts ?? []), ...partsToCheckout]
    }));

    addNote(`Checked out parts: ${partsToCheckout.map(p => p.name).join(', ')}`, 'part_checkout');
    setSelectedParts([]);
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData(prev => ({ ...prev, status: newStatus as any }));
    addNote(`Status changed to: ${newStatus}`, 'status_change');
  };

  const handleSave = () => {
    onSave(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <h1 className="text-2xl font-bold">{formData.title || 'New Work Order'}</h1>
            <p className="text-blue-100 mt-1">{formData.id}</p>
            <div className="flex items-center space-x-4 mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(formData.priority ?? 'medium')}`}>
                {formData.priority || 'medium'} priority
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                {formData.status}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {/* Quick Actions */}
            <button
              onClick={handleTechnicianCheckIn}
              className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                formData.checkedInTechnician 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              {formData.checkedInTechnician ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>{formData.checkedInTechnician ? 'Check Out' : 'Check In'}</span>
            </button>
            
            <button
              onClick={handleDowntimeToggle}
              className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                downtimeActive 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-orange-500 hover:bg-orange-600'
              } text-white`}
            >
              <Timer className="w-4 h-4" />
              <span>{downtimeActive ? 'End Downtime' : 'Start Downtime'}</span>
            </button>
          </div>
        </div>

        {/* Status Info Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-blue-500">
          <div>
            <p className="text-blue-200 text-sm">Assigned To</p>
            <p className="font-medium">{formData.assignedTo || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Due Date</p>
            <p className="font-medium">{formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : 'Not set'}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Estimated Hours</p>
            <p className="font-medium">{formData.estimatedHours}h</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Actual Hours</p>
            <p className="font-medium">{(formData.actualHours || 0).toFixed(2)}h</p>
          </div>
        </div>

        {/* Checked In Status */}
        {formData.checkedInTechnician && (
          <div className="mt-4 p-3 bg-green-500 bg-opacity-20 rounded-lg border border-green-400">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-green-200" />
              <span className="text-green-100">
                {formData.checkedInTechnician.name} is currently working on this order
              </span>
              <span className="text-green-200 text-sm">
                (since {new Date(formData.checkedInTechnician.checkedInAt).toLocaleTimeString()})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {['details', 'parts', 'attachments', 'notes', 'timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Work Order Details</h3>
              <div className="flex space-x-3">
                {mode !== 'create' && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={handleSave}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </div>
            </div>

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
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(formData.priority ?? 'medium')}`}>
                      {formData.priority ?? 'medium'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
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
                      value={formData.asset?.name || ''}
                      onChange={(e) => handleAssetChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Asset name"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      <Wrench className="w-4 h-4 mr-2 text-gray-500" />
                      {formData.asset?.name || 'No asset assigned'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.asset?.location || ''}
                      onChange={(e) => handleAssetChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Asset location"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                      {formData.asset?.location || 'No location specified'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      {formData.dueDate ? new Date(formData.dueDate).toLocaleString() : 'No due date set'}
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
                    <p className="text-gray-900">{formData.estimatedHours} hours</p>
                  )}
                </div>
              </div>
            </div>

            {/* Downtime Tracking */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Downtime Tracking
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-orange-700">Total Downtime</p>
                  <p className="font-semibold text-orange-900">{(formData.downtime?.totalMinutes || 0).toFixed(1)} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">Current Status</p>
                  <p className="font-semibold text-orange-900">
                    {downtimeActive ? 'Downtime Active' : 'Asset Operational'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">Started</p>
                  <p className="font-semibold text-orange-900">
                    {formData.downtime?.started ? new Date(formData.downtime.started).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parts Tab */}
        {activeTab === 'parts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Parts Management</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTab('parts')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Checkout Selected ({selectedParts.length})</span>
                </button>
              </div>
            </div>

            {/* Available Parts for Checkout */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Available Parts</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableParts.map((part) => (
                  <div key={part.id} className="bg-white border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (selectedParts.includes(part.id)) {
                              setSelectedParts(prev => prev.filter(id => id !== part.id));
                            } else {
                              setSelectedParts(prev => [...prev, part.id]);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {selectedParts.includes(part.id) ? 
                            <CheckSquare className="w-4 h-4" /> : 
                            <Square className="w-4 h-4" />
                          }
                        </button>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{part.name}</p>
                          <p className="text-gray-600 text-xs">{part.partNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${part.cost}</p>
                        <p className="text-xs text-gray-600">Stock: {part.stock}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedParts.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleCheckoutParts}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Checkout {selectedParts.length} Part(s)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Checked Out Parts */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Checked Out Parts</h4>
              {(formData.parts?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No parts checked out yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(formData.parts ?? []).map((part) => (
                    <div key={part.id} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">{part.name}</h5>
                          <p className="text-gray-600 text-sm">{part.partNumber}</p>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Needed: {part.quantityNeeded}</span>
                            <span>Used: {part.quantityUsed}</span>
                            <span>Cost: ${part.cost}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Checked out by {part.checkedOutBy} on {new Date(part.checkedOutAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Checked Out
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Photos, Videos & Documents</h3>
            </div>

            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'image')}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Upload Photos</p>
                  <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB</p>
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={videoInputRef}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'video')}
                  className="hidden"
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full"
                >
                  <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Upload Videos</p>
                  <p className="text-gray-500 text-sm">MP4, MOV up to 100MB</p>
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileUpload(e.target.files, 'document')}
                  className="hidden"
                  id="document-upload"
                />
                <label htmlFor="document-upload" className="cursor-pointer w-full block">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Upload Documents</p>
                  <p className="text-gray-500 text-sm">PDF, DOC, TXT up to 50MB</p>
                </label>
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
              <input
                type="text"
                value={newAttachmentDescription}
                onChange={(e) => setNewAttachmentDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what this file shows or contains..."
              />
            </div>

            {/* Attachments List */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Uploaded Files ({(formData.attachments ?? []).length})</h4>
              {(formData.attachments?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Paperclip className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(formData.attachments ?? []).map((attachment) => (
                    <div key={attachment.id} className="bg-white border rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {attachment.type === 'image' && <Image className="w-4 h-4 text-blue-600" />}
                              {attachment.type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                              {attachment.type === 'document' && <FileText className="w-4 h-4 text-green-600" />}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {attachment.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{attachment.description}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatFileSize(attachment.size)}</span>
                              <span>{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {attachment.type === 'video' && (
                              <button className="text-purple-600 hover:text-purple-800">
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-800">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Thumbnail for images */}
                        {attachment.type === 'image' && (
                          <div className="mt-3">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="w-full h-24 object-cover rounded"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Notes & Comments</h3>
            </div>

            {/* Add Note */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note or comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Add Note</span>
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {(formData.notes?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No notes added yet</p>
                </div>
              ) : (
                (formData.notes ?? []).map((note) => (
                  <div key={note.id} className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-900">{note.text}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{note.author}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(note.timestamp).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        note.type === 'status_change' ? 'bg-blue-100 text-blue-800' :
                        note.type === 'part_checkout' ? 'bg-green-100 text-green-800' :
                        note.type === 'checkin_checkout' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {note.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
            
            <div className="flow-root">
              <ul className="-mb-8">
                {(formData.notes ?? []).map((note, index, notesArr) => (
                  <li key={note.id}>
                    <div className="relative pb-8">
                      {index !== notesArr.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            note.type === 'status_change' ? 'bg-blue-500' :
                            note.type === 'part_checkout' ? 'bg-green-500' :
                            note.type === 'checkin_checkout' ? 'bg-purple-500' :
                            'bg-gray-400'
                          }`}>
                            {note.type === 'status_change' && <CheckCircle className="w-4 h-4 text-white" />}
                            {note.type === 'part_checkout' && <Package className="w-4 h-4 text-white" />}
                            {note.type === 'checkin_checkout' && <User className="w-4 h-4 text-white" />}
                            {note.type === 'note' && <MessageSquare className="w-4 h-4 text-white" />}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900">{note.text}</p>
                            <p className="text-xs text-gray-500">by {note.author}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>{new Date(note.timestamp).toLocaleString()}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Created: {new Date(formData.createdAt ?? '').toLocaleDateString()}</span>
          <span>•</span>
          <span>Created by: {formData.createdBy}</span>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Save Work Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkOrderManager;
