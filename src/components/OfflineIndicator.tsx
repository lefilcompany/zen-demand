import { WifiOff, Cloud, RefreshCw } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSyncQueueCount } from '@/lib/offlineStorage';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOffline, isOnline } = useOfflineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { syncNow } = useSyncManager();

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

  if (!isOffline && !showOnlineToast && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300',
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : showOnlineToast
          ? 'bg-green-500 text-white'
          : 'bg-primary text-primary-foreground'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Modo offline - Visualizando dados em cache</span>
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {t('sync.pending', { count: pendingCount })}
            </span>
          )}
        </>
      ) : showOnlineToast ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>Conexão restaurada</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{t('sync.syncing')}</span>
        </>
      ) : null}
    </div>
  );
}
