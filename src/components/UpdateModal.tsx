import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/logo-soma.png";
import logoDark from "@/assets/logo-soma-dark.png";

const POLL_INTERVAL = 60 * 1000; // 60s

export function UpdateModal() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, POLL_INTERVAL);
      }
    },
  });

  const [open, setOpen] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { resolvedTheme } = useTheme();

  const logo = resolvedTheme === "dark" ? logoDark : logoLight;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      // 1. Preserve Supabase auth tokens
      const preserved: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-") && key.includes("auth-token")) {
          preserved[key] = localStorage.getItem(key) || "";
        }
      }

      // 2. Clear all SW caches
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));

      // 3. Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // 4. Restore auth tokens
      Object.entries(preserved).forEach(([k, v]) => {
        localStorage.setItem(k, v);
      });

      // 5. Activate new SW
      await updateServiceWorker(true);

      // 6. Force reload
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch {
      window.location.reload();
    }
  };

  if (!needRefresh) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center gap-4">
          <img src={logo} alt="SoMA" className="h-10 w-auto mx-auto" />
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-[#F28705]" />
            <DialogTitle className="text-xl">Novidades no SoMA!</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            Uma nova versão está disponível com melhorias e correções.
            Atualize agora para ter a melhor experiência.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={updating}
            className="sm:flex-1"
          >
            Depois
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="sm:flex-1 bg-[#F28705] hover:bg-[#D97706] text-white"
          >
            {updating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {updating ? "Atualizando..." : "Atualizar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
