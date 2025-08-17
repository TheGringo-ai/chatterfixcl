/**
 * Sync-aware React Query hooks for ChatterFix CMMS PWA
 * Provides seamless offline/online data management with automatic sync
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { syncManager, useSyncManager } from '../utils/enhancedSyncManager';
import {
  getCachedAPIResponse,
  cacheAPIResponse,
  pmTaskStorage,
  pmScheduleStorage,
  workOrderStorage,
  costEntryStorage
} from '../utils/offlineStorage';
import { useState, useEffect } from 'react';

interface SyncAwareQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  offlineFirst?: boolean; // Whether to check offline storage first
}

interface SyncAwareMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  optimistic?: boolean; // Whether to apply changes optimistically
  tableName: string; // For sync tracking
}

/**
 * Sync-aware query hook that handles offline/online scenarios
 */
export function useSyncAwareQuery<T>(
  queryKey: (string | number)[],
  endpoint: string,
  options: SyncAwareQueryOptions = {}
) {
  const { offlineFirst = true } = options;
  
  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        // Try offline first if enabled
        if (offlineFirst && !navigator.onLine) {
          const cached = await getCachedAPIResponse(endpoint);
          if (cached) {
            return cached;
          }
        }

        // Try network
        const response = await api.get<T>(endpoint);
        
        // Cache the response for offline use
        await cacheAPIResponse(endpoint, response);
        
        return response;
      } catch (error) {
        // Fallback to cache if network fails
        console.log('Network failed, trying cache for:', endpoint);
        const cached = await getCachedAPIResponse(endpoint);
        
        if (cached) {
          return cached;
        }
        
        throw error;
      }
    },
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
    ...options,
  });
}

/**
 * Sync-aware mutation hook with offline support and automatic sync
 */
