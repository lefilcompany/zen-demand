import { useState, useEffect } from 'react';
import { onOnlineStatusChange, isOnline } from '@/lib/offlineStorage';

export function useOfflineStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(setOnline);
    return unsubscribe;
  }, []);

  return { isOnline: online, isOffline: !online };
}
