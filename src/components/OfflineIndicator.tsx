import { WifiOff, Cloud } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOffline, isOnline } = useOfflineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

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

  if (!isOffline && !showOnlineToast) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300',
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-green-500 text-white'
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Modo offline - Visualizando dados em cache</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          <span>Conexão restaurada</span>
        </>
      )}
    </div>
  );
}
