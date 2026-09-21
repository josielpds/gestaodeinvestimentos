import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Check, Edit2, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSaveRow, useDeleteRow } from "@/lib/data";
import { formatCurrency, formatPercent, type Snapshot } from "@/lib/finance";

const MONTHS = [
  { num: "01", name: "JANEIRO" },
  { num: "02", name: "FEVEREIRO" },
  { num: "03", name: "MARÇO" },
  { num: "04", name: "ABRIL" },
  { num: "05", name: "MAIO" },
  { num: "06", name: "JUNHO" },
  { num: "07", name: "JULHO" },
  { num: "08", name: "AGOSTO" },
  { num: "09", name: "SETEMBRO" },
  { num: "10", name: "OUTUBRO" },
  { num: "11", name: "NOVEMBRO" },
  { num: "12", name: "DEZEMBRO" },
];

interface AnnualSpreadsheetProps {
  title: string;
  year: number;
  snapshots: Snapshot[];
  investmentId?: string | null;
  accentColor?: "blue" | "emerald";
  onSnapshotSaved?: () => void;
}

interface MonthRowData {
  yearMonth: string;
  monthName: string;
  snapshotId: string | null;
  initialBalance: number;
  finalBalance: number;
  profitAmount: number;
  profitPercent: number;
  hasData: boolean;
}

