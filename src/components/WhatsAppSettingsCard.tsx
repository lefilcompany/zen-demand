import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";

export function WhatsAppSettingsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-whatsapp", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("whatsapp_phone, whatsapp_verified_at, default_whatsapp_board_id")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myBoards } = useQuery({
    queryKey: ["my-boards-for-whatsapp", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("board_members")
        .select("board_id, boards!inner(id, name, whatsapp_enabled)")
        .eq("user_id", user.id);
      return (data || [])
        .map((m: any) => m.boards)
        .filter((b: any) => b?.whatsapp_enabled);
    },
    enabled: !!user?.id,
  });

  const setDefaultBoard = useMutation({
    mutationFn: async (boardId: string | null) => {
      const { error } = await supabase
        .from("profiles")
        .update({ default_whatsapp_board_id: boardId })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-whatsapp"] });
      toast.success("Quadro padrão atualizado");
    },
  });

  async function handleSendCode() {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-verify-phone", {
        body: { action: "send", phone },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Código enviado pelo WhatsApp");
      setStep("code");
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("Telefone inválido")) {
        toast.error("Número inválido", { description: "Use o formato internacional, ex: +5511999999999" });
      } else if (msg.includes("vinculado a outra conta")) {
        toast.error("Número já em uso", { description: "Este telefone já está vinculado a outra conta." });
      } else {
        toast.error("Falha ao enviar código", { description: msg });
      }
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-verify-phone", {
        body: { action: "verify", phone, code },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("WhatsApp verificado!");
      setStep("idle");
      setEditing(false);
      setPhone("");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["profile-whatsapp"] });
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("Código incorreto")) {
        toast.error("Código errado", { description: "O código digitado está incorreto. Tente novamente." });
      } else if (msg.includes("expirado")) {
        toast.error("Código expirado", { description: "O código expirou. Solicite um novo código." });
      } else if (msg.includes("já utilizado")) {
        toast.error("Código já usado", { description: "Este código já foi utilizado. Solicite um novo." });
      } else if (msg.includes("Muitas tentativas")) {
        toast.error("Muitas tentativas", { description: "Você excedeu o limite de tentativas. Solicite um novo código." });
      } else if (msg.includes("Solicite um novo código")) {
        toast.error("Código inválido", { description: "Solicite um novo código e tente novamente." });
      } else if (msg.includes("Código inválido")) {
        toast.error("Código inválido", { description: "Digite o código de 6 dígitos enviado por WhatsApp." });
      } else {
        toast.error("Falha ao verificar", { description: msg });
      }
    } finally {
      setVerifying(false);
    }
  }

  const verified = !!profile?.whatsapp_verified_at;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">WhatsApp</CardTitle>
            <CardDescription className="text-xs">
              Crie demandas enviando uma mensagem com <code className="text-primary">@soma</code>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified && !editing ? (
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="font-mono text-sm truncate">{profile?.whatsapp_phone}</span>
              <Badge variant="outline" className="text-[10px] h-5">verificado</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setStep("idle"); setPhone(profile?.whatsapp_phone || ""); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="wa-phone" className="text-xs">Número (formato internacional)</Label>
            <div className="flex gap-2">
              <Input
                id="wa-phone"
                placeholder="+5511999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "code" || sending}
                className="h-9"
              />
              {step === "idle" && (
                <Button onClick={handleSendCode} disabled={!phone || sending} size="sm">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
                </Button>
              )}
            </div>
            {step === "code" && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="wa-code" className="text-xs">Código recebido por WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    id="wa-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="h-9 font-mono tracking-widest"
                  />
                  <Button onClick={handleVerify} disabled={code.length !== 6 || verifying} size="sm">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setStep("idle"); setCode(""); }}>
                  Reenviar código
                </Button>
              </div>
            )}
          </div>
        )}

        {verified && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs">Quadro padrão (quando não informar #palavra-chave)</Label>
            <Select
              value={profile?.default_whatsapp_board_id || "none"}
              onValueChange={(v) => setDefaultBoard.mutate(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(myBoards || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Exemplo: <code>@soma #marketing fazer banner</code> ou apenas <code>@soma fazer banner</code> (usa o quadro padrão).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
