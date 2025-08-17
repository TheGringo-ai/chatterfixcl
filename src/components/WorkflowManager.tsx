import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Clock, Users, 
  Zap, AlertTriangle, Settings, Timer,
  UserCheck, FileText, ArrowRight
} from 'lucide-react';
import { 
  useSubmitForApproval, useApproveWO, useRejectWO, 
  useAutoAssignWO, useSetSLA, useSLAStatus,
  getApprovalStateColor, getWorkOrderStatusColor, getSLAUrgencyColor
} from '../hooks/useWorkOrderWorkflow';

interface WorkflowManagerProps {
  workOrderId: string;
  currentUserId?: string;
  workOrderStatus?: string;
  assigneeId?: string;
}

const WorkflowManager: React.FC<WorkflowManagerProps> = ({ 
  workOrderId, 
  currentUserId = 'user1',
  workOrderStatus = 'OPEN',
  assigneeId 
}) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'assignment' | 'sla'>('approvals');
  const [approvalNote, setApprovalNote] = useState('');
  const [approverIds, setApproverIds] = useState<string[]>(['manager1']);
  const [slaConfig, setSlaConfig] = useState({
    name: 'Standard SLA',
    respondMins: 30,
    resolveMins: 240
  });

  // Hooks
  const submitForApproval = useSubmitForApproval();
  const approveWO = useApproveWO();
  const rejectWO = useRejectWO();
  const autoAssignWO = useAutoAssignWO();
  const setSLA = useSetSLA();
  const { data: slaStatus } = useSLAStatus(workOrderId);

  // Mock data for demo
  const mockManagers = [
    { id: 'manager1', name: 'Sarah Wilson', role: 'Maintenance Manager' },
    { id: 'manager2', name: 'John Smith', role: 'Operations Manager' },
    { id: 'manager3', name: 'Mike Johnson', role: 'Safety Manager' }
  ];

  const handleSubmitForApproval = () => {
    submitForApproval.mutate({
      workOrderId,
      approverIds
    });
  };

  const handleApprove = () => {
    approveWO.mutate({
      workOrderId,
      approverId: currentUserId,
      note: approvalNote || undefined
    });
    setApprovalNote('');
  };

  const handleReject = () => {
    rejectWO.mutate({
      workOrderId,
      approverId: currentUserId,
      note: approvalNote || 'Rejected'
    });
    setApprovalNote('');
  };

  const handleAutoAssign = () => {
    autoAssignWO.mutate(workOrderId);
  };

  const handleSetSLA = () => {
    setSLA.mutate({
      workOrderId,
      ...slaConfig
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Workflow Management</h2>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getWorkOrderStatusColor(workOrderStatus)}`}>
              {workOrderStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {(['approvals', 'assignment', 'sla'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'sla' ? 'SLA' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* Submit for Approval */}
            {workOrderStatus === 'OPEN' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit for Approval</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Approvers
                    </label>
                    <div className="space-y-2">
                      {mockManagers.map((manager) => (
                        <label key={manager.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={approverIds.includes(manager.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setApproverIds([...approverIds, manager.id]);
                              } else {
                                setApproverIds(approverIds.filter(id => id !== manager.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="ml-3">
                            <span className="font-medium">{manager.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({manager.role})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitForApproval}
                    disabled={submitForApproval.isPending || approverIds.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {submitForApproval.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            )}

            {/* Approval Actions */}
            {workOrderStatus === 'PENDING_APPROVAL' && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approval</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Note (Optional)
                    </label>
                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Add a note for your decision..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleApprove}
                      disabled={approveWO.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveWO.isPending ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={rejectWO.isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectWO.isPending ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Status */}
            {(workOrderStatus === 'APPROVED' || workOrderStatus === 'REJECTED') && (
              <div className={`p-4 rounded-lg ${workOrderStatus === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  {workOrderStatus === 'APPROVED' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 mr-3" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Work Order {workOrderStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {workOrderStatus === 'APPROVED' 
                        ? 'This work order has been approved and can now be assigned.'
                        : 'This work order has been rejected and is on hold.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment Tab */}
        {activeTab === 'assignment' && (
          <div className="space-y-6">
            {/* Current Assignment */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Assignment</h3>
              {assigneeId ? (
                <div className="flex items-center p-3 bg-white rounded-lg border">
                  <UserCheck className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Assigned to: {assigneeId}</p>
                    <p className="text-sm text-gray-600">Status: {workOrderStatus}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-white rounded-lg border">
                  <Users className="w-5 h-5 text-gray-400 mr-3" />
                  <p className="text-gray-600">No technician assigned</p>
                </div>
              )}
            </div>

            {/* Auto-Assignment */}
            {!assigneeId && (workOrderStatus === 'APPROVED' || workOrderStatus === 'OPEN') && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto-Assignment</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Automatically assign this work order to the best available technician based on skills, workload, and availability.
                </p>
                <button
                  onClick={handleAutoAssign}
                  disabled={autoAssignWO.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {autoAssignWO.isPending ? 'Assigning...' : 'Auto-Assign Technician'}
                </button>
              </div>
            )}

            {/* Assignment Rules Info */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Assignment Rules</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Technicians with relevant skills get priority</p>
                <p>• Workload balance is considered</p>
                <p>• High/Critical priority work orders get faster assignment</p>
                <p>• Maximum 5 active work orders per technician</p>
              </div>
            </div>
          </div>
        )}

        {/* SLA Tab */}
        {activeTab === 'sla' && (
          <div className="space-y-6">
            {/* Current SLA Status */}
            {slaStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Response Time</p>
                        <p className={`text-lg font-bold ${getSLAUrgencyColor(slaStatus.firstResponseDueInMins)}`}>
                          {slaStatus.firstResponseDueInMins > 0 
                            ? `${slaStatus.firstResponseDueInMins} min remaining`
                            : `${Math.abs(slaStatus.firstResponseDueInMins)} min overdue`
                          }
                        </p>
                      </div>
                      <Timer className={`w-6 h-6 ${getSLAUrgencyColor(slaStatus.firstResponseDueInMins)}`} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Resolution Time</p>
                        <p className={`text-lg font-bold ${getSLAUrgencyColor(slaStatus.resolveDueInMins)}`}>
                          {slaStatus.resolveDueInMins > 0 
                            ? `${slaStatus.resolveDueInMins} min remaining`
                            : `${Math.abs(slaStatus.resolveDueInMins)} min overdue`
                          }
                        </p>
                      </div>
                      <Clock className={`w-6 h-6 ${getSLAUrgencyColor(slaStatus.resolveDueInMins)}`} />
                    </div>
                  </div>
                </div>

                {/* Escalations */}
                {slaStatus.escalations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Escalations</h4>
                    <div className="space-y-2">
                      {slaStatus.escalations.map((escalation, index) => (
                        <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                          <div>
                            <p className="font-medium text-red-800">Level {escalation.level} Escalation</p>
                            <p className="text-sm text-red-600">{escalation.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Set SLA */}
            {!slaStatus && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Set SLA</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SLA Name
                    </label>
                    <input
                      type="text"
                      value={slaConfig.name}
                      onChange={(e) => setSlaConfig({ ...slaConfig, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Response Time (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={slaConfig.respondMins}
                        onChange={(e) => setSlaConfig({ ...slaConfig, respondMins: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Time (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={slaConfig.resolveMins}
                        onChange={(e) => setSlaConfig({ ...slaConfig, resolveMins: parseInt(e.target.value) || 240 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSetSLA}
                    disabled={setSLA.isPending}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {setSLA.isPending ? 'Setting SLA...' : 'Set SLA'}
                  </button>
                </div>
              </div>
            )}

            {/* SLA Presets */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">SLA Presets</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Critical', respond: 15, resolve: 120 },
                  { name: 'Standard', respond: 30, resolve: 240 },
                  { name: 'Low Priority', respond: 60, resolve: 480 }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSlaConfig({ 
                      name: `${preset.name} SLA`, 
                      respondMins: preset.respond, 
                      resolveMins: preset.resolve 
                    })}
                    className="p-3 bg-white rounded-lg border hover:border-green-300 text-left transition-colors"
                  >
                    <p className="font-medium text-gray-900">{preset.name}</p>
                    <p className="text-sm text-gray-600">
                      {preset.respond}min / {preset.resolve}min
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowManager;