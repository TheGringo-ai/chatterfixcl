/**
 * Enhanced Sync Manager for ChatterFix CMMS PWA
 * Handles bidirectional sync between IndexedDB and PostgreSQL backend
 */

import { api } from '../api/client';
import { 
  initDB, 
  getAllData, 
  storeData, 
  deleteData,
  pmTaskStorage,
  pmScheduleStorage,
  workOrderStorage,
  costEntryStorage
} from './offlineStorage';

interface SyncOperation {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  data?: any;
  client_timestamp: Date;
  retry_count: number;
}

interface SyncRequest {
  client_id: string;
  operations: SyncOperation[];
  last_sync_timestamp?: Date;
}

interface SyncResponse {
  success: boolean;
  processed_operations: string[];
  failed_operations: Array<{
    operation_id: string;
    error: string;
  }>;
  server_changes: Array<{
    table_name: string;
    operation: string;
    record_id: string;
    data: any;
  }>;
  sync_timestamp: Date;
}

interface SyncStatus {
  client_id: string;
  last_sync?: string;
  pending_operations: Record<string, number>;
  total_pending: number;
  status: 'up_to_date' | 'pending_sync' | 'error';
}

class EnhancedSyncManager {
  private clientId: string;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private pendingOperations: SyncOperation[] = [];
  private lastSyncTimestamp?: Date;
  private retryAttempts: number = 3;
  private retryDelay: number = 5000; // 5 seconds
  private syncInterval?: NodeJS.Timeout;

  constructor() {
    this.clientId = this.getOrCreateClientId();
    this.setupEventListeners();
    this.loadPendingOperations();
    this.startPeriodicSync();
  }

  /**
   * Initialize sync manager
   */
  async initialize(): Promise<void> {
    await initDB();
    await this.loadSyncState();
    
    if (this.isOnline) {
      await this.performFullSync();
    }
  }

  /**
   * Add operation to sync queue
   */
  async addOperation(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    data?: any
  ): Promise<void> {
    const syncOp: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      table_name: tableName,
      record_id: recordId,
      data,
      client_timestamp: new Date(),
      retry_count: 0
    };

    this.pendingOperations.push(syncOp);
    await this.savePendingOperations();

