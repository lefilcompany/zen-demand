import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarWithStatus } from "@/components/AvatarWithStatus";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, Loader2, User, Calendar, Briefcase, CheckCircle2, Clock, Edit, 
  Trophy, Target, Flame, Star, TrendingUp, Award, Zap, MapPin, Link as LinkIcon,
  Github, Linkedin, Shield, Users, Layout, ShieldCheck, ClipboardCheck, MessageSquare,
  Wrench, Rocket, Timer, Cog, UserCheck, PlusCircle, MessageCircle, Layers, Circle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePresence } from "@/contexts/PresenceContext";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  category?: "general" | "admin" | "moderator" | "executor" | "requester";
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isUserOnline } = usePresence();
  
  const isOwnProfile = user?.id === userId;
  const isOnline = userId ? isUserOnline(userId) : false;

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
          joined_at,
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

  // Get user's boards
  const { data: userBoards } = useQuery({
    queryKey: ["user-boards", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("board_members")
        .select(`
          role,
          boards:board_id (
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

  // Get user's extended stats
  const { data: stats } = useQuery({
    queryKey: ["user-stats-extended", userId],
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

      // Get total time tracked
      const { data: timeEntries } = await supabase
        .from("demand_time_entries")
        .select("duration_seconds")
        .eq("user_id", userId);
      
      const totalSeconds = timeEntries?.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0) || 0;

      // Get comments count
      const { count: commentsCount } = await supabase
        .from("demand_interactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("interaction_type", "comment");

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentActivity } = await supabase
        .from("demand_interactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      return {
        created: createdCount || 0,
        assigned: assignedCount || 0,
        completed: completedCount,
        totalTimeSeconds: totalSeconds,
        comments: commentsCount || 0,
        recentActivity: recentActivity || 0,
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      moderator: "default",
      executor: "secondary",
      requester: "outline",
    };
    return variants[role] || "secondary";
  };

  // Calculate user level based on activity
  const calculateLevel = () => {
    if (!stats) return { level: 1, xp: 0, nextLevelXp: 100, progress: 0 };
    
    const xp = (stats.completed * 50) + (stats.created * 20) + (stats.comments * 5) + Math.floor(stats.totalTimeSeconds / 3600) * 10;
    let level = 1;
    let totalXpForLevel = 0;
    let xpNeeded = 100;
    
    while (xp >= totalXpForLevel + xpNeeded) {
      totalXpForLevel += xpNeeded;
      level++;
      xpNeeded = Math.floor(xpNeeded * 1.5);
    }
    
    const currentLevelXp = xp - totalXpForLevel;
    const progress = (currentLevelXp / xpNeeded) * 100;
    
    return { level, xp, nextLevelXp: xpNeeded, currentLevelXp, progress };
  };

  // Get user roles from teams
  const getUserRoles = () => {
    if (!userTeams) return { isAdmin: false, isModerator: false, isExecutor: false, isRequester: false };
    
    const roles = userTeams.map((tm: any) => tm.role);
    return {
      isAdmin: roles.includes("admin"),
      isModerator: roles.includes("moderator"),
      isExecutor: roles.includes("executor"),
      isRequester: roles.includes("requester"),
    };
  };

  const userRoles = getUserRoles();

  // Generate achievements
  const getAchievements = (): Achievement[] => {
    if (!stats || !profile) return [];
    
    const memberDays = differenceInDays(new Date(), new Date(profile.created_at));
    const teamsCount = userTeams?.length || 0;
    const boardsCount = userBoards?.length || 0;
    
    const generalAchievements: Achievement[] = [
      {
        id: "first-demand",
        name: "Primeira Demanda",
        description: "Crie sua primeira demanda",
        icon: <Target className="h-5 w-5" />,
        unlocked: stats.created >= 1,
        progress: Math.min(stats.created, 1),
        maxProgress: 1,
        category: "general",
      },
      {
        id: "task-master",
        name: "Mestre das Tarefas",
        description: "Complete 10 demandas",
        icon: <Trophy className="h-5 w-5" />,
        unlocked: stats.completed >= 10,
        progress: Math.min(stats.completed, 10),
        maxProgress: 10,
        category: "general",
      },
      {
        id: "super-achiever",
        name: "Super Realizador",
        description: "Complete 50 demandas",
        icon: <Star className="h-5 w-5" />,
        unlocked: stats.completed >= 50,
        progress: Math.min(stats.completed, 50),
        maxProgress: 50,
        category: "general",
      },
      {
        id: "communicator",
        name: "Comunicador",
        description: "Faça 20 comentários",
        icon: <Zap className="h-5 w-5" />,
        unlocked: stats.comments >= 20,
        progress: Math.min(stats.comments, 20),
        maxProgress: 20,
        category: "general",
      },
      {
        id: "time-tracker",
        name: "Controlador do Tempo",
        description: "Registre 10 horas de trabalho",
        icon: <Clock className="h-5 w-5" />,
        unlocked: stats.totalTimeSeconds >= 36000,
        progress: Math.min(Math.floor(stats.totalTimeSeconds / 3600), 10),
        maxProgress: 10,
        category: "general",
      },
      {
        id: "veteran",
        name: "Veterano",
        description: "Seja membro por 30 dias",
        icon: <Award className="h-5 w-5" />,
        unlocked: memberDays >= 30,
        progress: Math.min(memberDays, 30),
        maxProgress: 30,
        category: "general",
      },
    ];

    // Admin specific achievements
    const adminAchievements: Achievement[] = userRoles.isAdmin ? [
      {
        id: "admin-leader",
        name: "Líder Nato",
        description: "Seja admin de uma equipe",
        icon: <Shield className="h-5 w-5" />,
        unlocked: true,
        category: "admin",
      },
      {
        id: "admin-multi-team",
        name: "Multi-Equipes",
        description: "Seja admin em 3 equipes",
        icon: <Users className="h-5 w-5" />,
        unlocked: userTeams?.filter((tm: any) => tm.role === "admin").length >= 3,
        progress: userTeams?.filter((tm: any) => tm.role === "admin").length || 0,
        maxProgress: 3,
        category: "admin",
      },
      {
        id: "admin-board-master",
        name: "Arquiteto de Quadros",
        description: "Gerencie 5 quadros",
        icon: <Layout className="h-5 w-5" />,
        unlocked: boardsCount >= 5,
        progress: Math.min(boardsCount, 5),
        maxProgress: 5,
        category: "admin",
      },
    ] : [];

    // Moderator specific achievements
    const moderatorAchievements: Achievement[] = userRoles.isModerator ? [
      {
        id: "mod-guardian",
        name: "Guardião",
        description: "Seja moderador de uma equipe",
        icon: <ShieldCheck className="h-5 w-5" />,
        unlocked: true,
        category: "moderator",
      },
      {
        id: "mod-reviewer",
        name: "Revisor Experiente",
        description: "Revise 25 demandas",
        icon: <ClipboardCheck className="h-5 w-5" />,
        unlocked: stats.completed >= 25,
        progress: Math.min(stats.completed, 25),
        maxProgress: 25,
        category: "moderator",
      },
      {
        id: "mod-helper",
        name: "Ajudante",
        description: "Faça 50 comentários",
        icon: <MessageSquare className="h-5 w-5" />,
        unlocked: stats.comments >= 50,
        progress: Math.min(stats.comments, 50),
        maxProgress: 50,
        category: "moderator",
      },
    ] : [];

    // Executor specific achievements
    const executorAchievements: Achievement[] = userRoles.isExecutor ? [
      {
        id: "exec-worker",
        name: "Trabalhador",
        description: "Seja executor de uma equipe",
        icon: <Wrench className="h-5 w-5" />,
        unlocked: true,
        category: "executor",
      },
      {
        id: "exec-speedster",
        name: "Velocista",
        description: "Complete 20 demandas",
        icon: <Rocket className="h-5 w-5" />,
        unlocked: stats.completed >= 20,
        progress: Math.min(stats.completed, 20),
        maxProgress: 20,
        category: "executor",
      },
      {
        id: "exec-dedicated",
        name: "Dedicado",
        description: "Registre 50 horas de trabalho",
        icon: <Timer className="h-5 w-5" />,
        unlocked: stats.totalTimeSeconds >= 180000,
        progress: Math.min(Math.floor(stats.totalTimeSeconds / 3600), 50),
        maxProgress: 50,
        category: "executor",
      },
      {
        id: "exec-machine",
        name: "Máquina de Entregas",
        description: "Complete 100 demandas",
        icon: <Cog className="h-5 w-5" />,
        unlocked: stats.completed >= 100,
        progress: Math.min(stats.completed, 100),
        maxProgress: 100,
        category: "executor",
      },
    ] : [];

    // Requester specific achievements
    const requesterAchievements: Achievement[] = userRoles.isRequester ? [
      {
        id: "req-starter",
        name: "Iniciante",
        description: "Seja solicitante de uma equipe",
        icon: <UserCheck className="h-5 w-5" />,
        unlocked: true,
        category: "requester",
      },
      {
        id: "req-creator",
        name: "Criador Ativo",
        description: "Crie 10 demandas",
        icon: <PlusCircle className="h-5 w-5" />,
        unlocked: stats.created >= 10,
        progress: Math.min(stats.created, 10),
        maxProgress: 10,
        category: "requester",
      },
      {
        id: "req-engaged",
        name: "Engajado",
        description: "Faça 10 comentários",
        icon: <MessageCircle className="h-5 w-5" />,
        unlocked: stats.comments >= 10,
        progress: Math.min(stats.comments, 10),
        maxProgress: 10,
        category: "requester",
      },
      {
        id: "req-prolific",
        name: "Prolífico",
        description: "Crie 50 demandas",
        icon: <Layers className="h-5 w-5" />,
        unlocked: stats.created >= 50,
        progress: Math.min(stats.created, 50),
        maxProgress: 50,
        category: "requester",
      },
    ] : [];

    return [
      ...generalAchievements,
      ...adminAchievements,
      ...moderatorAchievements,
      ...executorAchievements,
      ...requesterAchievements,
    ];
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      general: "Geral",
      admin: "Administrador",
      moderator: "Moderador",
      executor: "Executor",
      requester: "Solicitante",
    };
    return labels[category || "general"] || "Geral";
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      general: "bg-primary",
      admin: "bg-destructive",
      moderator: "bg-secondary",
      executor: "bg-success",
      requester: "bg-accent",
    };
    return colors[category || "general"] || "bg-primary";
  };

  const levelData = calculateLevel();
  const achievements = getAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

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
    <div className="space-y-6 animate-fade-in pb-8">
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
        <div className="h-36 bg-gradient-to-r from-primary via-secondary to-primary/60 relative">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Nível {levelData.level}</span>
          </div>
        </div>
        <CardContent className="relative pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 md:left-8">
            <div className="relative">
              <AvatarWithStatus
                userId={userId}
                src={profile.avatar_url || undefined}
                fallback={profile.full_name ? getInitials(profile.full_name) : "?"}
                className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-xl text-3xl"
                size="xl"
                showStatus={true}
              />
              {/* Level badge on avatar */}
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg border-2 border-background">
                {levelData.level}
              </div>
            </div>
          </div>

          {/* Profile Info Header */}
          <div className="pt-16 md:pt-20 md:pl-40">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {profile.full_name}
                </h1>
                {(profile as any).job_title && (
                  <p className="text-primary font-medium mt-1">{(profile as any).job_title}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isOnline ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <Circle className={`h-2 w-2 fill-current ${isOnline ? 'animate-pulse' : ''}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membro desde {formatDate(profile.created_at)}
                  </span>
                  {(profile as any).location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {(profile as any).location}
                    </span>
                  )}
                </div>
                {(profile as any).bio && (
                  <p className="text-muted-foreground mt-3 max-w-2xl">{(profile as any).bio}</p>
                )}
              </div>
              
              {/* Social links */}
              <div className="flex items-center gap-2">
                {(profile as any).website && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a href={(profile as any).website} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Website</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {(profile as any).github_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a href={(profile as any).github_url} target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>GitHub</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {(profile as any).linkedin_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a href={(profile as any).linkedin_url} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>LinkedIn</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* XP Progress bar */}
            <div className="mt-6 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Progresso para Nível {levelData.level + 1}
                </span>
                <span className="text-muted-foreground">
                  {levelData.currentLevelXp} / {levelData.nextLevelXp} XP
                </span>
              </div>
              <Progress value={levelData.progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Total de {levelData.xp} XP acumulados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{stats?.assigned || 0}</p>
              <p className="text-xs text-muted-foreground">Atribuídas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <p className="text-2xl font-bold">{stats?.completed || 0}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-2xl font-bold">{stats?.created || 0}</p>
              <p className="text-xs text-muted-foreground">Criadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-2xl font-bold">{formatTime(stats?.totalTimeSeconds || 0)}</p>
              <p className="text-xs text-muted-foreground">Tempo Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{stats?.comments || 0}</p>
              <p className="text-xs text-muted-foreground">Comentários</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center mb-2">
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <p className="text-2xl font-bold">{stats?.recentActivity || 0}</p>
              <p className="text-xs text-muted-foreground">Ações (30d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
            <Badge variant="secondary" className="ml-2">
              {unlockedAchievements}/{achievements.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Group achievements by category */}
          {["general", "admin", "moderator", "executor", "requester"].map((category) => {
            const categoryAchievements = achievements.filter(a => a.category === category);
            if (categoryAchievements.length === 0) return null;
            
            return (
              <div key={category} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-2 w-2 rounded-full ${getCategoryColor(category)}`} />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {getCategoryLabel(category)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({categoryAchievements.filter(a => a.unlocked).length}/{categoryAchievements.length})
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {categoryAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        achievement.unlocked 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-muted/30 border-transparent opacity-60"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        achievement.unlocked 
                          ? getCategoryColor(achievement.category) + " text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${achievement.unlocked ? "" : "text-muted-foreground"}`}>
                          {achievement.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                        {!achievement.unlocked && achievement.progress !== undefined && (
                          <div className="mt-1">
                            <Progress 
                              value={(achievement.progress / (achievement.maxProgress || 1)) * 100} 
                              className="h-1" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {achievement.progress}/{achievement.maxProgress}
                            </span>
                          </div>
                        )}
                      </div>
                      {achievement.unlocked && (
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Teams & Boards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Teams */}
        {userTeams && userTeams.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Equipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userTeams.map((tm: any) => (
                  <div 
                    key={tm.teams?.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{tm.teams?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(tm.joined_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(tm.role)}>
                      {getRoleLabel(tm.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boards */}
        {userBoards && userBoards.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Quadros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userBoards.map((bm: any) => (
                  <div 
                    key={bm.boards?.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{bm.boards?.name}</p>
                    <Badge variant={getRoleBadgeVariant(bm.role)}>
                      {getRoleLabel(bm.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
