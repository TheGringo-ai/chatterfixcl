import React, { useState } from 'react';
import { 
  Calendar, Clock, Plus, Settings, BarChart3, 
  CheckCircle, AlertTriangle, Filter, Search,
  Wrench, Gauge, Timer, Target, TrendingUp,
  RefreshCw, Zap, Bell, MapPin, User
} from 'lucide-react';
import { 
  usePMTasks, 
  usePMSchedule, 
  usePMAnalytics,
  useCreatePMTask,
  useCompletePMTask,
  getPMStatusColor,
  getPMTaskStatusColor,
  getPMTriggerTypeLabel,
  getPMFrequencyLabel,
  formatDuration,
  isTaskOverdue,
  isDueSoon,
  PM_TASK_TEMPLATES
} from '../hooks/usePreventiveMaintenance';
import { PMTaskCreate, PMTriggerType, PMFrequency } from '../api/client';
import PMCalendarView from './PMCalendarView';

interface PreventiveMaintenanceManagerProps {
  currentUserId?: string;
}

const PreventiveMaintenanceManager: React.FC<PreventiveMaintenanceManagerProps> = ({ 
  currentUserId = 'user1' 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'tasks' | 'create' | 'calendar'>('overview');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Hooks
  const { data: pmTasks = [] } = usePMTasks();
  const { data: pmSchedule = [] } = usePMSchedule();
  const { data: analytics } = usePMAnalytics();
  const createPMTask = useCreatePMTask();
  const completePMTask = useCompletePMTask();

  // Filter schedule entries
  const filteredSchedule = pmSchedule.filter(entry => {
    const matchesSearch = entry.pmTaskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.assetName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'due':
        return entry.status === 'DUE' || isDueSoon(entry.dueDate);
      case 'overdue':
        return entry.status === 'OVERDUE' || isTaskOverdue(entry.dueDate);
      case 'completed':
        return entry.status === 'COMPLETED';
      default:
        return true;
    }
  });

  const handleCompleteTask = (scheduleId: string) => {
    completePMTask.mutate({ scheduleId });
  };

  const handleCreateFromTemplate = (template: any) => {
    const newTask: PMTaskCreate = {
      ...template,
      assetId: 'asset-demo-001', // Mock asset ID
    };
    
    createPMTask.mutate(newTask, {
      onSuccess: () => {
        setShowCreateForm(false);
        setActiveTab('tasks');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wrench className="w-6 h-6 mr-3" />
            <h1 className="text-xl font-bold">Preventive Maintenance</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-500 hover:bg-blue-400 p-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'tasks', label: 'Tasks', icon: Settings },
            { id: 'create', label: 'Create', icon: Plus }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics?.totalTasks || 0}</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Due Tasks</p>
                    <p className="text-2xl font-bold text-yellow-600">{analytics?.dueTasks || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{analytics?.overdueTasks || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">{analytics?.completionRate || 0}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setActiveTab('create')}
                  className="w-full flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-blue-600">Create New PM Task</span>
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="w-full flex items-center p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                >
                  <Calendar className="w-5 h-5 text-yellow-600 mr-3" />
                  <span className="font-medium text-yellow-600">View Today's Schedule</span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-green-600">Manage PM Tasks</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredSchedule.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{entry.pmTaskName}</p>
                        <p className="text-sm text-gray-600">{entry.assetName}</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPMTaskStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Due: {new Date(entry.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {entry.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleCompleteTask(entry.id)}
                          className="ml-3 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow border p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="due">Due Soon</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Schedule Entries */}
            <div className="space-y-3">
              {filteredSchedule.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow border">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{entry.pmTaskName}</h3>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {entry.assetName}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPMTaskStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Due: {new Date(entry.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Timer className="w-4 h-4 mr-2" />
                        <span>{formatDuration(entry.estimatedDuration)}</span>
                      </div>
                      {entry.assignedTo && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          <span>{entry.assignedTo}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        <span className={`capitalize ${entry.priority === 'HIGH' ? 'text-red-600' : entry.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {entry.priority}
                        </span>
                      </div>
                    </div>

                    {entry.status !== 'COMPLETED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCompleteTask(entry.id)}
                          disabled={completePMTask.isPending}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {completePMTask.isPending ? 'Completing...' : 'Complete'}
                        </button>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredSchedule.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No scheduled tasks found</p>
                <p className="text-sm text-gray-500">Try adjusting your filters or create new PM tasks</p>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">PM Tasks</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {pmTasks.map((task) => (
                  <div key={task.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.name}</h4>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPMStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Type:</span> {getPMTriggerTypeLabel(task.triggerType)}
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span> {getPMFrequencyLabel(task.frequency)}
                      </div>
                      <div>
                        <span className="font-medium">Asset:</span> {task.assetName}
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span> {task.completionCount} times
                      </div>
                    </div>

                    {task.nextDue && (
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className={isTaskOverdue(task.nextDue) ? 'text-red-600' : isDueSoon(task.nextDue) ? 'text-yellow-600' : 'text-gray-600'}>
                          Next due: {new Date(task.nextDue).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {pmTasks.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No PM tasks configured</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Your First PM Task
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <PMCalendarView onTaskClick={(task) => console.log('Task clicked:', task)} />
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Start Templates</h3>
                <p className="text-sm text-gray-600">Choose a template to get started quickly</p>
              </div>
              <div className="p-4 space-y-3">
                {PM_TASK_TEMPLATES.map((template, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <button
                        onClick={() => handleCreateFromTemplate(template)}
                        disabled={createPMTask.isPending}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Use Template
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {getPMTriggerTypeLabel(template.triggerType)}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {formatDuration(template.estimatedDuration)}
                      </span>
                      {template.meterType && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          Every {template.meterThreshold} {template.meterType}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Or Create Custom Task</h3>
              </div>
              <div className="p-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors"
                >
                  <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Create Custom PM Task</p>
                  <p className="text-sm text-gray-500">Configure your own maintenance schedule</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Form Modal - Mobile Optimized */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen p-4 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Create PM Task</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                
                <PMTaskForm 
                  onSubmit={(task) => {
                    createPMTask.mutate(task, {
                      onSuccess: () => {
                        setShowCreateForm(false);
                        setActiveTab('tasks');
                      }
                    });
                  }}
                  onCancel={() => setShowCreateForm(false)}
                  isSubmitting={createPMTask.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simplified PM Task Form Component
const PMTaskForm: React.FC<{
  onSubmit: (task: PMTaskCreate) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<PMTaskCreate>({
    name: '',
    description: '',
    assetId: 'asset-demo-001',
    triggerType: 'TIME_BASED',
    frequency: 'MONTHLY',
    intervalValue: 1,
    estimatedDuration: 60,
    instructions: '',
    priority: 'MEDIUM'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
          <select
            value={formData.triggerType}
            onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as PMTriggerType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="TIME_BASED">Time Based</option>
            <option value="METER_BASED">Meter Based</option>
            <option value="CONDITION_BASED">Condition Based</option>
            <option value="EVENT_BASED">Event Based</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value as PMFrequency })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUALLY">Annually</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default PreventiveMaintenanceManager;