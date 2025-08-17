import React, { useState } from 'react';
import { 
  BarChart3, Clock, Users, 
  FileText, Calendar, DollarSign, Wrench, Package,
  MessageSquare, Upload, Plus, 
  Download, Eye, CheckCircle, Settings,
  PieChart, Activity, Target, Zap, ArrowUp, ArrowDown,
  Bell, MapPin, Star, Award, ThumbsUp, TrendingUp, AlertTriangle, XCircle
} from 'lucide-react';

interface ManagerDashboardProps {
  getAIResponse?: (prompt: string, context?: string, workOrderId?: string, assetId?: string) => Promise<string>;
}

interface KPI {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface WorkOrderSummary {
  id: string;
  title: string;
  asset: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  assignee: string;
  dueDate: string;
  estimatedHours: number;
}

interface TechnicianPerformance {
  id: string;
  name: string;
  completedOrders: number;
  avgResponseTime: number;
  efficiency: number;
  rating: number;
  specialties: string[];
}

interface AssetHealth {
  id: string;
  name: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  healthScore: number;
  lastMaintenance: string;
  nextDue: string;
  location: string;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ getAIResponse }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scheduling' | 'reports' | 'documents' | 'bulk-ops'>('dashboard');
  const [chatMessages, setChatMessages] = useState<Array<{role: string; content: string}>>([
    { role: 'assistant', content: 'Hello! I\'m your AI Maintenance Assistant. I can help you analyze KPIs, schedule maintenance, generate reports, and answer questions about your assets and documentation. How can I assist you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Mock data
  const [kpis, setKpis] = useState<KPI[]>([
    {
      title: 'Overall Equipment Effectiveness',
      value: '87.5%',
      change: 2.3,
      trend: 'up',
      icon: <Target className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Mean Time To Repair',
      value: '2.4h',
      change: -0.6,
      trend: 'down',
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-green-500'
    },
    {
      title: 'Work Order Completion Rate',
      value: '94.2%',
      change: 1.8,
      trend: 'up',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Asset Uptime',
      value: '96.7%',
      change: 0.5,
      trend: 'up',
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-orange-500'
    },
    {
      title: 'Maintenance Costs',
      value: '$42,350',
      change: -5.2,
      trend: 'down',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-red-500'
    },
    {
      title: 'Parts Inventory Value',
      value: '$127,840',
      change: 3.1,
      trend: 'up',
      icon: <Package className="w-6 h-6" />,
      color: 'bg-yellow-500'
    },
    {
      title: 'Technician Utilization',
      value: '82.3%',
      change: 1.2,
      trend: 'up',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-indigo-500'
    },
    {
      title: 'Preventive Maintenance %',
      value: '76.8%',
      change: 4.7,
      trend: 'up',
      icon: <Wrench className="w-6 h-6" />,
      color: 'bg-teal-500'
    }
  ]);

  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([
    {
      id: 'WO-2025-001',
      title: 'Replace conveyor belt motor',
      asset: 'Conveyor Line A',
      priority: 'high',
      status: 'in-progress',
      assignee: 'John Smith',
      dueDate: '2025-08-05',
      estimatedHours: 4
    },
    {
      id: 'WO-2025-002',
      title: 'Lubrication service - Pump #3',
      asset: 'Water Pump #3',
      priority: 'medium',
      status: 'pending',
      assignee: 'Mike Johnson',
      dueDate: '2025-08-06',
      estimatedHours: 1.5
    },
    {
      id: 'WO-2025-003',
      title: 'Safety inspection - Elevator',
      asset: 'Freight Elevator',
      priority: 'critical',
      status: 'overdue',
      assignee: 'Sarah Wilson',
      dueDate: '2025-08-03',
      estimatedHours: 3
    }
  ]);

  const [technicians, setTechnicians] = useState<TechnicianPerformance[]>([
    {
      id: 'tech-001',
      name: 'John Smith',
      completedOrders: 23,
      avgResponseTime: 1.2,
      efficiency: 94,
      rating: 4.8,
      specialties: ['Electrical', 'HVAC']
    },
    {
      id: 'tech-002',
      name: 'Mike Johnson',
      completedOrders: 18,
      avgResponseTime: 1.8,
      efficiency: 87,
      rating: 4.6,
      specialties: ['Mechanical', 'Plumbing']
    },
    {
      id: 'tech-003',
      name: 'Sarah Wilson',
      completedOrders: 31,
      avgResponseTime: 0.9,
      efficiency: 96,
      rating: 4.9,
      specialties: ['Safety', 'Compliance']
    }
  ]);

  const [assetHealth, setAssetHealth] = useState<AssetHealth[]>([
    {
      id: 'asset-001',
      name: 'Conveyor Line A',
      status: 'warning',
      healthScore: 72,
      lastMaintenance: '2025-07-28',
      nextDue: '2025-08-15',
      location: 'Production Floor A'
    },
    {
      id: 'asset-002',
      name: 'HVAC Unit #2',
      status: 'excellent',
      healthScore: 95,
      lastMaintenance: '2025-07-25',
      nextDue: '2025-09-25',
      location: 'Building B'
    },
    {
      id: 'asset-003',
      name: 'Water Pump #3',
      status: 'good',
      healthScore: 85,
      lastMaintenance: '2025-07-20',
      nextDue: '2025-08-20',
      location: 'Utility Room'
    }
  ]);

  const handleAIChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsAIProcessing(true);

    try {
      let aiResponse = '';
      
      if (getAIResponse) {
        // Enhanced system prompt for manager dashboard
        const managerPrompt = `${currentInput}

Context: You are an AI assistant for a maintenance manager using ChatterFix CMMS. You have access to:
- Current KPIs: OEE 87.5%, MTTR 2.4h, Work Order Completion 94.2%, Asset Uptime 96.7%
- Active work orders: ${workOrders.length} total, ${workOrders.filter(wo => wo.status === 'overdue').length} overdue
- Technician performance: ${technicians.length} technicians, avg efficiency ${Math.round(technicians.reduce((sum, t) => sum + t.efficiency, 0) / technicians.length)}%
- Asset health: ${assetHealth.filter(a => a.status === 'critical').length} critical, ${assetHealth.filter(a => a.status === 'warning').length} warning status assets

Provide specific, actionable insights and recommendations for maintenance management decisions.`;

        aiResponse = await getAIResponse(managerPrompt, 'manager-dashboard');
      } else {
        aiResponse = 'AI service not available. Please ensure the Llama API is configured.';
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsAIProcessing(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-3 text-blue-600" />
            Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive maintenance management and analytics</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
          </select>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-white p-1 rounded-lg shadow">
        {['dashboard', 'scheduling', 'reports', 'documents', 'bulk-ops'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 rounded-md font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {kpis.map((kpi, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-full ${kpi.color} text-white`}>
                        {kpi.icon}
                      </div>
                      <div className={`flex items-center ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {kpi.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : 
                         kpi.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
                        <span className="text-sm font-medium ml-1">
                          {kpi.change > 0 ? '+' : ''}{kpi.change}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
                      <p className="text-sm text-gray-600">{kpi.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Order Trends</h3>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Chart placeholder - Work order completion trends</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Health Distribution</h3>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Chart placeholder - Asset health breakdown</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Work Orders */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Work Orders</h3>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{order.id}</div>
                              <div className="text-sm text-gray-500">{order.title}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.asset}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.assignee}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.dueDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Scheduling Tab */}
          {activeTab === 'scheduling' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Schedule</h3>
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Interactive calendar for scheduling maintenance tasks</p>
                    <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Create Schedule
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Technician Availability</h3>
                  <div className="space-y-3">
                    {technicians.map((tech) => (
                      <div key={tech.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{tech.name}</p>
                          <p className="text-sm text-gray-600">{tech.specialties.join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">Available</p>
                          <p className="text-xs text-gray-500">Efficiency: {tech.efficiency}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Maintenance</h3>
                  <div className="space-y-3">
                    {assetHealth.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{asset.name}</p>
                          <p className="text-sm text-gray-600">{asset.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Due: {new Date(asset.nextDue).toLocaleDateString()}</p>
                          <p className={`text-xs ${getHealthColor(asset.status)}`}>
                            Health: {asset.healthScore}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <FileText className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Asset Performance Report</h3>
                  <p className="text-sm text-gray-600">Comprehensive asset health and performance metrics</p>
                </button>
                
                <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <Users className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Technician Performance</h3>
                  <p className="text-sm text-gray-600">Individual and team productivity analysis</p>
                </button>
                
                <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <DollarSign className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Cost Analysis</h3>
                  <p className="text-sm text-gray-600">Maintenance costs and ROI breakdown</p>
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Report Generator</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Generate with AI
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option>Asset Health Summary</option>
                      <option>Work Order Analysis</option>
                      <option>Cost Optimization</option>
                      <option>Compliance Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option>Last 30 Days</option>
                      <option>Last Quarter</option>
                      <option>Last 6 Months</option>
                      <option>Year to Date</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Requirements</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    rows={3}
                    placeholder="Describe any specific metrics, comparisons, or insights you need..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Document Library</h3>
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Link to Asset
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Drag & drop files here or click to browse</p>
                    <p className="text-sm text-gray-500 mt-2">Supports: PDF, Word, Excel, Images</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">AI Document Processing</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Auto-extract key information</li>
                      <li>• Link to relevant assets</li>
                      <li>• Generate summaries</li>
                      <li>• Enable smart search</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Document Types</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Equipment manuals</li>
                      <li>• Safety procedures</li>
                      <li>• Maintenance schedules</li>
                      <li>• Compliance certificates</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Documents</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Conveyor_Manual_2025.pdf', asset: 'Conveyor Line A', uploaded: '2 hours ago' },
                      { name: 'Safety_Checklist_HVAC.docx', asset: 'HVAC Unit #2', uploaded: '1 day ago' },
                      { name: 'Pump_Maintenance_Schedule.xlsx', asset: 'Water Pump #3', uploaded: '3 days ago' }
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-sm text-gray-600">Linked to: {doc.asset}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{doc.uploaded}</span>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Operations Tab */}
          {activeTab === 'bulk-ops' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                    Bulk Work Orders
                  </h3>
                  <p className="text-gray-600 mb-4">Create multiple work orders from templates or CSV import</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Create Bulk Orders
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-green-600" />
                    Bulk Parts Update
                  </h3>
                  <p className="text-gray-600 mb-4">Update inventory levels, prices, and vendors in bulk</p>
                  <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                    Update Parts
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-purple-600" />
                    Bulk Asset Updates
                  </h3>
                  <p className="text-gray-600 mb-4">Update asset information, schedules, and assignments</p>
                  <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                    Update Assets
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Download Templates</h4>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center justify-between">
                        <span>Work Orders Template</span>
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center justify-between">
                        <span>Parts Inventory Template</span>
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center justify-between">
                        <span>Asset List Template</span>
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Upload completed templates</p>
                    <p className="text-sm text-gray-500">CSV, Excel files supported</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Chat Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                AI Assistant
              </h3>
              <p className="text-sm text-gray-600">Your maintenance management assistant</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isAIProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                  placeholder="Ask about KPIs, scheduling, reports..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleAIChat}
                  disabled={isAIProcessing}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Show asset health summary",
                  "Generate cost report",
                  "Schedule recommendations",
                  "Top performing technicians"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setChatInput(suggestion);
                      setTimeout(handleAIChat, 100);
                    }}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
