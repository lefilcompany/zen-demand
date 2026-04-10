
# Plano: Redesign do Modal de Criação de Demanda

## Resumo
Redesenhar o modal de criação de demanda com efeito glassmorphism (estilo Apple) e transformar o seletor de prioridade em cards visuais interativos que explicam o impacto de cada nível.

## O que muda para o usuário
- Modal com visual mais moderno, com fundo translúcido e blur (efeito vidro)
- Campos agrupados em seções com bordas glass
- Prioridade deixa de ser um dropdown simples e passa a ser 3 cards selecionáveis (Baixa, Média, Alta) com ícone, cor, e descrição do impacto
- Inputs e selects com estilo glass sutil (borda translúcida, fundo semi-transparente)

## Detalhes técnicos

### 1. Glassmorphism no DialogContent (`CreateDemand.tsx`)
- Aplicar `bg-background/80 backdrop-blur-xl border-white/10` no `DialogContent`
- Agrupar campos em seções com containers glass: `bg-white/5 dark:bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm`
- Header e footer com fundo glass separado

### 2. Cards de Prioridade (novo componente `PriorityCards.tsx`)
- Substituir o `<Select>` de prioridade por 3 cards clicáveis lado a lado
- Cada card terá:
  - **Baixa** (verde): ícone de escudo, texto "Sem urgência, prazo flexível"
  - **Média** (amarelo): ícone de relógio, texto "Prazo padrão, atenção moderada"
  - **Alta** (vermelho): ícone de alerta, texto "Urgente, requer ação imediata"
- Card selecionado terá borda colorida + glow sutil
- Cards não selecionados ficam com opacidade reduzida

### 3. Seções Glass agrupadas
- **Seção 1**: Quadro + Título (campos essenciais)
- **Seção 2**: Serviço + Responsáveis
- **Seção 3**: Priority Cards (largura total, destaque visual)
- **Seção 4**: Status + Data de Entrega (2 colunas)
- **Seção 5**: Descrição
- **Seção 6**: Anexos + Recorrência

### 4. Estilos glass nos inputs
- Adicionar classes utilitárias glass nos `SelectTrigger` e `Input`: fundo semi-transparente com borda sutil

### Arquivos modificados
- `src/pages/CreateDemand.tsx` — layout glass + seções + priority cards inline
- `src/index.css` — classes utilitárias `.glass-card` e `.glass-input` (opcional)
