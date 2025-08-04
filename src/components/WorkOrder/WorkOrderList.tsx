import React from 'react';
import { Clock, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import { WorkOrder } from '../../types';

interface WorkOrderListProps {
  workOrders: WorkOrder[];
  activeWorkOrderId?: string;
  onSelectWorkOrder?: (workOrder: WorkOrder) => void;
}

const WorkOrderList: React.FC<WorkOrderListProps> = ({ 
  workOrders, 
  activeWorkOrderId,
  onSelectWorkOrder 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'In Progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (workOrders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Work Orders</h2>
        <div className="text-center py-8">
          <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No work orders yet. Start by using voice commands!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Recent Work Orders</h2>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {workOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => onSelectWorkOrder?.(order)}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
              activeWorkOrderId === order.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {getStatusIcon(order.status)}
                  <h3 className="font-semibold text-gray-900">
                    {order.asset.name}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {order.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>ID: {order.id}</span>
                  <span>Tech: {order.technician}</span>
                  <span>{formatDate(order.startTime)}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2 ml-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                {order.duration && (
                  <span className="text-sm text-gray-600">
                    {formatDuration(order.duration)}
                  </span>
                )}
              </div>
            </div>
            
            {order.resolution && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <span className="font-medium">Resolution:</span> {order.resolution}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkOrderList;