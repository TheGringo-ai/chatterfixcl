/**
 * Sync Status Indicator Component
 * Shows real-time sync status and allows manual sync control
 */

import React, { useState } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, 
  Clock, Database, Upload, Download 
} from 'lucide-react';
import { useSyncStatus, useOfflineQueue } from '../hooks/useSyncAwareQueries';

interface SyncStatusIndicatorProps {
  position?: 'fixed' | 'relative';
  showDetails?: boolean;
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  position = 'fixed',
  showDetails = false,
  className = ''
}) => {
  const { syncStatus, syncInProgress, forceSync, isOnline } = useSyncStatus();
  const { queueSize, hasQueuedOperations } = useOfflineQueue();
  const [showDetailedStatus, setShowDetailedStatus] = useState(showDetails);

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-red-500 bg-red-100';
    if (syncInProgress) return 'text-blue-500 bg-blue-100';
    if (hasQueuedOperations) return 'text-yellow-500 bg-yellow-100';
    return 'text-green-500 bg-green-100';
  };

  const getSyncStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncInProgress) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (hasQueuedOperations) return <Upload className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncInProgress) return 'Syncing...';
    if (hasQueuedOperations) return `${queueSize} pending`;
    return 'Synced';
  };

  const handleForceSync = async () => {
    if (isOnline && !syncInProgress) {
      await forceSync();
    }
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const baseClasses = `
    ${position === 'fixed' ? 'fixed bottom-4 right-4 z-50' : 'relative'}
    ${className}
  `;

  return (
    <div className={baseClasses}>
      {/* Compact Status Indicator */}
      <div
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg shadow-md cursor-pointer
          transition-all duration-200 hover:shadow-lg
          ${getSyncStatusColor()}
        `}
        onClick={() => setShowDetailedStatus(!showDetailedStatus)}
      >
        {getSyncStatusIcon()}
        <span className="text-sm font-medium">{getSyncStatusText()}</span>
        {!isOnline && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Detailed Status Panel */}
      {showDetailedStatus && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sync Status</h3>
            <button
              onClick={() => setShowDetailedStatus(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-3 mb-4">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-gray-500">
                {isOnline ? 'Connected to server' : 'Working offline'}
              </p>
            </div>
          </div>

          {/* Sync Statistics */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Pending Operations</span>
              </div>
              <span className="text-sm font-medium">{queueSize}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Last Sync</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatLastSync(syncStatus?.lastSync)}
              </span>
            </div>

            {syncStatus && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Status</span>
                </div>
                <span className={`text-sm font-medium ${
                  syncStatus.status === 'up_to_date' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {syncStatus.status === 'up_to_date' ? 'Up to date' : 'Pending sync'}
                </span>
              </div>
            )}
          </div>

          {/* Pending Operations Breakdown */}
          {hasQueuedOperations && syncStatus?.pending_operations && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Pending Changes:</p>
              <div className="space-y-1">
                {Object.entries(syncStatus.pending_operations).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-xs">
                    <span className="text-gray-600 capitalize">
                      {table.replace('_', ' ')}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleForceSync}
              disabled={!isOnline || syncInProgress}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                transition-colors duration-200
                ${isOnline && !syncInProgress
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {syncInProgress ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{syncInProgress ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Offline Mode Info */}
          {!isOnline && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Working Offline
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your changes are being saved locally and will sync when you're back online.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;