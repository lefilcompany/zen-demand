

## Implementacao do Login com Google OAuth - Captura Completa de Dados

### Resumo
Adicionar login com Google nas telas de autenticacao, capturando todos os dados possiveis (nome, email, foto de perfil). Tambem adicionar colunas `phone`, `state` e `city` na tabela `profiles` para que o cadastro manual salve esses dados corretamente, e atualizar o trigger do banco para mapear todos os campos.

### O que o Google fornece automaticamente
- **Nome completo** (full_name) -- salvo automaticamente
- **Foto de perfil** (avatar_url) -- salva automaticamente  
- **Email** -- gerenciado pela autenticacao, nao precisa de coluna extra
- **Locale** (idioma/regiao) -- disponivel nos metadados

### O que o Google NAO fornece
- Telefone, estado, cidade -- esses dados so sao coletados no cadastro manual

### Etapas

1. **Adicionar colunas na tabela `profiles`**
   - `phone` (text, nullable)
   - `state` (text, nullable)
   - `city` (text, nullable)
   - Isso permite que o cadastro manual salve telefone, estado e cidade

2. **Atualizar o trigger `handle_new_user`**
   - Capturar `phone`, `state`, `city` e `locale` dos metadados do usuario
   - Para cadastro manual: pega phone/state/city que serao passados via `signUp`
   - Para Google: pega full_name, avatar_url e locale automaticamente

3. **Atualizar a funcao `signUp` no `src/lib/auth.tsx`**
   - Passar `phone`, `state` e `city` como `data` (metadados) no `signUp`
   - Atualmente so passa `full_name`

4. **Atualizar `handleSignup` em `src/pages/Auth.tsx`**
   - Passar phone, state e city para a funcao `signUp`

5. **Configurar o provedor Google no Lovable Cloud**
   - Usar a ferramenta `configure-social-auth` para gerar o modulo de integracao

6. **Adicionar botao "Continuar com Google" em `src/pages/Auth.tsx`**
   - Botao com icone SVG do Google
   - Separador visual "ou" entre formulario e botao
   - Aparece tanto na tab Login quanto Cadastrar

7. **Adicionar botao "Continuar com Google" em `src/components/get-started/AuthStep.tsx`**
   - Mesma logica para consistencia

### Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.profiles 
  ADD COLUMN phone text,
  ADD COLUMN state text,
  ADD COLUMN city text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone, state, city)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city'
  );
  
  IF (SELECT COUNT(*) FROM public.profiles) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'member');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Assinatura atualizada do signUp:**
```typescript
signUp: (email, password, fullName, phone?, state?, city?) => Promise<void>
```

**Chamada Google OAuth:**
```typescript
import { lovable } from "@/integrations/lovable/index";

const handleGoogleSignIn = async () => {
  const { error } = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (error) toast.error("Erro ao entrar com Google");
};
```

**Fluxo Google:**
```text
Usuario clica "Continuar com Google"
  -> Redirecionado para tela Google
  -> Google retorna com token
  -> Trigger salva: full_name, avatar_url (foto)
  -> phone/state/city ficam null (Google nao fornece)
  -> onAuthStateChange detecta SIGNED_IN
  -> Redirecionado para /welcome
```

### Arquivos Modificados
- `src/lib/auth.tsx` -- Atualizar signUp para aceitar phone/state/city
- `src/pages/Auth.tsx` -- Botao Google + passar dados extras no signup
- `src/components/get-started/AuthStep.tsx` -- Botao Google

### Arquivos Gerados Automaticamente
- `src/integrations/lovable/` -- Gerado pela ferramenta configure-social-auth

### Migracao de Banco
- Adicionar colunas phone, state, city na tabela profiles
- Atualizar trigger handle_new_user
