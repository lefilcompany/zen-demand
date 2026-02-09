

## Corrigir Google OAuth -- Solucao Definitiva

### Problema
O codigo atual tenta usar `supabase.auth.signInWithOAuth` diretamente quando voce acessa pelo dominio customizado (`pla.soma.lefil.com.br`). Mas o projeto Supabase NAO tem o Google Client ID/Secret configurado diretamente nele -- esses dados estao apenas no broker do Lovable Cloud. Por isso da o erro "missing OAuth secret".

### Solucao
Remover toda a logica condicional e usar **SEMPRE** o broker do Lovable Cloud (`lovable.auth.signInWithOAuth`) em qualquer dominio. O parametro `redirect_uri: window.location.origin` garante que apos autenticar, o usuario volta para o dominio de onde veio (seja `pla.soma.lefil.com.br`, preview, etc).

O broker ja esta configurado com a URL correta (`oauthBrokerUrl`) no arquivo `src/integrations/lovable/index.ts`, entao ele funciona independente do dominio.

### Arquivo modificado: `src/components/GoogleSignInButton.tsx`

Simplificar para:

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error("Erro ao entrar com Google", {
        description: err?.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ... botao permanece igual
}
```

### O que muda
- Remove import do `supabase` (nao precisa mais)
- Remove toda a deteccao de dominio (`isEditorPreview`, etc)
- Remove o fallback para `supabase.auth.signInWithOAuth` que causava o erro
- Usa SEMPRE `lovable.auth.signInWithOAuth` com `redirect_uri: window.location.origin`

### Por que funciona
- O broker do Lovable Cloud tem os credentials do Google configurados
- O `redirect_uri` garante que voce volta para `pla.soma.lefil.com.br` (ou qualquer dominio que esteja usando)
- O `oauthBrokerUrl` no `src/integrations/lovable/index.ts` ja aponta para o broker correto

### Requisito no Google Cloud Console
Certifique-se de que a URL de callback do Supabase esta nos **Authorized redirect URIs** do Google:
```
https://dcojvsftpzwfhgvamdgm.supabase.co/auth/v1/callback
```

