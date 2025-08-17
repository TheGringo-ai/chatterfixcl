import React, { useState } from 'react';
import { 
  DollarSign, Plus, TrendingUp, TrendingDown, 
  PieChart, BarChart3, Calculator, Receipt 
} from 'lucide-react';
import { useWorkOrderFinancials, useAddCostEntry, useFinancialSummary, CostType, getCostTypeLabel, getCostTypeColor } from '../hooks/useFinancials';

interface FinancialManagerProps {
  workOrderId?: string;
}

const FinancialManager: React.FC<FinancialManagerProps> = ({ workOrderId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'add-cost' | 'analytics'>('overview');
  const [newCostEntry, setNewCostEntry] = useState({
    type: 'LABOR' as CostType,
    amount: '',
    note: ''
  });

  // Hooks
  const { data: workOrderFinancials } = useWorkOrderFinancials(workOrderId || '');
  const { data: financialSummary } = useFinancialSummary();
  const addCostMutation = useAddCostEntry();

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderId || !newCostEntry.amount) return;

    addCostMutation.mutate({
      workOrderId,
      type: newCostEntry.type,
      amount: parseFloat(newCostEntry.amount),
      meta: { note: newCostEntry.note || undefined }
    }, {
      onSuccess: () => {
        setNewCostEntry({ type: 'LABOR', amount: '', note: '' });
        setActiveTab('overview');
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Financial Management</h2>
          </div>
          {workOrderId && (
            <button
              onClick={() => setActiveTab('add-cost')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Cost
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'add-cost', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={tab === 'add-cost' && !workOrderId}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Work Order Financial Summary */}
            {workOrderId && workOrderFinancials && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Work Order Costs: {workOrderId}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Cost</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${workOrderFinancials.total.toFixed(2)}
                        </p>
                      </div>
                      <Calculator className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Cost Entries</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {workOrderFinancials.entries.length}
                        </p>
                      </div>
                      <Receipt className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Cost Entries List */}
                {workOrderFinancials.entries.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Recent Costs</h4>
                    <div className="space-y-2">
                      {workOrderFinancials.entries.slice(-5).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCostTypeColor(entry.type)}`}>
                              {getCostTypeLabel(entry.type)}
                            </span>
                            {entry.meta?.note && (
                              <span className="ml-3 text-sm text-gray-600">{entry.meta.note}</span>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900">${entry.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overall Financial Summary */}
            {financialSummary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Spend</p>
                        <p className="text-xl font-bold text-blue-600">
                          ${financialSummary.total.toFixed(2)}
                        </p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Labor Costs</p>
                        <p className="text-xl font-bold text-purple-600">
                          ${(financialSummary.byType.LABOR || 0).toFixed(2)}
                        </p>
                      </div>
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Parts Costs</p>
                        <p className="text-xl font-bold text-orange-600">
                          ${(financialSummary.byType.PART || 0).toFixed(2)}
                        </p>
                      </div>
                      <PieChart className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Cost Tab */}
        {activeTab === 'add-cost' && workOrderId && (
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Add Cost Entry</h3>
            <form onSubmit={handleAddCost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Type
                </label>
                <select
                  value={newCostEntry.type}
                  onChange={(e) => setNewCostEntry({ ...newCostEntry, type: e.target.value as CostType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="LABOR">Labor</option>
                  <option value="PART">Parts</option>
                  <option value="SERVICE">Service</option>
                  <option value="MISC">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCostEntry.amount}
                  onChange={(e) => setNewCostEntry({ ...newCostEntry, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={newCostEntry.note}
                  onChange={(e) => setNewCostEntry({ ...newCostEntry, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Description or reference"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={addCostMutation.isPending}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addCostMutation.isPending ? 'Adding...' : 'Add Cost'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && financialSummary && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Cost Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost by Type */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Costs by Type</h4>
                <div className="space-y-3">
                  {Object.entries(financialSummary.byType).map(([type, amount]) => {
                    const percentage = financialSummary.total > 0 ? (amount / financialSummary.total) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCostTypeColor(type as CostType)}`}>
                            {getCostTypeLabel(type as CostType)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            ${amount.toFixed(2)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Insights */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Financial Insights</h4>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-white rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Average Cost per Entry</p>
                      <p className="text-sm text-gray-600">
                        ${financialSummary.total > 0 ? (financialSummary.total / Object.values(financialSummary.byType).reduce((sum, amt) => sum + (amt > 0 ? 1 : 0), 0)).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-white rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Largest Cost Category</p>
                      <p className="text-sm text-gray-600">
                        {Object.entries(financialSummary.byType).length > 0 
                          ? getCostTypeLabel(Object.entries(financialSummary.byType).reduce((a, b) => a[1] > b[1] ? a : b)[0] as CostType)
                          : 'No data'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialManager;