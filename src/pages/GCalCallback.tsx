import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function GCalCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "error">("processing");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      toast.error("Autorização do Google Calendar cancelada");
      navigate("/settings", { replace: true });
      return;
    }

    if (!code) {
      toast.error("Código de autorização não encontrado");
      navigate("/settings", { replace: true });
      return;
    }

    const userId = state || sessionStorage.getItem("gcal_user_id");
    const redirectUri = sessionStorage.getItem("gcal_redirect_uri") || `${window.location.origin}/settings/gcal-callback`;

    if (!userId) {
      toast.error("Sessão expirada. Tente conectar novamente.");
      navigate("/settings", { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("google-calendar-auth", {
          body: {
            action: "callback",
            code,
            redirectUri,
            userId,
          },
        });

        if (fnError) throw fnError;

        if (data?.success) {
          sessionStorage.removeItem("gcal_user_id");
          sessionStorage.removeItem("gcal_redirect_uri");
          toast.success("Google Calendar conectado com sucesso!");
          navigate("/settings", { replace: true });
        } else {
          throw new Error(data?.error || "Falha ao conectar");
        }
      } catch (err: any) {
        console.error("GCal callback error:", err);
        setStatus("error");
        toast.error("Erro ao conectar Google Calendar. Tente novamente.");
        setTimeout(() => navigate("/settings", { replace: true }), 2000);
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "processing" ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Conectando Google Calendar...</p>
          </>
        ) : (
          <p className="text-destructive">Erro ao conectar. Redirecionando...</p>
        )}
      </div>
    </div>
  );
}
