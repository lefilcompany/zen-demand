import { Trophy, Crown, Shield, Briefcase, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveUserTimeRow } from "@/components/LiveUserTimeRow";
import { BoardMemberWithTime, BoardMemberRole } from "@/hooks/useBoardTimeEntries";

interface MemberRankingProps {
  members: BoardMemberWithTime[];
  activeTimersCount: number;
  maxUserTime: number;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
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

export function MemberRanking({
  members,
  activeTimersCount,
  maxUserTime,
  roleFilter,
  onRoleFilterChange,
}: MemberRankingProps) {
  // Filter members by role
  const filteredMembers = roleFilter === "all" 
    ? members 
    : members.filter(m => m.role === roleFilter);

  const topMember = filteredMembers.length > 0 && filteredMembers[0].totalSeconds > 0 
    ? filteredMembers[0] 
    : null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                Ranking de Membros
                {activeTimersCount > 0 && (
                  <Badge className="bg-emerald-500 text-white border-0 animate-pulse text-xs">
                    <span className="w-2 h-2 bg-white rounded-full mr-1.5" />
                    Ao vivo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {filteredMembers.length} membro{filteredMembers.length !== 1 ? 's' : ''} no quadro
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={roleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger className="w-[180px]">
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
            
            {topMember && (
              <div className="text-right hidden sm:block">
                <p className="text-sm text-muted-foreground">Líder atual</p>
                <p className="font-semibold text-amber-600 dark:text-amber-400 text-lg">
                  {topMember.profile.full_name.split(' ')[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro encontrado com este cargo.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.slice(0, 15).map((member, index) => {
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
                    maxTime={maxUserTime}
                  />
                </div>
              );
            })}
            {filteredMembers.length > 15 && (
              <div className="text-center pt-4 pb-2">
                <Badge variant="outline" className="text-muted-foreground">
                  E mais {filteredMembers.length - 15} membro(s)...
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
