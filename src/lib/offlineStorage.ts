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

// Specific functions for statuses
export const saveDemandStatuses = async (statuses: unknown[]): Promise<void> => {
  await saveToStore(STORES.demandStatuses, statuses);
};

export const getCachedDemandStatuses = async (): Promise<unknown[]> => {
  return getAllFromStore(STORES.demandStatuses);
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
