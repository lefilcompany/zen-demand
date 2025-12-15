import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTimerControl() {
  const queryClient = useQueryClient();

  const startTimer = useMutation({
    mutationFn: async (demandId: string) => {
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
