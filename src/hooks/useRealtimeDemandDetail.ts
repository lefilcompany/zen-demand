import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface RealtimeUpdate {
  type: "demand" | "interaction" | "assignee" | "subtask";
  eventType: string;
  timestamp: Date;
}

export function useRealtimeDemandDetail(demandId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);

  const clearUpdateIndicator = useCallback(() => {
    setShowUpdateIndicator(false);
    setLastUpdate(null);
  }, []);

  useEffect(() => {
    if (!user || !demandId) return;

    console.log('Setting up realtime subscription for demand:', demandId);

    const channel = supabase
      .channel(`demand-detail-${demandId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demands',
          filter: `id=eq.${demandId}`,
        },
        (payload) => {
          console.log('Realtime demand detail change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["demand", demandId] });
          setLastUpdate({ type: "demand", eventType: payload.eventType, timestamp: new Date() });
          setShowUpdateIndicator(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demand_interactions',
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          console.log('Realtime interaction change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["demand-interactions", demandId] });
          setLastUpdate({ type: "interaction", eventType: payload.eventType, timestamp: new Date() });
          setShowUpdateIndicator(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demand_assignees',
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          console.log('Realtime assignee change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["demand-assignees", demandId] });
          setLastUpdate({ type: "assignee", eventType: payload.eventType, timestamp: new Date() });
          setShowUpdateIndicator(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demand_subtasks',
          filter: `demand_id=eq.${demandId}`,
        },
        (payload) => {
          console.log('Realtime subtask change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["demand-subtasks", demandId] });
          setLastUpdate({ type: "subtask", eventType: payload.eventType, timestamp: new Date() });
          setShowUpdateIndicator(true);
        }
      )
      .subscribe((status) => {
        console.log('Demand detail realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription for demand:', demandId);
      supabase.removeChannel(channel);
    };
  }, [user, demandId, queryClient]);

  // Auto-hide indicator after 5 seconds
  useEffect(() => {
    if (showUpdateIndicator) {
      const timer = setTimeout(() => {
        setShowUpdateIndicator(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUpdateIndicator]);

  return { lastUpdate, showUpdateIndicator, clearUpdateIndicator };
}
