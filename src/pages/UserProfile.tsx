import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, User, Calendar, Briefcase, CheckCircle2, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isOwnProfile = user?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Get user's teams
  const { data: userTeams } = useQuery({
    queryKey: ["user-teams", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          role,
          teams:team_id (
            id,
            name
          )
        `)
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Get user's stats
  const { data: stats } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Get demands created by user
      const { count: createdCount } = await supabase
        .from("demands")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId);
      
      // Get demands assigned to user
      const { count: assignedCount } = await supabase
        .from("demand_assignees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      
      // Get completed demands
      const { data: deliveredStatus } = await supabase
        .from("demand_statuses")
        .select("id")
        .eq("name", "Entregue")
        .single();
      
      let completedCount = 0;
      if (deliveredStatus) {
        const { count } = await supabase
          .from("demands")
          .select("*, demand_assignees!inner(*)", { count: "exact", head: true })
          .eq("demand_assignees.user_id", userId)
          .eq("status_id", deliveredStatus.id);
        completedCount = count || 0;
      }
      
      return {
        created: createdCount || 0,
        assigned: assignedCount || 0,
        completed: completedCount,
      };
    },
    enabled: !!userId,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMMM 'de' yyyy", { locale: ptBR });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      moderator: "Moderador",
      executor: "Executor",
      requester: "Solicitante",
    };
    return roles[role] || role;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Usuário não encontrado</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        {isOwnProfile && (
          <Button onClick={() => navigate("/profile")} variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
        )}
      </div>

      {/* Profile Hero Section */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <CardContent className="relative pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 md:left-8">
            <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} className="object-cover" />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-semibold">
                {profile.full_name ? getInitials(profile.full_name) : <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info Header */}
          <div className="pt-16 md:pt-20 md:pl-40">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile.full_name}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Membro desde {formatDate(profile.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.assigned || 0}</p>
                <p className="text-sm text-muted-foreground">Demandas Atribuídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-sm text-muted-foreground">Demandas Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.created || 0}</p>
                <p className="text-sm text-muted-foreground">Demandas Criadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      {userTeams && userTeams.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Equipes
            </h2>
            <div className="flex flex-wrap gap-2">
              {userTeams.map((tm: any) => (
                <Badge key={tm.teams?.id} variant="secondary" className="text-sm py-1.5 px-3">
                  {tm.teams?.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({getRoleLabel(tm.role)})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
