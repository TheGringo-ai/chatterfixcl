import React, { useState, useRef } from 'react';
import { X, Upload, Clock, User, Package, Camera, Video, FileText, CheckCircle } from 'lucide-react';
import { WorkOrder } from '../types';

interface EnhancedWorkOrderFormProps {
  workOrder?: WorkOrder;
  onSave: (workOrder: Partial<WorkOrder>) => void;
  onCancel: () => void;
  technicians: Array<{ id: string; name: string; status: string }>;
  parts: Array<{ id: string; name: string; quantity: number; location: string }>;
}

interface TechnicianSession {
  technicianId: string;
  checkInTime: string;
  checkOutTime?: string;
  notes?: string;
}

interface PartCheckout {
  partId: string;
  quantity: number;
  checkedOutBy: string;
  timestamp: string;
}

interface Attachment {
  type: 'photo' | 'video' | 'document';
  file: File;
  description: string;
}

export const EnhancedWorkOrderForm: React.FC<EnhancedWorkOrderFormProps> = ({
  workOrder,
  onSave,
  onCancel,
  technicians,
  parts
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    priority: workOrder?.priority || 'medium',
    assignedTo: workOrder?.assignedTo || '',
    assetName: workOrder?.assetName || '',
    estimatedHours: workOrder?.estimatedHours || 0,
    status: workOrder?.status || 'open',
    dueDate: workOrder?.dueDate || ''
  });

  // Advanced features state
  const [technicianSessions, setTechnicianSessions] = useState<TechnicianSession[]>([]);
  const [partsCheckedOut, setPartsCheckedOut] = useState<PartCheckout[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [downtimeStart, setDowntimeStart] = useState<string>('');
  const [downtimeEnd, setDowntimeEnd] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'basic' | 'technicians' | 'parts' | 'attachments' | 'downtime'>('basic');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  
  // File upload refs
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechnicianCheckIn = () => {
    if (!selectedTechnician) return;
    
    const session: TechnicianSession = {
      technicianId: selectedTechnician,
      checkInTime: new Date().toISOString(),
      notes: ''
    };
    
    setTechnicianSessions(prev => [...prev, session]);
    setSelectedTechnician('');
  };

  const handleTechnicianCheckOut = (sessionIndex: number, notes: string = '') => {
    setTechnicianSessions(prev => prev.map((session, index) => 
      index === sessionIndex 
        ? { ...session, checkOutTime: new Date().toISOString(), notes }
        : session
    ));
  };

  const handlePartCheckout = () => {
    if (!selectedPart || partQuantity <= 0) return;
    
    const part = parts.find(p => p.id === selectedPart);
    if (!part || part.quantity < partQuantity) {
      alert('Insufficient parts in inventory');
      return;
    }
    
    const checkout: PartCheckout = {
      partId: selectedPart,
      quantity: partQuantity,
      checkedOutBy: formData.assignedTo || 'Unknown',
      timestamp: new Date().toISOString()
    };
    
    setPartsCheckedOut(prev => [...prev, checkout]);
    setSelectedPart('');
    setPartQuantity(1);
  };

  const handleFileUpload = (type: 'photo' | 'video' | 'document', files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        type,
        file,
        description: ''
      };
      setAttachments(prev => [...prev, attachment]);
    });
  };

  const calculateDowntime = () => {
    if (!downtimeStart || !downtimeEnd) return 0;
    const start = new Date(downtimeStart);
    const end = new Date(downtimeEnd);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60)); // hours
  };

  const handleSave = () => {
    const enhancedWorkOrder: Partial<WorkOrder> = {
      ...formData,
      id: workOrder?.id || Date.now().toString(),
      createdAt: workOrder?.createdAt || new Date().toISOString(),
      // Store additional data in existing properties
      notes: [
        ...(workOrder?.notes || []),
        {
          type: 'work_session',
          content: workNotes,
          timestamp: new Date().toISOString(),
          technicianSessions,
          partsCheckedOut,
          attachmentCount: attachments.length,
          downtimeHours: calculateDowntime()
        }
      ],
      attachments: attachments.map(a => ({ 
        type: a.type, 
        description: a.description, 
        fileName: a.file.name 
      })),
      downtime: downtimeStart && downtimeEnd ? {
        started: downtimeStart,
        ended: downtimeEnd,
        totalMinutes: calculateDowntime() * 60
      } : workOrder?.downtime || { started: null, ended: null, totalMinutes: 0 }
    };
    
    onSave(enhancedWorkOrder);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'technicians', label: 'Technicians', icon: User },
    { id: 'parts', label: 'Parts', icon: Package },
    { id: 'attachments', label: 'Attachments', icon: Upload },
    { id: 'downtime', label: 'Downtime', icon: Clock }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {workOrder ? 'Edit Work Order' : 'Create Work Order'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <div className="flex space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name
                  </label>
                  <input
                    type="text"
                    value={formData.assetName}
                    onChange={(e) => handleInputChange('assetName', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Notes
                </label>
                <textarea
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  rows={4}
                  placeholder="Add detailed work notes, observations, or instructions..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          {/* Technicians Tab */}
          {activeTab === 'technicians' && (
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-md">
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Technician</option>
                  {technicians.filter(tech => 
                    !technicianSessions.find(session => 
                      session.technicianId === tech.id && !session.checkOutTime
                    )
                  ).map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleTechnicianCheckIn}
                  disabled={!selectedTechnician}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Check In
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Active Sessions</h4>
                {technicianSessions.map((session, index) => {
                  const technician = technicians.find(t => t.id === session.technicianId);
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{technician?.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Checked in: {new Date(session.checkInTime).toLocaleString()}
                          </span>
                        </div>
                        {!session.checkOutTime ? (
                          <button
                            onClick={() => {
                              const notes = prompt('Add notes for checkout (optional):');
                              handleTechnicianCheckOut(index, notes || '');
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Check Out
                          </button>
                        ) : (
                          <div className="text-sm text-gray-500">
                            <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />
                            Checked out: {new Date(session.checkOutTime).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {session.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          Notes: {session.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-md">
                <select
                  value={selectedPart}
                  onChange={(e) => setSelectedPart(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Part</option>
                  {parts.map(part => (
                    <option key={part.id} value={part.id}>
                      {part.name} (Available: {part.quantity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-20 p-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handlePartCheckout}
                  disabled={!selectedPart}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Checked Out Parts</h4>
                {partsCheckedOut.map((checkout, index) => {
                  const part = parts.find(p => p.id === checkout.partId);
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{part?.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Qty: {checkout.quantity} | By: {checkout.checkedOutBy}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(checkout.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos
                  </label>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload('photo', e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 flex flex-col items-center"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Add Photos</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Videos
                  </label>
                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleFileUpload('video', e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => videoRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 flex flex-col items-center"
                  >
                    <Video className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Add Videos</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents
                  </label>
                  <input
                    ref={documentRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    onChange={(e) => handleFileUpload('document', e.target.files)}
                    className="hidden"
                  />
                  <button
                    onClick={() => documentRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 flex flex-col items-center"
                  >
                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Add Documents</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Attachments ({attachments.length})</h4>
                {attachments.map((attachment, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md flex justify-between items-center">
                    <div>
                      <span className="font-medium">{attachment.file.name}</span>
                      <span className="text-sm text-gray-500 ml-2 capitalize">
                        ({attachment.type})
                      </span>
                    </div>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Downtime Tab */}
          {activeTab === 'downtime' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Downtime Start
                  </label>
                  <input
                    type="datetime-local"
                    value={downtimeStart}
                    onChange={(e) => setDowntimeStart(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Downtime End
                  </label>
                  <input
                    type="datetime-local"
                    value={downtimeEnd}
                    onChange={(e) => setDowntimeEnd(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {downtimeStart && downtimeEnd && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">
                      Total Downtime: {calculateDowntime().toFixed(2)} hours
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {workOrder ? 'Update Work Order' : 'Create Work Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
