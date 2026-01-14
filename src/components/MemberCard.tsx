import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, Shield, ShieldCheck, User, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TeamMember } from "@/hooks/useTeamMembers";
import { TeamRole } from "@/hooks/useTeamRole";
import { PositionBadge } from "@/components/PositionBadge";
import { PositionSelector } from "@/components/PositionSelector";
import { TeamPosition } from "@/hooks/useTeamPositions";

interface MemberCardProps {
  member: TeamMember;
  isAdmin: boolean;
  currentUserId: string;
  onRemove: (memberId: string) => void;
  isRemoving: boolean;
  canManage?: boolean;
  positions?: TeamPosition[];
  onPositionChange?: (memberId: string, positionId: string | null) => void;
  isChangingPosition?: boolean;
}

const roleConfig: Record<TeamRole, { label: string; badgeColor: string; bannerColor: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrador",
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    bannerColor: "from-red-500/80 via-red-600 to-red-500/60",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: "Coordenador",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    bannerColor: "from-blue-500/80 via-blue-600 to-blue-500/60",
    icon: <Shield className="h-3 w-3" />,
  },
  executor: {
    label: "Agente",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    bannerColor: "from-green-500/80 via-green-600 to-green-500/60",
    icon: <Zap className="h-3 w-3" />,
  },
  requester: {
    label: "Solicitante",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    bannerColor: "from-purple-500/80 via-purple-600 to-purple-500/60",
    icon: <User className="h-3 w-3" />,
  },
};

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function MemberCard({
  member,
  isAdmin,
  currentUserId,
  onRemove,
  isRemoving,
  canManage = false,
  positions = [],
  onPositionChange,
  isChangingPosition = false,
}: MemberCardProps) {
  const navigate = useNavigate();
  const isCurrentUser = member.user_id === currentUserId;
  const canModify = isAdmin && !isCurrentUser;
  const config = roleConfig[member.role];

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${member.user_id}`);
  };

  const handlePositionChange = (positionId: string | null) => {
    if (onPositionChange) {
      onPositionChange(member.id, positionId);
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
      {/* Colored Banner */}
      <div className={`h-14 bg-gradient-to-r ${config.bannerColor}`} />
      
      {/* Remove Button - positioned on banner */}
      {canModify && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive"
                disabled={isRemoving}
              >
                <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}
      
      {/* "You" badge positioned on top right */}
      {isCurrentUser && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="text-xs bg-emerald-500 text-white shadow-md px-2.5 py-0.5 font-medium">
            Você
          </Badge>
        </div>
      )}
      
      {/* Avatar positioned over banner */}
      <div className="relative px-4 pb-4">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
            <AvatarImage src={member.profile.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-xl bg-muted font-semibold">
              {getInitials(member.profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Member Info */}
        <div className="pt-10 text-center space-y-2">
          <button
            type="button"
            onClick={handleNameClick}
            className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] hover:text-primary hover:underline cursor-pointer transition-colors"
          >
            {member.profile.full_name}
          </button>
          
          <p className="text-xs text-muted-foreground">
            Entrou em {format(new Date(member.joined_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
          
          {/* Role Badge - Fixed (not editable in team context) */}
          <div className="pt-1 space-y-2">
            <Badge className={`${config.badgeColor} flex items-center gap-1 justify-center`}>
              {config.icon}
              {config.label}
            </Badge>
            
            {/* Position Badge or Selector */}
            {canManage && positions.length > 0 ? (
              <PositionSelector
                positions={positions}
                value={member.position_id}
                onChange={handlePositionChange}
                disabled={isChangingPosition}
                placeholder="Atribuir cargo"
              />
            ) : member.position ? (
              <PositionBadge
                name={member.position.name}
                color={member.position.color}
                textColor={member.position.text_color}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}