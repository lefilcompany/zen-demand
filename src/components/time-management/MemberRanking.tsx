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
  const maxValue = sortedMembers.length > 0 ? sortMode === "time" ? Math.max(...sortedMembers.map(m => m.totalSeconds)) : sortMode === "demands" ? Math.max(...sortedMembers.map(m => m.demandCount)) : Math.max(...sortedMembers.map(m => m.deliveredCount)) : 0;

  // Stats summary
  const totalDemands = members.reduce((sum, m) => sum + m.demandCount, 0);
  const totalDelivered = members.reduce((sum, m) => sum + m.deliveredCount, 0);

  // Top 3 members for podium
  const topMembers = sortedMembers.slice(0, 3);
  const hasRankingData = topMembers.some(m => sortMode === "time" ? m.totalSeconds > 0 : sortMode === "demands" ? m.demandCount > 0 : m.deliveredCount > 0);
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };
  const getValue = (member: BoardMemberWithTime) => {
    switch (sortMode) {
      case "time":
        return member.totalSeconds;
      case "demands":
        return member.demandCount;
      case "delivered":
        return member.deliveredCount;
    }
  };
  const getDisplayValue = (member: BoardMemberWithTime) => {
    switch (sortMode) {
      case "time":
        return formatTimeDisplay(member.totalSeconds) || "00:00:00";
      case "demands":
        return `${member.demandCount} demandas`;
      case "delivered":
        return `${member.deliveredCount} entregas`;
    }
  };
  return;
}