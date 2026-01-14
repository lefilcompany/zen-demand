import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useShareToken, useCreateShareToken, useRevokeShareToken } from "@/hooks/useShareDemand";
import { useAuth } from "@/lib/auth";
import { Share2, Copy, Check, Link, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareDemandButtonProps {
  demandId: string;
}

export function ShareDemandButton({ demandId }: ShareDemandButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  
  const { data: existingToken, isLoading: isLoadingToken } = useShareToken(demandId);
  const createToken = useCreateShareToken();
  const revokeToken = useRevokeShareToken();

  const shareUrl = existingToken 
    ? `${window.location.origin}/shared/${existingToken.token}` 
    : null;

  const handleCreateLink = async () => {
    if (!user) return;
    
    try {
      await createToken.mutateAsync({ demandId, userId: user.id });
      toast.success("Link de compartilhamento criado!");
    } catch (error) {
      toast.error("Erro ao criar link de compartilhamento");
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleRevokeLink = async () => {
    if (!existingToken) return;
    
    try {
      await revokeToken.mutateAsync(existingToken.id);
      toast.success("Link de compartilhamento revogado!");
    } catch (error) {
      toast.error("Erro ao revogar link");
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="flex-1 sm:flex-none"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartilhar Demanda
            </DialogTitle>
            <DialogDescription>
              Crie um link público para compartilhar esta demanda. Quem tiver o link poderá visualizar, 
              mas não editar a demanda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingToken ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-600 font-medium">Link ativo</span>
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl || ""} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={handleRevokeLink}
                    disabled={revokeToken.isPending}
                  >
                    {revokeToken.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ao revogar o link, ele deixará de funcionar e quem tentar acessá-lo verá uma mensagem de erro.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Qualquer pessoa com o link pode visualizar
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Inclui descrição, status e comentários
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Não é possível editar sem login
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Você pode revogar o link a qualquer momento
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handleCreateLink}
                  disabled={createToken.isPending}
                  className="w-full"
                >
                  {createToken.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Criar Link de Compartilhamento
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
