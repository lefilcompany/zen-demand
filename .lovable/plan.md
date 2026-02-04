
# Plano: Refatoração Completa da Tela de Gerenciamento de Tempo

## Visão Geral

Reconstruir completamente a página de Gerenciamento de Tempo (`/time-management`) com:
- **Restrição de acesso**: Apenas administradores e coordenadores podem visualizar
- **Escopo por quadro**: Dados mudam automaticamente ao trocar de quadro
- **Tempo real**: Contadores atualizam ao vivo quando há timers ativos
- **Demandas ativas visíveis**: Cards destacados mostrando quem está trabalhando agora
- **Gráficos informativos**: Visualizações claras e coloridas do tempo por usuário

---

## Arquitetura de Componentes

```text
TimeManagement.tsx (página principal)
├── Verificação de Permissão (admin/moderator)
├── Header com Indicador do Quadro Atual
├── Seção "Atividade ao Vivo" (demandas com timer ativo)
│   └── ActiveDemandCard (novo componente)
├── Cards de Estatísticas (tempo total, usuários, médias)
├── Gráficos
│   ├── PieChart - Distribuição por Usuário
│   └── BarChart - Top Demandas
├── Ranking de Usuários com Tempo Real
│   └── LiveUserTimeRow (existente, aprimorado)
└── Tabs de Detalhamento
    ├── Por Usuário → UserDetailTimeRow
    └── Por Demanda → DemandDetailTimeRow
```

---

## Alterações por Arquivo

### 1. `src/pages/TimeManagement.tsx` (Refatoração Completa)

**Mudanças Principais:**

1. **Importar hook de verificação de role**
```tsx
import { useIsTeamAdminOrModerator } from "@/hooks/useTeamRole";
```

2. **Adicionar verificação de permissão no início**
```tsx
const { canManage, isLoading: roleLoading } = useIsTeamAdminOrModerator(currentTeamId);

// Bloquear acesso se não for admin/moderator
if (!roleLoading && !canManage && selectedBoardId) {
  return (
    <div className="container mx-auto py-6">
      <Card className="border-destructive/50">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">
            Apenas administradores e coordenadores podem acessar o gerenciamento de tempo.
          </p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

3. **Nova Seção "Atividade ao Vivo"**
   - Mostrar cards destacados para cada demanda com timer ativo
   - Incluir avatar do usuário, nome da demanda, status, tempo corrente
   - Animação pulsante para indicar atividade

4. **Melhorar Cards de Estatísticas**
   - Gradientes e cores mais vibrantes
   - Ícones contextuais
   - Indicadores animados quando há timers ativos

5. **Gráficos Aprimorados**
   - Cores mais vibrantes e temáticas
   - Legendas mais claras
   - Tooltips informativos

6. **Ranking em Tempo Real**
   - Medalhas animadas para top 3
   - Barras de progresso relativas
   - Indicador "Trabalhando agora" com destaque

---

### 2. Novo Componente: `src/components/ActiveDemandCard.tsx`

Card visual para mostrar demandas com timer ativo em destaque:

```tsx
interface ActiveDemandCardProps {
  entry: BoardTimeEntry;
  demandTotalSeconds: number;
}

