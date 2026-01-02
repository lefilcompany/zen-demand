import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface KanbanMoveNotification {
  demandId: string;
  demandTitle: string;
  fromStatus: string;
  toStatus: string;
  movedBy: string;
  timestamp: Date;
}

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

export function useKanbanRealtimeNotifications(boardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<KanbanMoveNotification[]>([]);

  const clearNotification = useCallback((demandId: string) => {
    setNotifications(prev => prev.filter(n => n.demandId !== demandId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!user || !boardId) return;

    console.log('Setting up Kanban realtime notifications for board:', boardId);

    const channel = supabase
      .channel(`kanban-notifications-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'demands',
          filter: `board_id=eq.${boardId}`,
        },
        async (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          // Only notify if status changed and it wasn't the current user
          if (oldData.status_id !== newData.status_id) {
            // Check if the update was made by someone else
            // We can't get the user who made the update directly, so we'll show all status changes
            // and let the UI filter out self-made changes if needed
            
            // Fetch status names and demand info
            const [oldStatusRes, newStatusRes, demandRes] = await Promise.all([
              supabase.from('demand_statuses').select('name').eq('id', oldData.status_id).single(),
              supabase.from('demand_statuses').select('name').eq('id', newData.status_id).single(),
              supabase.from('demands').select('title, created_by').eq('id', newData.id).single()
            ]);

            if (oldStatusRes.data && newStatusRes.data && demandRes.data) {
              const notification: KanbanMoveNotification = {
                demandId: newData.id,
                demandTitle: demandRes.data.title,
                fromStatus: oldStatusRes.data.name,
                toStatus: newStatusRes.data.name,
                movedBy: demandRes.data.created_by || 'Usuário',
                timestamp: new Date()
              };

              setNotifications(prev => {
                // Remove duplicate for same demand if exists
                const filtered = prev.filter(n => n.demandId !== notification.demandId);
                return [...filtered, notification];
              });
            }
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["demands", boardId] });
        }
      )
      .subscribe((status) => {
        console.log('Kanban notifications subscription status:', status);
      });

    return () => {
      console.log('Cleaning up Kanban notifications for board:', boardId);
      supabase.removeChannel(channel);
    };
  }, [user, boardId, queryClient]);

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications(prev => {
        if (prev.length === 0) return prev;
        // Remove oldest notification
        return prev.slice(1);
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [notifications]);

  return {
    notifications,
    clearNotification,
    clearAllNotifications,
    hasNotifications: notifications.length > 0
  };
}
