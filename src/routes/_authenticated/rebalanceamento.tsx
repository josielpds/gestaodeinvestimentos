import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  PieChart as PieIcon,
  RefreshCw,
  Save,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/stat-card";
import { useInvestments, useSaveTarget, useTargets, useTransactions } from "@/lib/data";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  formatCurrency,
  formatPercent,
  summarize,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/rebalanceamento")({
  head: () => ({
    meta: [{ title: "Rebalanceamento & Metas — Finantria Invest" }],
  }),
  component: RebalanceamentoPage,
});

function RebalanceamentoPage() {
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: targets = [] } = useTargets();
  const saveTargets = useSaveTarget();

  const summary = summarize(investments, transactions);
  const totalGross = summary.totalGross;

  // Estado local para metas percentuais
  const [targetMap, setTargetMap] = useState<Record<string, number>>({
    renda_fixa: 40,
    renda_variavel: 30,
    internacional: 20,
    cripto: 10,
  });

  // Simulador de novo aporte
  const [simulatedContribution, setSimulatedContribution] = useState<number>(3000);

  useEffect(() => {
    if (targets.length > 0) {
      const nextMap: Record<string, number> = {
        renda_fixa: 0,
        renda_variavel: 0,
        internacional: 0,
        cripto: 0,
      };
      for (const t of targets) {
        if (t.category in nextMap) nextMap[t.category] = t.target_percent;
      }
      setTargetMap(nextMap);
    }
  }, [targets]);

  const totalTargetPercent = useMemo(() => {
    return Object.values(targetMap).reduce((a, b) => a + Number(b || 0), 0);
  }, [targetMap]);

  // Cálculos de desvio e sugestão de aporte
  const comparison = useMemo(() => {
    const currentByCat: Record<string, number> = {
      renda_fixa: 0,
      renda_variavel: 0,
      internacional: 0,
      cripto: 0,
    };

    for (const inv of investments.filter((i) => i.status === "ativo")) {
      currentByCat[inv.category] = (currentByCat[inv.category] ?? 0) + inv.current_balance;
    }

    const rows = CATEGORIES.map((cat) => {
      const currentVal = currentByCat[cat] ?? 0;
      const currentPct = totalGross > 0 ? (currentVal / totalGross) * 100 : 0;
      const targetPct = targetMap[cat] ?? 0;
      const idealVal = (totalGross * targetPct) / 100;
      const diffVal = idealVal - currentVal; // Positivo = precisa aportar, Negativo = sobreponderado
      const diffPct = targetPct - currentPct;

      return {
        key: cat,
        label: CATEGORY_LABELS[cat],
        currentVal,
        currentPct,
        targetPct,
        idealVal,
        diffVal,
        diffPct,
      };
    });

    // Algoritmo de sugestão de aporte para o valor simulado
    const newTotal = totalGross + simulatedContribution;
    const positiveDeficits = rows.map((r) => {
      const idealWithNew = (newTotal * r.targetPct) / 100;
      const deficit = Math.max(0, idealWithNew - r.currentVal);
      return { key: r.key, deficit };
    });

    const sumDeficits = positiveDeficits.reduce((a, b) => a + b.deficit, 0);

    const suggestions: Record<string, number> = {};
    for (const row of rows) {
      if (sumDeficits > 0 && simulatedContribution > 0) {
        const rowDeficit = positiveDeficits.find((d) => d.key === row.key)?.deficit ?? 0;
        const allocated = (rowDeficit / sumDeficits) * simulatedContribution;
        suggestions[row.key] = allocated;
      } else {
        suggestions[row.key] = 0;
      }
    }

    return { rows, suggestions };
  }, [investments, totalGross, targetMap, simulatedContribution]);

  async function handleSaveTargets() {
    if (Math.abs(totalTargetPercent - 100) > 0.01) {
      toast.error("A soma das metas precisa totalizar exatamente 100%.");
      return;
    }

    try {
      await saveTargets.mutateAsync(
        Object.entries(targetMap).map(([category, target_percent]) => ({
          category,
          target_percent: Number(target_percent),
        })),
      );
      toast.success("Metas de alocação salvas com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar metas.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Rebalanceamento & Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina sua distribuição ideal por classe e saiba exatamente onde aportar.
          </p>
        </div>
        <Button
          onClick={handleSaveTargets}
          disabled={saveTargets.isPending || Math.abs(totalTargetPercent - 100) > 0.01}
          size="sm"
        >
          <Save className="mr-1.5 h-4 w-4" /> Salvar Metas
        </Button>
      </div>

      {/* Alerta de Validação 100% */}
      {Math.abs(totalTargetPercent - 100) > 0.01 && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Atenção na soma das metas:</span> O total atual é de{" "}
            <span className="font-bold">{totalTargetPercent.toFixed(1)}%</span>. Ajuste os
            percentuais para somar exatamente 100%.
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patrimônio Consolidado"
          value={formatCurrency(totalGross)}
          hint="Base para cálculo das metas"
          icon={PieIcon}
          tone="positive"
        />
        <StatCard
          label="Total das Metas"
          value={`${totalTargetPercent.toFixed(0)}%`}
          hint={Math.abs(totalTargetPercent - 100) < 0.01 ? "Alocação 100% configurada" : "Incompleto"}
          icon={Sliders}
          tone={Math.abs(totalTargetPercent - 100) < 0.01 ? "positive" : "negative"}
        />
        <StatCard
          label="Aporte Simulado"
          value={formatCurrency(simulatedContribution)}
          hint="Simulação de compra inteligente"
          icon={TrendingUp}
        />
        <StatCard
          label="Classes Ativas"
          value={`${comparison.rows.filter((r) => r.currentVal > 0).length} de ${CATEGORIES.length}`}
          hint="Diversificação por categoria"
          icon={CheckCircle2}
        />
      </div>

      {/* Tabela de Alocação e Desvios */}
      <div className="panel overflow-hidden">
        <div className="border-b border-border bg-surface p-4">
          <h2 className="text-base font-semibold">Configuração de Metas & Comparativo</h2>
          <p className="text-xs text-muted-foreground">
            Altere os campos de % Alvo e veja o desvio em reais em relação ao ideal.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Classe de Ativo</th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Atual</th>
                <th className="px-3 py-3 text-right font-semibold">% Atual</th>
                <th className="px-3 py-3 text-right font-semibold" style={{ width: "130px" }}>
                  % Alvo (Meta)
                </th>
                <th className="px-3 py-3 text-right font-semibold">Saldo Ideal</th>
                <th className="px-3 py-3 text-right font-semibold">Desvio (R$)</th>
                <th className="py-3 pl-3 pr-4 text-center font-semibold">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparison.rows.map((row) => {
                const isUnder = row.diffVal > 10;
                const isOver = row.diffVal < -10;

                return (
                  <tr key={row.key} className="transition-colors hover:bg-surface/50">
                    <td className="py-3 pl-4 pr-3">
                      <span className="font-semibold text-foreground">{row.label}</span>
                    </td>

                    <td className="num px-3 py-3 text-right font-bold text-foreground">
                      {formatCurrency(row.currentVal)}
                    </td>

                    <td className="num px-3 py-3 text-right text-muted-foreground">
                      {row.currentPct.toFixed(1)}%
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={targetMap[row.key] ?? 0}
                          onChange={(e) =>
                            setTargetMap((m) => ({
                              ...m,
                              [row.key]: Number(e.target.value),
                            }))
                          }
                          className="h-8 w-16 text-right text-xs font-bold"
                        />
                        <span className="text-muted-foreground font-semibold">%</span>
                      </div>
                    </td>

                    <td className="num px-3 py-3 text-right text-muted-foreground">
                      {formatCurrency(row.idealVal)}
                    </td>

                    <td className="num px-3 py-3 text-right font-bold">
                      <span
                        className={
                          isUnder
                            ? "text-primary"
                            : isOver
                              ? "text-warning"
                              : "text-success"
                        }
                      >
                        {row.diffVal > 0 ? "+ " : ""}
                        {formatCurrency(row.diffVal)}
                      </span>
                    </td>

                    <td className="py-3 pl-3 pr-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          isUnder
                            ? "bg-primary/15 text-primary"
                            : isOver
                              ? "bg-warning/15 text-warning"
                              : "bg-success/15 text-success"
                        }`}
                      >
                        {isUnder
                          ? "Aporte Recomendado"
                          : isOver
                            ? "Sobreponderado"
                            : "Em Equilíbrio"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulador de Aportes Inteligentes */}
      <div className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-base font-semibold">Simulador de Aporte Inteligente</h2>
            <p className="text-xs text-muted-foreground">
              Digite quanto quer investir e veja a distribuição ótima para atingir suas metas sem
              precisar vender ativos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="simAmount" className="text-xs whitespace-nowrap">
              Valor do Aporte (R$):
            </Label>
            <Input
              id="simAmount"
              type="number"
              step="100"
              value={simulatedContribution}
              onChange={(e) => setSimulatedContribution(Math.max(0, Number(e.target.value)))}
              className="h-9 w-32 font-bold text-xs"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {comparison.rows.map((row) => {
            const sug = comparison.suggestions[row.key] ?? 0;
            const pctOfContribution =
              simulatedContribution > 0 ? (sug / simulatedContribution) * 100 : 0;
            const projectedBalance = row.currentVal + sug;
            const projectedTotal = totalGross + simulatedContribution;
            const projectedPct = projectedTotal > 0 ? (projectedBalance / projectedTotal) * 100 : 0;

            return (
              <div key={row.key} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{row.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Meta: {targetMap[row.key]}%
                  </span>
                </div>

                <div className="num text-xl font-bold text-primary">
                  {formatCurrency(sug)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>{pctOfContribution.toFixed(0)}% do aporte</span>
                  <span>Projeção: {projectedPct.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
