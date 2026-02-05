import { useState } from "react";
import { Trophy, Crown, Shield, Briefcase, UserCheck, TrendingUp, Clock, Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveUserTimeRow } from "@/components/LiveUserTimeRow";
import { BoardMemberWithTime, BoardMemberRole } from "@/hooks/useBoardTimeEntries";

interface MemberRankingProps {
  members: BoardMemberWithTime[];
  activeTimersCount: number;
  maxUserTime: number;
}

const roleLabels: Record<BoardMemberRole, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
};

const roleIcons: Record<BoardMemberRole, typeof Crown> = {
  admin: Crown,
  moderator: Shield,
  executor: Briefcase,
  requester: UserCheck,
};

type SortMode = "time" | "demands" | "delivered";

export function MemberRanking({
  members,
  activeTimersCount,
  maxUserTime,
}: MemberRankingProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("time");

  // Filter members by role
  const filteredByRole = roleFilter === "all" 
    ? members 
    : members.filter(m => m.role === roleFilter);

  // Sort members based on selected mode
  const sortedMembers = [...filteredByRole].sort((a, b) => {
    // Active timers always first
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    
    switch (sortMode) {
      case "time":
        return b.totalSeconds - a.totalSeconds;
      case "demands":
        return b.demandCount - a.demandCount;
      case "delivered":
        return b.deliveredCount - a.deliveredCount;
      default:
        return b.totalSeconds - a.totalSeconds;
    }
  });

  // Calculate max for progress bars based on sort mode
  const maxValue = sortedMembers.length > 0 
    ? sortMode === "time" 
      ? Math.max(...sortedMembers.map(m => m.totalSeconds))
      : sortMode === "demands"
        ? Math.max(...sortedMembers.map(m => m.demandCount))
        : Math.max(...sortedMembers.map(m => m.deliveredCount))
    : 0;

  const topMember = sortedMembers.length > 0 && (
    sortMode === "time" ? sortedMembers[0].totalSeconds > 0 :
    sortMode === "demands" ? sortedMembers[0].demandCount > 0 :
    sortedMembers[0].deliveredCount > 0
  ) ? sortedMembers[0] : null;

  // Stats summary
  const totalDemands = members.reduce((sum, m) => sum + m.demandCount, 0);
  const totalDelivered = members.reduce((sum, m) => sum + m.deliveredCount, 0);
  const avgDemandsPerMember = members.length > 0 ? Math.round(totalDemands / members.length) : 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  Ranking de Carga de Trabalho
                  {activeTimersCount > 0 && (
                    <Badge className="bg-emerald-500 text-white border-0 animate-pulse text-xs">
                      <span className="w-2 h-2 bg-white rounded-full mr-1.5" />
                      {activeTimersCount} ativo{activeTimersCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {sortedMembers.length} membro{sortedMembers.length !== 1 ? 's' : ''} ordenados por {
                    sortMode === "time" ? "tempo dedicado" :
                    sortMode === "demands" ? "demandas em progresso" :
                    "demandas entregues"
                  }
                </CardDescription>
              </div>
            </div>
            
            {topMember && (
              <div className="text-right hidden lg:block">
                <p className="text-sm text-muted-foreground">Líder atual</p>
                <p className="font-semibold text-amber-600 dark:text-amber-400 text-lg">
                  {topMember.profile.full_name.split(' ')[0]}
                </p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Total Demandas</span>
              </div>
              <p className="text-xl font-bold">{totalDemands}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Entregues</span>
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalDelivered}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Média/Membro</span>
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{avgDemandsPerMember}</p>
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Administradores
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Coordenadores
                  </div>
                </SelectItem>
                <SelectItem value="executor">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    Agentes
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)} className="flex-1">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="time" className="gap-1.5 text-xs sm:text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tempo</span>
                </TabsTrigger>
                <TabsTrigger value="demands" className="gap-1.5 text-xs sm:text-sm">
                  <Target className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Demandas</span>
                </TabsTrigger>
                <TabsTrigger value="delivered" className="gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Entregues</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro encontrado com este cargo.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMembers.slice(0, 15).map((member, index) => {
              const RoleIcon = roleIcons[member.role];
              return (
                <div key={member.userId} className="relative">
                  {/* Role badge */}
                  <div className="absolute -left-2 top-2 z-10">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0.5 bg-background shadow-sm"
                    >
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {roleLabels[member.role]}
                    </Badge>
                  </div>
                  <LiveUserTimeRow 
                    stats={{
                      userId: member.userId,
                      profile: member.profile,
                      role: member.role,
                      totalSeconds: member.totalSeconds,
                      isActive: member.isActive,
                      activeStartedAt: member.activeStartedAt,
                      demandCount: member.demandCount,
                      deliveredCount: member.deliveredCount,
                      inProgressCount: member.inProgressCount,
                      entries: member.entries,
                    }}
                    rank={index + 1}
                    maxTime={sortMode === "time" ? maxValue : maxUserTime}
                  />
                </div>
              );
            })}
            {sortedMembers.length > 15 && (
              <div className="text-center pt-4 pb-2">
                <Badge variant="outline" className="text-muted-foreground">
                  E mais {sortedMembers.length - 15} membro(s)...
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}