import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Coins,
  DollarSign,
  Edit2,
  Filter,
  Layers,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
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
import { DividendDialog } from "@/components/dividend-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { useDeleteRow, useDividends, useInvestments, useTransactions } from "@/lib/data";
import {
  CATEGORY_LABELS,
  DIVIDEND_LABELS,
  SUBTYPE_LABELS,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
  type Dividend,
  type Investment,
  type Transaction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/renda-variavel")({
  head: () => ({
    meta: [{ title: "Renda Variável — Finantria Invest" }],
  }),
  component: RendaVariavelPage,
});

const VARIABLE_CATEGORIES = ["acoes", "fiis", "etfs", "cripto", "bdr", "outros"];

function RendaVariavelPage() {
  const { data: investments = [], isLoading: loadingInvestments } = useInvestments();
  const { data: dividends = [], isLoading: loadingDividends } = useDividends();
  const { data: transactions = [] } = useTransactions();
  const deleteInv = useDeleteRow("investments");
  const deleteDiv = useDeleteRow("dividends");
  const deleteTx = useDeleteRow("transactions");

  // Filtra apenas ativos de Renda Variável
  const variableInvestments = useMemo(() => {
    return investments.filter((i) => i.category !== "renda_fixa");
  }, [investments]);

  // Transações de Renda Variável
  const variableTransactions = useMemo(() => {
    const varIds = new Set(variableInvestments.map((i) => i.id));
    return transactions.filter((t) => varIds.has(t.investment_id));
  }, [transactions, variableInvestments]);

  // Proventos de Renda Variável
  const variableDividends = useMemo(() => {
    const varIds = new Set(variableInvestments.map((i) => i.id));
    return dividends.filter((d) => varIds.has(d.investment_id));
  }, [dividends, variableInvestments]);

  // Totais agregados de Renda Variável
  const variableStats = useMemo(() => {
    let totalGross = 0;
    let totalInvested = 0;
    let totalProfit = 0;

    for (const inv of variableInvestments) {
      if (inv.status === "resgatado") continue;
      const m = metricsFor(inv, transactions);
      totalGross += inv.current_balance;
      totalInvested += m.investedTotal;
      totalProfit += m.grossProfit;
    }

    const totalDividends = variableDividends.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalGross,
      totalInvested,
      totalProfit,
      profitPercent,
      totalDividends,
      count: variableInvestments.filter((i) => i.status === "ativo").length,
    };
  }, [variableInvestments, variableDividends]);

  // Modais de controle
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [selectedDividend, setSelectedDividend] = useState<Dividend | null>(null);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txTargetInvId, setTxTargetInvId] = useState<string | null>(null);

  const [deleteInvId, setDeleteInvId] = useState<string | null>(null);
  const [deleteDivId, setDeleteDivId] = useState<string | null>(null);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("portfolio");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = useMemo(() => {
    return variableInvestments.filter((i) => {
      if (selectedCategoryFilter !== "todos" && i.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = i.name.toLowerCase().includes(q);
        const matchTicker = i.ticker?.toLowerCase().includes(q);
        const matchInst = i.institution.toLowerCase().includes(q);
        if (!matchName && !matchTicker && !matchInst) return false;
      }
      return true;
    });
  }, [variableInvestments, selectedCategoryFilter, searchQuery]);

  async function handleDeleteInvestment() {
    if (!deleteInvId) return;
    try {
      await deleteInv.mutateAsync(deleteInvId);
      toast.success("Ativo removido com sucesso.");
      setDeleteInvId(null);
    } catch {
      toast.error("Erro ao excluir ativo.");
    }
  }

  async function handleDeleteDividend() {
    if (!deleteDivId) return;
    try {
      await deleteDiv.mutateAsync(deleteDivId);
      toast.success("Provento removido.");
      setDeleteDivId(null);
    } catch {
      toast.error("Erro ao excluir provento.");
    }
  }

  async function handleDeleteTransaction() {
    if (!deleteTxId) return;
    try {
      await deleteTx.mutateAsync(deleteTxId);
      toast.success("Transação excluída.");
      setDeleteTxId(null);
    } catch {
      toast.error("Erro ao excluir transação.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Principal da Renda Variável */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Renda Variável
              </h1>
              <p className="text-xs text-muted-foreground">
                Acompanhe Ações, Fundos Imobiliários (FIIs), ETFs, BDRs, cotações, proventos e preço médio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Novo Ativo RV */}
          <Button
            onClick={() => {
              setSelectedInvestment(null);
              setInvDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Ativo (Ação / FII / ETF)
          </Button>

          {/* Botão Lançar Provento */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedDividend(null);
              setDivDialogOpen(true);
            }}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Lançar Provento / Dividendo
          </Button>

          {/* Botão Compra/Venda */}
          <Button
            variant="outline"
            onClick={() => {
              setTxTargetInvId(null);
              setTxDialogOpen(true);
            }}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Nova Compra / Venda
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais em Tons de Azul Claro */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Patrimônio em Renda Variável */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/5 p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrimônio em RV
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(variableStats.totalGross)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Custo de Aquisição: <span className="font-semibold text-foreground">{formatCurrency(variableStats.totalInvested)}</span>
            </p>
          </div>
        </div>

        {/* Lucro / Prejuízo de Valorização */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lucro / Prejuízo em RV
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                variableStats.totalProfit >= 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {variableStats.totalProfit >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                variableStats.totalProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatCurrency(variableStats.totalProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rentabilidade:{" "}
              <span className="font-semibold text-foreground">
                {formatPercent(variableStats.profitPercent)}
              </span>
            </p>
          </div>
        </div>

        {/* Total em Dividendos / Proventos */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proventos Recebidos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(variableStats.totalDividends)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {variableDividends.length} provento(s) registrado(s)
            </p>
          </div>
        </div>

        {/* Ativos em Carteira */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-glow/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Ativos em Carteira
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {variableStats.count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ações, FIIs, ETFs & BDRs
            </p>
          </div>
        </div>
      </div>

      {/* Abas Secundárias */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-surface border border-border p-1">
          <TabsTrigger
            value="portfolio"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Layers className="h-3.5 w-3.5" />
            Minha Carteira ({variableInvestments.length})
          </TabsTrigger>
          <TabsTrigger
            value="dividends"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Proventos & Dividendos ({variableDividends.length})
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="flex items-center gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Receipt className="h-3.5 w-3.5" />
            Histórico de Negociações ({variableTransactions.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: CARTEIRA DE AÇÕES, FIIS, ETFS */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Ativos de Renda Variável
                </h3>
                <p className="text-xs text-muted-foreground">
                  Posições abertas com cotação atual, preço médio e rentabilidade acumulada.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todas Categorias</option>
                  <option value="acoes">Ações</option>
                  <option value="fiis">Fundos Imobiliários (FIIs)</option>
                  <option value="etfs">ETFs</option>
                  <option value="bdr">BDRs</option>
                  <option value="cripto">Criptoativos</option>
                </select>

                <Input
                  placeholder="Buscar ticker ou nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-44 text-xs"
                />

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedInvestment(null);
                    setInvDialogOpen(true);
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
                <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Nenhum ativo de Renda Variável encontrado
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Cadastre suas ações, fundos imobiliários ou ETFs para acompanhar a cotação, preço médio e dividendos.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedInvestment(null);
                    setInvDialogOpen(true);
                  }}
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Cadastrar Primeiro Ativo
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Ticker / Ativo</th>
                      <th className="py-3 px-4 font-semibold">Categoria</th>
                      <th className="py-3 px-4 font-semibold text-right">Quantidade</th>
                      <th className="py-3 px-4 font-semibold text-right">Preço Médio</th>
                      <th className="py-3 px-4 font-semibold text-right">Cotação Atual</th>
                      <th className="py-3 px-4 font-semibold text-right">Saldo Atual</th>
                      <th className="py-3 px-4 font-semibold text-right">Lucro / Prejuízo</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssets.map((inv) => {
                      const m = metricsFor(inv);
                      const isPositive = m.grossProfit >= 0;

                      return (
                        <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <div>
                              <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <span className="font-mono text-primary font-bold">
                                  {inv.ticker || inv.name}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">{inv.name} • {inv.institution}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30">
                              {CATEGORY_LABELS[inv.category] ?? inv.category}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right num font-semibold text-foreground">
                            {inv.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {formatCurrency(inv.average_price)}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-foreground">
                            {formatCurrency(inv.current_price || inv.average_price)}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-foreground">
                            {formatCurrency(inv.current_balance)}
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
                              <span>{formatCurrency(m.grossProfit)}</span>
                            </div>
                            <span className="text-[10px] font-medium">
                              ({formatPercent(m.grossProfitPercent)})
                            </span>
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
                                    setInvDialogOpen(true);
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
                                  Nova Compra / Venda
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDividend({
                                      id: "",
                                      user_id: "",
                                      investment_id: inv.id,
                                      type: "dividendo",
                                      payment_date: new Date().toISOString().slice(0, 10),
                                      amount: 0,
                                      amount_per_share: 0,
                                      status: "recebido",
                                      created_at: "",
                                      updated_at: "",
                                    });
                                    setDivDialogOpen(true);
                                  }}
                                >
                                  Lançar Dividendo / Provento
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

        {/* ABA 2: HISTÓRICO DE PROVENTOS & DIVIDENDOS */}
        <TabsContent value="dividends" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Proventos & Dividendos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Dividendos, JCP, Rendimentos de FIIs e bonificações recebidas.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedDividend(null);
                  setDivDialogOpen(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Lançar Provento
              </Button>
            </div>

            {variableDividends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <Coins className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Nenhum provento registrado ainda
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Registre os dividendos recebidos das suas ações e fundos imobiliários para acompanhar o fluxo de renda passiva.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDividend(null);
                    setDivDialogOpen(true);
                  }}
                  className="mt-4 bg-primary text-primary-foreground"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Lançar Primeiro Provento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Ativo / Ticker</th>
                      <th className="py-3 px-4 font-semibold">Tipo</th>
                      <th className="py-3 px-4 font-semibold">Data de Pagamento</th>
                      <th className="py-3 px-4 font-semibold text-right">Valor por Cota</th>
                      <th className="py-3 px-4 font-semibold text-right">Valor Total Líquido</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variableDividends.map((div) => {
                      const inv = variableInvestments.find((i) => i.id === div.investment_id);
                      return (
                        <tr key={div.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <div>
                              <p className="font-bold text-foreground">
                                {inv ? inv.ticker || inv.name : "Ativo não identificado"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{inv?.name}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] bg-surface">
                              {DIVIDEND_LABELS[div.type] ?? div.type}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {formatDate(div.payment_date)}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {div.amount_per_share ? formatCurrency(div.amount_per_share) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-success">
                            + {formatCurrency(div.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                div.status === "recebido"
                                  ? "bg-success/10 text-success border-success/30"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                              }`}
                            >
                              {div.status === "recebido" ? "Recebido" : "A Receber"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedDividend(div);
                                  setDivDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteDivId(div.id)}
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

        {/* ABA 3: HISTÓRICO DE COMPRAS E VENDAS */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-subtle space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Histórico de Compras e Vendas
                </h3>
                <p className="text-xs text-muted-foreground">
                  Registro de todas as ordens de compra e venda executadas na carteira.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setTxTargetInvId(null);
                  setTxDialogOpen(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova Operação
              </Button>
            </div>

            {variableTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <Receipt className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Nenhuma negociação registrada
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Registre as compras e vendas de ativos para atualizar o preço médio e a quantidade em carteira.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Data</th>
                      <th className="py-3 px-4 font-semibold">Ativo</th>
                      <th className="py-3 px-4 font-semibold">Tipo</th>
                      <th className="py-3 px-4 font-semibold text-right">Quantidade</th>
                      <th className="py-3 px-4 font-semibold text-right">Preço Unitário</th>
                      <th className="py-3 px-4 font-semibold text-right">Taxas / Corretagem</th>
                      <th className="py-3 px-4 font-semibold text-right">Valor Total</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variableTransactions.map((tx) => {
                      const inv = variableInvestments.find((i) => i.id === tx.investment_id);
                      const isBuy = tx.type === "aplicacao" || tx.type === "compra";
                      return (
                        <tr key={tx.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            <span className="font-bold">{inv?.ticker || inv?.name || "Ativo"}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isBuy
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                              }`}
                            >
                              {isBuy ? "Compra / Aporte" : "Venda / Resgate"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right num text-foreground">
                            {tx.quantity || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {tx.unit_price ? formatCurrency(tx.unit_price) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num text-muted-foreground">
                            {tx.notes ? tx.notes : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right num font-bold text-foreground">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTxId(tx.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
      </Tabs>

      {/* MODAL: NOVO/EDITAR ATIVO */}
      <InvestmentDialog
        open={invDialogOpen}
        onOpenChange={setInvDialogOpen}
        investment={selectedInvestment}
        defaultCategory="renda_variavel"
      />

      {/* MODAL: NOVO/EDITAR PROVENTO */}
      <DividendDialog
        open={divDialogOpen}
        onOpenChange={setDivDialogOpen}
        investments={variableInvestments}
        dividend={selectedDividend}
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
            <AlertDialogTitle>Excluir Ativo de Renda Variável?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o ativo da sua carteira.
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

      {/* CONFIRMAÇÃO EXCLUSÃO PROVENTO */}
      <AlertDialog open={!!deleteDivId} onOpenChange={(open) => !open && setDeleteDivId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Provento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este lançamento de dividendo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDividend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMAÇÃO EXCLUSÃO TRANSAÇÃO */}
      <AlertDialog open={!!deleteTxId} onOpenChange={(open) => !open && setDeleteTxId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta transação de compra/venda?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
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