    // Try immediate sync if online
    if (this.isOnline && !this.syncInProgress) {
      this.performSync();
    }
  }

  /**
   * Perform full synchronization
   */
  async performFullSync(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return false;
    }

    this.syncInProgress = true;
    
    try {
      console.log('Starting full sync...');
      
      // Step 1: Send pending operations to server
      const syncSuccess = await this.sendPendingOperations();
      
      // Step 2: Get and apply server changes
      await this.pullServerChanges();
      
      // Step 3: Update sync timestamp
      this.lastSyncTimestamp = new Date();
      await this.saveSyncState();
      
      console.log('Full sync completed successfully');
      this.dispatchSyncEvent('sync_completed', { success: syncSuccess });
      
      return syncSuccess;
      
    } catch (error) {
      console.error('Full sync failed:', error);
      this.dispatchSyncEvent('sync_error', { error: error instanceof Error ? error.message : String(error) });
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Send pending operations to server
   */
  private async sendPendingOperations(): Promise<boolean> {
    if (this.pendingOperations.length === 0) {
      return true;
    }

    try {
      const request: SyncRequest = {
        client_id: this.clientId,
        operations: this.pendingOperations,
        last_sync_timestamp: this.lastSyncTimestamp
      };

      const response: SyncResponse = await api.post('/sync/batch', request);
      
      if (response.success) {
        // Remove successfully processed operations
        this.pendingOperations = this.pendingOperations.filter(
          op => !response.processed_operations.includes(op.id)
        );
        
        // Handle failed operations
        for (const failedOp of response.failed_operations) {
          const operation = this.pendingOperations.find(op => op.id === failedOp.operation_id);
          if (operation) {
            operation.retry_count++;
            
            // Remove operation if max retries exceeded
            if (operation.retry_count >= this.retryAttempts) {
              console.warn(`Max retries exceeded for operation ${operation.id}:`, failedOp.error);
              this.pendingOperations = this.pendingOperations.filter(op => op.id !== operation.id);
            }
          }
        }
        
        await this.savePendingOperations();
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Error sending pending operations:', error);
      return false;
    }
  }

  /**
   * Pull and apply server changes
   */
  private async pullServerChanges(): Promise<void> {
    try {
      const since = this.lastSyncTimestamp?.toISOString();
      const response = await api.get(`/sync/changes/${this.clientId}${since ? `?since=${since}` : ''}`);
      
      if (response.changes && response.changes.length > 0) {
        console.log(`Applying ${response.changes.length} server changes`);
        
        for (const change of response.changes) {
          await this.applyServerChange(change);
        }
      }
      
    } catch (error) {
      console.error('Error pulling server changes:', error);
    }
  }

  /**
   * Apply a single server change to local storage
   */
  private async applyServerChange(change: any): Promise<void> {
    try {
      const { table_name, operation, record_id, data } = change;
      
      switch (table_name) {
        case 'work_orders':
          if (operation === 'UPDATE' || operation === 'CREATE') {
            await workOrderStorage.store(data);
          } else if (operation === 'DELETE') {
            await workOrderStorage.delete(record_id);
          }
          break;
          
        case 'pm_tasks':
          if (operation === 'UPDATE' || operation === 'CREATE') {
            await pmTaskStorage.store(data);
          } else if (operation === 'DELETE') {
            await pmTaskStorage.delete(record_id);
          }
          break;
          
        case 'pm_schedule':
          if (operation === 'UPDATE' || operation === 'CREATE') {
            await pmScheduleStorage.store(data);
          } else if (operation === 'DELETE') {
            await pmScheduleStorage.delete(record_id);
          }
          break;
          
        case 'cost_entries':
          if (operation === 'UPDATE' || operation === 'CREATE') {
            await costEntryStorage.store(data);
          } else if (operation === 'DELETE') {
            await costEntryStorage.delete(record_id);
          }
          break;
          
        default:
          console.warn(`Unknown table for sync: ${table_name}`);
      }
      
    } catch (error) {
      console.error(`Error applying server change for ${change.table_name}:`, error);
    }
  }

  /**
   * Get sync status from server
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    try {
      const status: SyncStatus = await api.get(`/sync/status/${this.clientId}`);
      return status;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  /**
   * Force sync now
   */
  async forceSync(): Promise<boolean> {
    if (!this.isOnline) {
      console.log('Cannot force sync while offline');
      return false;
    }
    
    return await this.performFullSync();
  }

  /**
   * Perform quick sync (lightweight)
   */
  async performSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    try {
      // Ping server to check connectivity
      await api.post('/sync/ping', { client_id: this.clientId });
      
      // Quick sync of pending operations only
      if (this.pendingOperations.length > 0) {
        await this.sendPendingOperations();
      }
      
    } catch (error) {
      console.error('Quick sync failed:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Network status listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Device came online, starting sync...');
      this.performFullSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Device went offline');
    });

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.performSync();
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Get or create client ID
   */
  private getOrCreateClientId(): string {
    let clientId = localStorage.getItem('chatterfix_client_id');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chatterfix_client_id', clientId);
    }
    return clientId;
  }

  /**
   * Load pending operations from storage
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const stored = localStorage.getItem('chatterfix_pending_sync');
      if (stored) {
        this.pendingOperations = JSON.parse(stored).map((op: any) => ({
          ...op,
          client_timestamp: new Date(op.client_timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
      this.pendingOperations = [];
    }
  }

  /**
   * Save pending operations to storage
   */
  private async savePendingOperations(): Promise<void> {
    try {
      localStorage.setItem('chatterfix_pending_sync', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  /**
   * Load sync state
   */
  private async loadSyncState(): Promise<void> {
    try {
      const stored = localStorage.getItem('chatterfix_sync_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.lastSyncTimestamp = state.lastSyncTimestamp ? new Date(state.lastSyncTimestamp) : undefined;
      }
    } catch (error) {
      console.error('Error loading sync state:', error);
    }
  }

  /**
   * Save sync state
   */
  private async saveSyncState(): Promise<void> {
    try {
      const state = {
        lastSyncTimestamp: this.lastSyncTimestamp?.toISOString(),
        clientId: this.clientId
      };
      localStorage.setItem('chatterfix_sync_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving sync state:', error);
    }
  }

  /**
   * Dispatch custom sync events
   */
  private dispatchSyncEvent(eventType: string, detail: any): void {
    const event = new CustomEvent(`chatterfix_${eventType}`, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    clientId: string;
    isOnline: boolean;
    syncInProgress: boolean;
    pendingOperations: number;
    lastSync?: string;
  } {
    return {
      clientId: this.clientId,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: this.pendingOperations.length,
      lastSync: this.lastSyncTimestamp?.toISOString()
    };
  }

  /**
   * Clear all sync data (for debugging/reset)
   */
  async clearSyncData(): Promise<void> {
    this.pendingOperations = [];
    this.lastSyncTimestamp = undefined;
    localStorage.removeItem('chatterfix_pending_sync');
    localStorage.removeItem('chatterfix_sync_state');
    localStorage.removeItem('chatterfix_client_id');
    
    console.log('Sync data cleared');
  }
}

// Export singleton instance
export const syncManager = new EnhancedSyncManager();

// Helper functions for components
export const useSyncManager = () => {
  return {
    forceSync: () => syncManager.forceSync(),
    getSyncStatus: () => syncManager.getSyncStatus(),
    getSyncStats: () => syncManager.getSyncStats(),
    addOperation: (op: 'CREATE' | 'UPDATE' | 'DELETE', table: string, id: string, data?: any) =>
      syncManager.addOperation(op, table, id, data)
  };
};

// Initialize sync manager when module loads
syncManager.initialize().catch(console.error);