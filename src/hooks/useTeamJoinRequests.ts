import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Extended TeamRole to include executor (added via migration)
export type ExtendedTeamRole = "admin" | "moderator" | "requester" | "executor";

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  message: string | null;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  teams?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface TeamPreview {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// Get team by access code (bypasses RLS)
export function useTeamByAccessCode(accessCode: string) {
  return useQuery({
    queryKey: ["team-by-access-code", accessCode],
    queryFn: async () => {
      if (!accessCode || accessCode.length !== 6) return null;

      const { data, error } = await supabase
        .rpc("get_team_by_access_code", { code: accessCode.toUpperCase() });

      if (error) throw error;
      return (data?.[0] as TeamPreview) || null;
    },
    enabled: accessCode.length === 6,
  });
}

// Create a join request
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamId, message }: { teamId: string; message?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("team_join_requests")
        .insert({
          team_id: teamId,
          user_id: user.id,
          message: message || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-join-requests"] });
    },
  });
}

// Get user's own join requests
export function useMyJoinRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-join-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("team_join_requests")
        .select(`
          *,
          teams (id, name, description)
        `)
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as TeamJoinRequest[];
    },
    enabled: !!user,
  });
}

// Get pending requests for a team (admin only)
export function useTeamJoinRequests(teamId: string | null) {
  return useQuery({
    queryKey: ["team-join-requests", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      // First get the requests
      const { data: requests, error } = await supabase
        .from("team_join_requests")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("requested_at", { ascending: true });

      if (error) throw error;

      // Then get profiles for each request
      if (requests && requests.length > 0) {
        const userIds = requests.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        return requests.map((r) => ({
          ...r,
          profiles: profileMap.get(r.user_id) || null,
        })) as TeamJoinRequest[];
      }

      return [] as TeamJoinRequest[];
    },
    enabled: !!teamId,
  });
}

// Count pending requests for badge
export function usePendingRequestsCount(teamId: string | null) {
  return useQuery({
    queryKey: ["pending-requests-count", teamId],
    queryFn: async () => {
      if (!teamId) return 0;

      const { count, error } = await supabase
        .from("team_join_requests")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!teamId,
  });
}

// Approve or reject a request
export function useRespondToRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      teamId,
      userId,
      status,
      role,
    }: {
      requestId: string;
      teamId: string;
      userId: string;
      status: "approved" | "rejected";
      role?: ExtendedTeamRole;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Update the request status
      const { error: updateError } = await supabase
        .from("team_join_requests")
        .update({
          status,
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, add user to team
      if (status === "approved" && role) {
        const { error: memberError } = await supabase
          .from("team_members")
          .insert({
            team_id: teamId,
            user_id: userId,
            role,
          });

        if (memberError) throw memberError;
      }

      return { status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-join-requests", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["pending-requests-count", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

// Check if user already has a pending request for a team
export function useExistingRequest(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["existing-request", teamId, user?.id],
    queryFn: async () => {
      if (!user || !teamId) return null;

      const { data, error } = await supabase
        .from("team_join_requests")
        .select("*")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as TeamJoinRequest | null;
    },
    enabled: !!user && !!teamId,
  });
}