export function useSyncAwareMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: SyncAwareMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { addOperation } = useSyncManager();
  const { optimistic = true, tableName } = options;
  
  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      try {
        // Try the mutation online
        if (navigator.onLine) {
          const result = await mutationFn(variables);
          return result;
        } else {
          throw new Error('Device is offline');
        }
      } catch (error) {
        // Handle offline scenario
        if (!navigator.onLine || (error as any)?.name === 'NetworkError') {
          console.log('Offline mutation, adding to sync queue');
          
          // Generate optimistic ID if needed
          const recordId = (variables as any).id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Add to sync queue
          await addOperation('CREATE', tableName, recordId, variables);
          
          // Apply optimistic update if enabled
          if (optimistic) {
            const optimisticResult = {
              ...variables,
              id: recordId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as TData;
            
            // Store locally for immediate UI update
            await storeOptimisticUpdate(tableName, optimisticResult);
            
            // Update React Query cache
            queryClient.invalidateQueries({ queryKey: [tableName] });
            
            return optimisticResult;
          }
        }
        
        throw error;
      }
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

/**
 * Store optimistic update in appropriate offline storage
 */
async function storeOptimisticUpdate(tableName: string, data: any): Promise<void> {
  switch (tableName) {
    case 'pm_tasks':
      await pmTaskStorage.store(data);
      break;
    case 'pm_schedule':
      await pmScheduleStorage.store(data);
      break;
    case 'work_orders':
      await workOrderStorage.store(data);
      break;
    case 'cost_entries':
      await costEntryStorage.store(data);
      break;
    default:
      console.warn(`No offline storage configured for table: ${tableName}`);
  }
}

/**
 * Hook for PM Tasks with offline support
 */
export function usePMTasksSync() {
  return useSyncAwareQuery(
    ['pm_tasks'],
    '/preventive-maintenance/tasks',
    { offlineFirst: true }
  );
}

/**
 * Hook for PM Schedule with offline support
 */
export function usePMScheduleSync(startDate?: string, endDate?: string) {
  const endpoint = `/preventive-maintenance/schedule${
    startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ''
  }`;
  
  return useSyncAwareQuery(
    ['pm_schedule', startDate, endDate],
    endpoint,
    { offlineFirst: true }
  );
}

/**
 * Hook for creating PM Tasks with offline support
 */
export function useCreatePMTaskSync() {
  return useSyncAwareMutation(
    (variables: any) => api.post('/preventive-maintenance/tasks', variables),
    {
      tableName: 'pm_tasks',
      optimistic: true,
      onSuccess: () => {
        console.log('PM Task created successfully');
      }
    }
  );
}

/**
 * Hook for completing PM Tasks with offline support
 */
export function useCompletePMTaskSync() {
  const { addOperation } = useSyncManager();
  
  return useSyncAwareMutation(
    (variables: { scheduleId: string }) => 
      api.post('/preventive-maintenance/complete', variables),
    {
      tableName: 'pm_schedule',
      optimistic: true,
      onSuccess: async (data, variables) => {
        // Add update operation to sync queue
        await addOperation('UPDATE', 'pm_schedule', variables.scheduleId, {
          status: 'COMPLETED',
          completion_date: new Date().toISOString()
        });
      }
    }
  );
}

/**
 * Hook for Work Orders with offline support
 */
export function useWorkOrdersSync() {
  return useSyncAwareQuery(
    ['work_orders'],
    '/work-orders',
    { offlineFirst: true }
  );
}

/**
 * Hook for creating Work Orders with offline support
 */
export function useCreateWorkOrderSync() {
  return useSyncAwareMutation(
    (variables: any) => api.post('/work-orders', variables),
    {
      tableName: 'work_orders',
      optimistic: true
    }
  );
}

/**
 * Network status hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

/**
 * Sync status hook with real-time updates
 */
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { getSyncStatus, getSyncStats, forceSync } = useSyncManager();
  
  useEffect(() => {
    // Load initial sync status
    const loadStatus = async () => {
      const status = await getSyncStatus();
      const stats = getSyncStats();
      setSyncStatus({ ...status, ...stats });
    };
    
    loadStatus();
    
    // Listen for sync events
    const handleSyncCompleted = () => {
      setSyncInProgress(false);
      loadStatus();
    };
    
    const handleSyncError = (event: CustomEvent) => {
      setSyncInProgress(false);
      console.error('Sync error:', event.detail.error);
    };
    
    const handleSyncStarted = () => {
      setSyncInProgress(true);
    };
    
    window.addEventListener('chatterfix_sync_completed', handleSyncCompleted as EventListener);
    window.addEventListener('chatterfix_sync_error', handleSyncError as EventListener);
    window.addEventListener('chatterfix_sync_started', handleSyncStarted as EventListener);
    
    // Periodic status updates
    const interval = setInterval(loadStatus, 10000); // Every 10 seconds
    
    return () => {
      window.removeEventListener('chatterfix_sync_completed', handleSyncCompleted as EventListener);
      window.removeEventListener('chatterfix_sync_error', handleSyncError as EventListener);
      window.removeEventListener('chatterfix_sync_started', handleSyncStarted as EventListener);
      clearInterval(interval);
    };
  }, [getSyncStatus, getSyncStats]);
  
  const handleForceSync = async () => {
    setSyncInProgress(true);
    try {
      await forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };
  
  return {
    syncStatus,
    syncInProgress,
    forceSync: handleForceSync,
    isOnline: useNetworkStatus()
  };
}

/**
 * Offline queue status hook
 */
export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const { getSyncStats } = useSyncManager();
  
  useEffect(() => {
    const updateQueueSize = () => {
      const stats = getSyncStats();
      setQueueSize(stats.pendingOperations);
    };
    
    updateQueueSize();
    
    // Update when sync events occur
    const handleSyncEvent = () => updateQueueSize();
    
    window.addEventListener('chatterfix_sync_completed', handleSyncEvent);
    window.addEventListener('chatterfix_sync_error', handleSyncEvent);
    
    const interval = setInterval(updateQueueSize, 5000); // Every 5 seconds
    
    return () => {
      window.removeEventListener('chatterfix_sync_completed', handleSyncEvent);
      window.removeEventListener('chatterfix_sync_error', handleSyncEvent);
      clearInterval(interval);
    };
  }, [getSyncStats]);
  
  return {
    queueSize,
    hasQueuedOperations: queueSize > 0
  };
}