export function ActiveDemandCard({ entry, demandTotalSeconds }: ActiveDemandCardProps) {
  // Timer ao vivo
  const liveTime = useLiveTimer({
    isActive: true,
    baseSeconds: demandTotalSeconds,
    lastStartedAt: entry.started_at,
  });

  return (
    <Card className="border-emerald-500 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/30 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20">
      <CardContent className="p-4">
        {/* Avatar do usuário com indicador pulsante */}
        {/* Nome da demanda */}
        {/* Status badge */}
        {/* Timer grande e animado */}
        {/* Link para a demanda */}
      </CardContent>
    </Card>
  );
}
```

---

### 3. `src/components/LiveUserTimeRow.tsx` (Aprimoramentos)

Melhorias visuais:
- Medalhas mais elaboradas para top 3
- Barra de progresso com gradientes
- Micro-animações ao atualizar tempo
- Hover states mais evidentes

---

### 4. `src/hooks/useBoardTimeEntries.ts` (Melhorias)

Adicionar dados agregados úteis:
- Demandas com timer ativo (para a seção "Atividade ao Vivo")
- Contagem por status
- Otimização de re-renders com memoização

---

## Estrutura Visual da Nova Tela

```text
┌─────────────────────────────────────────────────────────────┐
│  📊 Gerenciamento de Tempo                                   │
│  Quadro: [Nome do Quadro] ● 3 timers ativos                  │
│  [Exportar PDF]                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ ATIVIDADE AO VIVO (seção destacada, verde)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ 👤 João      │ │ 👤 Maria     │ │ 👤 Pedro     │         │
│  │ Demanda X    │ │ Demanda Y    │ │ Demanda Z    │         │
│  │ 🟢 Fazendo   │ │ 🟠 Em Ajuste │ │ 🟢 Fazendo   │         │
│  │ 02:34:12     │ │ 01:15:45     │ │ 00:45:33     │         │
│  │ (pulsando)   │ │ (pulsando)   │ │ (pulsando)   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ ⏱️ Total │ │ 👥 Users│ │ 📊 Média │ │ 🎯 /Task │           │
│  │ 45:23:10│ │    8    │ │ 05:40:23│ │ 02:15:30│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ 🥧 Tempo por Usuário │  │ 📊 Top Demandas     │          │
│  │    [Pie Chart]      │  │    [Bar Chart]      │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏆 RANKING EM TEMPO REAL                          [Ao Vivo]│
│  ┌────────────────────────────────────────────────────────┐│
│  │ 🥇 João Silva      ████████████████████  15:30:45 🟢  ││
│  │ 🥈 Maria Santos    █████████████         12:45:20     ││
│  │ 🥉 Pedro Costa     ██████████            10:15:10 🟢  ││
│  │ 4. Ana Oliveira    ████████              08:30:00     ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Filtros de Data/Usuário/Status]                          │
├─────────────────────────────────────────────────────────────┤
│  [Por Usuário] [Por Demanda]  ← Tabs de detalhamento       │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Lista expansível com detalhes                          ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Verificação de Permissão
```tsx
// Usa o hook existente de verificação de role
const { canManage, isLoading: roleLoading } = useIsTeamAdminOrModerator(currentTeamId);

// currentTeamId vem do BoardContext - é o team_id do board selecionado
const { selectedBoardId, currentTeamId, currentBoard } = useSelectedBoard();
```

### Dados em Tempo Real
```tsx
// Hook existente já tem realtime configurado
const { data: timeEntries, isLoading: entriesLoading } = useBoardTimeEntries(selectedBoardId);
const { data: userStats, isLoading: statsLoading, activeTimersCount } = useBoardUserTimeStats(selectedBoardId);

// Demandas com timer ativo (filtrar do timeEntries)
const activeDemands = useMemo(() => {
  if (!timeEntries) return [];
  
  const activeMap = new Map();
  timeEntries.filter(e => !e.ended_at).forEach(entry => {
    if (!activeMap.has(entry.demand_id)) {
      activeMap.set(entry.demand_id, {
        entry,
        totalSeconds: timeEntries
          .filter(e => e.demand_id === entry.demand_id)
          .reduce((sum, e) => sum + (e.duration_seconds || 0), 0),
      });
    }
  });
  
  return Array.from(activeMap.values());
}, [timeEntries]);
```

### Mudança de Quadro
O sistema já está configurado para:
1. `useBoardTimeEntries(selectedBoardId)` - Query key inclui boardId
2. Quando o boardId muda, o React Query automaticamente refaz a query
3. O canal de realtime também é recriado para o novo board

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/TimeManagement.tsx` | Modificar | Refatoração completa com restrição de acesso |
| `src/components/ActiveDemandCard.tsx` | Criar | Card para demandas com timer ativo |
| `src/components/LiveUserTimeRow.tsx` | Modificar | Aprimoramentos visuais |
| `src/hooks/useBoardTimeEntries.ts` | Modificar | Adicionar dados de demandas ativas |

---

## Benefícios

1. **Segurança**: Apenas admin/moderator acessam dados sensíveis de tempo
2. **Contexto**: Dados sempre refletem o quadro selecionado
3. **Visibilidade**: Seção "Atividade ao Vivo" mostra quem está trabalhando agora
4. **Tempo Real**: Contadores atualizam automaticamente
5. **Visual**: Design moderno com cores vibrantes e gráficos informativos
6. **Experiência**: Feedback visual claro sobre a produtividade da equipe
