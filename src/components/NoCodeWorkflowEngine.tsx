import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Play, Pause, Trash2, Edit, 
  ArrowRight, Clock, AlertTriangle, CheckCircle,
  Zap, Brain, Target, Users, Calendar, 
  Mail, MessageSquare, Phone, Database,
  Filter, RotateCw, Save, Copy, Eye
} from 'lucide-react';

interface WorkflowTrigger {
  id: string;
  type: 'work_order_created' | 'asset_failure' | 'inventory_low' | 'time_based' | 'sensor_alert' | 'manual';
  name: string;
  description: string;
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with';
    value: string | number;
  }[];
  settings: Record<string, any>;
}

interface WorkflowAction {
  id: string;
  type: 'create_work_order' | 'send_notification' | 'update_asset' | 'order_parts' | 'assign_technician' | 'schedule_maintenance' | 'ai_analysis';
  name: string;
  description: string;
  settings: Record<string, any>;
  delay?: number; // minutes
}

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
  category: 'maintenance' | 'inventory' | 'safety' | 'compliance' | 'notifications';
  aiGenerated: boolean;
}

interface NoCodeWorkflowEngineProps {
  getAIResponse: (prompt: string, context?: string) => Promise<string>;
}

const NoCodeWorkflowEngine: React.FC<NoCodeWorkflowEngineProps> = ({ getAIResponse }) => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Mock workflow data
  const mockWorkflows: WorkflowRule[] = [
    {
      id: 'wf-001',
      name: 'Critical Asset Failure Response',
      description: 'Automatically create urgent work orders and notify key personnel when critical assets fail',
      isActive: true,
      trigger: {
        id: 'trigger-001',
        type: 'asset_failure',
        name: 'Critical Asset Down',
        description: 'When any critical asset status changes to "failed"',
        conditions: [
          { field: 'asset.criticality', operator: 'equals', value: 'critical' },
          { field: 'asset.status', operator: 'equals', value: 'failed' }
        ],
        settings: {}
      },
      actions: [
        {
          id: 'action-001',
          type: 'create_work_order',
          name: 'Create Emergency Work Order',
          description: 'Generate high-priority work order for immediate response',
          settings: {
            priority: 'critical',
            assignToRole: 'senior_technician',
            title: 'EMERGENCY: {asset.name} Failure',
            description: 'Critical asset failure detected. Immediate response required.'
          }
        },
        {
          id: 'action-002',
          type: 'send_notification',
          name: 'Alert Management Team',
          description: 'Send immediate notifications to all managers',
          settings: {
            recipients: ['maintenance_manager', 'plant_manager', 'operations_director'],
            method: ['email', 'sms', 'app_notification'],
            template: 'critical_asset_failure'
          }
        },
        {
          id: 'action-003',
          type: 'ai_analysis',
          name: 'AI Root Cause Analysis',
          description: 'Run AI analysis to determine likely causes and solutions',
          settings: {
            analysisType: 'root_cause',
            includeHistory: true,
            generateRecommendations: true
          },
          delay: 5
        }
      ],
      createdAt: '2025-08-01',
      lastTriggered: '2025-08-17',
      triggerCount: 3,
      category: 'maintenance',
      aiGenerated: false
    },
    {
      id: 'wf-002',
      name: 'Smart Inventory Reordering',
      description: 'Automatically order parts when AI predicts stockout risk above 85%',
      isActive: true,
      trigger: {
        id: 'trigger-002',
        type: 'inventory_low',
        name: 'AI Predicts Stockout',
        description: 'When AI prediction shows >85% probability of stockout within 30 days',
        conditions: [
          { field: 'inventory.aiPrediction.probabilityOfNeed', operator: 'greater_than', value: 85 },
          { field: 'inventory.aiPrediction.timeToStockout', operator: 'less_than', value: 30 }
        ],
        settings: { minimumConfidence: 80 }
      },
      actions: [
        {
          id: 'action-004',
          type: 'order_parts',
          name: 'Auto-Generate Purchase Order',
          description: 'Create purchase order with AI-recommended quantity',
          settings: {
            useAIQuantity: true,
            approvalRequired: true,
            supplier: 'preferred'
          }
        },
        {
          id: 'action-005',
          type: 'send_notification',
          name: 'Notify Procurement',
          description: 'Alert procurement team of auto-generated order',
          settings: {
            recipients: ['procurement_manager'],
            method: ['email'],
            template: 'auto_purchase_order'
          }
        }
      ],
      createdAt: '2025-07-15',
      lastTriggered: '2025-08-16',
      triggerCount: 12,
      category: 'inventory',
      aiGenerated: true
    },
    {
      id: 'wf-003',
      name: 'Preventive Maintenance Scheduler',
      description: 'Automatically schedule PM based on asset runtime and AI health predictions',
      isActive: true,
      trigger: {
        id: 'trigger-003',
        type: 'sensor_alert',
        name: 'Asset Health Declining',
        description: 'When asset health score drops below threshold',
        conditions: [
          { field: 'asset.healthScore', operator: 'less_than', value: 70 },
          { field: 'asset.nextPMDate', operator: 'greater_than', value: 7 }
        ],
        settings: {}
      },
      actions: [
        {
          id: 'action-006',
          type: 'schedule_maintenance',
          name: 'Schedule Preventive Maintenance',
          description: 'Create PM work order based on asset condition',
          settings: {
            priority: 'medium',
            scheduleDays: 3,
            includeAIRecommendations: true
          }
        },
        {
          id: 'action-007',
          type: 'assign_technician',
          name: 'Auto-Assign Best Technician',
          description: 'Assign technician based on skills and availability',
          settings: {
            criteria: ['skills_match', 'availability', 'location_proximity'],
            fallbackToManager: true
          }
        }
      ],
      createdAt: '2025-07-20',
      lastTriggered: '2025-08-15',
      triggerCount: 8,
      category: 'maintenance',
      aiGenerated: true
    }
  ];

  useEffect(() => {
    setWorkflows(mockWorkflows);
  }, []);

  const generateAIWorkflow = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGeneratingAI(true);
    
    try {
      const prompt = `
        Create a no-code workflow automation rule based on this business requirement:
        "${aiPrompt}"
        
        Generate a complete workflow with:
        1. Appropriate trigger (what starts the workflow)
        2. Trigger conditions (when it should activate)
        3. Series of actions to take
        4. Proper settings for each action
        
        Focus on maintenance, inventory, or asset management scenarios.
        
        Return JSON in this exact format:
        {
          "name": "Workflow name",
          "description": "What this workflow does",
          "category": "maintenance|inventory|safety|compliance|notifications",
          "trigger": {
            "type": "work_order_created|asset_failure|inventory_low|time_based|sensor_alert",
            "name": "Trigger name",
            "description": "When this happens",
            "conditions": [
              {"field": "field.name", "operator": "equals|greater_than|less_than", "value": "value"}
            ]
          },
          "actions": [
            {
              "type": "create_work_order|send_notification|update_asset|order_parts|assign_technician|schedule_maintenance|ai_analysis",
              "name": "Action name",
              "description": "What this action does",
              "settings": {"key": "value"},
              "delay": 0
            }
          ]
        }
      `;
      
      const aiResponse = await getAIResponse(prompt);
      
      // Parse AI response
      let workflowData = null;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          workflowData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse AI workflow:', e);
      }
      
      if (workflowData) {
        const newWorkflow: WorkflowRule = {
          id: `wf-ai-${Date.now()}`,
          name: workflowData.name,
          description: workflowData.description,
          isActive: false,
          trigger: {
            id: `trigger-ai-${Date.now()}`,
            ...workflowData.trigger,
            settings: {}
          },
          actions: workflowData.actions.map((action: any, index: number) => ({
            id: `action-ai-${Date.now()}-${index}`,
            ...action
          })),
          createdAt: new Date().toISOString().split('T')[0],
          triggerCount: 0,
          category: workflowData.category || 'maintenance',
          aiGenerated: true
        };
        
        setWorkflows(prev => [...prev, newWorkflow]);
        setAiPrompt('');
      }
      
    } catch (error) {
      console.error('AI workflow generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => 
      prev.map(wf => 
        wf.id === workflowId 
          ? { ...wf, isActive: !wf.isActive }
          : wf
      )
    );
  };

  const duplicateWorkflow = (workflow: WorkflowRule) => {
    const duplicate: WorkflowRule = {
      ...workflow,
      id: `wf-copy-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      isActive: false,
      triggerCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setWorkflows(prev => [...prev, duplicate]);
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inventory': return 'bg-green-100 text-green-800 border-green-200';
      case 'safety': return 'bg-red-100 text-red-800 border-red-200';
      case 'compliance': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'notifications': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'work_order_created': return <Plus className="w-4 h-4" />;
      case 'asset_failure': return <AlertTriangle className="w-4 h-4" />;
      case 'inventory_low': return <Database className="w-4 h-4" />;
      case 'time_based': return <Clock className="w-4 h-4" />;
      case 'sensor_alert': return <Zap className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_work_order': return <Plus className="w-4 h-4" />;
      case 'send_notification': return <MessageSquare className="w-4 h-4" />;
      case 'update_asset': return <Edit className="w-4 h-4" />;
      case 'order_parts': return <Database className="w-4 h-4" />;
      case 'assign_technician': return <Users className="w-4 h-4" />;
      case 'schedule_maintenance': return <Calendar className="w-4 h-4" />;
      case 'ai_analysis': return <Brain className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const activeWorkflows = workflows.filter(wf => wf.isActive).length;
  const totalTriggers = workflows.reduce((sum, wf) => sum + wf.triggerCount, 0);
  const aiGeneratedCount = workflows.filter(wf => wf.aiGenerated).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Settings className="w-8 h-8 mr-3" />
              No-Code Workflow Automation
            </h1>
            <p className="text-purple-100 mt-2">
              Build powerful automation rules without coding - powered by AI
            </p>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-green-600">{activeWorkflows}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <Zap className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Triggers</p>
              <p className="text-2xl font-bold text-blue-600">{totalTriggers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <Brain className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">AI Generated</p>
              <p className="text-2xl font-bold text-purple-600">{aiGeneratedCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-orange-600">{workflows.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Workflow Generator */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Brain className="w-6 h-6 mr-2 text-purple-600" />
          AI Workflow Generator
        </h2>
        <p className="text-gray-600 mb-4">
          Describe what you want to automate and AI will create the complete workflow for you
        </p>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Example: 'When a pump fails, automatically create a work order, notify the maintenance team, and order replacement parts'"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />
          </div>
          <button
            onClick={generateAIWorkflow}
            disabled={isGeneratingAI || !aiPrompt.trim()}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            {isGeneratingAI ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Workflow List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Automation Workflows</h2>
          <p className="text-gray-600">Manage your business process automation rules</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {workflows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No workflows created yet. Use AI to generate your first automation rule!</p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 mr-3">
                        {workflow.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(workflow.category)}`}>
                        {workflow.category}
                      </span>
                      {workflow.aiGenerated && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          AI Generated
                        </span>
                      )}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{workflow.description}</p>
                    
                    {/* Trigger */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        {getTriggerIcon(workflow.trigger.type)}
                        <span className="ml-2">Trigger: {workflow.trigger.name}</span>
                      </h4>
                      <p className="text-sm text-gray-600 ml-6">{workflow.trigger.description}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Actions ({workflow.actions.length}):</h4>
                      <div className="flex items-center space-x-2 ml-4">
                        {workflow.actions.map((action, index) => (
                          <React.Fragment key={action.id}>
                            <div className="flex items-center bg-gray-100 px-3 py-1 rounded-lg">
                              {getActionIcon(action.type)}
                              <span className="ml-2 text-sm text-gray-700">{action.name}</span>
                            </div>
                            {index < workflow.actions.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {workflow.createdAt}</span>
                      <span>Triggered: {workflow.triggerCount} times</span>
                      {workflow.lastTriggered && (
                        <span>Last: {workflow.lastTriggered}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-6 flex flex-col space-y-2">
                    <button
                      onClick={() => toggleWorkflow(workflow.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                        workflow.isActive 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {workflow.isActive ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedWorkflow(workflow)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateWorkflow(workflow)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NoCodeWorkflowEngine;