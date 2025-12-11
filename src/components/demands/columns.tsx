"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

// Define the demand type based on what useDemands returns
export interface DemandTableRow {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  demand_statuses?: {
    name: string;
    color: string;
  } | null;
  demand_assignees?: Array<{
    user_id: string;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }>;
  assigned_profile?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  baixa: {
    label: "Baixa",
    className: "bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  },
  média: {
    label: "Média",
    className: "bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-400",
  },
  alta: {
    label: "Alta",
    className: "bg-destructive/20 border-destructive/30 text-destructive",
  },
};

// Cell component for clickable title
function TitleCell({ row }: { row: { original: DemandTableRow } }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/demands/${row.original.id}`)}
      className="text-left font-medium text-foreground hover:text-primary hover:underline transition-colors"
    >
      {row.original.title}
    </button>
  );
}

// Cell component for assignees
function AssigneeCell({ row }: { row: { original: DemandTableRow } }) {
  const assignees: { user_id: string; profile: { full_name: string; avatar_url: string | null } }[] = [];

  // Get assignees from demand_assignees
  if (row.original.demand_assignees?.length) {
    row.original.demand_assignees.forEach((a) => {
      if (a.profile) {
        assignees.push({
          user_id: a.user_id,
          profile: {
            full_name: a.profile.full_name,
            avatar_url: a.profile.avatar_url,
          },
        });
      }
    });
  }

  // Fallback to assigned_profile if no demand_assignees
  if (assignees.length === 0 && row.original.assigned_profile) {
    assignees.push({
      user_id: row.original.id, // Use demand id as fallback
      profile: {
        full_name: row.original.assigned_profile.full_name,
        avatar_url: row.original.assigned_profile.avatar_url,
      },
    });
  }

  if (assignees.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return <AssigneeAvatars assignees={assignees} maxVisible={3} size="sm" />;
}

// Cell component for status
function StatusCell({ row }: { row: { original: DemandTableRow } }) {
  const status = row.original.demand_statuses;
  if (!status) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <Badge
      variant="outline"
      className="border"
      style={{
        backgroundColor: `${status.color}20`,
        borderColor: `${status.color}50`,
        color: status.color,
      }}
    >
      {status.name}
    </Badge>
  );
}

// Cell component for due date
function DueDateCell({ row }: { row: { original: DemandTableRow } }) {
  const dueDate = row.original.due_date;
  if (!dueDate) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const date = new Date(dueDate);
  const isOverdue = date < new Date();

  return (
    <span className={isOverdue ? "text-destructive font-medium" : "text-foreground"}>
      {format(date, "dd/MM/yyyy", { locale: ptBR })}
    </span>
  );
}

// Cell component for priority
function PriorityCell({ row }: { row: { original: DemandTableRow } }) {
  const priority = row.original.priority?.toLowerCase();
  if (!priority) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const config = priorityConfig[priority] || {
    label: priority,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={`border ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export const demandColumns: ColumnDef<DemandTableRow>[] = [
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ row }) => <TitleCell row={row} />,
  },
  {
    id: "assignees",
    header: "Responsável",
    cell: ({ row }) => <AssigneeCell row={row} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell row={row} />,
  },
  {
    accessorKey: "due_date",
    header: "Data de Entrega",
    cell: ({ row }) => <DueDateCell row={row} />,
  },
  {
    accessorKey: "priority",
    header: "Prioridade",
    cell: ({ row }) => <PriorityCell row={row} />,
  },
];
