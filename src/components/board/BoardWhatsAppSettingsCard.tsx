import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  boardId: string;
}

export function BoardWhatsAppSettingsCard({ boardId }: Props) {
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState("");

  const { data: board } = useQuery({
    queryKey: ["board-whatsapp", boardId],
    queryFn: async () => {
      const { data } = await supabase
        .from("boards")
        .select("id, name, whatsapp_enabled")
        .eq("id", boardId)
        .maybeSingle();
      return data;
    },
  });

  const { data: keywords } = useQuery({
    queryKey: ["board-whatsapp-keywords", boardId],
    queryFn: async () => {
      const { data } = await supabase
        .from("board_whatsapp_keywords")
        .select("id, keyword")
        .eq("board_id", boardId)
        .order("keyword");
      return data || [];
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("boards").update({ whatsapp_enabled: enabled }).eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-whatsapp", boardId] });
      toast.success("Configuração atualizada");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const addKeyword = useMutation({
    mutationFn: async (kw: string) => {
      const clean = kw.trim().toLowerCase().replace(/^#/, "");
      if (!/^[\p{L}\p{N}_-]{2,30}$/u.test(clean)) {
        throw new Error("Use 2-30 caracteres (letras, números, _ ou -)");
      }
      const { error } = await supabase.from("board_whatsapp_keywords").insert({ board_id: boardId, keyword: clean });
      if (error) {
        if (error.code === "23505") throw new Error("Esta palavra-chave já está em uso em outro quadro");
        throw error;
      }
    },
    onSuccess: () => {
      setNewKeyword("");
      queryClient.invalidateQueries({ queryKey: ["board-whatsapp-keywords", boardId] });
      toast.success("Palavra-chave adicionada");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const removeKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_whatsapp_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-whatsapp-keywords", boardId] }),
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription className="text-xs">
                Receba demandas via WhatsApp neste quadro
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={!!board?.whatsapp_enabled}
            onCheckedChange={(v) => toggleEnabled.mutate(v)}
            disabled={toggleEnabled.isPending}
          />
        </div>
      </CardHeader>
      {board?.whatsapp_enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Palavras-chave (use com # no WhatsApp)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ex: marketing"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword.mutate(newKeyword); } }}
                className="h-9"
                maxLength={30}
              />
              <Button size="sm" onClick={() => addKeyword.mutate(newKeyword)} disabled={!newKeyword.trim() || addKeyword.isPending}>
                {addKeyword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(keywords || []).map((k: any) => (
                <Badge key={k.id} variant="secondary" className="h-7 px-2 gap-1 font-mono">
                  #{k.keyword}
                  <button onClick={() => removeKeyword.mutate(k.id)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!keywords || keywords.length === 0) && (
                <span className="text-[11px] text-muted-foreground">Nenhuma palavra-chave ainda.</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            Membros mandam <code>@soma #palavra-chave sua demanda</code> no WhatsApp. A IA monta título e descrição automaticamente.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
