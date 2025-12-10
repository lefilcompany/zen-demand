import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, ShieldCheck, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TeamMember } from "@/hooks/useTeamMembers";
import { TeamRole } from "@/hooks/useTeamRole";

interface MemberCardProps {
  member: TeamMember;
  isAdmin: boolean;
  currentUserId: string;
  onRoleChange: (memberId: string, newRole: TeamRole) => void;
  onRemove: (memberId: string) => void;
  isUpdating: boolean;
  isRemoving: boolean;
}

const roleConfig: Record<TeamRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrador",
    color: "bg-primary text-primary-foreground",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: "Moderador",
    color: "bg-secondary text-secondary-foreground",
    icon: <Shield className="h-3 w-3" />,
  },
  requester: {
    label: "Solicitante",
    color: "bg-muted text-muted-foreground",
    icon: <User className="h-3 w-3" />,
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberCard({
  member,
  isAdmin,
  currentUserId,
  onRoleChange,
  onRemove,
  isUpdating,
  isRemoving,
}: MemberCardProps) {
  const isCurrentUser = member.user_id === currentUserId;
  const canModify = isAdmin && !isCurrentUser;
  const config = roleConfig[member.role];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(member.profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.profile.full_name}</span>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                Você
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Entrou em {format(new Date(member.joined_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canModify ? (
          <Select
            value={member.role}
            onValueChange={(value) => onRoleChange(member.id, value as TeamRole)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Administrador
                </div>
              </SelectItem>
              <SelectItem value="moderator">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Moderador
                </div>
              </SelectItem>
              <SelectItem value="requester">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Solicitante
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge className={`${config.color} flex items-center gap-1`}>
            {config.icon}
            {config.label}
          </Badge>
        )}

        {canModify && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isRemoving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover membro</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover <strong>{member.profile.full_name}</strong> da equipe? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove(member.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
