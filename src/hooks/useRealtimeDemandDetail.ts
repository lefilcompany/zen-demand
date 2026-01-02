import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useRealtimeDemandDetail(demandId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
}