export function AnnualSpreadsheetTable({
  title,
  year,
  snapshots,
  investmentId = null,
  accentColor = "blue",
  onSnapshotSaved,
}: AnnualSpreadsheetProps) {
  const saveSnapshot = useSaveRow("monthly_snapshots");
  const deleteSnapshot = useDeleteRow("monthly_snapshots");

  // Estado dos valores em edição por mês: { "2026-01": { initial: 1000, final: 1100 } }
  const [editingRows, setEditingRows] = useState<
    Record<string, { initial: string; final: string; isDirty: boolean }>
  >({});
  const [savingMonth, setSavingMonth] = useState<string | null>(null);

  // Mapeia os snapshots para os 12 meses do ano
  const rows: MonthRowData[] = useMemo(() => {
    return MONTHS.map((m) => {
      const yearMonth = `${year}-${m.num}`;
      // Encontra snapshot correspondente ao mês e ao investmentId
      const found = snapshots.find((s) => {
        const matchYM = s.year_month === yearMonth;
        if (investmentId === null) {
          return matchYM && (!s.investment_id || s.investment_id === "null");
        }
        return matchYM && s.investment_id === investmentId;
      });

      if (found) {
        const initial = Number(found.initial_balance) || 0;
        const final = Number(found.final_balance) || 0;
        const profit = found.profit_amount !== undefined && found.profit_amount !== null
          ? Number(found.profit_amount)
          : final - initial;
        const percent = found.profit_percent !== undefined && found.profit_percent !== null
          ? Number(found.profit_percent)
          : initial > 0 ? (profit / initial) * 100 : 0;

        return {
          yearMonth,
          monthName: m.name,
          snapshotId: found.id,
          initialBalance: initial,
          finalBalance: final,
          profitAmount: profit,
          profitPercent: percent,
          hasData: true,
        };
      }

      return {
        yearMonth,
        monthName: m.name,
        snapshotId: null,
        initialBalance: 0,
        finalBalance: 0,
        profitAmount: 0,
        profitPercent: 0,
        hasData: false,
      };
    });
  }, [snapshots, year, investmentId]);

  // Inicializa o estado de edição quando os dados mudam
  useEffect(() => {
    const initialEditing: Record<string, { initial: string; final: string; isDirty: boolean }> = {};
    for (const r of rows) {
      initialEditing[r.yearMonth] = {
        initial: r.hasData && r.initialBalance > 0 ? String(r.initialBalance) : "",
        final: r.hasData && r.finalBalance > 0 ? String(r.finalBalance) : "",
        isDirty: false,
      };
    }
    setEditingRows(initialEditing);
  }, [rows]);

  // Totais do ano
  const totals = useMemo(() => {
    let totalProfit = 0;
    let latestFinalBalance = 0;
    let sumInitialForActive = 0;
    let monthsWithData = 0;

    for (const r of rows) {
      const edit = editingRows[r.yearMonth];
      const initial = edit?.isDirty
        ? Number(edit.initial) || 0
        : r.initialBalance;
      const final = edit?.isDirty
        ? Number(edit.final) || 0
        : r.finalBalance;

      if (r.hasData || (edit?.isDirty && (initial > 0 || final > 0))) {
        const profit = final - initial;
        totalProfit += profit;
        sumInitialForActive += initial;
        monthsWithData++;
        if (final > 0) {
          latestFinalBalance = final;
        }
      }
    }

    const totalProfitPercent =
      sumInitialForActive > 0 ? (totalProfit / sumInitialForActive) * 100 : 0;

    return {
      latestFinalBalance,
      totalProfit,
      totalProfitPercent,
      monthsWithData,
    };
  }, [rows, editingRows]);

  function handleInputChange(yearMonth: string, field: "initial" | "final", value: string) {
    setEditingRows((prev) => {
      const current = prev[yearMonth] || { initial: "", final: "", isDirty: false };
      return {
        ...prev,
        [yearMonth]: {
          ...current,
          [field]: value,
          isDirty: true,
        },
      };
    });
  }

  async function handleSaveRow(yearMonth: string, snapshotId: string | null) {
    const edit = editingRows[yearMonth];
    if (!edit) return;

    const initial = parseFloat(edit.initial.replace(",", ".")) || 0;
    const final = parseFloat(edit.final.replace(",", ".")) || 0;
    const profit = final - initial;
    const percent = initial > 0 ? (profit / initial) * 100 : 0;

    setSavingMonth(yearMonth);
    try {
      await saveSnapshot.mutateAsync({
        id: snapshotId,
        values: {
          year_month: yearMonth,
          investment_id: investmentId,
          initial_balance: initial,
          deposits: 0,
          withdrawals: 0,
          earnings: profit > 0 ? profit : 0,
          final_balance: final,
          profit_amount: profit,
          profit_percent: percent,
        },
      });

      setEditingRows((prev) => ({
        ...prev,
        [yearMonth]: {
          ...prev[yearMonth]!,
          isDirty: false,
        },
      }));

      toast.success(`Mês ${yearMonth} salvo com sucesso!`);
      if (onSnapshotSaved) onSnapshotSaved();
    } catch (err) {
      toast.error("Erro ao salvar dados do mês.");
    } finally {
      setSavingMonth(null);
    }
  }

  async function handleDeleteRow(snapshotId: string, yearMonth: string) {
    try {
      await deleteSnapshot.mutateAsync(snapshotId);
      setEditingRows((prev) => ({
        ...prev,
        [yearMonth]: { initial: "", final: "", isDirty: false },
      }));
      toast.success("Registro removido.");
      if (onSnapshotSaved) onSnapshotSaved();
    } catch {
      toast.error("Erro ao excluir registro.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg transition-all">
      {/* Título Principal no Modelo da Planilha */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-3.5 px-6 border-b border-border text-center">
        <h2 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-wider text-primary">
          {title}
        </h2>
      </div>

      {/* Tabela de 12 Meses */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          {/* Cabeçalho da Tabela - Estilo Planilha */}
          <thead>
            <tr className="bg-slate-700/80 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-600">
              <th className="py-3 px-4 w-40 text-left border-r border-slate-600">MÊS</th>
              <th className="py-3 px-4 w-52 text-right border-r border-slate-600">CAPITAL INICIAL</th>
              <th className="py-3 px-4 w-52 text-right border-r border-slate-600">CAPITAL ATUAL</th>
              <th className="py-3 px-4 w-48 text-right border-r border-slate-600">LUCRO MÊS(R$)</th>
              <th className="py-3 px-4 w-36 text-right border-r border-slate-600">LUCRO %</th>
              <th className="py-3 px-3 w-24 text-center">AÇÃO</th>
            </tr>
          </thead>

          {/* Linhas dos 12 Meses */}
          <tbody className="divide-y divide-border/60 text-xs">
            {rows.map((row) => {
              const edit = editingRows[row.yearMonth] || {
                initial: "",
                final: "",
                isDirty: false,
              };

              // Valores calculados dinamicamente com base no input em tempo real
              const currentInitial = edit.isDirty
                ? parseFloat(edit.initial.replace(",", ".")) || 0
                : row.initialBalance;
              const currentFinal = edit.isDirty
                ? parseFloat(edit.final.replace(",", ".")) || 0
                : row.finalBalance;

              const liveProfit = currentFinal - currentInitial;
              const livePercent =
                currentInitial > 0 ? (liveProfit / currentInitial) * 100 : 0;

              const hasValue = currentInitial > 0 || currentFinal > 0;
              const isPositive = liveProfit >= 0;
              const isSaving = savingMonth === row.yearMonth;

              return (
                <tr
                  key={row.yearMonth}
                  className="hover:bg-primary/5 transition-colors group"
                >
                  {/* Coluna do Mês com Destaque Verde/Claro Estilo Planilha */}
                  <td className="py-2.5 px-4 text-left font-bold border-r border-border/60 bg-emerald-950/20 text-emerald-400 group-hover:bg-emerald-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs">{row.monthName}</span>
                    </div>
                  </td>

                  {/* Input: Capital Inicial */}
                  <td className="py-2 px-3 text-right border-r border-border/60">
                    <div className="relative flex items-center justify-end">
                      <span className="absolute left-2 text-[11px] text-muted-foreground font-mono">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={edit.initial}
                        onChange={(e) =>
                          handleInputChange(row.yearMonth, "initial", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveRow(row.yearMonth, row.snapshotId);
                          }
                        }}
                        className="h-8 text-right font-mono text-xs pl-8 pr-2 font-semibold bg-background/50 border-border/50 focus:bg-background"
                      />
                    </div>
                  </td>

                  {/* Input: Capital Atual */}
                  <td className="py-2 px-3 text-right border-r border-border/60">
                    <div className="relative flex items-center justify-end">
                      <span className="absolute left-2 text-[11px] text-muted-foreground font-mono">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={edit.final}
                        onChange={(e) =>
                          handleInputChange(row.yearMonth, "final", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveRow(row.yearMonth, row.snapshotId);
                          }
                        }}
                        className="h-8 text-right font-mono text-xs pl-8 pr-2 font-bold text-primary bg-background/50 border-border/50 focus:bg-background"
                      />
                    </div>
                  </td>

                  {/* Lucro Mês (R$) - Calculado Automaticamente */}
                  <td className="py-2.5 px-4 text-right border-r border-border/60 font-mono font-bold">
                    {hasValue ? (
                      <span
                        className={
                          isPositive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {formatCurrency(liveProfit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* Lucro % - Calculado Automaticamente */}
                  <td className="py-2.5 px-4 text-right border-r border-border/60 font-mono font-bold">
                    {hasValue && currentInitial > 0 ? (
                      <span
                        className={
                          isPositive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {formatPercent(livePercent)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">0,00%</span>
                    )}
                  </td>

                  {/* Botão de Ação Salvar / Status */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {edit.isDirty ? (
                        <Button
                          size="sm"
                          onClick={() => handleSaveRow(row.yearMonth, row.snapshotId)}
                          disabled={isSaving}
                          className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-sm"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Salvar
                        </Button>
                      ) : row.hasData ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
                            Salvo
                          </span>
                          {row.snapshotId ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRow(row.snapshotId!, row.yearMonth)}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">Vazio</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Rodapé de Totais - Estilo Idêntico ao Modelo da Planilha */}
          <tfoot>
            <tr className="border-t-2 border-slate-600 font-bold text-xs uppercase">
              {/* MÊS -> TOTAL ATUAL (Fundo Verde) */}
              <td className="py-3 px-4 text-center bg-emerald-600 text-white font-extrabold tracking-wider border-r border-slate-600">
                TOTAL ATUAL
              </td>

              {/* CAPITAL INICIAL -> Soma ou traço (Fundo Azul) */}
              <td className="py-3 px-4 text-right bg-sky-700 text-white font-mono text-sm font-extrabold border-r border-slate-600">
                —
              </td>

              {/* CAPITAL ATUAL -> Saldo Atual (Fundo Azul) */}
              <td className="py-3 px-4 text-right bg-sky-700 text-white font-mono text-sm font-extrabold border-r border-slate-600">
                {totals.latestFinalBalance > 0
                  ? formatCurrency(totals.latestFinalBalance)
                  : "R$ -"}
              </td>

              {/* LUCRO MÊS R$ -> Lucro Total Ano (Fundo Verde) */}
              <td className="py-3 px-4 text-right bg-emerald-600 text-white font-mono text-sm font-extrabold border-r border-slate-600">
                {totals.totalProfit !== 0
                  ? formatCurrency(totals.totalProfit)
                  : "R$ -"}
              </td>

              {/* LUCRO % -> Lucro Total % (Fundo Azul) */}
              <td className="py-3 px-4 text-right bg-sky-700 text-white font-mono text-sm font-extrabold border-r border-slate-600">
                {formatPercent(totals.totalProfitPercent)}
              </td>

              {/* Coluna Ação vazia no rodapé */}
              <td className="py-3 px-2 bg-slate-800 text-slate-400 text-[10px]">
                {totals.monthsWithData} mês(es)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
