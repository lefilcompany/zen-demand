const DB_NAME = 'soma-offline-db';
const DB_VERSION = 1;

interface OfflineStore {
  demands: 'demands';
  demandStatuses: 'demandStatuses';
  syncQueue: 'syncQueue';
}

const STORES: OfflineStore = {
  demands: 'demands',
  demandStatuses: 'demandStatuses',
  syncQueue: 'syncQueue',
};

let dbInstance: IDBDatabase | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for demands
      if (!db.objectStoreNames.contains(STORES.demands)) {
        const demandsStore = db.createObjectStore(STORES.demands, { keyPath: 'id' });
        demandsStore.createIndex('board_id', 'board_id', { unique: false });
        demandsStore.createIndex('team_id', 'team_id', { unique: false });
      }

      // Store for demand statuses
      if (!db.objectStoreNames.contains(STORES.demandStatuses)) {
        db.createObjectStore(STORES.demandStatuses, { keyPath: 'id' });
      }

      // Store for sync queue (pending operations when offline)
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Generic save function
export const saveToStore = async <T>(storeName: string, data: T[]): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear existing data and add new
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const item of data) {
      store.put(item);
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error(`Failed to save to ${storeName}:`, error);
  }
};

// Generic get all function
export const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to get from ${storeName}:`, error);
    return [];
  }
};

// Get by index
export const getByIndex = async <T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to get by index from ${storeName}:`, error);
    return [];
  }
};

// Get single item
export const getFromStore = async <T>(storeName: string, id: string): Promise<T | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T | null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to get item from ${storeName}:`, error);
    return null;
  }
};

// Specific functions for demands
export const saveDemands = async (demands: unknown[]): Promise<void> => {
  await saveToStore(STORES.demands, demands);
};

export const getCachedDemands = async (): Promise<unknown[]> => {
  return getAllFromStore(STORES.demands);
};

export const getCachedDemandsByBoard = async (boardId: string): Promise<unknown[]> => {
  return getByIndex(STORES.demands, 'board_id', boardId);
};

export const getCachedDemand = async (id: string): Promise<unknown | null> => {
  return getFromStore(STORES.demands, id);
};

// Update a single cached demand (for offline status changes)
export const updateCachedDemand = async (
  demandId: string,
  updates: Record<string, unknown>
): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.demands, 'readwrite');
    const store = transaction.objectStore(STORES.demands);

    const existingDemand = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
      const request = store.get(demandId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (existingDemand) {
      const updatedDemand = { ...existingDemand, ...updates };
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updatedDemand);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log('Updated cached demand:', demandId);
    }
  } catch (error) {
    console.error('Failed to update cached demand:', error);
  }
};

// Specific functions for statuses
export const saveDemandStatuses = async (statuses: unknown[]): Promise<void> => {
  await saveToStore(STORES.demandStatuses, statuses);
};

export const getCachedDemandStatuses = async (): Promise<unknown[]> => {
  return getAllFromStore(STORES.demandStatuses);
};

// Sync Queue types and functions
export interface SyncOperation {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// Add operation to sync queue
export const addToSyncQueue = async (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);

    const syncOp: Omit<SyncOperation, 'id'> = {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(syncOp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('Added to sync queue:', operation.type, operation.table);
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
  }
};

// Get all pending sync operations
export const getPendingSyncOperations = async (): Promise<SyncOperation[]> => {
  return getAllFromStore<SyncOperation>(STORES.syncQueue);
};

// Remove operation from sync queue
export const removeSyncOperation = async (id: number): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to remove sync operation:', error);
  }
};

// Update retry count for failed operation
export const updateSyncOperationRetry = async (id: number, retryCount: number): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);

    const operation = await new Promise<SyncOperation | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (operation) {
      operation.retryCount = retryCount;
      await new Promise<void>((resolve, reject) => {
        const request = store.put(operation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    console.error('Failed to update sync operation:', error);
  }
};

// Clear all sync operations
export const clearSyncQueue = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.syncQueue, 'readwrite');
    const store = transaction.objectStore(STORES.syncQueue);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
  }
};

// Get sync queue count
export const getSyncQueueCount = async (): Promise<number> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORES.syncQueue, 'readonly');
    const store = transaction.objectStore(STORES.syncQueue);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get sync queue count:', error);
    return 0;
  }
};

// Check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Listen for online/offline events
export const onOnlineStatusChange = (callback: (online: boolean) => void): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
