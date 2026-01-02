import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import { TeamScope } from "@/hooks/useTeamScope";
interface TeamScopeConfigProps {
  teamId: string;
  currentScope: TeamScope | null;
}
export function TeamScopeConfig({
  teamId,
  currentScope
}: TeamScopeConfigProps) {
  const queryClient = useQueryClient();
  const [scopeDescription, setScopeDescription] = useState(currentScope?.scope_description || "");
  const [contractStartDate, setContractStartDate] = useState(currentScope?.contract_start_date || "");
  const [contractEndDate, setContractEndDate] = useState(currentScope?.contract_end_date || "");
  const [active, setActive] = useState(currentScope?.active ?? true);
  const updateScopeMutation = useMutation({
    mutationFn: async () => {
      const {
        error
      } = await supabase.from("teams").update({
        scope_description: scopeDescription || null,
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        active
      }).eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["team-scope", teamId]
      });
      queryClient.invalidateQueries({
        queryKey: ["teams"]
      });
      toast.success("Configurações de escopo atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configurações");
    }
  });
  return;
}