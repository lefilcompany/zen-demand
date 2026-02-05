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
  requester: "Solicitante"
};
const roleIcons: Record<BoardMemberRole, typeof Crown> = {
  admin: Crown,
  moderator: Shield,
  executor: Briefcase,
  requester: UserCheck
};
type SortMode = "time" | "demands" | "delivered";
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
  const maxValue = sortedMembers.length > 0 ? sortMode === "time" ? Math.max(...sortedMembers.map(m => m.totalSeconds)) : sortMode === "demands" ? Math.max(...sortedMembers.map(m => m.demandCount)) : Math.max(...sortedMembers.map(m => m.deliveredCount)) : 0;
  const topMember = sortedMembers.length > 0 && (sortMode === "time" ? sortedMembers[0].totalSeconds > 0 : sortMode === "demands" ? sortedMembers[0].demandCount > 0 : sortedMembers[0].deliveredCount > 0) ? sortedMembers[0] : null;

  // Stats summary
  const totalDemands = members.reduce((sum, m) => sum + m.demandCount, 0);
  const totalDelivered = members.reduce((sum, m) => sum + m.deliveredCount, 0);
  const avgDemandsPerMember = members.length > 0 ? Math.round(totalDemands / members.length) : 0;
  return;
}