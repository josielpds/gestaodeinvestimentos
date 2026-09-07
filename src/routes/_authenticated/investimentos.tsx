import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Edit2,
  Filter,
  MoreVertical,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Zap,
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
import { InvestmentDialog } from "@/components/investment-dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { OpenFinanceModal } from "@/components/open-finance-modal";
import { useDeleteRow, useInvestments, useOpenFinanceConnections, useTransactions } from "@/lib/data";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  INDEXER_LABELS,
  SUBTYPE_LABELS,
  daysBetween,
  formatCurrency,
  formatDate,
  formatPercent,
  metricsFor,
  todayISO,
  type Investment,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({
    meta: [{ title: "Carteira & Ativos — Finantria Invest" }],
  }),
  component: InvestimentosPage,
});

function InvestimentosPage() {
  const { data: investments = [], isLoading } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: connections = [] } = useOpenFinanceConnections();
  const deleteInv = useDeleteRow("investments");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<"ativo" | "resgatado" | "todos">("ativo");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txTargetInvId, setTxTargetInvId] = useState<string | null>(null);

  const [openFinanceOpen, setOpenFinanceOpen] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (statusFilter !== "todos" && inv.status !== statusFilter) return false;
      if (selectedCategory !== "todos" && inv.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = inv.name.toLowerCase().includes(q);
        const matchTicker = inv.ticker?.toLowerCase().includes(q);
        const matchInst = inv.institution.toLowerCase().includes(q);
        if (!matchName && !matchTicker && !matchInst) return false;
      }
      return true;
    });
  }, [investments, selectedCategory, statusFilter, search]);

  // Totais do filtro atual
  const stats = useMemo(() => {
    let applied = 0;
    let gross = 0;
    let tax = 0;
    let net = 0;
    let profit = 0;

    for (const inv of filteredInvestments) {
      const m = metricsFor(inv, transactions);
      applied += m.investedTotal;
      gross += inv.current_balance;
      tax += m.estimatedTax;
      net += m.netBalance;
      profit += m.grossProfit;
    }

    const profitPercent = applied > 0 ? (profit / applied) * 100 : 0;

    return { applied, gross, tax, net, profit, profitPercent };
  }, [filteredInvestments, transactions]);

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await deleteInv.mutateAsync(deleteConfirmId);
      toast.success("Ativo removido com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleOpenNew() {
    setSelectedInvestment(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(inv: Investment) {
    setSelectedInvestment(inv);
    setDialogOpen(true);
  }

  function handleOpenTx(inv: Investment) {
    setTxTargetInvId(inv.id);
    setTxDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Carteira & Ativos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie CDBs, LCI, Tesouro, Ações, FIIs, Criptoativos e seus impostos estimados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenFinanceOpen(true)}
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
          <Button onClick={handleOpenNew} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Novo Investimento
          </Button>
        </div>
      </div>

      {/* Cards de Métricas do Filtro */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Total Aplicado</p>
          <p className="num mt-1 text-xl font-bold text-foreground">
            {formatCurrency(stats.applied)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Saldo Bruto Atual</p>
          <p className="num mt-1 text-xl font-bold text-primary">{formatCurrency(stats.gross)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Lucro Bruto</p>
          <p
            className={`num mt-1 text-xl font-bold ${stats.profit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {formatCurrency(stats.profit)}{" "}
            <span className="text-xs font-medium text-muted-foreground">
              ({formatPercent(stats.profitPercent)})
            </span>
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Saldo Líquido de IR</p>
          <p className="num mt-1 text-xl font-bold text-foreground">
            {formatCurrency(stats.net)}
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={selectedCategory === "todos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory("todos")}
            className="text-xs"
          >
            Todos
          </Button>
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={selectedCategory === c ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(c)}
              className="text-xs"
            >
              {CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ativo, ticker ou corretora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ativo">Ativos</option>
            <option value="resgatado">Resgatados</option>
            <option value="todos">Todos os status</option>
          </select>
        </div>
      </div>

      {/* Tabela de Ativos */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Ativo / Tipo</th>
                <th className="px-3 py-3 font-semibold">Instituição & Indexador</th>
                <th className="px-3 py-3 font-semibold">Aplicação & Vencimento</th>
                <th className="px-3 py-3 text-right font-semibold">Total Investido</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Atual</th>
                <th className="px-3 py-3 text-right font-semibold">Rentabilidade</th>
                <th className="px-3 py-3 text-right font-semibold">IR Estimado</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Líquido</th>
                <th className="py-3 pl-3 pr-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Nenhum investimento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInvestments.map((inv) => {
                  const m = metricsFor(inv, transactions);
                  const isDueSoon =
                    inv.due_date &&
                    daysBetween(todayISO(), inv.due_date) >= 0 &&
                    daysBetween(todayISO(), inv.due_date) <= 45;

                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-surface/50">
                      {/* Ativo */}
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{inv.name}</span>
                          {inv.is_automated && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1 px-1.5 py-0 font-medium"
                              title="Sincronizado via Open Finance"
                            >
                              <Zap className="h-2.5 w-2.5 fill-primary/20" /> Open Finance
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          {inv.ticker && (
                            <span className="rounded bg-primary/10 px-1 py-0.5 font-bold text-primary">
                              {inv.ticker}
                            </span>
                          )}
                          <span>{SUBTYPE_LABELS[inv.sub_type] || inv.sub_type}</span>
                          {inv.tax_exempt && (
                            <span className="inline-flex items-center gap-0.5 text-success">
                              <ShieldCheck className="h-3 w-3" /> Isento
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Instituição & Indexador */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{inv.institution}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {INDEXER_LABELS[inv.indexer] || inv.indexer}
                          {inv.contract_rate ? ` (${inv.contract_rate})` : ""}
                        </div>
                      </td>

                      {/* Datas */}
                      <td className="px-3 py-3">
                        <div className="text-muted-foreground">
                          Início: {formatDate(inv.start_date)}
                        </div>
                        <div className="text-[11px]">
                          {inv.due_date ? (
                            <span
                              className={
                                isDueSoon
                                  ? "font-semibold text-warning"
                                  : "text-muted-foreground"
                              }
                            >
                              Vence: {formatDate(inv.due_date)} (
                              {daysBetween(todayISO(), inv.due_date)}d)
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem vencimento</span>
                          )}
                        </div>
                      </td>

                      {/* Investido */}
                      <td className="num px-3 py-3 text-right font-medium text-muted-foreground">
                        {formatCurrency(m.investedTotal)}
                        {inv.quantity && inv.quantity !== 1 ? (
                          <div className="text-[10px]">
                            {inv.quantity} un @ {formatCurrency(inv.average_price)}
                          </div>
                        ) : null}
                      </td>

                      {/* Saldo Atual */}
                      <td className="num px-3 py-3 text-right font-bold text-foreground">
                        {formatCurrency(inv.current_balance)}
                        {inv.current_price ? (
                          <div className="text-[10px] text-muted-foreground">
                            Cota: {formatCurrency(inv.current_price)}
                          </div>
                        ) : null}
                      </td>

                      {/* Rentabilidade */}
                      <td className="num px-3 py-3 text-right font-semibold">
                        <div className={m.grossProfit >= 0 ? "text-success" : "text-destructive"}>
                          {formatCurrency(m.grossProfit)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatPercent(m.grossProfitPercent)}
                        </div>
                      </td>

                      {/* IR Estimado */}
                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {inv.tax_exempt ? (
                          <span className="text-success font-medium">Isento</span>
                        ) : (
                          <div>
                            <span className="text-foreground">{formatCurrency(m.estimatedTax)}</span>
                            <div className="text-[10px]">({m.taxRatePercent}%)</div>
                          </div>
                        )}
                      </td>

                      {/* Saldo Líquido */}
                      <td className="num px-3 py-3 text-right font-bold text-primary">
                        {formatCurrency(m.netBalance)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 pl-3 pr-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleOpenTx(inv)}>
                              <Receipt className="mr-2 h-3.5 w-3.5" /> Lançar Movimentação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(inv)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar Ativo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(inv.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir Ativo
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
      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={selectedInvestment}
      />

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        investments={investments}
        defaultInvestmentId={txTargetInvId}
      />

      <OpenFinanceModal
        open={openFinanceOpen}
        onOpenChange={setOpenFinanceOpen}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o ativo e todas as suas movimentações e proventos vinculados. Esta
              ação não pode ser desfeita.
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
