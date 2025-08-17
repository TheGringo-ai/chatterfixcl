const CACHE_NAME = 'chatterfix-cmms-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets
];

// URLs that should always be fetched from network
const NETWORK_FIRST_URLS = [
  '/api/',
  '/health'
];

// URLs that can be served from cache first
const CACHE_FIRST_URLS = [
  '/static/',
  '/images/',
  '/icons/'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Network first strategy for API calls
  if (NETWORK_FIRST_URLS.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache first strategy for static assets
  if (CACHE_FIRST_URLS.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stale while revalidate for everything else
  event.respondWith(staleWhileRevalidate(request));
});

// Network first strategy - try network, fallback to cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Cache first strategy - try cache, fallback to network
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url);
    throw error;
  }
}

// Stale while revalidate - serve from cache, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh content in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, that's okay for this strategy
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-work-orders') {
    event.waitUntil(syncWorkOrders());
  } else if (event.tag === 'sync-pm-tasks') {
    event.waitUntil(syncPMTasks());
  }
});

async function syncWorkOrders() {
  console.log('[SW] Syncing work orders');
  try {
    // Get pending work orders from IndexedDB
    const pendingWorkOrders = await getPendingWorkOrders();
    
    for (const workOrder of pendingWorkOrders) {
      try {
        await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workOrder)
        });
        
        // Remove from pending queue
        await removePendingWorkOrder(workOrder.id);
      } catch (error) {
        console.log('[SW] Failed to sync work order:', workOrder.id);
      }
    }
  } catch (error) {
    console.log('[SW] Sync work orders failed:', error);
  }
}

async function syncPMTasks() {
  console.log('[SW] Syncing PM tasks');
  try {
    const pendingTasks = await getPendingPMTasks();
    
    for (const task of pendingTasks) {
      try {
        await fetch('/api/preventive-maintenance/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
        
        await removePendingPMTask(task.id);
      } catch (error) {
        console.log('[SW] Failed to sync PM task:', task.id);
      }
    }
  } catch (error) {
    console.log('[SW] Sync PM tasks failed:', error);
  }
}

// Push notifications for PM reminders
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'You have maintenance tasks due',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Tasks',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ChatterFix PM Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?tab=preventive-maintenance')
    );
  }
});

// Helper functions for IndexedDB operations
async function getPendingWorkOrders() {
  // Implement IndexedDB operations
  return [];
}

async function removePendingWorkOrder(id) {
  // Implement IndexedDB operations
}

async function getPendingPMTasks() {
  // Implement IndexedDB operations
  return [];
}

async function removePendingPMTask(id) {
  // Implement IndexedDB operations
}