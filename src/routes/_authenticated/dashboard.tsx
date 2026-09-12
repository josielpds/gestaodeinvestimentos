import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Landmark,
  PieChart as PieIcon,
  Plus,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { InvestmentDialog } from "@/components/investment-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { DividendDialog } from "@/components/dividend-dialog";
import { MonthlySnapshotDialog } from "@/components/monthly-snapshot-dialog";
import { OpenFinanceModal } from "@/components/open-finance-modal";
import { useDividends, useInvestments, useOpenFinanceConnections, useSnapshots, useTransactions } from "@/lib/data";
import {
  CATEGORY_CHART_VAR,
  CATEGORY_LABELS,
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
  monthLabel,
  summarize,
  todayISO,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Finantria Invest" }],
  }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "#38bdf8",
  "#a855f7",
];

function DashboardPage() {
  const { data: investments = [], isLoading: loadingInv } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: dividends = [] } = useDividends();
  const { data: snapshots = [] } = useSnapshots();
  const { data: connections = [] } = useOpenFinanceConnections();

  const [openInvDialog, setOpenInvDialog] = useState(false);
  const [openTxDialog, setOpenTxDialog] = useState(false);
  const [openDivDialog, setOpenDivDialog] = useState(false);
  const [openSnapDialog, setOpenSnapDialog] = useState(false);
  const [openOfDialog, setOpenOfDialog] = useState(false);

  const summary = summarize(investments, transactions);

  // Total de proventos no ano atual
  const currentYear = new Date().getFullYear().toString();
  const yearDividends = dividends
    .filter((d) => d.payment_date.startsWith(currentYear) && d.status === "recebido")
    .reduce((acc, d) => acc + d.amount, 0);

  // Ativos ativos ordenados por saldo (maiores posições)
  const activeInvestments = investments
    .filter((i) => i.status === "ativo")
    .sort((a, b) => b.current_balance - a.current_balance);

  const topPositions = activeInvestments.slice(0, 5);

  // Vencimentos próximos (próximos 45 dias)
  const todayStr = todayISO();
  const upcomingMaturities = activeInvestments
    .filter((i) => {
      if (!i.due_date) return false;
      const days = daysBetween(todayStr, i.due_date);
      return days >= 0 && days <= 45;
    })
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));

  // Dados formatados para gráficos
  const categoryChartData = summary.byCategory.map((c) => ({
    name: c.label,
    value: c.value,
    percent: c.percent,
    key: c.key,
  }));

  const institutionChartData = summary.byInstitution.slice(0, 6).map((inst) => ({
    name: inst.institution,
    valor: inst.valor,
  }));

  const snapshotEvolutionData = snapshots.slice(-6).map((s) => ({
    mes: monthLabel(s.year_month),
    saldo: s.final_balance,
    lucro: s.profit_amount,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header com Ações Rápidas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Painel Geral</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do seu patrimônio, rentabilidade e distribuição.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setOpenOfDialog(true)}
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/5 hover:text-primary relative"
          >
            <Zap className="mr-1.5 h-4 w-4 text-primary fill-primary/20" />
            Open Finance
            {connections.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-bold">
                {connections.length}
              </span>
            )}
          </Button>
          <Button asChild variant="outline" size="sm" className="border-primary/30 hover:bg-primary/5 hover:text-primary">
            <Link to="/relatorios">
              <BarChart3 className="mr-1.5 h-4 w-4 text-primary" /> Relatório do Mês
            </Link>
          </Button>
          <Button onClick={() => setOpenInvDialog(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Novo Ativo
          </Button>
          <Button onClick={() => setOpenTxDialog(true)} variant="outline" size="sm">
            <Receipt className="mr-1.5 h-4 w-4" /> Movimentação
          </Button>
          <Button onClick={() => setOpenDivDialog(true)} variant="outline" size="sm">
            <DollarSign className="mr-1.5 h-4 w-4" /> Provento
          </Button>
          <Button onClick={() => setOpenSnapDialog(true)} variant="secondary" size="sm">
            <Calendar className="mr-1.5 h-4 w-4" /> Fechar Mês
          </Button>
        </div>
      </div>

      {/* Alerta de Vencimento Próximo */}
      {upcomingMaturities.length > 0 && upcomingMaturities[0] && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">Vencimento de Renda Fixa próximo:</span>{" "}
            {upcomingMaturities[0].name} ({upcomingMaturities[0].institution}) vence em{" "}
            <span className="font-bold underline">{formatDate(upcomingMaturities[0].due_date)}</span> (
            {daysBetween(todayStr, upcomingMaturities[0].due_date!)} dias restantes).
          </div>
          <Button asChild variant="outline" size="sm" className="border-warning/30 hover:bg-warning/20">
            <Link to="/investimentos">Ver carteira</Link>
          </Button>
        </div>
      )}

      {/* Grid de StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patrimônio Líquido"
          value={formatCurrency(summary.totalNet)}
          hint={`Bruto: ${formatCurrency(summary.totalGross)}`}
          icon={Wallet}
          tone="positive"
        />
        <StatCard
          label="Lucro Bruto Total"
          value={formatCurrency(summary.grossProfit)}
          hint={`Rentabilidade: ${formatPercent(summary.grossProfitPercent)}`}
          icon={TrendingUp}
          tone={summary.grossProfit >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Proventos em 2026"
          value={formatCurrency(yearDividends)}
          hint="Dividendos, JCP e FIIs recebidos"
          icon={DollarSign}
        />
        <StatCard
          label="Provisão de Tributos (IR & IOF)"
          value={formatCurrency(summary.totalTax)}
          hint={
            summary.totalIof > 0
              ? `IR: ${formatCurrency(summary.totalIr)} · IOF: ${formatCurrency(summary.totalIof)}`
              : "Tabela regressiva aplicada (IOF zerado)"
          }
          icon={ShieldAlert}
        />
      </div>

      {/* Grid Gráficos de Alocação e Evolução */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alocação por Classe */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Alocação por Classe</h2>
              <p className="text-xs text-muted-foreground">Distribuição percentual do patrimônio</p>
            </div>
            <PieIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 h-60 w-full">
            {categoryChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum ativo cadastrado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={CATEGORY_CHART_VAR[entry.key] || "var(--color-chart-1)"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => [formatCurrency(val), "Saldo"]}
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: "0.75rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {categoryChartData.map((c) => (
              <div key={c.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_CHART_VAR[c.key] || "var(--color-chart-1)" }}
                  />
                  <span className="font-medium text-foreground">{c.name}</span>
                </div>
                <div className="num font-semibold text-muted-foreground">
                  {formatCurrency(c.value)}{" "}
                  <span className="text-foreground">({c.percent.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por Instituição */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Por Instituição</h2>
              <p className="text-xs text-muted-foreground">Onde seu dinheiro está custodiado</p>
            </div>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 h-60 w-full">
            {institutionChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum ativo cadastrado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={institutionChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    width={70}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => [formatCurrency(val), "Patrimônio"]}
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Bar dataKey="valor" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {summary.byInstitution.slice(0, 4).map((inst) => (
              <div key={inst.institution} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{inst.institution}</span>
                <span className="num font-semibold text-foreground">
                  {formatCurrency(inst.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução Patrimonial dos Fechamentos */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Histórico Mensal</h2>
              <p className="text-xs text-muted-foreground">Evolução dos fechamentos recentes</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 h-60 w-full">
            {snapshotEvolutionData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <p>Nenhum fechamento registrado.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenSnapDialog(true)}
                >
                  Registrar 1º Fechamento
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshotEvolutionData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
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
                  <Bar dataKey="saldo" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 text-right">
            <Link
              to="/fechamento"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Ver relatório completo <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Maiores Posições da Carteira */}
      <div className="panel p-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-base font-semibold">Maiores Posições da Carteira</h2>
            <p className="text-xs text-muted-foreground">
              Seus principais ativos em valor financeiro acumulado
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/investimentos" className="text-xs font-medium text-primary">
              Ver todos ({activeInvestments.length}) <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {activeInvestments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Você ainda não cadastrou investimentos.
            <div className="mt-3">
              <Button onClick={() => setOpenInvDialog(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Cadastrar Primeiro Ativo
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {topPositions.map((inv) => {
              const m = metricsFor(inv, transactions);
              const percentOfTotal =
                summary.totalGross > 0 ? (inv.current_balance / summary.totalGross) * 100 : 0;

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-strong font-bold text-foreground">
                      {inv.ticker ? inv.ticker.slice(0, 4) : inv.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{inv.name}</span>
                        {inv.ticker && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {inv.ticker}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">· {inv.institution}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[inv.category]} ·{" "}
                        {inv.tax_exempt
                          ? "Isento de IR/IOF"
                          : `Tributos: ${formatCurrency(m.totalTax)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p className="num text-sm font-bold text-foreground">
                        {formatCurrency(inv.current_balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentOfTotal.toFixed(1)}% da carteira
                      </p>
                    </div>

                    <div className="min-w-20 text-right">
                      <p
                        className={`num text-xs font-semibold ${m.grossProfit >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatCurrency(m.grossProfit)}
                      </p>
                      <p className="num text-[11px] text-muted-foreground">
                        {formatPercent(m.grossProfitPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais Globais */}
      <InvestmentDialog open={openInvDialog} onOpenChange={setOpenInvDialog} />
      <TransactionDialog
        open={openTxDialog}
        onOpenChange={setOpenTxDialog}
        investments={investments}
      />
      <DividendDialog
        open={openDivDialog}
        onOpenChange={setOpenDivDialog}
        investments={investments}
      />
      <MonthlySnapshotDialog
        open={openSnapDialog}
        onOpenChange={setOpenSnapDialog}
        defaultCurrentBalance={summary.totalGross}
      />
      <OpenFinanceModal
        open={openOfDialog}
        onOpenChange={setOpenOfDialog}
      />
    </div>
  );
}
