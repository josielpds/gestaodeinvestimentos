import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  DollarSign,
  Edit2,
  MoreVertical,
  Plus,
  Target as TargetIcon,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { MonthlyYieldReport } from "@/components/monthly-yield-report";
import {
  useDeleteRow,
  useDividends,
  useGoals,
  useInvestments,
  useSnapshots,
  useTransactions,
} from "@/lib/data";
import {
  daysBetween,
  formatCurrency,
  formatDate,
  summarize,
  todayISO,
  type Goal,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [{ title: "Relatórios de Investimentos & Metas — PatrimônioInvest" }],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: goals = [] } = useGoals();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: dividends = [] } = useDividends();
  const { data: snapshots = [] } = useSnapshots();
  const deleteGoal = useDeleteRow("financial_goals");

  const [activeTab, setActiveTab] = useState<string>("rendimento_mensal");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const summary = summarize(investments, transactions, snapshots);
  const totalNet = summary.totalNet;
  const totalGross = summary.totalGross;
  const todayStr = todayISO();

  // Relatório de Renda Variável (Proventos & Tickers)
  const rvReport = useMemo(() => {
    const rvInvestments = investments.filter(
      (i) => i.status === "ativo" && i.category === "renda_variavel",
    );
    const rvInvMap = new Map(rvInvestments.map((i) => [i.id, i]));

    // Proventos agrupados por ativo
    const assetDividends: Record<
      string,
      {
        investmentId: string;
        name: string;
        ticker?: string | null;
        subType: string;
        currentBalance: number;
        totalDividends: number;
        dividendCount: number;
      }
    > = {};

    for (const inv of rvInvestments) {
      assetDividends[inv.id] = {
        investmentId: inv.id,
        name: inv.name,
        ticker: inv.ticker,
        subType: inv.sub_type,
        currentBalance: inv.current_balance,
        totalDividends: 0,
        dividendCount: 0,
      };
    }

    // Proventos agrupados por tipo (dividendo, jcp, fii)
    const typeDividends: Record<string, number> = {
      dividendo: 0,
      jcp: 0,
      rendimento_fii: 0,
    };

    let totalRvDividends = 0;

    for (const d of dividends) {
      if (d.status === "recebido") {
        const inv = rvInvMap.get(d.investment_id);
        if (inv) {
          if (!assetDividends[d.investment_id]) {
            assetDividends[d.investment_id] = {
              investmentId: d.investment_id,
              name: inv.name,
              ticker: inv.ticker,
              subType: inv.sub_type,
              currentBalance: inv.current_balance,
              totalDividends: 0,
              dividendCount: 0,
            };
          }
          const item = assetDividends[d.investment_id];
          if (item) {
            item.totalDividends += d.amount;
            item.dividendCount += 1;
          }
          typeDividends[d.type] = (typeDividends[d.type] ?? 0) + d.amount;
          totalRvDividends += d.amount;
        }
      }
    }

    const byAssetList = Object.values(assetDividends).sort(
      (a, b) => b.totalDividends - a.totalDividends,
    );

    return {
      totalRvDividends,
      byAssetList,
      typeDividends,
      totalRvBalance: rvInvestments.reduce((acc, i) => acc + i.current_balance, 0),
    };
  }, [investments, dividends]);

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
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Central de Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o rendimento do mês nos investimentos em R$ e %, proventos de renda variável e metas financeiras.
          </p>
        </div>

        {activeTab === "metas" && (
          <Button onClick={handleOpenNewGoal} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Nova Meta
          </Button>
        )}
      </div>

      {/* Tabs de Navegação entre Relatórios */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 p-1 bg-surface border border-border h-auto gap-1 rounded-xl print:hidden">
          <TabsTrigger
            value="rendimento_mensal"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-4 w-4" /> Rendimento do Mês
          </TabsTrigger>
          <TabsTrigger
            value="renda_variavel"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-4 w-4" /> Renda Variável & Proventos
          </TabsTrigger>
          <TabsTrigger
            value="metas"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <TargetIcon className="h-4 w-4" /> Metas Financeiras
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: RELATÓRIO DE RENDIMENTO MENSAL (R$ E %) */}
        <TabsContent value="rendimento_mensal" className="space-y-6 focus-visible:outline-none">
          <MonthlyYieldReport
            investments={investments}
            transactions={transactions}
            dividends={dividends}
            snapshots={snapshots}
          />
        </TabsContent>

        {/* ABA 2: RELATÓRIO DE RENDA VARIÁVEL (PROVENTOS & RENDIMENTO PASSIVO) */}
        <TabsContent value="renda_variavel" className="space-y-6 focus-visible:outline-none">
          {/* Cards de Resumo de Proventos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-4">
              <p className="text-xs text-muted-foreground">Total de Proventos Acumulados</p>
              <p className="num mt-1 text-xl font-bold text-primary">
                {formatCurrency(rvReport.totalRvDividends)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Dividendos, JCP e FIIs recebidos</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-muted-foreground">Rendimentos de FIIs</p>
              <p className="num mt-1 text-xl font-bold text-foreground">
                {formatCurrency(rvReport.typeDividends["rendimento_fii"] || 0)}
              </p>
              <p className="mt-1 text-[11px] text-success">Isentos de Imposto de Renda</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-muted-foreground">Dividendos de Ações</p>
              <p className="num mt-1 text-xl font-bold text-foreground">
                {formatCurrency(rvReport.typeDividends["dividendo"] || 0)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Distribuição de lucros</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-muted-foreground">Juros sobre Capital Próprio (JCP)</p>
              <p className="num mt-1 text-xl font-bold text-foreground">
                {formatCurrency(rvReport.typeDividends["jcp"] || 0)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Tributação 15% retida na fonte</p>
            </div>
          </div>

          {/* Tabela de Proventos por Ativo */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold">Proventos por Ativo de Renda Variável</h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhamento de renda gerada por cada ação, fundo imobiliário ou BDR
                </p>
              </div>
            </div>

            {rvReport.byAssetList.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum provento ou ativo de Renda Variável registrado.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {rvReport.byAssetList.map((asset) => {
                  const yieldOnBalance =
                    asset.currentBalance > 0
                      ? (asset.totalDividends / asset.currentBalance) * 100
                      : 0;

                  return (
                    <div
                      key={asset.investmentId}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-strong font-bold text-foreground">
                          {asset.ticker ? asset.ticker.slice(0, 4) : asset.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{asset.name}</span>
                            {asset.ticker && (
                              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {asset.ticker}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Saldo em carteira: {formatCurrency(asset.currentBalance)} · {asset.dividendCount} proventos recebidos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="num text-sm font-bold text-success">
                            {formatCurrency(asset.totalDividends)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Proventos acumulados
                          </p>
                        </div>

                        <div className="min-w-20 text-right">
                          <p className="num text-xs font-semibold text-primary">
                            {yieldOnBalance > 0 ? `${yieldOnBalance.toFixed(2)}%` : "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Yield s/ saldo
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 3: METAS FINANCEIRAS */}
        <TabsContent value="metas" className="space-y-6 focus-visible:outline-none">
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
        </TabsContent>
      </Tabs>

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

