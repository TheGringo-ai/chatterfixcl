/**
 * ChatterFix CMMS Service Worker
 * Optimized for offline-first PWA with background sync
 * Phase 2: PWA registration + background sync
 */

const CACHE_NAME = 'chatterfix-cmms-v2.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const API_CACHE = `${CACHE_NAME}-api`;
const SYNC_TAG = 'sync-chatterfix';

// Cache-first assets (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Network-first API endpoints
const API_ENDPOINTS = [
  '/api/health',
  '/api/work-orders',
  '/api/preventive-maintenance',
  '/api/sync',
  '/api/costs'
];

// =============================================================================
// INSTALL & ACTIVATE
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing ChatterFix CMMS v2.0.0');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ChatterFix CMMS');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('chatterfix-cmms-') && cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// =============================================================================
// FETCH STRATEGY
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Strategy 1: Cache-first for static assets
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Strategy 2: Network-with-background-fallback for API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkWithBackgroundFallback(request));
    return;
  }
  
  // Strategy 3: Stale-while-revalidate for other resources
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// =============================================================================
// CACHING STRATEGIES
// =============================================================================

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkWithBackgroundFallback(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Try cache fallback
    const cache = await caches.open(API_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // If POST/PUT/DELETE failed, store for background sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeFailedRequest(request);
      
      // Return optimistic response
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Saved for sync when online'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always try to fetch fresh version in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise || new Response('Offline', { status: 503 });
}

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingRequests());
  }
});

async function storeFailedRequest(request) {
  try {
    const body = await request.clone().text();
    const failedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for sync
    const db = await openSyncDB();
    const tx = db.transaction(['pending_requests'], 'readwrite');
    const store = tx.objectStore('pending_requests');
    await store.add(failedRequest);
    
    console.log('[SW] Stored failed request for sync:', failedRequest.id);
    
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register(SYNC_TAG);
    }
    
  } catch (error) {
    console.error('[SW] Failed to store request for sync:', error);
  }
}

async function syncPendingRequests() {
  try {
    console.log('[SW] Starting background sync...');
    
    const db = await openSyncDB();
    const tx = db.transaction(['pending_requests'], 'readonly');
    const store = tx.objectStore('pending_requests');
    const requests = await store.getAll();
    
    console.log(`[SW] Found ${requests.length} pending requests`);
    
    for (const pendingRequest of requests) {
      try {
        // Reconstruct and retry the request
        const response = await fetch(pendingRequest.url, {
          method: pendingRequest.method,
          headers: pendingRequest.headers,
          body: pendingRequest.body
        });
        
        if (response.ok) {
          // Remove from pending queue
          const deleteTx = db.transaction(['pending_requests'], 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_requests');
          await deleteStore.delete(pendingRequest.id);
          
          console.log('[SW] Sync successful for:', pendingRequest.id);
          
          // Notify clients
          await notifyClients('sync_success', {
            requestId: pendingRequest.id,
            url: pendingRequest.url,
            method: pendingRequest.method
          });
        } else {
          console.warn('[SW] Sync failed for:', pendingRequest.id, response.status);
        }
        
      } catch (error) {
        console.error('[SW] Sync error for:', pendingRequest.id, error);
      }
    }
    
    console.log('[SW] Background sync completed');
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'You have new maintenance notifications',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('[SW] Invalid push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('ChatterFix CMMS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/#/notifications')
    );
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatterFixSync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_requests')) {
        const store = db.createObjectStore('pending_requests', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function notifyClients(type, data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  
  for (const client of clients) {
    client.postMessage({
      type,
      data,
      timestamp: Date.now()
    });
  }
}

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SYNC_NOW':
      event.waitUntil(syncPendingRequests());
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(cacheNames => 
          Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
        )
      );
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(
        getCacheStatus().then(status => 
          event.ports[0].postMessage(status)
        )
      );
      break;
  }
});

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

console.log('[SW] ChatterFix CMMS Service Worker loaded');