import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Calendar, Filter, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatTimeDisplay } from "@/hooks/useLiveTimer";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

interface TimeEntryWithDetails {
  id: string;
  demand_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  demand: {
    id: string;
    title: string;
    status_id: string;
    priority: string | null;
    status: {
      name: string;
      color: string;
    };
  };
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface GroupedByDemand {
  demand: TimeEntryWithDetails["demand"];
  entries: TimeEntryWithDetails[];
  totalSeconds: number;
  users: Map<string, { profile: TimeEntryWithDetails["profile"]; totalSeconds: number }>;
}

export default function TimeManagement() {
  const { selectedTeamId } = useSelectedTeam();
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());

  // Fetch all time entries for the team
  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["team-time-entries", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];

      const { data, error } = await supabase
        .from("demand_time_entries")
        .select(`
          *,
          demand:demands!inner(
            id,
            title,
            status_id,
            priority,
            team_id,
            status:demand_statuses(name, color)
          ),
          profile:profiles!demand_time_entries_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("demand.team_id", selectedTeamId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data as unknown as TimeEntryWithDetails[];
    },
    enabled: !!selectedTeamId,
  });

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!timeEntries) return [];
    const usersMap = new Map<string, TimeEntryWithDetails["profile"]>();
    timeEntries.forEach((entry) => {
      if (entry.profile && !usersMap.has(entry.profile.id)) {
        usersMap.set(entry.profile.id, entry.profile);
      }
    });
    return Array.from(usersMap.values());
  }, [timeEntries]);

  // Filter and group entries
  const groupedData = useMemo(() => {
    if (!timeEntries) return [];

    let filtered = timeEntries;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.demand.title.toLowerCase().includes(term) ||
          entry.profile?.full_name.toLowerCase().includes(term)
      );
    }

    // Apply user filter
    if (userFilter !== "all") {
      filtered = filtered.filter((entry) => entry.user_id === userFilter);
    }

    // Group by demand
    const grouped = new Map<string, GroupedByDemand>();

    filtered.forEach((entry) => {
      const demandId = entry.demand_id;
      const duration = entry.ended_at
        ? Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000)
        : 0;

      if (!grouped.has(demandId)) {
        grouped.set(demandId, {
          demand: entry.demand,
          entries: [],
          totalSeconds: 0,
          users: new Map(),
        });
      }

      const group = grouped.get(demandId)!;
      group.entries.push(entry);
      group.totalSeconds += duration;

      // Track per-user time
      if (entry.profile) {
        const userId = entry.user_id;
        if (!group.users.has(userId)) {
          group.users.set(userId, { profile: entry.profile, totalSeconds: 0 });
        }
        group.users.get(userId)!.totalSeconds += duration;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [timeEntries, searchTerm, userFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalTime = groupedData.reduce((sum, group) => sum + group.totalSeconds, 0);
    const totalDemands = groupedData.length;
    const totalEntries = groupedData.reduce((sum, group) => sum + group.entries.length, 0);
    return { totalTime, totalDemands, totalEntries };
  }, [groupedData]);

  const toggleDemand = (demandId: string) => {
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(demandId)) {
        next.delete(demandId);
      } else {
        next.add(demandId);
      }
      return next;
    });
  };

  const priorityColors: Record<string, string> = {
    alta: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    baixa: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb items={[{ label: "Gerenciamento de Tempo" }]} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Gerenciamento de Tempo</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o tempo gasto em cada demanda por usuário.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.totalTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Demandas com Tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totals.totalDemands}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Entradas de Tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totals.totalEntries}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por demanda ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tempo por Demanda</CardTitle>
          <CardDescription>
            Clique em uma demanda para ver os detalhes de tempo por usuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : groupedData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma entrada de tempo encontrada.
            </p>
          ) : (
            <div className="space-y-2">
              {groupedData.map((group) => (
                <Collapsible
                  key={group.demand.id}
                  open={expandedDemands.has(group.demand.id)}
                  onOpenChange={() => toggleDemand(group.demand.id)}
                >
                  <div className="border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">
                                {group.demand.title}
                              </span>
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: group.demand.status.color,
                                  color: group.demand.status.color,
                                }}
                              >
                                {group.demand.status.name}
                              </Badge>
                              {group.demand.priority && (
                                <Badge
                                  variant="secondary"
                                  className={priorityColors[group.demand.priority] || ""}
                                >
                                  {group.demand.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{group.users.size} usuário(s)</span>
                              <span>{group.entries.length} entrada(s)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg">
                            {formatTimeDisplay(group.totalSeconds)}
                          </span>
                          {expandedDemands.has(group.demand.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/30 p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-medium">Tempo por Usuário</h4>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/demands/${group.demand.id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver Demanda
                            </Link>
                          </Button>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuário</TableHead>
                              <TableHead className="text-center">Entradas</TableHead>
                              <TableHead className="text-right">Tempo Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from(group.users.values())
                              .sort((a, b) => b.totalSeconds - a.totalSeconds)
                              .map(({ profile, totalSeconds }) => {
                                const userEntries = group.entries.filter(
                                  (e) => e.user_id === profile.id
                                );
                                return (
                                  <TableRow key={profile.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={profile.avatar_url || undefined} />
                                          <AvatarFallback className="text-xs">
                                            {profile.full_name
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")
                                              .slice(0, 2)
                                              .toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{profile.full_name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {userEntries.length}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                      {formatTimeDisplay(totalSeconds)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        {/* Detailed entries */}
                        <details className="mt-4">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver todas as entradas ({group.entries.length})
                          </summary>
                          <div className="mt-2 space-y-1 text-sm">
                            {group.entries.map((entry) => {
                              const duration = entry.ended_at
                                ? Math.floor(
                                    (new Date(entry.ended_at).getTime() -
                                      new Date(entry.started_at).getTime()) /
                                      1000
                                  )
                                : 0;
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between py-1 px-2 rounded bg-background"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {format(new Date(entry.started_at), "dd/MM HH:mm", {
                                        locale: ptBR,
                                      })}
                                      {" → "}
                                      {entry.ended_at
                                        ? format(new Date(entry.ended_at), "HH:mm", {
                                            locale: ptBR,
                                          })
                                        : "em andamento"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({entry.profile?.full_name})
                                    </span>
                                  </div>
                                  <span className="font-mono text-xs">
                                    {entry.ended_at ? formatTimeDisplay(duration) : "⏱️"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
