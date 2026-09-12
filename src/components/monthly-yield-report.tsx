import { useState, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Landmark,
  Percent,
  PieChart,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { MonthlySnapshotDialog } from "@/components/monthly-snapshot-dialog";
import {
  CATEGORY_LABELS,
  DIVIDEND_LABELS,
  INDEXER_LABELS,
  SUBTYPE_LABELS,
  currentYearMonth,
  formatCurrency,
  formatDate,
  formatPercent,
  monthLabel,
  todayISO,
  type Dividend,
  type Investment,
  type Snapshot,
  type Transaction,
} from "@/lib/finance";

interface MonthlyYieldReportProps {
  investments: Investment[];
  transactions: Transaction[];
  dividends: Dividend[];
  snapshots: Snapshot[];
}

export function MonthlyYieldReport({
  investments,
  transactions,
  dividends,
  snapshots,
}: MonthlyYieldReportProps) {
  const currentYM = currentYearMonth();

  // Lista de meses disponíveis para seleção
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYM);
    for (const s of snapshots) set.add(s.year_month);
    for (const t of transactions) {
      if (t.date) set.add(t.date.slice(0, 7));
    }
    for (const d of dividends) {
      if (d.payment_date) set.add(d.payment_date.slice(0, 7));
    }

    // Se tiver poucos meses, gerar últimos 6 meses para conveniência
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(d.toISOString().slice(0, 7));
    }

    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [snapshots, transactions, dividends, currentYM]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    snapshots.length > 0 ? snapshots[0]?.year_month ?? currentYM : currentYM,
  );
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);

  // Snapshot consolidado para o mês selecionado (se houver)
  const snapshotForMonth = useMemo(() => {
    return snapshots.find((s) => s.year_month === selectedMonth) ?? null;
  }, [snapshots, selectedMonth]);

  // Transações e proventos do mês selecionado
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthDividends = useMemo(() => {
    return dividends.filter(
      (d) => d.payment_date && d.payment_date.startsWith(selectedMonth) && d.status === "recebido",
    );
  }, [dividends, selectedMonth]);

  // Snapshot do mês anterior
  const previousSnapshot = useMemo(() => {
    const past = snapshots
      .filter((s) => s.year_month < selectedMonth)
      .sort((a, b) => (a.year_month > b.year_month ? -1 : 1));
    return past[0] ?? null;
  }, [snapshots, selectedMonth]);

  // Cálculo consolidado de rendimento do mês
  const monthReportData = useMemo(() => {
    const isConsolidated = !!snapshotForMonth;
    const isCurrentMonth = selectedMonth === currentYM;

    // Aportes e resgates do mês pelas transações
    const txDeposits = monthTransactions
      .filter((t) => t.type === "aporte")
      .reduce((acc, t) => acc + t.amount, 0);

    const txWithdrawals = monthTransactions
      .filter((t) => t.type === "resgate")
      .reduce((acc, t) => acc + t.amount, 0);

    const txRFEarnings = monthTransactions
      .filter((t) => t.type === "rendimento_rf")
      .reduce((acc, t) => acc + t.amount, 0);

    const totalDividends = monthDividends.reduce((acc, d) => acc + d.amount, 0);

    // Saldo atual dos ativos
    const totalCurrentGross = investments
      .filter((i) => i.status === "ativo")
      .reduce((acc, i) => acc + i.current_balance, 0);

    let initialBalance = 0;
    let finalBalance = 0;
    let deposits = 0;
    let withdrawals = 0;
    let profitAmount = 0;
    let profitPercent = 0;
    let cdiBenchmark = 0.95; // CDI padrão aproximado mensal
    let ipcaBenchmark = 0.40;
    let ibovespaBenchmark = 1.20;

    if (snapshotForMonth) {
      initialBalance = snapshotForMonth.initial_balance;
      finalBalance = snapshotForMonth.final_balance;
      deposits = snapshotForMonth.deposits;
      withdrawals = snapshotForMonth.withdrawals;
      profitAmount = snapshotForMonth.profit_amount;
      profitPercent = snapshotForMonth.profit_percent;
      cdiBenchmark = snapshotForMonth.cdi_benchmark || 0.95;
      ipcaBenchmark = snapshotForMonth.ipca_benchmark || 0.40;
      ibovespaBenchmark = snapshotForMonth.ibovespa_benchmark || 1.20;
    } else {
      deposits = txDeposits;
      withdrawals = txWithdrawals;

      if (previousSnapshot) {
        initialBalance = previousSnapshot.final_balance;
      } else {
        initialBalance = Math.max(0, totalCurrentGross - deposits + withdrawals);
      }

      if (isCurrentMonth) {
        finalBalance = totalCurrentGross;
      } else {
        finalBalance = initialBalance + deposits - withdrawals + totalDividends + txRFEarnings;
      }

      // Rendimento em R$ = Saldo Final - (Saldo Inicial + Aportes - Resgates)
      profitAmount = finalBalance - (initialBalance + deposits - withdrawals);

      // Base média investida ponderada para percentual
      const baseInvested = initialBalance + (deposits - withdrawals) / 2;
      profitPercent = baseInvested > 0 ? (profitAmount / baseInvested) * 100 : 0;
    }

    // % do CDI alcançado
    const percentOfCdi = cdiBenchmark > 0 ? (profitPercent / cdiBenchmark) * 100 : 0;
    // Ganho Real acima da Inflação
    const realReturn = profitPercent - ipcaBenchmark;

    return {
      isConsolidated,
      isCurrentMonth,
      initialBalance,
      finalBalance,
      deposits,
      withdrawals,
      profitAmount,
      profitPercent,
      totalDividends,
      txRFEarnings,
      cdiBenchmark,
      ipcaBenchmark,
      ibovespaBenchmark,
      percentOfCdi,
      realReturn,
    };
  }, [
    snapshotForMonth,
    selectedMonth,
    currentYM,
    monthTransactions,
    monthDividends,
    investments,
    previousSnapshot,
  ]);

  // Rendimento por Categoria / Classe no Mês
  const categoryYieldBreakdown = useMemo(() => {
    const active = investments.filter((i) => i.status === "ativo");
    const totalGross = monthReportData.finalBalance > 0 ? monthReportData.finalBalance : 1;

    const catMap: Record<
      string,
      {
        category: string;
        label: string;
        currentBalance: number;
        dividendsAmount: number;
        estimatedProfitAmount: number;
        profitPercent: number;
        weightPercent: number;
      }
    > = {
      renda_fixa: {
        category: "renda_fixa",
        label: "Renda Fixa",
        currentBalance: 0,
        dividendsAmount: 0,
        estimatedProfitAmount: 0,
        profitPercent: 0,
        weightPercent: 0,
      },
      renda_variavel: {
        category: "renda_variavel",
        label: "Renda Variável (Ações/FIIs)",
        currentBalance: 0,
        dividendsAmount: 0,
        estimatedProfitAmount: 0,
        profitPercent: 0,
        weightPercent: 0,
      },
      internacional: {
        category: "internacional",
        label: "Internacional",
        currentBalance: 0,
        dividendsAmount: 0,
        estimatedProfitAmount: 0,
        profitPercent: 0,
        weightPercent: 0,
      },
      cripto: {
        category: "cripto",
        label: "Criptoativos",
        currentBalance: 0,
        dividendsAmount: 0,
        estimatedProfitAmount: 0,
        profitPercent: 0,
        weightPercent: 0,
      },
    };

    // Alocar saldos
    for (const inv of active) {
      if (catMap[inv.category]) {
        catMap[inv.category].currentBalance += inv.current_balance;
      }
    }

    // Alocar proventos do mês por categoria
    for (const d of monthDividends) {
      const inv = investments.find((i) => i.id === d.investment_id);
      if (inv && catMap[inv.category]) {
        catMap[inv.category].dividendsAmount += d.amount;
      }
    }

    // Proporção de rendimento no mês
    for (const cat of Object.values(catMap)) {
      cat.weightPercent = (cat.currentBalance / totalGross) * 100;
      // Estimativa ponderada de lucro por classe
      if (cat.currentBalance > 0) {
        cat.estimatedProfitAmount = (monthReportData.profitAmount * cat.weightPercent) / 100;
        cat.profitPercent =
          cat.currentBalance > 0
            ? (cat.estimatedProfitAmount / (cat.currentBalance - cat.estimatedProfitAmount)) * 100
            : 0;
      }
    }

    return Object.values(catMap).filter((c) => c.currentBalance > 0 || c.dividendsAmount > 0);
  }, [investments, monthDividends, monthReportData]);

  // Detalhamento por Ativo Individual no Mês
  const assetYieldList = useMemo(() => {
    return investments
      .filter((i) => i.status === "ativo")
      .map((inv) => {
        const invTxs = monthTransactions.filter((t) => t.investment_id === inv.id);
        const invDeposits = invTxs
          .filter((t) => t.type === "aporte")
          .reduce((a, t) => a + t.amount, 0);
        const invWithdrawals = invTxs
          .filter((t) => t.type === "resgate")
          .reduce((a, t) => a + t.amount, 0);

        const invDividends = monthDividends
          .filter((d) => d.investment_id === inv.id)
          .reduce((a, d) => a + d.amount, 0);

        // Participação na carteira
        const sharePercent =
          monthReportData.finalBalance > 0
            ? (inv.current_balance / monthReportData.finalBalance) * 100
            : 0;

        // Rendimento estimado do ativo no mês proporcional ou com base nos proventos
        const assetProfitAmount =
          (monthReportData.profitAmount * sharePercent) / 100 + invDividends;
        const assetProfitPercent =
          inv.current_balance > 0 ? (assetProfitAmount / inv.current_balance) * 100 : 0;

        return {
          investment: inv,
          deposits: invDeposits,
          withdrawals: invWithdrawals,
          dividends: invDividends,
          currentBalance: inv.current_balance,
          sharePercent,
          profitAmount: assetProfitAmount,
          profitPercent: assetProfitPercent,
        };
      })
      .sort((a, b) => b.currentBalance - a.currentBalance);
  }, [investments, monthTransactions, monthDividends, monthReportData]);

  // Histórico dos últimos meses para gráficos comparativos
  const historicalChartData = useMemo(() => {
    // Combinar snapshots com o mês selecionado
    const map = new Map<string, { mes: string; lucroRs: number; rentabilidadePct: number; cdiPct: number }>();

    for (const s of snapshots) {
      map.set(s.year_month, {
        mes: monthLabel(s.year_month),
        lucroRs: s.profit_amount,
        rentabilidadePct: s.profit_percent,
        cdiPct: s.cdi_benchmark || 0.95,
      });
    }

    // Se o mês atual não tiver snapshot, adicionar estimativa
    if (!map.has(selectedMonth)) {
      map.set(selectedMonth, {
        mes: monthLabel(selectedMonth),
        lucroRs: monthReportData.profitAmount,
        rentabilidadePct: monthReportData.profitPercent,
        cdiPct: monthReportData.cdiBenchmark,
      });
    }

    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-12)
      .map((item) => item[1]);
  }, [snapshots, selectedMonth, monthReportData]);

  // Função para exportar CSV
  function handleExportCSV() {
    try {
      const headers = [
        "Mês",
        "Saldo Inicial (R$)",
        "Aportes (R$)",
        "Resgates (R$)",
        "Saldo Final (R$)",
        "Rendimento no Mês (R$)",
        "Rentabilidade no Mês (%)",
        "Proventos Recebidos (R$)",
        "CDI (%)",
        "Status",
      ];

      const rows = snapshots.map((s) => [
        monthLabel(s.year_month),
        s.initial_balance.toFixed(2),
        s.deposits.toFixed(2),
        s.withdrawals.toFixed(2),
        s.final_balance.toFixed(2),
        s.profit_amount.toFixed(2),
        s.profit_percent.toFixed(2),
        (s.earnings || 0).toFixed(2),
        (s.cdi_benchmark || 0).toFixed(2),
        "Consolidado",
      ]);

      // Adicionar linha do mês atual se não estiver nos snapshots
      if (!snapshotForMonth) {
        rows.push([
          monthLabel(selectedMonth),
          monthReportData.initialBalance.toFixed(2),
          monthReportData.deposits.toFixed(2),
          monthReportData.withdrawals.toFixed(2),
          monthReportData.finalBalance.toFixed(2),
          monthReportData.profitAmount.toFixed(2),
          monthReportData.profitPercent.toFixed(2),
          monthReportData.totalDividends.toFixed(2),
          monthReportData.cdiBenchmark.toFixed(2),
          "Estimado / Em Aberto",
        ]);
      }

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio-rendimento-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Relatório CSV exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar arquivo CSV.");
    }
  }

  // Função para imprimir relatório
  function handlePrint() {
    window.print();
  }

  const isProfitPositive = monthReportData.profitAmount >= 0;

  return (
    <div className="space-y-6">
      {/* SELETOR DE MÊS & AÇÕES DO RELATÓRIO */}
      <div className="panel p-5 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Relatório de Rendimento & Rentabilidade Mensal
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Demonstrativo detalhado do lucro em Reais (R$) e retorno percentual (%) auferido no período.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Seletor do Mês */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Mês de Referência:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground">
                    {monthLabel(m)} {m === currentYM ? "(Mês Atual)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status do Mês */}
            {monthReportData.isConsolidated ? (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[11px] py-1">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Fechamento Consolidado
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSnapshotDialogOpen(true)}
                className="text-xs border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" /> Mês em Aberto · Consolidar
              </Button>
            )}

            {/* Ações de Impressão e Download */}
            <Button variant="outline" size="sm" onClick={handleExportCSV} title="Exportar para Excel / CSV">
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-success" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} title="Imprimir ou Salvar PDF">
              <Printer className="mr-1.5 h-4 w-4 text-primary" /> Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO (visível apenas na impressão) */}
      <div className="hidden print:block border-b border-border pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
              F
            </div>
            <div>
              <h1 className="text-xl font-bold">Finantria Invest — Relatório Gerencial</h1>
              <p className="text-xs text-muted-foreground">Gestão Consolidada de Investimentos</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Mês de Referência: {monthLabel(selectedMonth)}</p>
            <p className="text-muted-foreground">Emissão: {formatDate(todayISO())}</p>
          </div>
        </div>
      </div>

      {/* CARDS PRINCIPAIS: RENDIMENTO EM R$ E % */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1: Rendimento em Reais (R$) */}
        <div className="panel p-5 relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rendimento no Mês (R$)
              </p>
              <p
                className={`num text-2xl sm:text-3xl font-bold mt-1.5 ${
                  isProfitPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isProfitPositive ? `+ ${formatCurrency(monthReportData.profitAmount)}` : formatCurrency(monthReportData.profitAmount)}
              </p>
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isProfitPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}
            >
              {isProfitPositive ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Proventos no Mês:</span>
            <span className="font-bold text-foreground">
              {formatCurrency(monthReportData.totalDividends)}
            </span>
          </div>
        </div>

        {/* CARD 2: Rentabilidade em Porcentagem (%) */}
        <div className="panel p-5 relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rentabilidade no Mês (%)
              </p>
              <p
                className={`num text-2xl sm:text-3xl font-bold mt-1.5 ${
                  isProfitPositive ? "text-success" : "text-destructive"
                }`}
              >
                {formatPercent(monthReportData.profitPercent)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Percent className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Desempenho vs CDI:</span>
            <span
              className={`font-bold ${
                monthReportData.percentOfCdi >= 100 ? "text-success" : "text-warning"
              }`}
            >
              {monthReportData.percentOfCdi.toFixed(1)}% do CDI
            </span>
          </div>
        </div>

        {/* CARD 3: Patrimônio & Variação */}
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Patrimônio Final ({monthLabel(selectedMonth)})
              </p>
              <p className="num text-2xl sm:text-3xl font-bold text-foreground mt-1.5">
                {formatCurrency(monthReportData.finalBalance)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-strong text-muted-foreground">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Saldo Inicial do Mês:</span>
            <span className="num font-semibold text-muted-foreground">
              {formatCurrency(monthReportData.initialBalance)}
            </span>
          </div>
        </div>

        {/* CARD 4: Fluxo de Aportes vs Resgates */}
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Aportes Líquidos no Mês
              </p>
              <p className="num text-2xl sm:text-3xl font-bold text-primary mt-1.5">
                {formatCurrency(monthReportData.deposits - monthReportData.withdrawals)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-strong text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Aportes: </span>
              <span className="num font-bold text-success">+{formatCurrency(monthReportData.deposits)}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Resgates: </span>
              <span className="num font-bold text-destructive">-{formatCurrency(monthReportData.withdrawals)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATIVO COM BENCHMARKS DE MERCADO */}
      <div className="panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Comparativo de Desempenho do Mês vs Benchmarks
            </h3>
            <p className="text-xs text-muted-foreground">
              Como sua carteira performou em relação aos principais indicadores da economia brasileira.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-semibold">
            {monthLabel(selectedMonth)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Carteira Finantria */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase">Sua Carteira</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className={`num text-2xl font-bold ${isProfitPositive ? "text-success" : "text-destructive"}`}>
              {formatPercent(monthReportData.profitPercent)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Rendimento em R$: <span className="font-bold text-foreground">{formatCurrency(monthReportData.profitAmount)}</span>
            </p>
          </div>

          {/* CDI */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">CDI</span>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="num text-2xl font-bold text-foreground">
              {formatPercent(monthReportData.cdiBenchmark)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sua carteira: <span className="font-bold text-primary">{monthReportData.percentOfCdi.toFixed(1)}% do CDI</span>
            </p>
          </div>

          {/* IPCA (Inflação) */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">IPCA (Inflação)</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="num text-2xl font-bold text-foreground">
              {formatPercent(monthReportData.ipcaBenchmark)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ganho Real (acima inflação):{" "}
              <span className={`font-bold ${monthReportData.realReturn >= 0 ? "text-success" : "text-destructive"}`}>
                {formatPercent(monthReportData.realReturn)}
              </span>
            </p>
          </div>

          {/* Ibovespa */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Ibovespa (B3)</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="num text-2xl font-bold text-foreground">
              {formatPercent(monthReportData.ibovespaBenchmark)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Spread vs Bolsa:{" "}
              <span className="font-bold text-foreground">
                {formatPercent(monthReportData.profitPercent - monthReportData.ibovespaBenchmark)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICOS: RENDIMENTO EM R$ E % MÊS A MÊS */}
      <div className="grid gap-6 lg:grid-cols-2 print:break-inside-avoid">
        {/* Gráfico de Lucro / Rendimento em Reais */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Rendimento em Reais (R$) por Mês</h3>
              <p className="text-xs text-muted-foreground">
                Histórico do resultado financeiro monetário gerado
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  formatter={(val: number) => [formatCurrency(val), "Rendimento"]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                  }}
                />
                <Bar dataKey="lucroRs" radius={[4, 4, 0, 0]}>
                  {historicalChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.lucroRs >= 0 ? "var(--color-success)" : "var(--color-destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Rentabilidade Percentual vs CDI */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Rentabilidade (%) vs CDI</h3>
              <p className="text-xs text-muted-foreground">
                Comparação percentual da carteira vs taxa livre de risco
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <RechartsTooltip
                  formatter={(val: number, name: string) => [
                    `${val.toFixed(2)}%`,
                    name === "rentabilidadePct" ? "Sua Carteira" : "CDI",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                  }}
                />
                <Legend
                  formatter={(value) => (value === "rentabilidadePct" ? "Sua Carteira (%)" : "CDI (%)")}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                <Line
                  type="monotone"
                  dataKey="rentabilidadePct"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-primary)" }}
                />
                <Line
                  type="monotone"
                  dataKey="cdiPct"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETALHAMENTO POR CLASSE / CATEGORIA */}
      <div className="panel p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Rendimento por Classe de Ativo ({monthLabel(selectedMonth)})
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribuição do resultado financeiro e proventos por tipo de aplicação.
            </p>
          </div>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categoryYieldBreakdown.map((cat) => (
            <div
              key={cat.category}
              className="rounded-xl border border-border bg-surface p-4 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{cat.label}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {cat.weightPercent.toFixed(1)}% da carteira
                  </span>
                </div>
                <p className="num text-lg font-bold text-primary mt-1">
                  {formatCurrency(cat.currentBalance)}
                </p>
              </div>

              <div className="border-t border-border pt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rendimento R$:</span>
                  <span
                    className={`num font-bold ${
                      cat.estimatedProfitAmount >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(cat.estimatedProfitAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rentabilidade %:</span>
                  <span
                    className={`num font-bold ${
                      cat.profitPercent >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatPercent(cat.profitPercent)}
                  </span>
                </div>
                {cat.dividendsAmount > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span className="text-[11px]">Proventos:</span>
                    <span className="num font-bold">+{formatCurrency(cat.dividendsAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TABELA DETALHADA POR ATIVO NO MÊS */}
      <div className="panel overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Detalhamento de Rendimento por Ativo ({monthLabel(selectedMonth)})
            </h3>
            <p className="text-xs text-muted-foreground">
              Posição, proventos, movimentações e rendimento individual de cada ativo.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {assetYieldList.length} ativos ativos analisados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Ativo / Código</th>
                <th className="px-3 py-3 font-semibold">Classe & Instituição</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Atual</th>
                <th className="px-3 py-3 text-right font-semibold">Aportes / Resgates</th>
                <th className="px-3 py-3 text-right font-semibold">Proventos no Mês</th>
                <th className="px-3 py-3 text-right font-semibold">Rendimento (R$)</th>
                <th className="py-3 pl-3 pr-4 text-right font-semibold">Rentabilidade (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assetYieldList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum investimento ativo no momento.
                  </td>
                </tr>
              ) : (
                assetYieldList.map((item) => {
                  const inv = item.investment;
                  const isPositive = item.profitAmount >= 0;

                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-surface/50">
                      <td className="py-3 pl-4 pr-3">
                        <p className="font-bold text-foreground">{inv.name}</p>
                        {inv.ticker && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            {inv.ticker}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{inv.institution}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {CATEGORY_LABELS[inv.category] ?? inv.category} ·{" "}
                          {SUBTYPE_LABELS[inv.sub_type] ?? inv.sub_type}
                        </p>
                      </td>

                      <td className="num px-3 py-3 text-right font-bold text-foreground">
                        {formatCurrency(item.currentBalance)}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {item.sharePercent.toFixed(1)}% do total
                        </span>
                      </td>

                      <td className="num px-3 py-3 text-right">
                        {item.deposits > 0 && (
                          <span className="block text-success font-semibold">
                            +{formatCurrency(item.deposits)}
                          </span>
                        )}
                        {item.withdrawals > 0 && (
                          <span className="block text-destructive font-semibold">
                            -{formatCurrency(item.withdrawals)}
                          </span>
                        )}
                        {item.deposits === 0 && item.withdrawals === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="num px-3 py-3 text-right font-semibold">
                        {item.dividends > 0 ? (
                          <span className="text-success font-bold">
                            +{formatCurrency(item.dividends)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="num px-3 py-3 text-right font-bold">
                        <span className={isPositive ? "text-success" : "text-destructive"}>
                          {isPositive ? `+${formatCurrency(item.profitAmount)}` : formatCurrency(item.profitAmount)}
                        </span>
                      </td>

                      <td className="num py-3 pl-3 pr-4 text-right font-bold">
                        <span className={isPositive ? "text-success" : "text-destructive"}>
                          {formatPercent(item.profitPercent)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Fechamento Rápido */}
      <MonthlySnapshotDialog
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
        snapshot={snapshotForMonth}
        defaultCurrentBalance={monthReportData.finalBalance}
      />
    </div>
  );
}
