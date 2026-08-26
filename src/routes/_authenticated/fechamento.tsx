import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Edit2,
  MoreVertical,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { MonthlySnapshotDialog } from "@/components/monthly-snapshot-dialog";
import { useDeleteRow, useInvestments, useSnapshots, useTransactions } from "@/lib/data";
import {
  formatCurrency,
  formatPercent,
  monthLabel,
  summarize,
  type Snapshot,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/fechamento")({
  head: () => ({
    meta: [{ title: "Fechamento Mensal — Finantria Invest" }],
  }),
  component: FechamentoPage,
});

function FechamentoPage() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const deleteSnapshot = useDeleteRow("monthly_snapshots");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const summary = summarize(investments, transactions);

  // Ordenação cronológica para histórico
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => (a.year_month > b.year_month ? -1 : 1));
  }, [snapshots]);

  // Estatísticas acumuladas
  const stats = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalProfit = 0;

    for (const s of snapshots) {
      totalDeposits += s.deposits;
      totalWithdrawals += s.withdrawals;
      totalProfit += s.profit_amount;
    }

    const latest = sortedSnapshots[0];

    const chartData = [...snapshots]
      .sort((a, b) => (a.year_month > b.year_month ? 1 : -1))
      .map((s) => ({
        mes: monthLabel(s.year_month),
        saldo: s.final_balance,
        lucro: s.profit_amount,
        rentabilidade: s.profit_percent,
        cdi: s.cdi_benchmark,
      }));

    return { totalDeposits, totalWithdrawals, totalProfit, latest, chartData };
  }, [snapshots, sortedSnapshots]);

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await deleteSnapshot.mutateAsync(deleteConfirmId);
      toast.success("Fechamento removido com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleOpenNew() {
    setSelectedSnapshot(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(s: Snapshot) {
    setSelectedSnapshot(s);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fechamento Mensal</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a evolução do patrimônio mês a mês e compare sua rentabilidade com os benchmarks.
          </p>
        </div>
        <Button onClick={handleOpenNew} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Registrar Fechamento
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo Último Fechamento"
          value={formatCurrency(stats.latest?.final_balance ?? summary.totalGross)}
          hint={stats.latest ? `Mês: ${monthLabel(stats.latest.year_month)}` : "Saldo atual estimado"}
          icon={Calendar}
          tone="positive"
        />
        <StatCard
          label="Lucro Acumulado nos Fechamentos"
          value={formatCurrency(stats.totalProfit)}
          hint="Soma das variações patrimoniais"
          icon={TrendingUp}
          tone={stats.totalProfit >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Aportes Registrados"
          value={formatCurrency(stats.totalDeposits)}
          hint="Total aportado nos meses fechados"
        />
        <StatCard
          label="Resgates Registrados"
          value={formatCurrency(stats.totalWithdrawals)}
          hint="Total retirado nos meses fechados"
        />
      </div>

      {/* Gráfico de Evolução Patrimonial */}
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Evolução do Patrimônio</h2>
            <p className="text-xs text-muted-foreground">
              Trajetória do saldo final nos fechamentos mensais
            </p>
          </div>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="mt-4 h-72 w-full">
          {stats.chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <p>Nenhum fechamento registrado ainda.</p>
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Fechar Primeiro Mês
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(val: number) => [formatCurrency(val), "Saldo Final"]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSaldo)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabela de Fechamentos */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Mês / Ano</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Inicial</th>
                <th className="px-3 py-3 text-right font-semibold">Aportes</th>
                <th className="px-3 py-3 text-right font-semibold">Resgates</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Final</th>
                <th className="px-3 py-3 text-right font-semibold">Lucro / Variação</th>
                <th className="px-3 py-3 text-right font-semibold">Rentabilidade</th>
                <th className="px-3 py-3 text-right font-semibold">CDI</th>
                <th className="px-3 py-3 text-right font-semibold">IPCA</th>
                <th className="px-3 py-3 text-right font-semibold">Ibovespa</th>
                <th className="py-3 pl-3 pr-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    Nenhum histórico de fechamento mensal registrado.
                  </td>
                </tr>
              ) : (
                sortedSnapshots.map((s) => {
                  const isPositive = s.profit_amount >= 0;

                  return (
                    <tr key={s.id} className="transition-colors hover:bg-surface/50">
                      <td className="py-3 pl-4 pr-3 font-bold text-foreground">
                        {monthLabel(s.year_month)}
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {formatCurrency(s.initial_balance)}
                      </td>

                      <td className="num px-3 py-3 text-right text-success">
                        {s.deposits > 0 ? `+ ${formatCurrency(s.deposits)}` : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right text-destructive">
                        {s.withdrawals > 0 ? `- ${formatCurrency(s.withdrawals)}` : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right font-bold text-primary">
                        {formatCurrency(s.final_balance)}
                      </td>

                      <td className="num px-3 py-3 text-right font-semibold">
                        <span className={isPositive ? "text-success" : "text-destructive"}>
                          {formatCurrency(s.profit_amount)}
                        </span>
                      </td>

                      <td className="num px-3 py-3 text-right font-bold">
                        <span className={isPositive ? "text-success" : "text-destructive"}>
                          {formatPercent(s.profit_percent)}
                        </span>
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {s.cdi_benchmark ? formatPercent(s.cdi_benchmark) : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {s.ipca_benchmark ? formatPercent(s.ipca_benchmark) : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {s.ibovespa_benchmark ? formatPercent(s.ibovespa_benchmark) : "—"}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEdit(s)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais */}
      <MonthlySnapshotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snapshot={selectedSnapshot}
        defaultCurrentBalance={summary.totalGross}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro do fechamento mensal selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
