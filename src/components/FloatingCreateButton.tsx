import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function FloatingCreateButton() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const isMobile = useIsMobile();

  if (!isMobile || !selectedTeamId) return null;

  return (
    <Button
      onClick={() => navigate("/demands/create")}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg animate-scale-in"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
