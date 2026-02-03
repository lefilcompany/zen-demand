import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { differenceInDays, isPast, parseISO } from "date-fns";

export interface TrialStatus {
  isLoading: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
}

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-trial", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("trial_ends_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const trialEndsAt = profile?.trial_ends_at ? parseISO(profile.trial_ends_at) : null;
  const isTrialExpired = trialEndsAt ? isPast(trialEndsAt) : false;
  const isTrialActive = trialEndsAt ? !isPast(trialEndsAt) : true;
  const daysRemaining = trialEndsAt ? Math.max(0, differenceInDays(trialEndsAt, new Date())) : 0;

  return {
    isLoading,
    isTrialActive,
    isTrialExpired,
    trialEndsAt,
    daysRemaining,
  };
}
