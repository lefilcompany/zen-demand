import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  saveDemands,
  saveDemandStatuses,
  saveTeams,
  saveBoards,
  saveProfiles,
  saveServices,
  isCacheStale,
  getLastCacheUpdate,
} from "@/lib/offlineStorage";

const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

export function useDataPrecache() {
  const { user } = useAuth();
  const [isPrecaching, setIsPrecaching] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const precacheUserData = useCallback(async () => {
    if (!user || !navigator.onLine) return;

    setIsPrecaching(true);
    setError(null);

    try {
      // Check if cache is stale
      const teamsStale = await isCacheStale('teams', CACHE_MAX_AGE);
      const boardsStale = await isCacheStale('boards', CACHE_MAX_AGE);
      const demandsStale = await isCacheStale('demands', CACHE_MAX_AGE);

      // Only fetch if cache is stale
      const fetchPromises: Promise<void>[] = [];

      // Always fetch statuses (small data)
      fetchPromises.push(
        (async () => {
          const { data } = await supabase.from('demand_statuses').select('*');
          if (data) await saveDemandStatuses(data);
        })()
      );

      // Fetch teams
      if (teamsStale) {
        fetchPromises.push(
          (async () => {
            const { data } = await supabase.from('teams').select('*');
            if (data) await saveTeams(data);
          })()
        );
      }

      // Fetch boards
      if (boardsStale) {
        fetchPromises.push(
          (async () => {
            const { data } = await supabase.from('boards').select('*');
            if (data) await saveBoards(data);
          })()
        );
      }

      // Fetch demands (limited to active/recent)
      if (demandsStale) {
        fetchPromises.push(
          (async () => {
            const { data } = await supabase
              .from('demands')
              .select(`
                *,
                status:demand_statuses(*),
                service:services(*),
                creator:profiles!demands_created_by_fkey(*),
                assignee:profiles!demands_assigned_to_fkey(*)
              `)
              .eq('archived', false)
              .order('updated_at', { ascending: false })
              .limit(200);
            if (data) await saveDemands(data);
          })()
        );
      }

      // Fetch services
      fetchPromises.push(
        (async () => {
          const { data } = await supabase.from('services').select('*');
          if (data) await saveServices(data);
        })()
      );

      // Fetch profiles of team members
      fetchPromises.push(
        (async () => {
          const { data } = await supabase.from('profiles').select('*');
          if (data) await saveProfiles(data);
        })()
      );

      await Promise.all(fetchPromises);

      const lastCacheUpdate = await getLastCacheUpdate();
      setLastUpdate(lastCacheUpdate);

      console.log('Data precache completed successfully');
    } catch (err) {
      console.error('Failed to precache data:', err);
      setError('Falha ao carregar dados offline');
    } finally {
      setIsPrecaching(false);
    }
  }, [user]);

  // Initial precache on mount
  useEffect(() => {
    if (user) {
      precacheUserData();
    }
  }, [user, precacheUserData]);

  // Periodic refresh every 30 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        precacheUserData();
      }
    }, CACHE_MAX_AGE);

    return () => clearInterval(interval);
  }, [user, precacheUserData]);

  // Refresh on coming back online
  useEffect(() => {
    const handleOnline = () => {
      precacheUserData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [precacheUserData]);

  return {
    isPrecaching,
    lastUpdate,
    error,
    refresh: precacheUserData,
  };
}
