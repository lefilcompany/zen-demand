import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "demand" | "member" | "user";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  avatarUrl?: string;
}

export function useGlobalSearch(query: string, boardId: string | null) {
  return useQuery({
    queryKey: ["global-search", query, boardId],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];
      
      const results: SearchResult[] = [];
      const searchTerm = `%${query}%`;
      
      // Check if query looks like a demand code (e.g., "EQUIPE-123" or just "123")
      const codeMatch = query.match(/^(?:([A-Za-z]+)-)?(\d+)$/);
      const sequenceNumber = codeMatch ? parseInt(codeMatch[2], 10) : null;
      
      // Search demands in the current board by title, description, or sequence number
      if (boardId) {
        let demandsQuery = supabase
          .from("demands")
          .select("id, title, board_sequence_number, boards(name)")
          .eq("board_id", boardId);
        
        if (sequenceNumber !== null) {
          demandsQuery = demandsQuery.or(`board_sequence_number.eq.${sequenceNumber},title.ilike.${searchTerm},description.ilike.${searchTerm}`);
        } else {
          demandsQuery = demandsQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
        }
        
        const { data: demands } = await demandsQuery.limit(10);
        
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
        
        // Search board members
        const { data: boardMembers } = await supabase
          .from("board_members")
          .select("user_id, profiles(id, full_name, avatar_url, job_title)")
          .eq("board_id", boardId);
        
        if (boardMembers) {
          const matchingMembers = boardMembers
            .filter((bm) => {
              const profile = bm.profiles as any;
              return profile?.full_name?.toLowerCase().includes(query.toLowerCase());
            })
            .slice(0, 5);
          
          results.push(
            ...matchingMembers.map((bm) => {
              const profile = bm.profiles as any;
              return {
                type: "member" as const,
                id: profile.id,
                title: profile.full_name,
                subtitle: profile.job_title || "Membro do quadro",
                link: `/user/${profile.id}`,
                avatarUrl: profile.avatar_url || undefined,
              };
            })
          );
        }
      }
      
      // Search all users/profiles
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_title")
        .ilike("full_name", searchTerm)
        .limit(5);
      
      if (users) {
        // Filter out users already added as board members
        const existingIds = results.filter(r => r.type === "member").map(r => r.id);
        const newUsers = users.filter(u => !existingIds.includes(u.id));
        
        results.push(
          ...newUsers.map((u) => ({
            type: "user" as const,
            id: u.id,
            title: u.full_name || "Usuário",
            subtitle: u.job_title || "Usuário do sistema",
            link: `/user/${u.id}`,
            avatarUrl: u.avatar_url || undefined,
          }))
        );
      }
      
      return results;
    },
    enabled: query.length >= 2,
    staleTime: 1000,
  });
}
