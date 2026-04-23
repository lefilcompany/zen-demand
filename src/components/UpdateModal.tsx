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
      // 1. Clear ONLY service worker caches (NOT localStorage/sessionStorage)
      // This preserves the Supabase auth session so users don't get logged out.
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));

      // 2. Activate new SW
      await updateServiceWorker(true);

      // 3. Soft reload — keeps storage intact
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
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden border-border/60 rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Decorative header band */}
        <div className="relative bg-gradient-to-br from-[#F28705]/10 via-background to-background pt-8 pb-6 px-6 border-b border-border/50">
          <div className="absolute inset-x-0 -top-16 h-32 bg-[#F28705]/10 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />
          <DialogHeader className="items-center text-center gap-5 relative">
            <img src={logo} alt="SoMA" className="h-16 w-auto mx-auto drop-shadow-sm" />
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F28705]/10 border border-[#F28705]/20">
                <Sparkles className="h-3.5 w-3.5 text-[#F28705]" />
                <span className="text-xs font-medium text-[#F28705]">Nova versão disponível</span>
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Novidades no SoMA!
              </DialogTitle>
              <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground max-w-sm mx-auto">
                Uma nova versão está disponível com melhorias e correções.
                Atualize agora para ter a melhor experiência. Sua sessão será mantida.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 p-4 bg-background">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={updating}
            className="sm:flex-1 h-11 rounded-xl"
          >
            Depois
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="sm:flex-1 h-11 rounded-xl bg-[#F28705] hover:bg-[#D97706] text-white shadow-lg shadow-[#F28705]/25 transition-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Atualizando..." : "Atualizar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
