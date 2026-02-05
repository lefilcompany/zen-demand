import { useState } from "react";
import { Trophy, Crown, Shield, Briefcase, UserCheck, TrendingUp, Clock, Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LiveUserTimeRow } from "@/components/LiveUserTimeRow";
import { BoardMemberWithTime, BoardMemberRole } from "@/hooks/useBoardTimeEntries";
import { formatTimeDisplay } from "@/hooks/useLiveTimer";
import { cn } from "@/lib/utils";

interface MemberRankingProps {
  members: BoardMemberWithTime[];
  activeTimersCount: number;
  maxUserTime: number;
}

const roleLabels: Record<BoardMemberRole, string> = {
  admin: "Admin",
  moderator: "Coord.",
  executor: "Agente",
  requester: "Solic."
};

const roleIcons: Record<BoardMemberRole, typeof Crown> = {
  admin: Crown,
  moderator: Shield,
  executor: Briefcase,
  requester: UserCheck
};

type SortMode = "time" | "demands" | "delivered";

const sortLabels: Record<SortMode, string> = {
  time: "Tempo",
  demands: "Demandas",
  delivered: "Entregas"
};

export function MemberRanking({
  members,
  activeTimersCount,
  maxUserTime
}: MemberRankingProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("time");

  // Filter members by role
  const filteredByRole = roleFilter === "all" ? members : members.filter(m => m.role === roleFilter);

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

  // Stats summary
  const totalDemands = members.reduce((sum, m) => sum + m.demandCount, 0);
  const totalDelivered = members.reduce((sum, m) => sum + m.deliveredCount, 0);

  // Top 3 members for podium
  const topMembers = sortedMembers.slice(0, 3);
  const hasRankingData = topMembers.some(m => 
    sortMode === "time" ? m.totalSeconds > 0 : 
    sortMode === "demands" ? m.demandCount > 0 : 
    m.deliveredCount > 0
  );

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-yellow-500";
      case 1: return "text-gray-400";
      case 2: return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  const getValue = (member: BoardMemberWithTime) => {
    switch (sortMode) {
      case "time": return member.totalSeconds;
      case "demands": return member.demandCount;
      case "delivered": return member.deliveredCount;
    }
  };

  const getDisplayValue = (member: BoardMemberWithTime) => {
    switch (sortMode) {
      case "time": return formatTimeDisplay(member.totalSeconds) || "00:00:00";
      case "demands": return `${member.demandCount} demandas`;
      case "delivered": return `${member.deliveredCount} entregas`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Ranking de Carga de Trabalho</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-8 w-[110px] sm:w-[130px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Por Tempo</SelectItem>
                <SelectItem value="demands">Por Demandas</SelectItem>
                <SelectItem value="delivered">Por Entregas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="moderator">Coords.</SelectItem>
                <SelectItem value="executor">Agentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            {totalDemands} demandas
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {totalDelivered} entregas
          </span>
          {activeTimersCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {activeTimersCount} ativo{activeTimersCount > 1 ? "s" : ""}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasRankingData ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum dado de ranking disponível</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {sortedMembers.slice(0, 5).map((member, index) => {
              const RoleIcon = roleIcons[member.role];
              const value = getValue(member);
              const progressPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div 
                  key={member.userId}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card transition-colors",
                    member.isActive && "border-primary/50 bg-primary/5"
                  )}
                >
                  {/* Position / Medal */}
                  <div className="w-6 sm:w-8 flex justify-center shrink-0">
                    {index < 3 ? (
                      <Trophy className={cn("h-4 w-4 sm:h-5 sm:w-5", getMedalColor(index))} />
                    ) : (
                      <span className="text-sm text-muted-foreground font-medium">{index + 1}º</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    <AvatarImage src={member.profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {member.profile.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="font-medium text-sm sm:text-base truncate">
                        {member.profile.full_name}
                      </span>
                      {member.isActive && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progressPercent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0 hidden xs:inline">
                        {roleLabels[member.role]}
                      </span>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "font-semibold text-sm sm:text-base",
                      sortMode === "time" && "font-mono tabular-nums"
                    )}>
                      {sortMode === "time" 
                        ? (formatTimeDisplay(member.totalSeconds) || "00:00:00")
                        : sortMode === "demands" 
                          ? member.demandCount
                          : member.deliveredCount
                      }
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {sortMode === "time" ? `${member.demandCount} dem.` : 
                       sortMode === "demands" ? `${member.deliveredCount} ent.` :
                       `${member.demandCount} dem.`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
