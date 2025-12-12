import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface LogoutDialogProps {
  isCollapsed?: boolean;
}

export function LogoutDialog({ isCollapsed }: LogoutDialogProps) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton tooltip={t("auth.logout")} className="w-full hover:bg-sidebar-accent transition-colors">
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>{t("auth.logout")}</span>}
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("auth.logoutConfirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("auth.logoutDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t("auth.logout")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
