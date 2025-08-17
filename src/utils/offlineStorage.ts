// IndexedDB utilities for offline storage
const DB_NAME = 'ChatterFixCMMS';
const DB_VERSION = 1;

// Store names
const STORES = {
  WORK_ORDERS: 'workOrders',
  PM_TASKS: 'pmTasks',
  PM_SCHEDULE: 'pmSchedule',
  COST_ENTRIES: 'costEntries',
  METER_READINGS: 'meterReadings',
  PENDING_SYNC: 'pendingSync'
};

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!database.objectStoreNames.contains(STORES.WORK_ORDERS)) {
        const workOrderStore = database.createObjectStore(STORES.WORK_ORDERS, { keyPath: 'id' });
        workOrderStore.createIndex('status', 'status', { unique: false });
        workOrderStore.createIndex('assignedTo', 'assignedTo', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PM_TASKS)) {
        const pmTaskStore = database.createObjectStore(STORES.PM_TASKS, { keyPath: 'id' });
        pmTaskStore.createIndex('assetId', 'assetId', { unique: false });
        pmTaskStore.createIndex('status', 'status', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PM_SCHEDULE)) {
        const pmScheduleStore = database.createObjectStore(STORES.PM_SCHEDULE, { keyPath: 'id' });
        pmScheduleStore.createIndex('pmTaskId', 'pmTaskId', { unique: false });
        pmScheduleStore.createIndex('status', 'status', { unique: false });
        pmScheduleStore.createIndex('dueDate', 'dueDate', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.COST_ENTRIES)) {
        const costEntryStore = database.createObjectStore(STORES.COST_ENTRIES, { keyPath: 'id' });
        costEntryStore.createIndex('workOrderId', 'workOrderId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.METER_READINGS)) {
        const meterReadingStore = database.createObjectStore(STORES.METER_READINGS, { keyPath: 'id' });
        meterReadingStore.createIndex('assetId', 'assetId', { unique: false });
        meterReadingStore.createIndex('meterType', 'meterType', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        const pendingSyncStore = database.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
        pendingSyncStore.createIndex('type', 'type', { unique: false });
        pendingSyncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      console.log('IndexedDB object stores created');
    };
  });
}

// Generic storage operations
export async function storeData<T>(storeName: string, data: T & { id: string }): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getData<T>(storeName: string, id: string): Promise<T | null> {
  const database = await initDB();
  const transaction = database.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllData<T>(storeName: string): Promise<T[]> {
  const database = await initDB();
  const transaction = database.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteData(storeName: string, id: string): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Specific data operations
export const workOrderStorage = {
  store: (workOrder: any) => storeData(STORES.WORK_ORDERS, workOrder),
  get: (id: string) => getData(STORES.WORK_ORDERS, id),
  getAll: () => getAllData(STORES.WORK_ORDERS),
  delete: (id: string) => deleteData(STORES.WORK_ORDERS, id),
};

export const pmTaskStorage = {
  store: (task: any) => storeData(STORES.PM_TASKS, task),
  get: (id: string) => getData(STORES.PM_TASKS, id),
  getAll: () => getAllData(STORES.PM_TASKS),
  delete: (id: string) => deleteData(STORES.PM_TASKS, id),
};

export const pmScheduleStorage = {
  store: (entry: any) => storeData(STORES.PM_SCHEDULE, entry),
  get: (id: string) => getData(STORES.PM_SCHEDULE, id),
  getAll: () => getAllData(STORES.PM_SCHEDULE),
  delete: (id: string) => deleteData(STORES.PM_SCHEDULE, id),
};

export const costEntryStorage = {
  store: (entry: any) => storeData(STORES.COST_ENTRIES, entry),
  get: (id: string) => getData(STORES.COST_ENTRIES, id),
  getAll: () => getAllData(STORES.COST_ENTRIES),
  delete: (id: string) => deleteData(STORES.COST_ENTRIES, id),
};

// Pending sync operations
interface PendingSyncItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  storeName: string;
  data: any;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  createdAt: Date;
}

export async function addPendingSync(item: Omit<PendingSyncItem, 'id' | 'createdAt'>): Promise<void> {
  const syncItem: PendingSyncItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  };
  
  await storeData(STORES.PENDING_SYNC, syncItem);
  
  // Try to sync if online
  if (navigator.onLine) {
    syncPendingItems();
  }
}

export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  return getAllData<PendingSyncItem>(STORES.PENDING_SYNC);
}

export async function removePendingSyncItem(id: string): Promise<void> {
  await deleteData(STORES.PENDING_SYNC, id);
}

// Background sync
export async function syncPendingItems(): Promise<void> {
  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync');
    return;
  }

  const pendingItems = await getPendingSyncItems();
  console.log(`Syncing ${pendingItems.length} pending items`);

  for (const item of pendingItems) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE || '/api'}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.method !== 'DELETE' ? JSON.stringify(item.data) : undefined,
      });

      if (response.ok) {
        // Remove from pending sync
        await removePendingSyncItem(item.id);
        console.log(`Successfully synced ${item.type} for ${item.storeName}`);
      } else {
        console.error(`Failed to sync ${item.type} for ${item.storeName}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error syncing ${item.type} for ${item.storeName}:`, error);
    }
  }
}

// Network status handling
export function setupNetworkHandlers(): void {
  window.addEventListener('online', () => {
    console.log('Device came online, syncing pending items...');
    syncPendingItems();
  });

  window.addEventListener('offline', () => {
    console.log('Device went offline, enabling offline mode');
  });
}

// Cache management
export async function cacheAPIResponse(endpoint: string, data: any): Promise<void> {
  try {
    const cache = await caches.open('api-cache');
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(endpoint, response);
  } catch (error) {
    console.error('Failed to cache API response:', error);
  }
}

export async function getCachedAPIResponse(endpoint: string): Promise<any | null> {
  try {
    const cache = await caches.open('api-cache');
    const response = await cache.match(endpoint);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get cached API response:', error);
  }
  return null;
}

// Initialize offline capabilities
export function initOfflineCapabilities(): void {
  initDB();
  setupNetworkHandlers();
  
  // Sync on page load if online
  if (navigator.onLine) {
    syncPendingItems();
  }
  
  console.log('Offline capabilities initialized');
}