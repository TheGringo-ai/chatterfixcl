import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { 
  cacheAPIResponse, 
  getCachedAPIResponse, 
  addPendingSync,
  pmTaskStorage,
  pmScheduleStorage,
  costEntryStorage
} from "../utils/offlineStorage";

// Offline-aware query hook
export function useOfflineAwareQuery<T>(
  queryKey: (string | number)[],
  endpoint: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        // Try network first
        const response = await api.get<T>(endpoint);
        
        // Cache the response
        await cacheAPIResponse(endpoint, response);
        
        return response;
      } catch (error) {
        // If network fails, try cache
        console.log('Network failed, trying cache for:', endpoint);
        const cachedData = await getCachedAPIResponse(endpoint);
        
        if (cachedData) {
          return cachedData;
        }
        
        // If no cache, throw the original error
        throw error;
      }
    },
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Offline-aware mutation hook
export function useOfflineAwareMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    optimisticUpdate?: (variables: TVariables) => TData;
    syncConfig?: {
      storeName: string;
      endpoint: string;
      method: 'POST' | 'PUT' | 'DELETE';
    };
  }
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      try {
        // Try the mutation
        const result = await mutationFn(variables);
        return result;
      } catch (error) {
        // If offline or network error, handle gracefully
        if (!navigator.onLine || (error as any)?.name === 'NetworkError') {
          console.log('Offline mutation, adding to sync queue');
          
          // Add to pending sync if config provided
          if (options?.syncConfig) {
            await addPendingSync({
              type: 'CREATE',
              storeName: options.syncConfig.storeName,
              data: variables,
              endpoint: options.syncConfig.endpoint,
              method: options.syncConfig.method,
            });
          }
          
          // Return optimistic result if provided
          if (options?.optimisticUpdate) {
            const optimisticResult = options.optimisticUpdate(variables);
            
            // Store locally for immediate UI update
            if (options?.syncConfig?.storeName === 'pmTasks') {
              await pmTaskStorage.store(optimisticResult);
            } else if (options?.syncConfig?.storeName === 'pmSchedule') {
              await pmScheduleStorage.store(optimisticResult);
            } else if (options?.syncConfig?.storeName === 'costEntries') {
              await costEntryStorage.store(optimisticResult);
            }
            
            return optimisticResult;
          }
        }
        
        throw error;
      }
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
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

// Sync status hook
export function useSyncStatus() {
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  
  React.useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const { getPendingSyncItems } = await import('../utils/offlineStorage');
        const items = await getPendingSyncItems();
        setPendingCount(items.length);
      } catch (error) {
        console.error('Error checking pending sync items:', error);
      }
    };
    
    // Check initially
    updatePendingCount();
    
    // Check periodically
    const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const forcSync = async () => {
    setIsSyncing(true);
    try {
      const { syncPendingItems } = await import('../utils/offlineStorage');
      await syncPendingItems();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return {
    pendingCount,
    isSyncing,
    forcSync,
  };
}

// React import for hooks
import React from 'react';