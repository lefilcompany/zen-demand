import type { Subdemand } from "@/hooks/useSubdemands";

/**
 * Status names that count as "execução ativa" — quando subdemandas estão
 * nesses estados, vale a pena pedir confirmação antes de propagar status da pai,
 * pois cronômetros podem estar rodando.
 */
const ACTIVE_STATUS_NAMES = new Set(["Fazendo", "Em Ajuste"]);

/**
 * Adjustment types que indicam um status de finalização/revisão.
 * Esses status, junto com "Entregue", recebem propagação automática.
 */
const FINALIZATION_ADJUSTMENT_TYPES = new Set(["internal", "external"]);

interface BoardStatusLike {
  status_id: string;
  adjustment_type?: string | null;
  status?: { name?: string | null } | null;
}

/**
 * Determina se o status alvo é considerado "de finalização" e portanto
 * dispara a propagação para subdemandas.
 *
 * Critérios:
 * - É o status "Entregue" do sistema, OU
 * - Possui `adjustment_type` igual a 'internal' (Aprovação Interna) ou
 *   'external' (Aprovação do Cliente).
 */
export function isFinalizationStatus(
  boardStatus: BoardStatusLike | null | undefined,
  deliveredStatusId: string | null | undefined
): boolean {
  if (!boardStatus) return false;
  if (deliveredStatusId && boardStatus.status_id === deliveredStatusId) return true;
  if (boardStatus.adjustment_type && FINALIZATION_ADJUSTMENT_TYPES.has(boardStatus.adjustment_type)) {
    return true;
  }
  return false;
}

export interface SubdemandPropagationAnalysis {
  /** Subdemandas que vão ser efetivamente movidas (que ainda não estão no status alvo). */
  toMoveCount: number;
  /** Subdemandas em "Fazendo" ou "Em Ajuste" entre as que serão movidas. */
  activeCount: number;
  /** Subdemandas com cronômetro rodando (last_started_at != null) entre as que serão movidas. */
  runningTimerCount: number;
  /** Se devemos exibir confirmação antes de propagar. */
  needsConfirmation: boolean;
}

/**
 * Analisa as subdemandas e decide se a propagação precisa de confirmação do usuário.
 * Confirmação é exigida quando há subdemandas em execução ativa ou com timer rodando,
 * para alertar o usuário de que cronômetros serão encerrados.
 */
export function analyzeSubdemandsForPropagation(
  subdemands: Subdemand[] | null | undefined,
  targetStatusId: string
): SubdemandPropagationAnalysis {
  const list = (subdemands || []).filter((s) => s.status_id !== targetStatusId);

  let activeCount = 0;
  let runningTimerCount = 0;

  for (const sub of list) {
    const statusName = sub.demand_statuses?.name ?? "";
    if (ACTIVE_STATUS_NAMES.has(statusName)) activeCount += 1;
    // last_started_at é populado quando a subdemanda está em "Fazendo"/"Em Ajuste".
    // Subdemand interface não expõe esse campo no tipo, mas o backend já encerra
    // qualquer timer aberto via demand_time_entries — usamos o status como proxy.
  }

  // Como proxy para "tem timer rodando", contamos quantas estão em status ativo.
  runningTimerCount = activeCount;

  return {
    toMoveCount: list.length,
    activeCount,
    runningTimerCount,
    needsConfirmation: activeCount > 0,
  };
}
