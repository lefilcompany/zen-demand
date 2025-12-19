import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedTeam } from "@/contexts/TeamContext";

export function useTimerControl() {
  const queryClient = useQueryClient();
  const { selectedTeamId } = useSelectedTeam();

  const startTimer = useMutation({
    mutationFn: async (demandId: string) => {
      // First, find any demand with an active timer in the same team
      if (selectedTeamId) {
        const { data: runningDemands, error: fetchError } = await supabase
          .from("demands")
          .select("id, last_started_at, time_in_progress_seconds")
          .eq("team_id", selectedTeamId)
          .not("last_started_at", "is", null)
          .neq("id", demandId);

        if (fetchError) throw fetchError;

        // Pause any running timer
        if (runningDemands && runningDemands.length > 0) {
          for (const running of runningDemands) {
            if (running.last_started_at) {
              const elapsedMs = Date.now() - new Date(running.last_started_at).getTime();
              const elapsedSeconds = Math.floor(elapsedMs / 1000);
              const newTotalSeconds = (running.time_in_progress_seconds || 0) + elapsedSeconds;

              const { error: pauseError } = await supabase
                .from("demands")
                .update({
                  last_started_at: null,
                  time_in_progress_seconds: newTotalSeconds,
                })
                .eq("id", running.id);

              if (pauseError) throw pauseError;
            }
          }
        }
      }

      // Now start the timer for the requested demand
      const { error } = await supabase
        .from("demands")
        .update({ last_started_at: new Date().toISOString() })
        .eq("id", demandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
    onError: () => {
      toast.error("Erro ao iniciar o timer");
    },
  });

  const pauseTimer = useMutation({
    mutationFn: async ({ demandId, lastStartedAt, currentSeconds }: { 
      demandId: string; 
      lastStartedAt: string; 
      currentSeconds: number;
    }) => {
      // Calculate elapsed time since last_started_at
      const elapsedMs = Date.now() - new Date(lastStartedAt).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newTotalSeconds = currentSeconds + elapsedSeconds;

      const { error } = await supabase
        .from("demands")
        .update({ 
          last_started_at: null,
          time_in_progress_seconds: newTotalSeconds 
        })
        .eq("id", demandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
    onError: () => {
      toast.error("Erro ao pausar o timer");
    },
  });

  return {
    startTimer,
    pauseTimer,
    isLoading: startTimer.isPending || pauseTimer.isPending,
  };
}
