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

export function TeamScopeConfig({ teamId, currentScope }: TeamScopeConfigProps) {
  const queryClient = useQueryClient();
  const [scopeDescription, setScopeDescription] = useState(currentScope?.scope_description || "");
  const [contractStartDate, setContractStartDate] = useState(currentScope?.contract_start_date || "");
  const [contractEndDate, setContractEndDate] = useState(currentScope?.contract_end_date || "");
  const [active, setActive] = useState(currentScope?.active ?? true);

  const updateScopeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("teams")
        .update({
          scope_description: scopeDescription || null,
          contract_start_date: contractStartDate || null,
          contract_end_date: contractEndDate || null,
          active,
        })
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-scope", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Configurações de escopo atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configurações");
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Configuração de Escopo</CardTitle>
            <CardDescription>
              Defina o escopo e limite de demandas para este cliente
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scope">Descrição do Escopo</Label>
          <Textarea
            id="scope"
            placeholder="Descreva o escopo contratado pelo cliente..."
            value={scopeDescription}
            onChange={(e) => setScopeDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start-date">Início do Contrato</Label>
            <Input
              id="start-date"
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Término do Contrato</Label>
            <Input
              id="end-date"
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="active">Contrato Ativo</Label>
            <p className="text-xs text-muted-foreground">
              Desative para bloquear novas demandas
            </p>
          </div>
          <Switch
            id="active"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>

        <Button
          onClick={() => updateScopeMutation.mutate()}
          disabled={updateScopeMutation.isPending}
          className="w-full"
        >
          {updateScopeMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
