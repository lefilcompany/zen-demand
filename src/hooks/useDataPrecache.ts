import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  saveDemands,
  saveDemandStatuses,
  saveTeams,
  saveBoards,
  saveProfiles,
  saveServices,
  getLastCacheUpdate,
} from "@/lib/offlineStorage";
import { useSyncManager } from "@/hooks/useSyncManager";

const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes when online

export function useDataPrecache() {
  const { user } = useAuth();
  const [isPrecaching, setIsPrecaching] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { syncNow } = useSyncManager();
  const isRefreshingRef = useRef(false);

  const precacheUserData = useCallback(async (forceRefresh = false) => {
    if (!user || !navigator.onLine) return;
    if (isRefreshingRef.current && !forceRefresh) return;

    isRefreshingRef.current = true;
    setIsPrecaching(true);
    setError(null);

    try {
      // First sync any pending offline changes
      await syncNow();

      // Fetch all data in parallel for faster updates
      const [
        statusesResult,
        teamsResult,
        boardsResult,
        demandsResult,
        servicesResult,
        profilesResult,
      ] = await Promise.all([
        supabase.from('demand_statuses').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('boards').select('*'),
        supabase
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
          .limit(500),
        supabase.from('services').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      // Save all data to IndexedDB
      const savePromises: Promise<void>[] = [];

      if (statusesResult.data) {
        savePromises.push(saveDemandStatuses(statusesResult.data));
      }
      if (teamsResult.data) {
        savePromises.push(saveTeams(teamsResult.data));
      }
      if (boardsResult.data) {
        savePromises.push(saveBoards(boardsResult.data));
      }
      if (demandsResult.data) {
        savePromises.push(saveDemands(demandsResult.data));
      }
      if (servicesResult.data) {
        savePromises.push(saveServices(servicesResult.data));
      }
      if (profilesResult.data) {
        savePromises.push(saveProfiles(profilesResult.data));
      }

      await Promise.all(savePromises);

      const now = new Date();
      setLastUpdate(now);

      console.log('Data precache completed successfully at', now.toISOString());
    } catch (err) {
      console.error('Failed to precache data:', err);
      setError('Falha ao carregar dados offline');
    } finally {
      setIsPrecaching(false);
      isRefreshingRef.current = false;
    }
  }, [user, syncNow]);

  // Initial precache on mount
  useEffect(() => {
    if (user) {
      precacheUserData(true);
    }
  }, [user, precacheUserData]);

  // Periodic refresh when online (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        precacheUserData();
      }
    }, CACHE_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, precacheUserData]);

  // Refresh immediately when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored, refreshing data...');
      precacheUserData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [precacheUserData]);

  // Listen for visibility changes to refresh when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && user) {
        // Check if last update was more than 2 minutes ago
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        if (!lastUpdate || lastUpdate.getTime() < twoMinutesAgo) {
          precacheUserData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, lastUpdate, precacheUserData]);

  // Listen for focus to refresh data
  useEffect(() => {
    const handleFocus = () => {
      if (navigator.onLine && user) {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        if (!lastUpdate || lastUpdate.getTime() < oneMinuteAgo) {
          precacheUserData();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, lastUpdate, precacheUserData]);

  return {
    isPrecaching,
    lastUpdate,
    error,
    refresh: () => precacheUserData(true),
  };
}
