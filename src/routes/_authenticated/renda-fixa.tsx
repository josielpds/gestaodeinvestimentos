import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit2,
  FileSpreadsheet,
  Info,
  Landmark,
  Layers,
  Plus,
  Receipt,
  Sparkles,
  TableProperties,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentDialog } from "@/components/investment-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { RendaFixaSnapshotDialog } from "@/components/renda-fixa-snapshot-dialog";
import { DailyYieldView } from "@/components/daily-yield-view";
import { AnnualSpreadsheetTable } from "@/components/annual-spreadsheet-table";
import { AnnualMonthlyYieldBar } from "@/components/annual-monthly-yield-bar";
import { useDeleteRow, useInvestments, useSaveRow, useSnapshots, useTransactions } from "@/lib/data";
import {
  INDEXER_LABELS,
  SUBTYPE_LABELS,
  currentYearMonth,
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
  monthLabel,
  todayISO,
  type Investment,
  type Snapshot,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/renda-fixa")({
  head: () => ({
    meta: [{ title: "Renda Fixa — PatrimônioInvest" }],
  }),
  component: RendaFixaPage,
});

export function RendaFixaPage() {
  const { data: investments = [], isLoading: loadingInvestments, refetch: refetchInvestments } = useInvestments();
  const { data: snapshots = [], isLoading: loadingSnapshots, refetch: refetchSnapshots } = useSnapshots();
  const { data: transactions = [] } = useTransactions();
  const deleteInv = useDeleteRow("investments");
  const saveInv = useSaveRow("investments");

  // Ano de referência selecionado para as planilhas
  const currentYear = new Date().getFullYear();
  const currentYM = currentYearMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Filtra apenas ativos de renda fixa
  const fixedInvestments = useMemo(() => {
    return investments.filter((i) => i.category === "renda_fixa");
  }, [investments]);

  // Identifica ou define o ativo de Saldo Conta Dia a Dia / CNPJ
  const cnpjAccount = useMemo(() => {
    return fixedInvestments.find(
      (i) =>
        i.name.toLowerCase().includes("cnpj") ||
        i.name.toLowerCase().includes("conta dia a dia") ||
        i.institution.toLowerCase().includes("cnpj") ||
        i.notes?.toLowerCase().includes("cnpj"),
    );
  }, [fixedInvestments]);

  // Se o usuário ainda não tiver a conta CNPJ criada, criamos silenciosamente quando necessário
  const [cnpjAccountId, setCnpjAccountId] = useState<string | null>(cnpjAccount?.id ?? null);

  useEffect(() => {
    if (cnpjAccount) {
      setCnpjAccountId(cnpjAccount.id);
    }
  }, [cnpjAccount]);

  // Totais agregados da Renda Fixa tradicional
  const fixedStats = useMemo(() => {
    let totalGross = 0;
    let totalInvested = 0;
    let totalNet = 0;
    let totalProfit = 0;

    for (const inv of fixedInvestments) {
      if (inv.status === "resgatado") continue;
      const m = metricsFor(inv, transactions);
      totalGross += inv.current_balance;
      totalInvested += m.investedTotal;
      totalNet += m.netBalance;
      totalProfit += m.grossProfit;
    }

    const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalGross,
      totalInvested,
      totalNet,
      totalProfit,
      totalProfitPercent,
      count: fixedInvestments.filter((i) => i.status === "ativo").length,
    };
  }, [fixedInvestments, transactions]);

  // Cálculo Dinâmico do Saldo do Patrimônio em RF e Rendimento do Mês Atual baseado nas Planilhas
  const spreadsheetMetrics = useMemo(() => {
    const yearSnaps = snapshots.filter((s) => s.year_month.startsWith(String(selectedYear)));
    const invSnaps = yearSnaps.filter((s) => !s.investment_id || s.investment_id === "null");
    const cnpjSnaps = cnpjAccountId
      ? yearSnaps.filter((s) => s.investment_id === cnpjAccountId)
      : cnpjAccount
        ? yearSnaps.filter((s) => s.investment_id === cnpjAccount.id)
        : [];

    // Snapshot do mês atual
    const currentInvSnap = invSnaps.find((s) => s.year_month === currentYM);
    const currentCnpjSnap = cnpjSnaps.find((s) => s.year_month === currentYM);

    // Último snapshot preenchido do ano
    const latestInvSnap =
      currentInvSnap ??
      [...invSnaps].sort((a, b) => b.year_month.localeCompare(a.year_month))[0];
    const latestCnpjSnap =
      currentCnpjSnap ??
      [...cnpjSnaps].sort((a, b) => b.year_month.localeCompare(a.year_month))[0];

    const invFinal = Number(latestInvSnap?.final_balance) || 0;
    const cnpjFinal = Number(latestCnpjSnap?.final_balance) || 0;

    // Saldo do Patrimônio: soma dos saldos finais das planilhas ou fallback
    const totalPatrimonioRF =
      invFinal + cnpjFinal > 0 ? invFinal + cnpjFinal : fixedStats.totalGross;

    // Rendimento do Mês Atual somado (Investimentos + Conta Dia a Dia)
    const currentInvProfit = Number(currentInvSnap?.profit_amount) || 0;
    const currentCnpjProfit = Number(currentCnpjSnap?.profit_amount) || 0;
    const currentMonthTotalYield = currentInvProfit + currentCnpjProfit;

    // Lucro Total no Ano Selecionado
    const totalYearProfit = yearSnaps.reduce((acc, s) => {
      const p =
        s.profit_amount !== undefined && s.profit_amount !== null
          ? Number(s.profit_amount)
          : (Number(s.final_balance) || 0) - (Number(s.initial_balance) || 0);
      return acc + p;
    }, 0);

    const refMonth = currentInvSnap?.year_month ?? latestInvSnap?.year_month ?? currentYM;

    return {
      totalPatrimonioRF,
      currentMonthTotalYield,
      totalYearProfit,
      refMonth,
    };
  }, [snapshots, selectedYear, currentYM, cnpjAccountId, cnpjAccount, fixedStats.totalGross]);

  // Modais de controle
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txTargetInvId, setTxTargetInvId] = useState<string | null>(null);

  const [deleteInvId, setDeleteInvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("spreadsheets");
  const [searchAsset, setSearchAsset] = useState("");

  const filteredAssets = useMemo(() => {
    if (!searchAsset.trim()) return fixedInvestments;
    const q = searchAsset.toLowerCase();
    return fixedInvestments.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.institution.toLowerCase().includes(q) ||
        (i.ticker && i.ticker.toLowerCase().includes(q)),
    );
  }, [fixedInvestments, searchAsset]);

  async function handleDeleteInvestment() {
    if (!deleteInvId) return;
    try {
      await deleteInv.mutateAsync(deleteInvId);
      toast.success("Ativo de renda fixa removido com sucesso.");
      setDeleteInvId(null);
    } catch {
      toast.error("Erro ao excluir ativo.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Principal da Renda Fixa */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Renda Fixa & Contas
              </h1>
              <p className="text-xs text-muted-foreground">
                Planilhas anuais com Capital Inicial, Capital Atual, Lucro Mês (R$) e Lucro % para Investimentos e Contas CNPJ.
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Ano & Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Ano */}
          <div className="flex items-center gap-1.5 bg-surface border border-border px-3 py-1 rounded-xl text-xs">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-muted-foreground">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>

          {/* Botão Novo Ativo de RF */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedInvestment(null);
              setInvestmentDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Título / Conta
          </Button>

          {/* Botão de Registro Detalhado */}
          <Button
            size="sm"
            onClick={() => {
              setSelectedSnapshot(null);
              setSnapshotDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow text-xs"
          >
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Registrar Fechamento
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais (Sempre pegando o saldo final e rendimento do mês atual) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Patrimônio em Renda Fixa (Saldo Final do Mês) */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/5 p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrimônio em Renda Fixa
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(spreadsheetMetrics.totalPatrimonioRF)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo Final ({spreadsheetMetrics.refMonth}): Investimentos + CNPJ
            </p>
          </div>
        </div>

        {/* Rendimento do Mês Atual */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rendimento do Mês ({monthLabel(currentYM)})
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                spreadsheetMetrics.currentMonthTotalYield >= 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                spreadsheetMetrics.currentMonthTotalYield >= 0
                  ? "text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(spreadsheetMetrics.currentMonthTotalYield)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Investimentos + Saldo Conta Dia a Dia
            </p>
          </div>
        </div>

        {/* Lucro Total do Ano */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-glow/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Rendimento Total ({selectedYear})
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                spreadsheetMetrics.totalYearProfit >= 0 ? "text-emerald-400" : "text-destructive"
              }`}
            >
              {formatCurrency(spreadsheetMetrics.totalYearProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consolidado dos 12 meses do ano
            </p>
          </div>
        </div>
      </div>

      {/* Abas Principais de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-surface border border-border p-1">
          <TabsTrigger
            value="spreadsheets"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Planilhas Anuais (Investimentos & CNPJ)
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Landmark className="h-3.5 w-3.5" />
            Títulos & Contas Cadastradas ({fixedInvestments.length})
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            Rendimento Diário & Calendário (DU/252)
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: MODELO DE PLANILHAS (INVESTIMENTOS & SALDO CONTA DIA A DIA E CNPJ) */}
        {/* ========================================================================= */}
        <TabsContent value="spreadsheets" className="space-y-8 focus-visible:outline-none">
          {/* BARRA RESUMO HORIZONTAL: JAN A DEZ + TOTAL ANUAL (EXATAMENTE COMO NA IMAGEM) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Resumo de Rendimento Mensal ({selectedYear})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Soma Investimentos + Conta Dia a Dia / CNPJ
              </span>
            </div>

            <AnnualMonthlyYieldBar year={selectedYear} snapshots={snapshots} />
          </div>

          {/* TABELA 1: INVESTIMENTOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Planilha 1 · Investimentos em Renda Fixa
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Ano: {selectedYear}
              </span>
            </div>

            <AnnualSpreadsheetTable
              title="INVESTIMENTOS"
              year={selectedYear}
              snapshots={snapshots}
              investmentId={null}
              allowEditProfit={false}
              onSnapshotSaved={() => refetchSnapshots()}
            />
          </div>

          {/* TABELA 2: SALDO CONTA DIA A DIA E CNPJ (LUCRO MÊS EDITÁVEL) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Planilha 2 · Saldo Conta Dia a Dia e CNPJ (Lucro Mês Editável)
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Ano: {selectedYear}
              </span>
            </div>

            <AnnualSpreadsheetTable
              title="SALDO CONTA DIA A DIA E CNPJ"
              year={selectedYear}
              snapshots={snapshots}
              investmentId={cnpjAccountId ?? cnpjAccount?.id ?? null}
              allowEditProfit={true}
              onSnapshotSaved={() => refetchSnapshots()}
            />
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: ATIVOS & TÍTULOS DE RENDA FIXA */}
        {/* ========================================================================= */}
        <TabsContent value="assets" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Títulos e Contas de Renda Fixa
                </h3>
                <p className="text-xs text-muted-foreground">
                  CDBs, LCIs, LCAs, Tesouro Direto, Debêntures e Contas remuneradas cadastradas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar título ou banco..."
                  value={searchAsset}
                  onChange={(e) => setSearchAsset(e.target.value)}
                  className="h-8 w-48 text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedInvestment(null);
                    setInvestmentDialogOpen(true);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Novo Título
                </Button>
              </div>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <Landmark className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Nenhum ativo de Renda Fixa encontrado
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Cadastre seus títulos de CDB, Tesouro Direto, LCI/LCA para acompanhar a rentabilidade diária e vencimento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Ativo / Tipo</th>
                      <th className="py-3 px-4 font-semibold">Instituição / Emissor</th>
                      <th className="py-3 px-4 font-semibold">Taxa / Indexador</th>
                      <th className="py-3 px-4 font-semibold">Vencimento</th>
                      <th className="py-3 px-4 font-semibold text-right">Saldo Bruto</th>
                      <th className="py-3 px-4 font-semibold text-right">Lucro Bruto</th>
                      <th className="py-3 px-4 font-semibold text-right">Saldo Líquido (IR)</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssets.map((inv) => {
                      const m = metricsFor(inv, transactions);
                      const daysLeft = inv.due_date ? daysBetween(todayISO(), inv.due_date) : null;

                      return (
                        <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <div>
                              <p className="font-bold text-sm text-foreground">{inv.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30">
                                  {SUBTYPE_LABELS[inv.sub_type] ?? inv.sub_type.toUpperCase()}
                                </Badge>
                                {inv.tax_exempt ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                    Isento IR
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-medium">
                            {inv.institution}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            <span>{inv.contract_rate || INDEXER_LABELS[inv.indexer]}</span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {inv.due_date ? (
                              <div>
                                <p>{formatDate(inv.due_date)}</p>
                                <p className={`text-[10px] ${daysLeft && daysLeft < 30 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                                  {daysLeft !== null
                                    ? daysLeft > 0
                                      ? `${daysLeft} dias restantes`
                                      : "Vencido"
                                    : ""}
                                </p>
                              </div>
                            ) : (
                              <span>Liquidez diária</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-foreground">
                            {formatCurrency(inv.current_balance)}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right num font-semibold ${
                              m.grossProfit >= 0 ? "text-emerald-400" : "text-destructive"
                            }`}
                          >
                            <div>
                              <p>{formatCurrency(m.grossProfit)}</p>
                              <p className="text-[10px]">({formatPercent(m.grossProfitPercent)})</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-primary">
                            <div>
                              <p>{formatCurrency(m.netBalance)}</p>
                              {!inv.tax_exempt ? (
                                <p className="text-[10px] text-muted-foreground font-normal">
                                  IR: {formatPercent(m.taxRatePercent)}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvestment(inv);
                                    setInvestmentDialogOpen(true);
                                  }}
                                >
                                  Editar Ativo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTxTargetInvId(inv.id);
                                    setTxDialogOpen(true);
                                  }}
                                >
                                  Nova Movimentação (Aporte/Resgate)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteInvId(inv.id)}
                                >
                                  Excluir Ativo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: RENDIMENTO DIÁRIO & CALENDÁRIO (DU/252 + FERIADOS) */}
        {/* ========================================================================= */}
        <TabsContent value="daily" className="space-y-4 focus-visible:outline-none">
          <DailyYieldView />
        </TabsContent>
      </Tabs>

      {/* MODAL: FECHAMENTO MENSAL DE RENDA FIXA */}
      <RendaFixaSnapshotDialog
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
        snapshot={selectedSnapshot}
        fixedInvestments={fixedInvestments}
        defaultInitialBalance={fixedStats.totalGross}
        defaultFinalBalance={fixedStats.totalGross}
      />

      {/* MODAL: NOVO/EDITAR ATIVO */}
      <InvestmentDialog
        open={investmentDialogOpen}
        onOpenChange={setInvestmentDialogOpen}
        investment={selectedInvestment}
        defaultCategory="renda_fixa"
      />

      {/* MODAL: NOVA TRANSAÇÃO */}
      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        investments={investments}
        defaultInvestmentId={txTargetInvId ?? undefined}
      />

      {/* CONFIRMAÇÃO EXCLUSÃO ATIVO */}
      <AlertDialog open={!!deleteInvId} onOpenChange={(open) => !open && setDeleteInvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Título de Renda Fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá este ativo da sua carteira. Os dados de movimentações vinculadas serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvestment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
