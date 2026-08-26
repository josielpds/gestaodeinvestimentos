import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Landmark,
  MoreVertical,
  Plus,
  ShieldCheck,
  Target as TargetIcon,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/stat-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalDialog } from "@/components/goal-dialog";
import { useDeleteRow, useGoals, useInvestments, useTransactions } from "@/lib/data";
import {
  CATEGORY_LABELS,
  INDEXER_LABELS,
  daysBetween,
  formatCurrency,
  formatDate,
  metricsFor,
  summarize,
  todayISO,
  type Goal,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [{ title: "Relatórios & Metas — Finantria Invest" }],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: goals = [], isLoading: loadingGoals } = useGoals();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const deleteGoal = useDeleteRow("financial_goals");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const summary = summarize(investments, transactions);
  const totalNet = summary.totalNet;
  const todayStr = todayISO();

  // Relatório de Vencimentos de Renda Fixa
  const maturityReport = useMemo(() => {
    const fixed = investments.filter(
      (i) => i.status === "ativo" && i.category === "renda_fixa" && i.due_date,
    );

    const buckets = {
      upTo30: { label: "Até 30 dias", total: 0, items: [] as typeof fixed },
      upTo90: { label: "31 a 90 dias", total: 0, items: [] as typeof fixed },
      upTo180: { label: "91 a 180 dias", total: 0, items: [] as typeof fixed },
      upTo360: { label: "181 a 360 dias", total: 0, items: [] as typeof fixed },
      over360: { label: "Mais de 1 ano", total: 0, items: [] as typeof fixed },
    };

    for (const inv of fixed) {
      const days = daysBetween(todayStr, inv.due_date!);
      if (days <= 30) {
        buckets.upTo30.total += inv.current_balance;
        buckets.upTo30.items.push(inv);
      } else if (days <= 90) {
        buckets.upTo90.total += inv.current_balance;
        buckets.upTo90.items.push(inv);
      } else if (days <= 180) {
        buckets.upTo180.total += inv.current_balance;
        buckets.upTo180.items.push(inv);
      } else if (days <= 360) {
        buckets.upTo360.total += inv.current_balance;
        buckets.upTo360.items.push(inv);
      } else {
        buckets.over360.total += inv.current_balance;
        buckets.over360.items.push(inv);
      }
    }

    return Object.values(buckets);
  }, [investments, todayStr]);

  // Relatório de Exposição ao FGC e Instituições
  const fgcReport = useMemo(() => {
    const FGC_LIMIT = 250000;
    const instTotals: Record<string, { total: number; exemptTaxTotal: number }> = {};

    for (const inv of investments.filter((i) => i.status === "ativo")) {
      const inst = inv.institution || "Outras";
      if (!instTotals[inst]) instTotals[inst] = { total: 0, exemptTaxTotal: 0 };
      instTotals[inst].total += inv.current_balance;
      if (inv.tax_exempt) instTotals[inst].exemptTaxTotal += inv.current_balance;
    }

    return Object.entries(instTotals)
      .map(([institution, data]) => ({
        institution,
        total: data.total,
        exemptTaxTotal: data.exemptTaxTotal,
        percentOfTotal: summary.totalGross > 0 ? (data.total / summary.totalGross) * 100 : 0,
        isOverFGC: data.total > FGC_LIMIT,
      }))
      .sort((a, b) => b.total - a.total);
  }, [investments, summary.totalGross]);

  // Relatório por Indexador
  const indexerReport = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of investments.filter((i) => i.status === "ativo")) {
      map[inv.indexer] = (map[inv.indexer] ?? 0) + inv.current_balance;
    }

    return Object.entries(map)
      .map(([indexer, value]) => ({
        indexer,
        label: INDEXER_LABELS[indexer] || indexer,
        value,
        percent: summary.totalGross > 0 ? (value / summary.totalGross) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [investments, summary.totalGross]);

  async function handleDeleteGoal() {
    if (!deleteConfirmId) return;
    try {
      await deleteGoal.mutateAsync(deleteConfirmId);
      toast.success("Meta excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir meta.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleOpenNewGoal() {
    setSelectedGoal(null);
    setDialogOpen(true);
  }

  function handleOpenEditGoal(g: Goal) {
    setSelectedGoal(g);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Relatórios & Metas Financeiras
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o progresso das suas metas, cronograma de vencimentos e controle de risco / FGC.
          </p>
        </div>
        <Button onClick={handleOpenNewGoal} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {/* SEÇÃO 1: Metas Financeiras */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TargetIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Metas Financeiras</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Patrimônio Base: {formatCurrency(totalNet)}
          </span>
        </div>

        {goals.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            <p>Você ainda não definiu metas financeiras.</p>
            <Button onClick={handleOpenNewGoal} size="sm" className="mt-3">
              <Plus className="mr-1.5 h-4 w-4" /> Criar Primeira Meta
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progressPct =
                goal.target_amount > 0
                  ? Math.min(100, (totalNet / goal.target_amount) * 100)
                  : 0;
              const remaining = Math.max(0, goal.target_amount - totalNet);
              const daysLeft = daysBetween(todayStr, goal.target_date);
              const isCompleted = totalNet >= goal.target_amount;

              return (
                <div key={goal.id} className="panel p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {goal.category || "Geral"}
                      </span>
                      <h3 className="mt-1.5 text-base font-bold text-foreground">{goal.title}</h3>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => handleOpenEditGoal(goal)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar Meta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmId(goal.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary">{progressPct.toFixed(1)}%</span>
                      <span className="text-muted-foreground">
                        Alvo: {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>

                  {/* Detalhes */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                    <div>
                      <p className="text-muted-foreground">Falta Acumular</p>
                      <p className="num font-bold text-foreground">
                        {isCompleted ? "Concluída!" : formatCurrency(remaining)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prazo Alvo</p>
                      <p className="font-medium text-foreground">
                        {formatDate(goal.target_date)} ({daysLeft}d)
                      </p>
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{goal.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: Cronograma de Vencimentos de Renda Fixa */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Cronograma de Vencimentos (Renda Fixa)</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {maturityReport.map((bucket) => (
            <div key={bucket.label} className="panel p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {bucket.label}
              </p>
              <p className="num text-lg font-bold text-foreground">
                {formatCurrency(bucket.total)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {bucket.items.length} {bucket.items.length === 1 ? "ativo" : "ativos"}
              </p>

              {bucket.items.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border/50">
                  {bucket.items.slice(0, 2).map((i) => (
                    <div key={i.id} className="truncate text-[10px] text-muted-foreground">
                      · {i.name} ({formatDate(i.due_date)})
                    </div>
                  ))}
                  {bucket.items.length > 2 && (
                    <span className="text-[10px] text-primary">
                      +{bucket.items.length - 2} outros
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 3: Controle de Risco, FGC e Indexadores */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* FGC e Instituições */}
        <div className="panel p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold">Exposição por Instituição & FGC</h2>
              <p className="text-xs text-muted-foreground">
                Limite de R$ 250.000,00 por conglomerado financeiro garantido
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 space-y-3">
            {fgcReport.map((item) => (
              <div
                key={item.institution}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{item.institution}</span>
                    {item.isOverFGC && (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Acima do FGC
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.percentOfTotal.toFixed(1)}% do patrimônio total
                  </p>
                </div>

                <div className="text-right">
                  <p className="num text-sm font-bold text-foreground">
                    {formatCurrency(item.total)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Isento: {formatCurrency(item.exemptTaxTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indexadores */}
        <div className="panel p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold">Alocação por Indexador</h2>
              <p className="text-xs text-muted-foreground">
                Proteção inflacionária vs Pós-fixado vs Renda Variável
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 space-y-3">
            {indexerReport.map((item) => (
              <div
                key={item.indexer}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs"
              >
                <div>
                  <span className="font-bold text-foreground">{item.label}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {item.percent.toFixed(1)}% da carteira
                  </p>
                </div>

                <div className="text-right">
                  <p className="num text-sm font-bold text-foreground">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modais */}
      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={selectedGoal} />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta Financeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a meta do seu planejamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
