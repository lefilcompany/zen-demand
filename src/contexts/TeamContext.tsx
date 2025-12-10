import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTeams } from "@/hooks/useTeams";

interface TeamContextType {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return localStorage.getItem("selectedTeamId");
  });
  const { data: teams } = useTeams();

  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem("selectedTeamId", selectedTeamId);
    } else {
      localStorage.removeItem("selectedTeamId");
    }
  }, [selectedTeamId]);

  // Auto-select first team if none selected
  useEffect(() => {
    if (!selectedTeamId && teams && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  return (
    <TeamContext.Provider value={{ selectedTeamId, setSelectedTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useSelectedTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useSelectedTeam must be used within a TeamProvider");
  }
  return context;
}