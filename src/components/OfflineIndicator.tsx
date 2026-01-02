import { WifiOff, Cloud } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSyncQueueCount } from '@/lib/offlineStorage';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOffline, isOnline } = useOfflineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, isOnline, wasOffline]);

  // Check for pending operations
  useEffect(() => {
    const checkPending = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Only show offline indicator or connection restored
  if (!isOffline && !showOnlineToast) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-xs font-medium transition-all duration-300 animate-fade-in',
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-green-600/90 text-white'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>{t('offline.viewingCache')}</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {t('sync.pending', { count: pendingCount })}
            </span>
          )}
        </>
      ) : showOnlineToast ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{t('offline.connectionRestored')}</span>
        </>
      ) : null}
    </div>
  );
}
