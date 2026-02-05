

## Correção do Conflito Entre Formulário de Login e Modal de Recuperação de Senha

### Problema Identificado

Quando o usuário pressiona **Enter** dentro do modal de recuperação de senha, o formulário de login na página por trás também é submetido. Isso acontece porque:

1. O Dialog está renderizado fora do form de login, mas ainda dentro da mesma estrutura DOM
2. Pressionar Enter em qualquer input pode "encontrar" e disparar o formulário de login
3. O `e.stopPropagation()` no `handleResetPassword` não é suficiente porque o evento de teclado (Enter) pode acionar o form nativo antes mesmo do handler ser chamado

### Solução Proposta

Vou implementar duas mudanças para garantir isolamento completo:

1. **Adicionar `onKeyDown` no input de reset** para capturar o Enter antes que ele propague
2. **Adicionar handler de `onKeyDown` no DialogContent** para isolar todos os eventos de teclado dentro do modal

### Mudanças Técnicas

**Arquivo:** `src/pages/Auth.tsx`

1. Criar um handler para capturar keydown no Dialog:
```typescript
const handleResetDialogKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.stopPropagation();
  }
};
```

2. Adicionar `onKeyDown` no `DialogContent`:
```tsx
<DialogContent 
  className="sm:max-w-md" 
  onPointerDownOutside={(e) => e.preventDefault()}
  onKeyDown={handleResetDialogKeyDown}
>
```

3. Adicionar `onKeyDown` no Input de reset email para segurança adicional:
```tsx
<Input 
  id="reset-email" 
  type="email" 
  placeholder="seu@email.com" 
  value={resetEmail} 
  onChange={e => setResetEmail(e.target.value)} 
  required 
  autoFocus
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
    }
  }}
/>
```

Isso garante que qualquer tecla Enter pressionada dentro do modal seja capturada e não propague para o formulário de login.

