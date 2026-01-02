import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useRealtimeDemands(boardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !boardId) return;

    console.log('Setting up realtime subscription for demands in board:', boardId);

    const channel = supabase
      .channel(`demands-board-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demands',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log('Realtime demand change:', payload.eventType, payload);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["demands", boardId] });
          
          // If it's a specific demand update, also invalidate that query
          if (payload.new && (payload.new as any).id) {
            queryClient.invalidateQueries({ 
              queryKey: ["demand", (payload.new as any).id] 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Demands realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription for board:', boardId);
      supabase.removeChannel(channel);
    };
  }, [user, boardId, queryClient]);
}

export function useRealtimeAllDemands() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for all demands');

    const channel = supabase
      .channel('demands-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demands',
        },
        (payload) => {
          console.log('Realtime demand change (all):', payload.eventType);
          
          // Invalidate all demands queries
          queryClient.invalidateQueries({ queryKey: ["demands"] });
          
          // If it's a specific demand, invalidate that too
          if (payload.new && (payload.new as any).id) {
            queryClient.invalidateQueries({ 
              queryKey: ["demand", (payload.new as any).id] 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('All demands realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
