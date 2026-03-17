import { useAdminStats } from "@/hooks/admin/useAdminStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const stats = [
  { key: "totalTeams" as const, label: "Total de Equipes", icon: Building2 },
  { key: "totalUsers" as const, label: "Total de Usuários", icon: Users },
  { key: "activeSubscriptions" as const, label: "Assinaturas Ativas", icon: CreditCard },
  { key: "activeCoupons" as const, label: "Cupons Ativos", icon: Ticket },
];

export default function AdminDashboard() {
  const { data, isLoading } = useAdminStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{data?.[s.key] ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
