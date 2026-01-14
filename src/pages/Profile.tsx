import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileEditDrawer } from "@/components/ProfileEditDrawer";
import { useUserStats, badges, calculateLevel } from "@/hooks/useUserStats";
import { 
  ArrowLeft, Settings, User, Calendar, MapPin, Briefcase, 
  Link as LinkIcon, Github, Linkedin, Target, CheckCircle2, 
  Clock, MessageSquare, Users, Loader2, Award, TrendingUp,
  Zap, Trophy, ChevronDown, ChevronUp
} from "lucide-react";

const INITIAL_BADGES_COUNT = 12;

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useUserStats(user?.id);

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const levelInfo = stats ? calculateLevel(stats) : { level: 1, xp: 0, xpForNext: 100, progress: 0 };
  const earnedBadges = stats ? badges.filter((b) => b.requirement(stats)) : [];
  const lockedBadges = stats ? badges.filter((b) => !b.requirement(stats)) : badges;

  if (profileLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <Button onClick={() => setEditDrawerOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Editar Perfil
        </Button>
      </div>

      {/* Profile Hero with Level */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-primary/60 relative">
          {/* Level Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-bold">Nível {levelInfo.level}</span>
          </div>
        </div>
        <CardContent className="relative pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 md:left-8">
            <div className="relative">
              <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-semibold">
                  {profile?.full_name ? getInitials(profile.full_name) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              {/* Level ring */}
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center font-bold border-4 border-background shadow-lg">
                {levelInfo.level}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-16 md:pt-20 md:pl-40">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {profile?.full_name || "Seu Nome"}
                </h1>
                {(profile as any)?.job_title && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {(profile as any).job_title}
                  </p>
                )}
                {(profile as any)?.location && (
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" />
                    {(profile as any).location}
                  </p>
                )}
              </div>

              {/* XP Progress */}
              <div className="bg-muted/50 rounded-lg p-4 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {levelInfo.xp} XP
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {levelInfo.xpForNext} XP
                  </span>
                </div>
                <Progress value={levelInfo.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(levelInfo.progress)}% para o nível {levelInfo.level + 1}
                </p>
              </div>
            </div>

            {/* Bio */}
            {(profile as any)?.bio && (
              <p className="text-muted-foreground mt-4 max-w-2xl">
                {(profile as any).bio}
              </p>
            )}

            {/* Social Links */}
            <div className="flex flex-wrap gap-2 mt-4">
              {(profile as any)?.website && (
                <a href={(profile as any).website} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80">
                    <LinkIcon className="h-3 w-3" />
                    Website
                  </Badge>
                </a>
              )}
              {(profile as any)?.linkedin_url && (
                <a href={(profile as any).linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80">
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </Badge>
                </a>
              )}
              {(profile as any)?.github_url && (
                <a href={(profile as any).github_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80">
                    <Github className="h-3 w-3" />
                    GitHub
                  </Badge>
                </a>
              )}
              {user?.created_at && (
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Membro desde {formatDate(user.created_at)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalDemands || 0}</p>
                <p className="text-sm text-muted-foreground">Demandas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.deliveredDemands || 0}</p>
                <p className="text-sm text-muted-foreground">Entregues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats ? formatTime(stats.totalTimeSpent) : "0m"}</p>
                <p className="text-sm text-muted-foreground">Trabalhado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalComments || 0}</p>
                <p className="text-sm text-muted-foreground">Comentários</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Equipes</span>
              </div>
              <span className="text-xl font-bold">{stats?.teamsCount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Quadros</span>
              </div>
              <span className="text-xl font-bold">{stats?.boardsCount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Tempo médio de entrega</span>
              </div>
              <span className="text-xl font-bold">
                {stats?.avgDeliveryTime ? `${stats.avgDeliveryTime}h` : "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Conquistas
            <Badge variant="secondary" className="ml-2">
              {earnedBadges.length}/{badges.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const allBadgesSorted = [...earnedBadges, ...lockedBadges];
            const displayedBadges = showAllBadges 
              ? allBadgesSorted 
              : allBadgesSorted.slice(0, INITIAL_BADGES_COUNT);
            const hasMoreBadges = allBadgesSorted.length > INITIAL_BADGES_COUNT;

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {displayedBadges.map((badge) => {
                    const isEarned = earnedBadges.some(b => b.id === badge.id);
                    
                    return (
                      <Tooltip key={badge.id}>
                        <TooltipTrigger asChild>
                          {isEarned ? (
                            <div 
                              className="flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer"
                              style={{ 
                                borderColor: badge.color,
                                backgroundColor: `${badge.color}15`
                              }}
                            >
                              <span className="text-3xl mb-2">{badge.icon}</span>
                              <span className="text-xs font-medium text-center line-clamp-2">{badge.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center p-4 rounded-xl border-2 border-muted bg-muted/30 opacity-50 cursor-pointer">
                              <span className="text-3xl mb-2 grayscale">{badge.icon}</span>
                              <span className="text-xs font-medium text-center text-muted-foreground">???</span>
                            </div>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{isEarned ? badge.name : "🔒 Bloqueado"}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                
                {hasMoreBadges && (
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAllBadges(!showAllBadges)}
                      className="gap-2"
                    >
                      {showAllBadges ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Ver mais conquistas ({allBadgesSorted.length - INITIAL_BADGES_COUNT})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Edit Drawer */}
      <ProfileEditDrawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} />
    </div>
  );
}
