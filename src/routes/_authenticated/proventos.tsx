import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  MoreVertical,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
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
import { DividendDialog } from "@/components/dividend-dialog";
import { useDeleteRow, useDividends, useInvestments } from "@/lib/data";
import {
  DIVIDEND_LABELS,
  currentYearMonth,
  formatCurrency,
  formatDate,
  monthLabel,
  type Dividend,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/proventos")({
  head: () => ({
    meta: [{ title: "Proventos & Renda Passiva — Finantria Invest" }],
  }),
  component: ProventosPage,
});

function ProventosPage() {
  const { data: dividends = [], isLoading } = useDividends();
  const { data: investments = [] } = useInvestments();
  const deleteDiv = useDeleteRow("dividends");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDiv, setSelectedDiv] = useState<Dividend | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const currentYear = new Date().getFullYear().toString();
  const currentYM = currentYearMonth();

  // Mapeamento de Investimentos
  const invMap = useMemo(() => {
    const map = new Map();
    for (const i of investments) map.set(i.id, i);
    return map;
  }, [investments]);

  // Proventos filtrados
  const filteredDividends = useMemo(() => {
    return dividends.filter((d) => {
      if (typeFilter !== "todos" && d.type !== typeFilter) return false;
      if (statusFilter !== "todos" && d.status !== statusFilter) return false;
      return true;
    });
  }, [dividends, typeFilter, statusFilter]);

  // Cálculos consolidados
  const stats = useMemo(() => {
    let yearTotal = 0;
    let monthTotal = 0;
    let pendingTotal = 0;
    const monthMap = new Map<string, number>();

    for (const d of dividends) {
      if (d.status === "recebido") {
        if (d.payment_date.startsWith(currentYear)) {
          yearTotal += d.amount;
        }
        if (d.payment_date.startsWith(currentYM)) {
          monthTotal += d.amount;
        }
        const ym = d.payment_date.slice(0, 7);
        monthMap.set(ym, (monthMap.get(ym) || 0) + d.amount);
      } else {
        pendingTotal += d.amount;
      }
    }

    const currentMonthNum = new Date().getMonth() + 1;
    const averageMonthly = currentMonthNum > 0 ? yearTotal / currentMonthNum : 0;

    // Dados para gráfico (últimos 12 meses ordenados)
    const chartData = Array.from(monthMap.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-12)
      .map(([ym, amount]) => ({
        mes: monthLabel(ym),
        amount,
      }));

    return { yearTotal, monthTotal, pendingTotal, averageMonthly, chartData };
  }, [dividends, currentYear, currentYM]);

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await deleteDiv.mutateAsync(deleteConfirmId);
      toast.success("Provento excluído com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function handleOpenNew() {
    setSelectedDiv(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(d: Dividend) {
    setSelectedDiv(d);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proventos & Renda</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o fluxo de dividendos, JCP e rendimentos de FIIs na sua conta.
          </p>
        </div>
        <Button onClick={handleOpenNew} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Novo Provento
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Total Recebido em ${currentYear}`}
          value={formatCurrency(stats.yearTotal)}
          hint="Proventos já creditados no ano"
          icon={DollarSign}
          tone="positive"
        />
        <StatCard
          label="Recebido Este Mês"
          value={formatCurrency(stats.monthTotal)}
          hint="Créditos do mês atual"
          icon={Calendar}
        />
        <StatCard
          label="Proventos Previstos"
          value={formatCurrency(stats.pendingTotal)}
          hint="Aguardando data de pagamento"
          icon={Clock}
        />
        <StatCard
          label="Média Mensal Estimada"
          value={formatCurrency(stats.averageMonthly)}
          hint="Renda passiva mensal média"
          icon={TrendingUp}
        />
      </div>

      {/* Gráfico de Histórico de Proventos */}
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Evolução Mensal de Proventos</h2>
            <p className="text-xs text-muted-foreground">
              Total de dividendos e rendimentos recebidos por mês
            </p>
          </div>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="mt-4 h-64 w-full">
          {stats.chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nenhum provento creditado registrado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                />
                <RechartsTooltip
                  formatter={(val: number) => [formatCurrency(val), "Proventos"]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                  }}
                />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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
            Todos os tipos
          </Button>
          {Object.entries(DIVIDEND_LABELS).map(([k, label]) => (
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="todos">Todos os status</option>
          <option value="recebido">Recebidos</option>
          <option value="previsto">Previstos</option>
        </select>
      </div>

      {/* Tabela de Proventos */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Data Pagamento</th>
                <th className="px-3 py-3 font-semibold">Ativo</th>
                <th className="px-3 py-3 font-semibold">Tipo</th>
                <th className="px-3 py-3 font-semibold">Situação</th>
                <th className="px-3 py-3 text-right font-semibold">Valor / Cota</th>
                <th className="px-3 py-3 text-right font-semibold">Valor Total</th>
                <th className="py-3 pl-3 pr-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhum provento cadastrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDividends.map((div) => {
                  const inv = invMap.get(div.investment_id);
                  const isRecebido = div.status === "recebido";

                  return (
                    <tr key={div.id} className="transition-colors hover:bg-surface/50">
                      <td className="num py-3 pl-4 pr-3 font-medium text-foreground">
                        {formatDate(div.payment_date)}
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

                      <td className="px-3 py-3 text-muted-foreground">
                        {DIVIDEND_LABELS[div.type] || div.type}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isRecebido
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {isRecebido ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {isRecebido ? "Recebido" : "Previsto"}
                        </span>
                      </td>

                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {div.amount_per_share ? formatCurrency(div.amount_per_share) : "—"}
                      </td>

                      <td className="num px-3 py-3 text-right font-bold text-success">
                        {formatCurrency(div.amount)}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEdit(div)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(div.id)}
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
      <DividendDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investments={investments}
        dividend={selectedDiv}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Provento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro do provento da sua conta.
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
