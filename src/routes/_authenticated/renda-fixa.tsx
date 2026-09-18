import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
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
import { useDeleteRow, useInvestments, useSnapshots, useTransactions } from "@/lib/data";
import {
  INDEXER_LABELS,
  SUBTYPE_LABELS,
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
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

function RendaFixaPage() {
  const { data: investments = [], isLoading: loadingInvestments } = useInvestments();
  const { data: snapshots = [], isLoading: loadingSnapshots } = useSnapshots();
  const { data: transactions = [] } = useTransactions();
  const deleteInv = useDeleteRow("investments");
  const deleteSnapshot = useDeleteRow("monthly_snapshots");

  // Filtra apenas ativos de renda fixa
  const fixedInvestments = useMemo(() => {
    return investments.filter((i) => i.category === "renda_fixa");
  }, [investments]);

  // Totais agregados da Renda Fixa
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
  }, [fixedInvestments]);

  // Snapshots de renda fixa (todos ou os gerais) ordenados do mais recente para o mais antigo
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => b.year_month.localeCompare(a.year_month));
  }, [snapshots]);

  // Modais de controle
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txTargetInvId, setTxTargetInvId] = useState<string | null>(null);

  const [deleteInvId, setDeleteInvId] = useState<string | null>(null);
  const [deleteSnapshotId, setDeleteSnapshotId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("snapshots");
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
    } catch (e) {
      toast.error("Erro ao excluir ativo.");
    }
  }

  async function handleDeleteSnapshot() {
    if (!deleteSnapshotId) return;
    try {
      await deleteSnapshot.mutateAsync(deleteSnapshotId);
      toast.success("Registro de fechamento removido.");
      setDeleteSnapshotId(null);
    } catch (e) {
      toast.error("Erro ao excluir fechamento.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Principal da Aba de Renda Fixa */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Renda Fixa
              </h1>
              <p className="text-xs text-muted-foreground">
                Acompanhamento mensal com Saldo Inicial, Aportes e Saldo Final, cálculo de rendimento dia a dia (DU/252) e ativos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Registro Mensal */}
          <Button
            onClick={() => {
              setSelectedSnapshot(null);
              setSnapshotDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Registrar Fechamento do Mês
          </Button>

          {/* Botão Novo Ativo de RF */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedInvestment(null);
              setInvestmentDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Ativo de RF
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais em Tons de Azul Claro */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Patrimônio em Renda Fixa */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/5 p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrimônio em RF
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(fixedStats.totalGross)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Líquido estimado: <span className="font-semibold text-foreground">{formatCurrency(fixedStats.totalNet)}</span>
            </p>
          </div>
        </div>

        {/* Total Aportado */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Aportado (Base)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(fixedStats.totalInvested)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fixedStats.count} ativo(s) ativo(s) na carteira
            </p>
          </div>
        </div>

        {/* Rendimento Total Acumulado */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rendimento Acumulado
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                fixedStats.totalProfit >= 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                fixedStats.totalProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatCurrency(fixedStats.totalProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rentabilidade:{" "}
              <span className="font-semibold text-foreground">
                {formatPercent(fixedStats.totalProfitPercent)}
              </span>
            </p>
          </div>
        </div>

        {/* Último Mês Registrado */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-glow/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Último Fechamento
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {sortedSnapshots.length > 0 && sortedSnapshots[0] ? (
              <>
                <p className="num text-xl font-bold text-foreground">
                  {sortedSnapshots[0].year_month}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Lucro mês:</span>
                  <span
                    className={`font-bold ${
                      sortedSnapshots[0].profit_amount >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(sortedSnapshots[0].profit_amount)} (
                    {formatPercent(sortedSnapshots[0].profit_percent)})
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Nenhum mês fechado</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Clique em &quot;Registrar Fechamento&quot;
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Abas Secundárias de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-surface border border-border p-1">
          <TabsTrigger
            value="snapshots"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            Fechamento Mensal (Saldos & Aportes)
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Landmark className="h-3.5 w-3.5" />
            Ativos de Renda Fixa ({fixedInvestments.length})
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            Rendimento Diário & Calendário (DU/252)
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: HISTÓRICO DE FECHAMENTO MENSAL (SALDOS & APORTES) */}
        <TabsContent value="snapshots" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Histórico de Fechamentos Mensais
                </h3>
                <p className="text-xs text-muted-foreground">
                  Registro simplificado do Saldo Inicial, Aportes no mês, Resgates e Saldo Final com cálculo do rendimento líquido real.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedSnapshot(null);
                  setSnapshotDialogOpen(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo Registro Mensal
              </Button>
            </div>

            {sortedSnapshots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Nenhum fechamento mensal registrado ainda
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Para acompanhar o rendimento real da sua Renda Fixa mês a mês, informe o saldo no início e no fim de cada mês junto com os aportes realizados.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSnapshot(null);
                    setSnapshotDialogOpen(true);
                  }}
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Registrar Primeiro Mês
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Mês / Ano</th>
                      <th className="py-3 px-4 font-semibold text-right">Saldo Inicial (1º dia)</th>
                      <th className="py-3 px-4 font-semibold text-right">Aportes no Mês</th>
                      <th className="py-3 px-4 font-semibold text-right">Resgates</th>
                      <th className="py-3 px-4 font-semibold text-right">Saldo Final (Último dia)</th>
                      <th className="py-3 px-4 font-semibold text-right">Rendimento (R$)</th>
                      <th className="py-3 px-4 font-semibold text-right">Rentabilidade (%)</th>
                      <th className="py-3 px-4 font-semibold text-center">Benchmark CDI</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedSnapshots.map((sn) => {
                      const isPositive = sn.profit_amount >= 0;
                      return (
                        <tr key={sn.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="font-mono text-sm">{sn.year_month}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {formatCurrency(sn.initial_balance)}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-semibold text-primary">
                            {sn.deposits > 0 ? `+ ${formatCurrency(sn.deposits)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {sn.withdrawals > 0 ? `- ${formatCurrency(sn.withdrawals)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-foreground">
                            {formatCurrency(sn.final_balance)}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right num font-bold ${
                              isPositive ? "text-success" : "text-destructive"
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {isPositive ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              )}
                              {formatCurrency(sn.profit_amount)}
                            </div>
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right num font-bold ${
                              isPositive ? "text-success" : "text-destructive"
                            }`}
                          >
                            {formatPercent(sn.profit_percent)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="outline" className="text-[10px] bg-surface">
                              CDI: {formatPercent(sn.cdi_benchmark)}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedSnapshot(sn);
                                  setSnapshotDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteSnapshotId(sn.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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

        {/* ABA 2: ATIVOS DE RENDA FIXA */}
        <TabsContent value="assets" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Meus Ativos de Renda Fixa
                </h3>
                <p className="text-xs text-muted-foreground">
                  CDBs, LCIs, LCAs, Tesouro Direto, Debêntures e outros títulos cadastrados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar ativo ou emissor..."
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
                  Novo Ativo
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
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedInvestment(null);
                    setInvestmentDialogOpen(true);
                  }}
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar Título de Renda Fixa
                </Button>
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
                      const m = metricsFor(inv);
                      const isExpired = inv.due_date && inv.due_date < todayISO();
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
                                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
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
                              m.grossProfit >= 0 ? "text-success" : "text-destructive"
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

        {/* ABA 3: RENDIMENTO DIÁRIO & CALENDÁRIO (DU/252 + FERIADOS) */}
        <TabsContent value="daily" className="space-y-4">
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

      {/* CONFIRMAÇÃO EXCLUSÃO SNAPSHOT */}
      <AlertDialog open={!!deleteSnapshotId} onOpenChange={(open) => !open && setDeleteSnapshotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fechamento Mensal?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o registro deste mês? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSnapshot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
