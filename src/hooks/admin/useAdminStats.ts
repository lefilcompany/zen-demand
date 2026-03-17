import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [teamsRes, profilesRes, subsRes, couponsRes] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("trial_coupons" as any).select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      return {
        totalTeams: teamsRes.count ?? 0,
        totalUsers: profilesRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
        activeCoupons: couponsRes.count ?? 0,
      };
    },
  });
}
