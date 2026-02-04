
# Plano: Exportação de PDF Profissional com Estilização Soma+

## Objetivo
Melhorar significativamente a exportação de PDF da análise de IA, incorporando toda a identidade visual do Soma+ (logo, cores, tipografia) e incluindo informações de copyright e direitos autorais.

## Problemas Identificados no PDF Atual
1. **Sem logo** - O PDF não inclui a marca Soma+
2. **Cores básicas** - Apenas texto preto sem as cores da marca (#F28705, #D95204)
3. **Layout simples** - Apenas texto corrido sem estruturação visual
4. **Sem métricas visuais** - Os dados analíticos não são apresentados graficamente
5. **Sem rodapé/cabeçalho** - Falta informações de copyright e branding

## Solução Proposta

### 1. Criar Utilitário de Exportação PDF Profissional
Criar um novo arquivo `src/lib/pdfExport.ts` com funções reutilizáveis para:

- **Cabeçalho branded**: Logo Soma+ no canto superior + título estilizado
- **Cores da marca**: Uso de #F28705 (laranja primário) e #D95204 (laranja escuro)
- **Seções visuais**: Cards com métricas-chave (total, prazo, atrasadas)
- **Tabelas estilizadas**: Usando jspdf-autotable para dados de equipe e tempo
- **Markdown parsing**: Converter o texto markdown em formatação PDF estruturada
- **Rodapé**: Copyright, data de geração e marca d'água

### 2. Estrutura do PDF Gerado

```text
┌─────────────────────────────────────────┐
│  [LOGO]    Análise Inteligente          │
│            Quadro: Nome do Quadro       │
│            Data: 04/02/2026 às 11:54    │
├─────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 73  │ │ 22% │ │  4  │ │5.1d │       │
│  │Total│ │Prazo│ │Atra │ │Média│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────────────┤
│  RESUMO EXECUTIVO                       │
│  [Texto formatado...]                   │
├─────────────────────────────────────────┤
│  MÉTRICAS DE PERFORMANCE                │
│  [Lista formatada...]                   │
├─────────────────────────────────────────┤
│  EQUIPE                                 │
│  ┌───────────────────────────────────┐  │
│  │ Nome │ Cargo │ Demandas │ Taxa % │  │
│  ├───────────────────────────────────┤  │
│  │ ...  │ ...   │   ...    │  ...   │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  TEMPO INVESTIDO                        │
│  ┌───────────────────────────────────┐  │
│  │ Executor │ Horas │ Demandas      │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  © 2026 Soma+ · Todos direitos reserv. │
│  Gerado automaticamente · Pág 1 de N   │
└─────────────────────────────────────────┘
```

### 3. Componentes Visuais

**Cores utilizadas:**
- Laranja primário: RGB(242, 135, 5) - #F28705
- Laranja escuro: RGB(217, 82, 4) - #D95204
- Laranja claro: RGB(242, 159, 5) - #F29F05
- Fundo cinza: RGB(248, 248, 248)
- Texto: RGB(29, 29, 29) - #1D1D1D

**Elementos visuais:**
- Barras de progresso coloridas
- Ícones de status (usando desenhos geométricos)
- Linhas divisórias com gradiente laranja
- Cards com bordas arredondadas e sombras sutis

### 4. Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/lib/pdfExport.ts` | **Criar** - Utilitário completo de exportação |
| `src/pages/BoardSummary.tsx` | **Modificar** - Usar novo utilitário |
| `src/pages/SharedBoardSummary.tsx` | **Modificar** - Usar novo utilitário |

### 5. Funcionalidades do Novo Utilitário

```typescript
// Funções principais
export async function generateBoardSummaryPDF(params: {
  boardName: string;
  createdAt: Date;
  summaryText: string;
  analytics: BoardAnalytics;
}): Promise<void>

// Funções auxiliares internas
- addHeader(): Adiciona logo e título
- addQuickStats(): Adiciona cards de métricas
- addSectionTitle(): Adiciona títulos de seção estilizados
- addMarkdownContent(): Parseia e formata o markdown
- addMemberTable(): Tabela de membros com jspdf-autotable
- addTimeTable(): Tabela de tempo investido
- addFooter(): Rodapé com copyright em cada página
```

### 6. Texto de Copyright
```
© 2026 Soma+ · Gestão Inteligente de Demandas
Todos os direitos reservados. Este documento foi gerado automaticamente.
A reprodução ou distribuição não autorizada é proibida.
```

---

## Detalhes Técnicos

### Conversão do Logo para Base64
O logo será convertido para base64 e embutido diretamente no código para garantir que funcione offline e sem dependências externas.

### Suporte a Múltiplas Páginas
O jsPDF com autoTable já suporta paginação automática. Adicionaremos:
- Cabeçalho repetido em cada página
- Numeração de páginas no rodapé
- Copyright em todas as páginas

### Tratamento de Texto Longo
- Quebra automática de linhas
- Verificação de espaço restante na página
- Criação de nova página quando necessário

### Qualidade do PDF
- Resolução otimizada para impressão
- Compressão de imagens
- Metadados do documento (título, autor, assunto)

---

## Resultado Esperado
Um PDF profissional e visualmente atraente que:
- Representa fielmente a identidade visual do Soma+
- Apresenta os dados de forma clara e organizada
- Inclui todas as informações legais necessárias
- Funciona em qualquer dispositivo sem dependências externas
- Suporta múltiplas páginas automaticamente
