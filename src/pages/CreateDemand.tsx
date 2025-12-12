import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useCanCreateDemand, useMonthlyDemandCount, useTeamScope } from "@/hooks/useTeamScope";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";

export default function CreateDemand() {
  const navigate = useNavigate();
  const createDemand = useCreateDemand();
  const { selectedTeamId, teams } = useSelectedTeam();
  const { data: statuses } = useDemandStatuses();
  const { data: canCreate } = useCanCreateDemand();
  const { data: monthlyCount } = useMonthlyDemandCount();
  const { data: scope } = useTeamScope();

  const selectedTeam = teams?.find(t => t.id === selectedTeamId);
  const limit = scope?.monthly_demand_limit || 0;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState("média");
  const [dueDate, setDueDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  // Set default status when statuses load
  useEffect(() => {
    if (statuses && statuses.length > 0 && !statusId) {
      const defaultStatus = statuses.find(s => s.name === "A Iniciar") || statuses[0];
      setStatusId(defaultStatus.id);
    }
  }, [statuses, statusId]);

  const handleServiceChange = (newServiceId: string, estimatedDays?: number) => {
    setServiceId(newServiceId);
    if (newServiceId !== "none" && estimatedDays) {
      const calculatedDate = addDays(new Date(), estimatedDays);
      setDueDate(format(calculatedDate, "yyyy-MM-dd"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTeamId || !statusId) return;

    createDemand.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        team_id: selectedTeamId,
        status_id: statusId,
        priority,
        due_date: dueDate || undefined,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      },
      {
        onSuccess: async (demand) => {
          // Add assignees if any
          if (assigneeIds.length > 0 && demand) {
            const { error: assignError } = await supabase
              .from("demand_assignees")
              .insert(
                assigneeIds.map((userId) => ({
                  demand_id: demand.id,
                  user_id: userId,
                }))
              );
            
            if (assignError) {
              console.error("Erro ao atribuir responsáveis:", assignError);
              toast.warning("Demanda criada, mas houve um erro ao atribuir responsáveis", {
                description: "Você pode atribuir responsáveis na tela de detalhes.",
              });
              navigate("/demands");
              return;
            }
          }
          toast.success("Demanda criada com sucesso!");
          navigate("/demands");
        },
        onError: (error: any) => {
          toast.error("Erro ao criar demanda", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/demands")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nova Demanda</h1>
        <p className="text-muted-foreground">
          Criar demanda para a equipe <span className="font-medium text-primary">{selectedTeam?.name}</span>
        </p>
      </div>

      {/* Limit Warning */}
      {limit > 0 && (
        <Card>
          <CardContent className="pt-6">
            <ScopeProgressBar used={monthlyCount || 0} limit={limit} />
          </CardContent>
        </Card>
      )}

      {/* Limit Reached Alert */}
      {canCreate === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O limite mensal de demandas foi atingido. Entre em contato com o administrador da equipe para mais informações.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações da Demanda</CardTitle>
          <CardDescription>
            Preencha os dados para criar uma nova demanda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Implementar nova funcionalidade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes da demanda..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={statusId} onValueChange={setStatusId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses?.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="média">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Serviço</Label>
              <ServiceSelector
                teamId={selectedTeamId}
                value={serviceId}
                onChange={handleServiceChange}
              />
              <p className="text-xs text-muted-foreground">
                Selecione um serviço para calcular automaticamente a data de vencimento
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <AssigneeSelector
                teamId={selectedTeamId}
                selectedUserIds={assigneeIds}
                onChange={setAssigneeIds}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/demands")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createDemand.isPending || !title.trim() || !statusId || canCreate === false}
                className="flex-1"
              >
                {createDemand.isPending ? "Criando..." : "Criar Demanda"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
