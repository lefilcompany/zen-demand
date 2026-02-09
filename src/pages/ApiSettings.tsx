import { useIsTeamAdmin } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ApiKeyManager } from "@/components/api/ApiKeyManager";
import { WebhookManager } from "@/components/api/WebhookManager";
import { ApiDocsPanel } from "@/components/api/ApiDocsPanel";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Shield } from "lucide-react";

export default function ApiSettings() {
  const { selectedTeamId } = useSelectedTeam();
  const { isAdmin, isLoading } = useIsTeamAdmin(selectedTeamId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Apenas administradores da equipe podem gerenciar a API.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <PageBreadcrumb items={[{ label: "API & Webhooks" }]} />

      <div>
        <h1 className="text-2xl font-bold">API & Webhooks</h1>
        <p className="text-muted-foreground">Gerencie integrações externas com a API REST e webhooks</p>
      </div>

      <div className="space-y-6">
        <ApiKeyManager />
        <WebhookManager />
        <ApiDocsPanel />
      </div>
    </div>
  );
}
