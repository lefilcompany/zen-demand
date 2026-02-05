
# Plano: Verificação e Correção do Fluxo de Recuperação de Senha

## Resumo Executivo

Após análise detalhada do código, identifiquei que o sistema tem duas formas de envio de email:

1. **Emails Transacionais** (notificações, ajustes): Usam a edge function `send-email` com Resend ✓
2. **Emails de Autenticação** (recuperação de senha): Usam o sistema nativo do Supabase Auth

O problema potencial é que os emails de recuperação de senha podem não estar sendo enviados corretamente porque o **SMTP customizado do Resend não está configurado nas configurações de autenticação do Supabase**.

---

## Análise do Fluxo Atual

### 1. Solicitação de Reset

```text
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Auth.tsx       │ ──── │  auth.tsx    │ ──── │  Supabase Auth  │
│  (Formulário)   │      │  (Context)   │      │  (Envia Email)  │
└─────────────────┘      └──────────────┘      └─────────────────┘
         │                                              │
         │  Email do usuário                            │
         ├──────────────────────────────────────────────┤
                                                        │
                                               ┌────────▼────────┐
                                               │  Email Default  │
                                               │  Supabase SMTP  │
                                               │  (Rate Limited) │
                                               └─────────────────┘
```

### 2. Recebimento do Link
- Usuário recebe email com link: `https://pla.soma.lefil.com.br/reset-password#access_token=...&type=recovery`

### 3. Página ResetPassword.tsx
- Detecta o token na URL
- Escuta evento `PASSWORD_RECOVERY`
- Permite alterar senha

---

## Problemas Identificados

### Problema 1: SMTP do Resend Não Configurado para Auth

O Resend está sendo usado apenas nas edge functions personalizadas (`send-email`, `notify-demand-request`). Os emails de autenticação do Supabase (incluindo recuperação de senha) usam o SMTP padrão do Supabase que:
- Tem rate limits baixos (3 emails/hora)
- Pode cair em spam
- Usa domínio genérico

**Solução**: Configurar SMTP customizado nas configurações de autenticação do Supabase com as credenciais do Resend.

### Problema 2: URL de Redirecionamento

A URL `redirectTo` precisa estar na lista de URLs permitidas:
- `https://pla.soma.lefil.com.br/reset-password`
- `https://id-preview--74839b7a-ef2a-44d4-8ac6-301dbb814ccc.lovable.app/reset-password`

---

## Passos para Correção

### Passo 1: Configurar SMTP Customizado no Supabase Auth

Para que os emails de recuperação de senha sejam enviados via Resend, é necessário acessar as configurações do backend (Lovable Cloud) e configurar:

| Campo | Valor |
|-------|-------|
| **SMTP Host** | `smtp.resend.com` |
| **SMTP Port** | `465` (SSL) ou `587` (TLS) |
| **SMTP User** | `resend` |
| **SMTP Password** | Sua chave de API do Resend |
| **Sender Email** | `noreply@pla.soma.lefil.com.br` |
| **Sender Name** | `SoMA+` |

### Passo 2: Verificar URLs Permitidas

Nas configurações de autenticação, adicionar URLs de redirecionamento:
- `https://pla.soma.lefil.com.br/**`
- `https://*.lovable.app/**`

### Passo 3: Teste End-to-End

Após configuração, testar:
1. Solicitar recuperação de senha
2. Verificar recebimento do email
3. Clicar no link e verificar redirecionamento
4. Alterar senha com sucesso

---

## Seção Técnica

### Código Atual (Correto)

**src/lib/auth.tsx** - Função resetPassword:
```typescript
const resetPassword = async (email: string) => {
  const redirectUrl = `${baseUrl}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw error;
};
```

**src/pages/ResetPassword.tsx** - Detecção de Token:
```typescript
// Verifica token na URL
if (params.access_token && params.type === "recovery") {
  setPageState("loading");
}

// Escuta evento PASSWORD_RECOVERY
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    setPageState("ready");
  }
});
```

### Configuração SMTP Necessária

Para habilitar o Resend como SMTP para autenticação, você precisa acessar:

1. **Lovable Cloud** → **Authentication** → **SMTP Settings**
2. Habilitar "Custom SMTP"
3. Inserir credenciais do Resend

### Edge Function vs Supabase Auth

| Funcionalidade | Método | Status |
|----------------|--------|--------|
| Notificações de demanda | Edge Function `send-email` | ✅ Usando Resend |
| Notificações de ajuste | Edge Function `notify-demand-request` | ✅ Usando Resend |
| Recuperação de senha | Supabase Auth nativo | ⚠️ SMTP padrão |
| Confirmação de email | Supabase Auth nativo | ⚠️ SMTP padrão |

---

## Ações Necessárias

1. **Configurar SMTP Resend** nas configurações de autenticação do Lovable Cloud
2. **Verificar domínio** - O domínio `pla.soma.lefil.com.br` precisa estar verificado no Resend
3. **Testar fluxo completo** após configuração

---

## Observações

O código frontend está corretamente implementado. O problema está na **configuração de infraestrutura** (SMTP não configurado para Auth). Após configurar o SMTP customizado com Resend, os emails de recuperação de senha serão enviados corretamente pelo mesmo serviço já utilizado nas outras funcionalidades do sistema.
