import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "demand" | "team" | "member";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  avatarUrl?: string;
}

export function useGlobalSearch(query: string, teamIds: string[]) {
  return useQuery({
    queryKey: ["global-search", query, teamIds],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];
      
      const results: SearchResult[] = [];
      const searchTerm = `%${query}%`;
      
      // Check if query looks like a demand code (e.g., "EQUIPE-123" or just "123")
      const codeMatch = query.match(/^(?:([A-Za-z]+)-)?(\d+)$/);
      const sequenceNumber = codeMatch ? parseInt(codeMatch[2], 10) : null;
      
      // Search demands by title, description, or sequence number
      let demandsQuery = supabase
        .from("demands")
        .select("id, title, board_sequence_number, boards(name), teams(name)")
        .in("team_id", teamIds);
      
      if (sequenceNumber !== null) {
        // Search by sequence number OR title/description
        demandsQuery = demandsQuery.or(`board_sequence_number.eq.${sequenceNumber},title.ilike.${searchTerm},description.ilike.${searchTerm}`);
      } else {
        demandsQuery = demandsQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
      }
      
      const { data: demands } = await demandsQuery.limit(8);
      
      if (demands) {
        results.push(
          ...demands.map((d) => {
            const boardName = (d.boards as any)?.name || "EQUIPE";
            const code = `${boardName}-${d.board_sequence_number}`;
            return {
              type: "demand" as const,
              id: d.id,
              title: d.title,
              subtitle: code,
              link: `/demands/${d.id}`,
            };
          })
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
        .select("id, full_name, avatar_url, job_title")
        .ilike("full_name", searchTerm)
        .limit(5);
      
      if (members) {
        results.push(
          ...members.map((m) => ({
            type: "member" as const,
            id: m.id,
            title: m.full_name,
            subtitle: m.job_title || undefined,
            link: `/user/${m.id}`,
            avatarUrl: m.avatar_url || undefined,
          }))
        );
      }
      
      return results;
    },
    enabled: query.length >= 2 && teamIds.length > 0,
    staleTime: 1000,
  });
}
