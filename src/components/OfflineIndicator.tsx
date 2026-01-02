import { WifiOff, Cloud, RefreshCw, Database, CheckCircle2, AlertCircle } from 'lucide-react';
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

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300',
        showOffline
          ? 'bg-destructive text-destructive-foreground'
          : showOnline || showCacheReady
          ? 'bg-green-600 text-white'
          : showCacheError
          ? 'bg-amber-500 text-white'
          : 'bg-primary text-primary-foreground'
      )}
    >
      {showOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>{t('offline.viewingCache')}</span>
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {t('sync.pending', { count: pendingCount })}
            </span>
          )}
        </>
      ) : showOnline ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>{t('offline.connectionRestored')}</span>
        </>
      ) : showPrecaching ? (
        <>
          <Database className="h-4 w-4 animate-pulse" />
          <span>{t('cache.precaching')}</span>
        </>
      ) : showSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{t('sync.syncing')}</span>
        </>
      ) : showCacheReady ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>{t('cache.ready')}</span>
          <span className="text-xs opacity-80">({formatLastUpdate()})</span>
        </>
      ) : showCacheError ? (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>{t('cache.error')}</span>
        </>
      ) : null}
    </div>
  );
}
