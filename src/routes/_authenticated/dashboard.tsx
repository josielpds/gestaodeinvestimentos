import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Landmark,
  Layers,
  PieChart as PieIcon,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  INDEXER_LABELS,
  SUBTYPE_LABELS,
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
  monthLabel,
  summarize,
  summarizeCategory,
  todayISO,
} from "@/lib/finance";
import { calculateMonthProjection } from "@/lib/yield-calculator";

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
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: dividends = [] } = useDividends();
  const { data: snapshots = [] } = useSnapshots();
  const { data: connections = [] } = useOpenFinanceConnections();

  const [activeTab, setActiveTab] = useState<"geral" | "renda_fixa" | "renda_variavel">("geral");

  const [openInvDialog, setOpenInvDialog] = useState(false);
  const [openTxDialog, setOpenTxDialog] = useState(false);
  const [openDivDialog, setOpenDivDialog] = useState(false);
  const [openSnapDialog, setOpenSnapDialog] = useState(false);
  const [openOfDialog, setOpenOfDialog] = useState(false);

  // Resumo Geral Consolidado
  const summary = summarize(investments, transactions);

  // Resumo Específico Renda Fixa
  const rfSummary = summarizeCategory("renda_fixa", investments, transactions);

  // Projeção de Dias Úteis e Rendimento Diário de Renda Fixa (ANBIMA DU/252)
  const rfMonthProjection = calculateMonthProjection(rfSummary.items);

  // Resumo Específico Renda Variável
  const rvSummary = summarizeCategory("renda_variavel", investments, transactions);

  // Total de proventos no ano atual (geral e por categoria)
  const currentYear = new Date().getFullYear().toString();
  const yearDividends = dividends
    .filter((d) => d.payment_date.startsWith(currentYear) && d.status === "recebido")
    .reduce((acc, d) => acc + d.amount, 0);

  // Proventos específicos de Renda Variável no ano
  const rvInvestmentsIds = new Set(rvSummary.items.map((i) => i.id));
  const yearRvDividends = dividends
    .filter((d) => rvInvestmentsIds.has(d.investment_id) && d.payment_date.startsWith(currentYear) && d.status === "recebido")
    .reduce((acc, d) => acc + d.amount, 0);

  // Ativos ativos ordenados por saldo (maiores posições)
  const activeInvestments = investments
    .filter((i) => i.status === "ativo")
    .sort((a, b) => b.current_balance - a.current_balance);

  const topPositions = activeInvestments.slice(0, 5);

  // Vencimentos de Renda Fixa próximos (próximos 45 dias)
  const todayStr = todayISO();
  const upcomingMaturities = rfSummary.items
    .filter((i) => {
      if (!i.due_date) return false;
      const days = daysBetween(todayStr, i.due_date);
      return days >= 0 && days <= 45;
    })
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));

  // Dados para gráficos do Consolidado
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

  // Proventos mensais de RV para gráfico
  const rvDividendsByMonth = (() => {
    const map: Record<string, number> = {};
    for (const d of dividends) {
      if (rvInvestmentsIds.has(d.investment_id) && d.status === "recebido" && d.payment_date) {
        const ym = d.payment_date.slice(0, 7);
        map[ym] = (map[ym] ?? 0) + d.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-6)
      .map(([ym, amount]) => ({
        mes: monthLabel(ym),
        valor: amount,
      }));
  })();

  return (
    <div className="space-y-6">
      {/* Top Header com Ações Rápidas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Painel de Investimentos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o patrimônio total consolidado e explore os painéis dedicados de Renda Fixa e Renda Variável.
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
              <BarChart3 className="mr-1.5 h-4 w-4 text-primary" /> Relatórios
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
          <Button
            variant="outline"
            size="sm"
            className="border-warning/30 hover:bg-warning/20"
            onClick={() => setActiveTab("renda_fixa")}
          >
            Ver Renda Fixa
          </Button>
        </div>
      )}

      {/* Seletor de Visão do Dashboard */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "geral" | "renda_fixa" | "renda_variavel")}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
          <TabsList className="grid grid-cols-3 h-11 bg-surface border border-border p-1 rounded-xl w-full sm:w-auto">
            <TabsTrigger
              value="geral"
              className="flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg"
            >
              <Layers className="h-4 w-4" />
              <span>Patrimônio Total</span>
            </TabsTrigger>
            <TabsTrigger
              value="renda_fixa"
              className="flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg"
            >
              <Landmark className="h-4 w-4" />
              <span>Renda Fixa</span>
              {rfSummary.activeCount > 0 && (
                <span className="hidden sm:inline-flex rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
                  {rfSummary.activeCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="renda_variavel"
              className="flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Renda Variável</span>
              {rvSummary.activeCount > 0 && (
                <span className="hidden sm:inline-flex rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
                  {rvSummary.activeCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 text-xs text-muted-foreground self-end sm:self-auto">
            <span>Patrimônio Bruto Consolidado:</span>
            <span className="num text-sm font-bold text-foreground">
              {formatCurrency(summary.totalGross)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: CONSOLIDADO / PATRIMÔNIO TOTAL */}
        {/* ========================================================================= */}
        <TabsContent value="geral" className="space-y-6 focus-visible:outline-none">
          {/* Grid de StatCards Consolidado */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Patrimônio Líquido Total"
              value={formatCurrency(summary.totalNet)}
              hint={`Bruto total: ${formatCurrency(summary.totalGross)}`}
              icon={Wallet}
              tone="positive"
            />
            <StatCard
              label="Lucro Bruto Consolidado"
              value={formatCurrency(summary.grossProfit)}
              hint={`Rentabilidade: ${formatPercent(summary.grossProfitPercent)}`}
              icon={TrendingUp}
              tone={summary.grossProfit >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Proventos em 2026"
              value={formatCurrency(yearDividends)}
              hint="Dividendos, JCP e Rendimentos no ano"
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

          {/* Banner de Comparação Rápida RF vs RV */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              onClick={() => setActiveTab("renda_fixa")}
              className="panel p-4 cursor-pointer hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-chart-1/10 text-chart-1 group-hover:bg-chart-1/20 transition-colors">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Renda Fixa</p>
                    <p className="num text-lg font-bold text-foreground">
                      {formatCurrency(rfSummary.totalGross)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs border-chart-1/40 text-chart-1">
                    {summary.totalGross > 0
                      ? `${((rfSummary.totalGross / summary.totalGross) * 100).toFixed(1)}%`
                      : "0%"}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {rfSummary.activeCount} {rfSummary.activeCount === 1 ? "ativo" : "ativos"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Lucro acumulado:</span>
                <span className={`num font-semibold ${rfSummary.grossProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(rfSummary.grossProfit)} ({formatPercent(rfSummary.grossProfitPercent)})
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("renda_variavel")}
              className="panel p-4 cursor-pointer hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-chart-2/10 text-chart-2 group-hover:bg-chart-2/20 transition-colors">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Renda Variável</p>
                    <p className="num text-lg font-bold text-foreground">
                      {formatCurrency(rvSummary.totalGross)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs border-chart-2/40 text-chart-2">
                    {summary.totalGross > 0
                      ? `${((rvSummary.totalGross / summary.totalGross) * 100).toFixed(1)}%`
                      : "0%"}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {rvSummary.activeCount} {rvSummary.activeCount === 1 ? "ativo" : "ativos"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Lucro valorização:</span>
                <span className={`num font-semibold ${rvSummary.grossProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(rvSummary.grossProfit)} ({formatPercent(rvSummary.grossProfitPercent)})
                </span>
              </div>
            </div>

            <div className="panel p-4 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Outras Classes</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Internacional & Cripto</span>
                  <span className="num text-base font-bold text-foreground">
                    {formatCurrency(
                      summary.totalGross - rfSummary.totalGross - rvSummary.totalGross,
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Total de ativos:</span>
                <span className="num font-semibold text-foreground">
                  {activeInvestments.length} ativos cadastrados
                </span>
              </div>
            </div>
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
                  Ver histórico completo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Maiores Posições da Carteira */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold">Maiores Posições da Carteira Consolidada</h2>
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
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: PAINEL DEDICADO DE RENDA FIXA */}
        {/* ========================================================================= */}
        <TabsContent value="renda_fixa" className="space-y-6 focus-visible:outline-none">
          {/* StatCards Renda Fixa */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Patrimônio Líquido em Renda Fixa"
              value={formatCurrency(rfSummary.totalNet)}
              hint={`Bruto RF: ${formatCurrency(rfSummary.totalGross)}`}
              icon={Landmark}
              tone="positive"
            />
            <StatCard
              label="Lucro Acumulado em Renda Fixa"
              value={formatCurrency(rfSummary.grossProfit)}
              hint={`Rentabilidade RF: ${formatPercent(rfSummary.grossProfitPercent)}`}
              icon={TrendingUp}
              tone={rfSummary.grossProfit >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Ativos Isentos de IR (LCI, LCA, CRI...)"
              value={formatCurrency(rfSummary.taxExemptTotal)}
              hint={`${rfSummary.taxExemptPercent.toFixed(1)}% da sua Renda Fixa`}
              icon={ShieldCheck}
            />
            <StatCard
              label="Tributos Estimados (IR & IOF)"
              value={formatCurrency(rfSummary.totalTax)}
              hint={`IR: ${formatCurrency(rfSummary.totalIr)} | IOF: ${formatCurrency(rfSummary.totalIof)}`}
              icon={ShieldAlert}
            />
          </div>

          {/* Banner de Rendimento Diário DU/252 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">Rendimento Diário Estimado:</span>
                  <span className="num font-bold text-success text-sm">
                    +{formatCurrency(rfMonthProjection.dailyYieldPortfolioEstimate)} / dia útil
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Convenção ANBIMA (252 dias úteis) · {rfMonthProjection.elapsedBusinessDays} de {rfMonthProjection.totalBusinessDays} dias úteis transcorridos no mês
                </p>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 self-start sm:self-auto">
              <Link to="/relatorios">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> Ver Extrato Dia a Dia
              </Link>
            </Button>
          </div>

          {/* Gráficos Específicos de Renda Fixa */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Por Subtipo de Renda Fixa */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Subtipos de Renda Fixa</h2>
                  <p className="text-xs text-muted-foreground">CDB, LCI/LCA, Tesouro, CRI/CRA</p>
                </div>
                <PieIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 h-56 w-full">
                {rfSummary.bySubtype.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum ativo de Renda Fixa cadastrado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rfSummary.bySubtype}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {rfSummary.bySubtype.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
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

              <div className="mt-2 space-y-1.5">
                {rfSummary.bySubtype.map((st, idx) => (
                  <div key={st.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-foreground">{st.label}</span>
                    </div>
                    <span className="num text-muted-foreground">
                      {formatCurrency(st.value)} ({st.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Indexador */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Indexadores (RF)</h2>
                  <p className="text-xs text-muted-foreground">CDI vs IPCA+ vs Pré-fixado</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 h-56 w-full">
                {rfSummary.byIndexer.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum dado disponível.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rfSummary.byIndexer} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                        width={75}
                      />
                      <RechartsTooltip
                        formatter={(val: number) => [formatCurrency(val), "Total"]}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {rfSummary.byIndexer.map((idx) => (
                  <div key={idx.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{idx.label}</span>
                    <span className="num font-semibold text-foreground">
                      {formatCurrency(idx.value)} ({idx.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instituições & FGC */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Emissores & FGC (RF)</h2>
                  <p className="text-xs text-muted-foreground">Limite de R$ 250k por conglomerado</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                {rfSummary.byInstitution.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum emissor de Renda Fixa.
                  </div>
                ) : (
                  rfSummary.byInstitution.map((inst) => {
                    const isOverFGC = inst.valor > 250000;
                    return (
                      <div
                        key={inst.institution}
                        className="rounded-xl border border-border bg-surface p-3 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{inst.institution}</span>
                            {isOverFGC && (
                              <span className="rounded bg-destructive/15 text-destructive px-1 py-0.2 text-[9px] font-bold">
                                Acima do FGC
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {inst.percent.toFixed(1)}% da sua Renda Fixa
                          </p>
                        </div>
                        <span className="num font-bold text-foreground">
                          {formatCurrency(inst.valor)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Ativos de Renda Fixa Detalhados */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold">Tabela de Ativos de Renda Fixa</h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhamento de alíquotas regressivas de IR, dias aplicados e datas de vencimento
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/relatorios">
                  <BarChart3 className="mr-1.5 h-4 w-4" /> Relatório de Vencimentos & FGC
                </Link>
              </Button>
            </div>

            {rfSummary.items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum ativo de Renda Fixa cadastrado.
                <div className="mt-3">
                  <Button onClick={() => setOpenInvDialog(true)} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Cadastrar Ativo de RF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {rfSummary.items.map((inv) => {
                  const m = metricsFor(inv, transactions);
                  const daysLeft = inv.due_date ? daysBetween(todayStr, inv.due_date) : null;

                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10 font-bold text-chart-1">
                          {SUBTYPE_LABELS[inv.sub_type] || "RF"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{inv.name}</span>
                            <span className="text-xs text-muted-foreground">· {inv.institution}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="rounded bg-accent px-1.5 py-0.2 text-[10px] font-medium">
                              {INDEXER_LABELS[inv.indexer] || inv.indexer}
                              {inv.indexer_rate ? ` (${inv.indexer_rate}%)` : ""}
                            </span>
                            <span>· Dia {m.daysHeld}</span>
                            <span>
                              · IR:{" "}
                              {inv.tax_exempt ? (
                                <span className="font-semibold text-success">Isento</span>
                              ) : (
                                `${m.taxRatePercent.toFixed(1)}%`
                              )}
                            </span>
                            {inv.due_date && (
                              <span className={daysLeft !== null && daysLeft <= 45 ? "text-warning font-semibold" : ""}>
                                · Vence: {formatDate(inv.due_date)} ({daysLeft}d)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="num text-sm font-bold text-foreground">
                            {formatCurrency(inv.current_balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Líquido: {formatCurrency(m.netBalance)}
                          </p>
                        </div>

                        <div className="min-w-24 text-right">
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
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: PAINEL DEDICADO DE RENDA VARIÁVEL */}
        {/* ========================================================================= */}
        <TabsContent value="renda_variavel" className="space-y-6 focus-visible:outline-none">
          {/* StatCards Renda Variável */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Patrimônio em Renda Variável"
              value={formatCurrency(rvSummary.totalGross)}
              hint={`Total aplicado: ${formatCurrency(rvSummary.totalInvested)}`}
              icon={TrendingUp}
              tone="positive"
            />
            <StatCard
              label="Lucro por Valorização"
              value={formatCurrency(rvSummary.grossProfit)}
              hint={`Rentabilidade: ${formatPercent(rvSummary.grossProfitPercent)}`}
              icon={Sparkles}
              tone={rvSummary.grossProfit >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Proventos em RV no Ano"
              value={formatCurrency(yearRvDividends)}
              hint="Dividendos, JCP e Rendimentos FII"
              icon={DollarSign}
            />
            <StatCard
              label="Ativos em Carteira (RV)"
              value={`${rvSummary.activeCount} ativos`}
              hint="Ações, FIIs, ETFs e BDRs"
              icon={Coins}
            />
          </div>

          {/* Gráficos e Distribuição em Renda Variável */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Por Subtipo de Renda Variável */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Subtipos de Renda Variável</h2>
                  <p className="text-xs text-muted-foreground">Ações, FIIs, ETFs e BDRs</p>
                </div>
                <PieIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 h-56 w-full">
                {rvSummary.bySubtype.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum ativo de Renda Variável cadastrado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rvSummary.bySubtype}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {rvSummary.bySubtype.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
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

              <div className="mt-2 space-y-1.5">
                {rvSummary.bySubtype.map((st, idx) => (
                  <div key={st.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-foreground">{st.label}</span>
                    </div>
                    <span className="num text-muted-foreground">
                      {formatCurrency(st.value)} ({st.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico Mensal de Proventos em RV */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Proventos Recentes em RV</h2>
                  <p className="text-xs text-muted-foreground">Evolução dos dividendos e rendimentos</p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 h-56 w-full">
                {rvDividendsByMonth.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <p>Nenhum provento registrado em RV.</p>
                    <Button variant="outline" size="sm" onClick={() => setOpenDivDialog(true)}>
                      Lançar Provento
                    </Button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rvDividendsByMonth} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                        tickFormatter={(v) => `R$ ${v}`}
                      />
                      <RechartsTooltip
                        formatter={(val: number) => [formatCurrency(val), "Proventos"]}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          borderColor: "var(--color-border)",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mt-2 text-right">
                <Link
                  to="/proventos"
                  className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                >
                  Ver calendário de proventos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Top Ações e FIIs da Carteira */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Maiores Posições (RV)</h2>
                  <p className="text-xs text-muted-foreground">Concentração em Ações e FIIs</p>
                </div>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                {rvSummary.items.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum ativo de Renda Variável.
                  </div>
                ) : (
                  rvSummary.items.slice(0, 5).map((inv) => {
                    const m = metricsFor(inv, transactions);
                    const pct = rvSummary.totalGross > 0 ? (inv.current_balance / rvSummary.totalGross) * 100 : 0;

                    return (
                      <div
                        key={inv.id}
                        className="rounded-xl border border-border bg-surface p-3 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/15 font-bold text-chart-2 text-xs">
                            {inv.ticker ? inv.ticker.slice(0, 4) : inv.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{inv.name}</span>
                              {inv.ticker && (
                                <span className="rounded bg-accent px-1 py-0.2 text-[9px] font-bold text-muted-foreground">
                                  {inv.ticker}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {pct.toFixed(1)}% da Renda Variável
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="num font-bold text-foreground">{formatCurrency(inv.current_balance)}</p>
                          <p className={`num text-[10px] ${m.grossProfit >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatPercent(m.grossProfitPercent)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Ativos de Renda Variável Detalhados */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold">Carteira de Renda Variável</h2>
                <p className="text-xs text-muted-foreground">
                  Ações, Fundos Imobiliários (FIIs), BDRs e ETFs com rentabilidade acumulada
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/proventos">
                  <DollarSign className="mr-1.5 h-4 w-4" /> Gestão de Proventos
                </Link>
              </Button>
            </div>

            {rvSummary.items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum ativo de Renda Variável cadastrado.
                <div className="mt-3">
                  <Button onClick={() => setOpenInvDialog(true)} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Cadastrar Ação ou FII
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {rvSummary.items.map((inv) => {
                  const m = metricsFor(inv, transactions);

                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 font-bold text-chart-2">
                          {inv.ticker ? inv.ticker.slice(0, 4) : SUBTYPE_LABELS[inv.sub_type] || "RV"}
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
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="rounded bg-accent px-1.5 py-0.2 text-[10px] font-medium">
                              {SUBTYPE_LABELS[inv.sub_type] || inv.sub_type}
                            </span>
                            {inv.quantity ? (
                              <span>· {inv.quantity} cotas/ações</span>
                            ) : null}
                            {inv.unit_price ? (
                              <span>· Preço Médio: {formatCurrency(inv.unit_price)}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="num text-sm font-bold text-foreground">
                            {formatCurrency(inv.current_balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aplicado: {formatCurrency(m.investedTotal)}
                          </p>
                        </div>

                        <div className="min-w-24 text-right">
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
        </TabsContent>
      </Tabs>

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

