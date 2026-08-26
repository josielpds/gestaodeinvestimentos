import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Filter,
  MoreVertical,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TransactionDialog } from "@/components/transaction-dialog";
import { useDeleteRow, useInvestments, useTransactions } from "@/lib/data";
import {
  TRANSACTION_LABELS,
  formatCurrency,
  formatDate,
  type Transaction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/transacoes")({
  head: () => ({
    meta: [{ title: "Movimentações & Transações — Finantria Invest" }],
  }),
  component: TransacoesPage,
});

function TransacoesPage() {
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const { data: investments = [] } = useInvestments();
  const deleteTx = useDeleteRow("transactions");

  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [investmentFilter, setInvestmentFilter] = useState<string>("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Mapeamento rápido de ID do investimento para objeto
  const invMap = useMemo(() => {
    const map = new Map();
    for (const i of investments) map.set(i.id, i);
    return map;
  }, [investments]);

  // Transações filtradas
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "todos" && t.type !== typeFilter) return false;
      if (investmentFilter !== "todos" && t.investment_id !== investmentFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, investmentFilter]);

  // Totais consolidados
  const totals = useMemo(() => {
    let aportes = 0;
    let resgates = 0;
    let rendimentos = 0;

    for (const t of filteredTransactions) {
      if (t.type === "aporte") aportes += t.amount;
      else if (t.type === "resgate") resgates += t.amount;
      else rendimentos += t.amount;
    }

    const fluxoLiquido = aportes - resgates;
    return { aportes, resgates, rendimentos, fluxoLiquido };
  }, [filteredTransactions]);

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await deleteTx.mutateAsync(deleteConfirmId);
      toast.success("Movimentação excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir movimentação.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleOpenNew() {
    setSelectedTx(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(tx: Transaction) {
    setSelectedTx(tx);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Movimentações</h1>
          <p className="text-sm text-muted-foreground">
            Extrato detalhado de aportes, resgates e rendimentos creditados.
          </p>
        </div>
        <Button onClick={handleOpenNew} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Nova Movimentação
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Total de Aportes</p>
          <p className="num mt-1 text-xl font-bold text-success">
            {formatCurrency(totals.aportes)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Total de Resgates</p>
          <p className="num mt-1 text-xl font-bold text-destructive">
            {formatCurrency(totals.resgates)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Fluxo Líquido (Aportes - Resgates)</p>
          <p className="num mt-1 text-xl font-bold text-primary">
            {formatCurrency(totals.fluxoLiquido)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-muted-foreground">Rendimentos / Proventos</p>
          <p className="num mt-1 text-xl font-bold text-foreground">
            {formatCurrency(totals.rendimentos)}
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={typeFilter === "todos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter("todos")}
            className="text-xs"
          >
            Todos
          </Button>
          {Object.entries(TRANSACTION_LABELS).map(([k, label]) => (
            <Button
              key={k}
              variant={typeFilter === k ? "default" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter(k)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <select
            value={investmentFilter}
            onChange={(e) => setInvestmentFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os ativos</option>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.ticker ? `${i.ticker} - ` : ""}
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Data</th>
                <th className="px-3 py-3 font-semibold">Tipo</th>
                <th className="px-3 py-3 font-semibold">Ativo Vinculado</th>
                <th className="px-3 py-3 text-right font-semibold">Quantidade</th>
                <th className="px-3 py-3 text-right font-semibold">Preço Unitário</th>
                <th className="px-3 py-3 text-right font-semibold">Valor Total</th>
                <th className="px-3 py-3 font-semibold">Observações</th>
                <th className="py-3 pl-3 pr-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma movimentação registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const inv = invMap.get(tx.investment_id);
                  const isAporte = tx.type === "aporte";
                  const isResgate = tx.type === "resgate";

                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-surface/50">
                      <td className="num py-3 pl-4 pr-3 font-medium text-foreground">
                        {formatDate(tx.date)}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isAporte
                              ? "bg-success/15 text-success"
                              : isResgate
                                ? "bg-destructive/15 text-destructive"
                                : "bg-primary/15 text-primary"
                          }`}
                        >
                          {isAporte ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : isResgate ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <Receipt className="h-3 w-3" />
                          )}
                          {TRANSACTION_LABELS[tx.type] || tx.type}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-semibold text-foreground">
                          {inv?.name || "Ativo removido"}
                        </div>
                        {inv && (
                          <div className="text-[11px] text-muted-foreground">
                            {inv.ticker ? `${inv.ticker} · ` : ""}
                            {inv.institution}
                          </div>
                        )}
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {tx.quantity ? tx.quantity : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {tx.unit_price ? formatCurrency(tx.unit_price) : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right font-bold">
                        <span
                          className={
                            isAporte
                              ? "text-success"
                              : isResgate
                                ? "text-destructive"
                                : "text-foreground"
                          }
                        >
                          {isResgate ? "- " : "+ "}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="max-w-xs truncate px-3 py-3 text-muted-foreground">
                        {tx.notes || "—"}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEdit(tx)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar Movimentação
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(tx.id)}
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
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investments={investments}
        transaction={selectedTx}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro da movimentação e atualizará os cálculos de total investido.
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
