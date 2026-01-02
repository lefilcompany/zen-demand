import { WifiOff, Cloud } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSyncQueueCount } from '@/lib/offlineStorage';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useTranslation } from 'react-i18next';
import { useDataPrecache } from '@/hooks/useDataPrecache';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

const localeMap = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es': es,
} as const;

export function OfflineIndicator() {
  const { t, i18n } = useTranslation();
  const { isOffline, isOnline } = useOfflineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { syncNow } = useSyncManager();
  const { isPrecaching, lastUpdate, error: cacheError } = useDataPrecache();
  const [showCacheStatus, setShowCacheStatus] = useState(false);

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

  // Show cache status briefly when precaching completes
  useEffect(() => {
    if (!isPrecaching && lastUpdate) {
      setShowCacheStatus(true);
      const timer = setTimeout(() => setShowCacheStatus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPrecaching, lastUpdate]);

  const locale = localeMap[i18n.language] || ptBR;

  const formatLastUpdate = () => {
    if (!lastUpdate) return null;
    return formatDistanceToNow(lastUpdate, { addSuffix: true, locale });
  };

  // Determine what to show
  const showOffline = isOffline;
  const showOnline = showOnlineToast;
  const showSyncing = !isOffline && pendingCount > 0;
  const showPrecaching = !isOffline && isPrecaching;
  const showCacheReady = !isOffline && showCacheStatus && !isPrecaching && lastUpdate;
  const showCacheError = !isOffline && cacheError;

  if (!showOffline && !showOnline && !showSyncing && !showPrecaching && !showCacheReady && !showCacheError) {
    return null;
  }

  // Only show offline indicator prominently, others are more discreet
  if (!showOffline && !showOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-xs font-medium transition-all duration-300 animate-fade-in',
        showOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-green-600/90 text-white'
      )}
    >
      {showOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>{t('offline.viewingCache')}</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {t('sync.pending', { count: pendingCount })}
            </span>
          )}
        </>
      ) : showOnline ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{t('offline.connectionRestored')}</span>
        </>
      ) : null}
    </div>
  );
}
