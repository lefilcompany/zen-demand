import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "demand" | "team" | "member";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export function useGlobalSearch(query: string, teamIds: string[]) {
  return useQuery({
    queryKey: ["global-search", query, teamIds],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];
      
      const results: SearchResult[] = [];
      const searchTerm = `%${query}%`;
      
      // Search demands
      const { data: demands } = await supabase
        .from("demands")
        .select("id, title, teams(name)")
        .in("team_id", teamIds)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5);
      
      if (demands) {
        results.push(
          ...demands.map((d) => ({
            type: "demand" as const,
            id: d.id,
            title: d.title,
            subtitle: (d.teams as any)?.name,
            link: `/demands/${d.id}`,
          }))
        );
      }
      
      // Search teams
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, description")
        .in("id", teamIds)
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(3);
      
      if (teams) {
        results.push(
          ...teams.map((t) => ({
            type: "team" as const,
            id: t.id,
            title: t.name,
            subtitle: t.description || undefined,
            link: `/teams/${t.id}`,
          }))
        );
      }
      
      // Search members
      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", searchTerm)
        .limit(3);
      
      if (members) {
        results.push(
          ...members.map((m) => ({
            type: "member" as const,
            id: m.id,
            title: m.full_name,
            link: `/user/${m.id}`,
          }))
        );
      }
      
      return results;
    },
    enabled: query.length >= 2 && teamIds.length > 0,
    staleTime: 1000,
  });
}
