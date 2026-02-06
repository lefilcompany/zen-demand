

# Plano: Corrigir Redefinicao de Senha

## Problemas Identificados

### 1. Input trava apos cada tecla digitada (BUG CRITICO)
O componente `PageWrapper` esta definido **dentro** da funcao `ResetPassword`. Isso significa que a cada re-render (cada tecla digitada), o React cria uma **nova referencia** de componente, desmonta toda a arvore e remonta do zero. Resultado: o input perde o foco e o usuario nao consegue digitar mais de um caractere.

```text
Tecla digitada
  -> setState (re-render)
  -> PageWrapper e redefinido como nova funcao
  -> React ve componente "diferente"
  -> Desmonta arvore inteira (inputs perdem foco)
  -> Remonta tudo do zero
```

### 2. Senha nao e realmente alterada
A funcao `updatePassword` chama `supabase.auth.updateUser({ password })`, o que depende de uma sessao valida. Porem, ha dois listeners de `onAuthStateChange` concorrentes (um no `AuthContext`, outro no `ResetPassword`), e a logica de sessao do `AuthContext` pode estar interferindo com a sessao de recuperacao. Alem disso, nao ha verificacao pos-update para confirmar que a mudanca foi persistida.

### 3. Redirecionamento incorreto
Apos alterar a senha, o codigo redireciona para `/` (dashboard). O comportamento correto e: deslogar o usuario e redirecionar para `/auth` (tela de login) para que ele entre com a nova senha.

---

## Solucao

### Passo 1: Extrair PageWrapper para fora do componente
Mover a definicao do `PageWrapper` para fora da funcao `ResetPassword`, tornando-o um componente estavel que nao e recriado a cada render.

### Passo 2: Reescrever o fluxo de submit da senha
- Chamar `supabase.auth.updateUser({ password })` diretamente (sem depender do `updatePassword` do AuthContext, que pode ser afetado pelo state management do contexto)
- Verificar o retorno da API para garantir que a senha foi alterada
- Apos sucesso, chamar `supabase.auth.signOut()` para encerrar a sessao de recuperacao
- Limpar localStorage/sessionStorage de preferencias de sessao
- Redirecionar para `/auth`

### Passo 3: Simplificar o listener de auth do ResetPassword
- Remover a dependencia de `pageState` do useEffect do `onAuthStateChange` para evitar resubscricoes desnecessarias
- Usar um `useRef` para trackear o pageState dentro do callback sem causar re-renders do effect

### Passo 4: Proteger contra interferencia do AuthContext
- O `AuthContext` tem logica que pode deslogar o usuario automaticamente (verificacao de `rememberMe`/`sessionOnly`). A pagina `/reset-password` ja e checada com `isPasswordResetPage`, mas vamos garantir que essa protecao funcione em todos os cenarios.

---

## Detalhes Tecnicos

### Arquivos a serem modificados

**`src/pages/ResetPassword.tsx`**:
- Extrair `PageWrapper` como componente no nivel do modulo (fora de `ResetPassword`)
- Passar `authBackground` e `logoSomaDark` como props ou via import direto
- Refatorar `handleSubmit` para:
  1. Chamar `supabase.auth.updateUser({ password })` diretamente
  2. Verificar `data.user` no retorno para confirmar sucesso
  3. Mostrar toast de sucesso
  4. Chamar `supabase.auth.signOut()` para limpar a sessao
  5. Limpar `localStorage.removeItem("rememberMe")` e sessionStorage
  6. Redirecionar para `/auth` apos breve delay (2 segundos para o usuario ver a mensagem de sucesso)
- Corrigir o `useEffect` do `onAuthStateChange` para usar `useRef` ao inves de `pageState` na dependencia
- Remover import de `useAuth` (nao sera mais necessario para `updatePassword`, apenas para `resetPassword` no formulario de reenvio)

**`src/lib/auth.tsx`**:
- Nenhuma mudanca necessaria -- a protecao `isPasswordResetPage` ja existe

### Fluxo apos as mudancas

```text
Usuario clica no link de recuperacao
  -> /reset-password carrega
  -> PASSWORD_RECOVERY event seta pageState = "ready"
  -> Usuario digita nova senha normalmente (PageWrapper estavel)
  -> Clica "Alterar Senha"
  -> supabase.auth.updateUser({ password }) -- senha alterada
  -> supabase.auth.signOut() -- sessao encerrada
  -> Toast "Senha alterada com sucesso!"
  -> Redirect para /auth (2s delay)
  -> Usuario faz login com nova senha
```

