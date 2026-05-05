import { useState, useMemo, useCallback } from "react";
import { useCreateBoard, type CreateBoardData } from "@/hooks/useBoards";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useServices } from "@/hooks/useServices";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical,
  Package, Users, Layers, FileText, Search, AlertCircle, Lock, ShieldCheck, Shield, Wrench, MessageSquare,
  CircleDot, ClipboardCheck, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ADJUSTMENT_OPTIONS = [
  { value: "none" as const, label: "Normal", icon: CircleDot, description: "Etapa de trabalho padrão" },
  { value: "internal" as const, label: "Aprov. Interna", icon: ClipboardCheck, description: "Aprovação da equipe interna" },
  { value: "external" as const, label: "Aprov. Externa", icon: UserCheck, description: "Aprovação do cliente" },
];

const STAGE_PRESET_COLORS = [
  "#6B7280", "#1D1D1D", "#3B82F6", "#0EA5E9",
  "#10B981", "#22C55E", "#F59E0B", "#F28705",
  "#EF4444", "#EC4899", "#9333EA", "#6366F1",
];

interface StageColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

function StageColorPicker({ value, onChange, disabled }: StageColorPickerProps) {
  const [hex, setHex] = useState(value);
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-8 w-8 rounded-md border border-border shrink-0 shadow-sm transition-all",
            "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100"
          )}
          style={{ backgroundColor: value }}
          title="Escolher cor"
          aria-label="Escolher cor"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cores sugeridas</p>
            <div className="grid grid-cols-6 gap-1.5">
              {STAGE_PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setHex(c); }}
                  className={cn(
                    "h-7 w-7 rounded-md border transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary",
                    value.toUpperCase() === c.toUpperCase()
                      ? "border-foreground ring-2 ring-primary/50 scale-110"
                      : "border-border"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Cor personalizada</p>
            <div className="flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0 rounded-md border border-border overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundColor: value }} />
                <input
                  type="color"
                  value={value}
                  onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Seletor de cor"
                />
              </div>
              <Input
                value={hex}
                onChange={(e) => {
                  const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  setHex(v.toUpperCase());
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                }}
                placeholder="#RRGGBB"
                maxLength={7}
                className="h-9 font-mono uppercase text-xs"
              />
            </div>
            {!isValidHex && hex.length > 0 && (
              <p className="text-[10px] text-destructive">Formato esperado: #RRGGBB</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type AdjustmentType = "none" | "internal" | "external";

const ADJUSTMENT_STYLES: Record<AdjustmentType, { dot: string; tint: string; ring: string; label: string }> = {
  none:     { dot: "bg-muted-foreground", tint: "bg-muted/40",         ring: "ring-muted-foreground/40", label: "text-foreground" },
  internal: { dot: "bg-blue-500",         tint: "bg-blue-500/10",      ring: "ring-blue-500/50",         label: "text-blue-700 dark:text-blue-400" },
  external: { dot: "bg-purple-500",       tint: "bg-purple-500/10",    ring: "ring-purple-500/50",       label: "text-purple-700 dark:text-purple-400" },
};

interface AdjustmentTypePickerProps {
  value: AdjustmentType;
  onChange: (v: AdjustmentType) => void;
  disabled?: boolean;
}

function AdjustmentTypePicker({ value, onChange, disabled }: AdjustmentTypePickerProps) {
  const current = ADJUSTMENT_OPTIONS.find((o) => o.value === value) ?? ADJUSTMENT_OPTIONS[0];
  const Icon = current.icon;
  const style = ADJUSTMENT_STYLES[value];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium shrink-0 transition-all w-[150px]",
            style.tint,
            style.label,
            "hover:border-foreground/30 focus:outline-none focus:ring-2",
            style.ring,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title={current.description}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
          <Icon className="h-3.5 w-3.5 opacity-80 shrink-0" />
          <span className="flex-1 text-left truncate">{current.label}</span>
          <svg className="h-3 w-3 opacity-50 group-hover:opacity-80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5" align="end">
        <div className="space-y-0.5">
          {ADJUSTMENT_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const s = ADJUSTMENT_STYLES[opt.value];
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "w-full flex items-start gap-2.5 rounded-md p-2 text-left transition-colors",
                  selected ? cn(s.tint, "ring-1", s.ring) : "hover:bg-muted/60"
                )}
              >
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", s.tint)}>
                  <OptIcon className={cn("h-4 w-4", s.label)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-semibold", selected && s.label)}>{opt.label}</span>
                    {selected && <Check className={cn("h-3.5 w-3.5", s.label)} />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
type BoardRole = "admin" | "moderator" | "executor" | "requester";

interface Stage {
  id: string;
  name: string;
  color: string;
  adjustment_type: AdjustmentType;
  locked?: boolean; // "Entregue"
}

interface SelectedService {
  serviceId: string;
  serviceName: string;
  monthlyLimit: number;
}

const makeStageId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `stage-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const DEFAULT_STAGES: Stage[] = [
  { id: makeStageId(), name: "A Iniciar", color: "#6B7280", adjustment_type: "none" },
  { id: makeStageId(), name: "Fazendo", color: "#3B82F6", adjustment_type: "none" },
  { id: makeStageId(), name: "Aprovação Interna", color: "#3B82F6", adjustment_type: "internal" },
  { id: makeStageId(), name: "Em Ajuste", color: "#9333EA", adjustment_type: "none" },
  { id: makeStageId(), name: "Entregue", color: "#10B981", adjustment_type: "none", locked: true },
];

const STAGE_COLORS = ["#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#9333EA", "#F28705", "#EC4899"];

const ROLE_OPTIONS: { value: BoardRole; label: string; short: string; icon: React.ElementType; color: string }[] = [
  { value: "admin", label: "Administrador", short: "Admin", icon: ShieldCheck, color: "text-red-600" },
  { value: "moderator", label: "Coordenador", short: "Coord", icon: Shield, color: "text-blue-600" },
  { value: "executor", label: "Agente", short: "Agente", icon: Wrench, color: "text-green-600" },
  { value: "requester", label: "Solicitante", short: "Solic", icon: MessageSquare, color: "text-purple-600" },
];

interface StepDef {
  key: string;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  { key: "info", label: "Informações", icon: FileText },
  { key: "stages", label: "Etapas", icon: Layers },
  { key: "members", label: "Membros", icon: Users },
  { key: "services", label: "Serviços", icon: Package },
];

interface CreateBoardWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function CreateBoardWizard({ onComplete, onCancel }: CreateBoardWizardProps) {
  const { selectedTeamId } = useSelectedTeam();
  const createBoard = useCreateBoard();
  const { data: teamServices, isLoading: servicesLoading } = useServices(selectedTeamId);
  const { data: teamMembers } = useTeamMembers(selectedTeamId);

  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);

  // Step 3
  const [memberRoles, setMemberRoles] = useState<Map<string, BoardRole>>(new Map());
  const [memberSearch, setMemberSearch] = useState("");

  // Step 4
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    // Exclude team admins (auto-added as moderator) and current user (auto-added as admin)
    const eligible = teamMembers.filter((m) => m.role !== "owner");
    if (!memberSearch.trim()) return eligible;
    const q = memberSearch.toLowerCase();
    return eligible.filter((m) => m.profile.full_name.toLowerCase().includes(q));
  }, [teamMembers, memberSearch]);

  const toggleMember = useCallback((userId: string) => {
    setMemberRoles((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) next.delete(userId);
      else next.set(userId, "executor");
      return next;
    });
  }, []);

  const setRole = useCallback((userId: string, role: BoardRole) => {
    setMemberRoles((prev) => {
      const next = new Map(prev);
      next.set(userId, role);
      return next;
    });
  }, []);

  // Stage handlers
  const addStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Já existe uma etapa com esse nome");
      return;
    }
    setError("");
    // Insert before "Entregue"
    const idx = stages.findIndex((s) => s.locked);
    const insertIdx = idx >= 0 ? idx : stages.length;
    const next = [...stages];
    next.splice(insertIdx, 0, { id: makeStageId(), name: trimmed, color: newStageColor, adjustment_type: "none" });
    setStages(next);
    setNewStageName("");
  };

  const removeStage = (idx: number) => {
    if (stages[idx].locked) return;
    setStages(stages.filter((_, i) => i !== idx));
  };

  const updateStage = (idx: number, patch: Partial<Stage>) => {
    setStages(stages.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  // Drag and drop for stages (smooth, with @dnd-kit)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      if (prev[oldIndex].locked) return prev;
      const moved = arrayMove(prev, oldIndex, newIndex);
      // Always keep locked stages anchored at the end
      const unlocked = moved.filter((s) => !s.locked);
      const locked = moved.filter((s) => s.locked);
      return [...unlocked, ...locked];
    });
  };

  // Service handlers
  const toggleService = (id: string, name: string, checked: boolean) => {
    if (checked) setSelectedServices((p) => [...p, { serviceId: id, serviceName: name, monthlyLimit: 0 }]);
    else setSelectedServices((p) => p.filter((s) => s.serviceId !== id));
  };
  const setLimit = (id: string, limit: number) => {
    setSelectedServices((p) => p.map((s) => (s.serviceId === id ? { ...s, monthlyLimit: limit } : s)));
  };

  // Validation per step
  const validateStep = (): string | null => {
    if (stepIdx === 0) {
      const t = name.trim();
      if (!t) return "Nome do quadro é obrigatório";
      if (t.length > 100) return "Nome deve ter no máximo 100 caracteres";
    }
    if (stepIdx === 1) {
      if (stages.length < 2) return "O quadro precisa de pelo menos 2 etapas";
      if (!stages.some((s) => s.locked && s.name === "Entregue")) return "A etapa 'Entregue' é obrigatória";
    }
    if (stepIdx === 3) {
      if (!teamServices || teamServices.length === 0) return "Cadastre serviços antes de criar o quadro";
      if (selectedServices.length === 0) return "Selecione ao menos um serviço";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError("");
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    if (!selectedTeamId) { setError("Equipe não selecionada"); return; }
    setError("");

    const payload: CreateBoardData = {
      team_id: selectedTeamId,
      name: name.trim(),
      description: description.trim() || null,
      services: selectedServices.map((s) => ({ service_id: s.serviceId, monthly_limit: s.monthlyLimit })),
      stages: stages.map((s) => ({ name: s.name, color: s.color, adjustment_type: s.adjustment_type })),
      members: Array.from(memberRoles.entries()).map(([user_id, role]) => ({ user_id, role })),
    };

    try {
      await createBoard.mutateAsync(payload);
      onComplete();
    } catch (e) {
      console.error(e);
    }
  };

  const isSubmitting = createBoard.isPending;
  const isLast = stepIdx === STEPS.length - 1;

  const hasNoServices = !servicesLoading && (!teamServices || teamServices.length === 0);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Stepper header */}
      <div className="px-1 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <div key={s.key} className="flex items-center flex-1 min-w-0">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    active && "bg-primary text-primary-foreground",
                    done && "bg-primary/20 text-primary",
                    !active && !done && "bg-muted text-muted-foreground"
                  )}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-[10px]">
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                  <Icon className="h-3.5 w-3.5 sm:hidden" />
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("h-px flex-1 mx-1", done ? "bg-primary/40" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {stepIdx === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-name">Nome do Quadro *</Label>
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marketing, Desenvolvimento..."
                maxLength={100}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-desc">Descrição</Label>
              <Textarea
                id="wiz-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste quadro..."
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {stepIdx === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Defina as etapas (status) do Kanban deste quadro. Você pode criar novas etapas ou remover as padrões. A etapa <strong>Entregue</strong> é obrigatória e fica sempre por último.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStageDragEnd}
            >
              <SortableContext
                items={stages.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {stages.map((s, i) => (
                    <SortableStageRow
                      key={s.id}
                      stage={s}
                      onChangeColor={(c) => updateStage(i, { color: c })}
                      onChangeName={(n) => updateStage(i, { name: n })}
                      onChangeAdjustment={(v) => updateStage(i, { adjustment_type: v })}
                      onRemove={() => removeStage(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex items-center gap-2 rounded-lg border border-dashed p-2 bg-muted/20">
              <StageColorPicker value={newStageColor} onChange={setNewStageColor} />
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStage(); } }}
                placeholder="Nome da nova etapa..."
                className="h-8 flex-1"
              />
              <Button type="button" size="sm" onClick={addStage} disabled={!newStageName.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}

        {stepIdx === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Selecione membros adicionais e defina o cargo de cada um neste quadro. Você (criador) será adicionado como Administrador automaticamente, e administradores da equipe entram como Coordenadores.
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membro..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {teamMembers && teamMembers.length > 0
                  ? "Nenhum membro encontrado."
                  : "Sua equipe ainda não tem outros membros."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((m) => {
                  const isSelected = memberRoles.has(m.user_id);
                  const role = memberRoles.get(m.user_id) || "executor";
                  return (
                    <div
                      key={m.user_id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-2.5 transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "bg-card"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(m.user_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {m.profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.profile.full_name}</p>
                        {m.position && (
                          <p className="text-[11px] text-muted-foreground truncate">{m.position.name}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex gap-1">
                          {ROLE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const active = role === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(m.user_id, opt.value)}
                                className={cn(
                                  "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                  active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-transparent text-muted-foreground hover:bg-muted"
                                )}
                                title={opt.label}
                              >
                                <Icon className="h-3 w-3" />
                                <span className="hidden md:inline">{opt.short}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {memberRoles.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {memberRoles.size} membro(s) selecionado(s)
              </p>
            )}
          </div>
        )}

        {stepIdx === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Selecione os serviços disponíveis neste quadro e defina o limite mensal (0 = ilimitado).
            </p>

            {hasNoServices ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não há serviços cadastrados nesta equipe. Cadastre serviços antes de criar este quadro.
                </AlertDescription>
              </Alert>
            ) : servicesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedServices.length === teamServices!.length}
                    onCheckedChange={(c) => {
                      if (c) setSelectedServices(teamServices!.map((s) => ({ serviceId: s.id, serviceName: s.name, monthlyLimit: 0 })));
                      else setSelectedServices([]);
                    }}
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Selecionar todos</span>
                </div>
                {teamServices!.map((service) => {
                  const sel = selectedServices.find((s) => s.serviceId === service.id);
                  return (
                    <div key={service.id} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!sel}
                          onCheckedChange={(c) => toggleService(service.id, service.name, c === true)}
                        />
                        <label className="flex-1 text-sm font-medium cursor-pointer">
                          {service.name}
                          <span className="ml-2 text-xs text-muted-foreground">({service.estimated_hours}h)</span>
                        </label>
                      </div>
                      {sel && (
                        <div className="ml-7 flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Limite mensal:</Label>
                          <Input
                            type="number"
                            min={0}
                            value={sel.monthlyLimit}
                            onChange={(e) => setLimit(service.id, parseInt(e.target.value) || 0)}
                            className="h-7 w-20 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">
                            {sel.monthlyLimit === 0 ? "(ilimitado)" : "demandas/mês"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive shrink-0 pt-2">{error}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t shrink-0 mt-3">
        <Button
          type="button"
          variant="outline"
          onClick={stepIdx === 0 ? onCancel : prev}
          disabled={isSubmitting || (stepIdx === 0 && !onCancel)}
        >
          {stepIdx === 0 ? "Cancelar" : (<><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</>)}
        </Button>

        <span className="text-xs text-muted-foreground">
          Passo {stepIdx + 1} de {STEPS.length}
        </span>

        {isLast ? (
          <Button onClick={submit} disabled={isSubmitting || hasNoServices}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</>) : "Criar Quadro"}
          </Button>
        ) : (
          <Button onClick={next} disabled={isSubmitting}>
            Próximo <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
