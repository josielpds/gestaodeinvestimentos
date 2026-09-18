import { useState, useMemo } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  HelpCircle,
  Info,
  Landmark,
  Percent,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  monthLabel,
  currentYearMonth,
  todayISO,
  type Investment,
  type Transaction,
} from "@/lib/finance";
import { useInvestments, useTransactions } from "@/lib/data";
import {
  DEFAULT_BENCHMARKS,
  calculateDailyEvolution,
  calculateMonthProjection,
  getDailyYieldMetrics,
  type BenchmarkRates,
} from "@/lib/yield-calculator";
import { getMonthDaysDetail, isBusinessDay } from "@/lib/business-days";

interface DailyYieldViewProps {
  investments?: Investment[];
  transactions?: Transaction[];
}

export function DailyYieldView({
  investments: propInvestments,
  transactions: propTransactions,
}: DailyYieldViewProps = {}) {
  const { data: hookInvestments = [] } = useInvestments();
  const { data: hookTransactions = [] } = useTransactions();

  const investments = propInvestments ?? hookInvestments;
  const transactions = propTransactions ?? hookTransactions;

  const currentYM = currentYearMonth();
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYM);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>("all_fixed");
  const [customCdiRate, setCustomCdiRate] = useState<number>(11.15); // 11.15% a.a.

  // Filtra investimentos de Renda Fixa ativos
  const fixedInvestments = useMemo(() => {
    return investments.filter(
      (i) => i.status === "ativo" && (i.category === "renda_fixa" || !i.category),
    );
  }, [investments]);

  // Lista de meses disponíveis para seleção
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentYM);
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      months.add(ym);
    }
    return Array.from(months).sort((a, b) => (a > b ? -1 : 1));
  }, [currentYM]);

  const benchmarks: BenchmarkRates = useMemo(() => {
    return {
      ...DEFAULT_BENCHMARKS,
      cdiAnnualRate: customCdiRate / 100,
    };
  }, [customCdiRate]);

  // Investimento selecionado (ou null para consolidado)
  const selectedInv = useMemo(() => {
    if (selectedInvestmentId === "all_fixed") return null;
    return fixedInvestments.find((i) => i.id === selectedInvestmentId) ?? null;
  }, [fixedInvestments, selectedInvestmentId]);

  // Detalhes do mês selecionado
  const monthDetail = useMemo(() => {
    return getMonthDaysDetail(selectedYearMonth);
  }, [selectedYearMonth]);

  // Cálculo da evolução dia a dia
  const dailyEvolution = useMemo(() => {
    const [y, m] = selectedYearMonth.split("-").map(Number);
    if (!y || !m) return [];
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startDate = `${selectedYearMonth}-01`;
    const endDate = `${selectedYearMonth}-${String(lastDay).padStart(2, "0")}`;

    if (selectedInv) {
      return calculateDailyEvolution(selectedInv, startDate, endDate, benchmarks);
    }

    // Se selecionado "Toda a Renda Fixa (Consolidada)"
    // Soma o cálculo diário de cada ativo
    const allDaysData = fixedInvestments.map((inv) =>
      calculateDailyEvolution(inv, startDate, endDate, benchmarks),
    );

    if (allDaysData.length === 0) return [];

    // Consolida por dia
    const consolidatedDays = monthDetail.days.map((day, idx) => {
      let startBalance = 0;
      let yieldAmount = 0;
      let endBalance = 0;
      let grossProfitTotal = 0;
      let estimatedIof = 0;
      let estimatedIr = 0;
      let netBalance = 0;

      for (const invDays of allDaysData) {
        const d = invDays[idx];
        if (d) {
          startBalance += d.startBalance;
          yieldAmount += d.yieldAmount;
          endBalance += d.endBalance;
          grossProfitTotal += d.grossProfitTotal;
          estimatedIof += d.estimatedIof;
          estimatedIr += d.estimatedIr;
          netBalance += d.netBalance;
        }
      }

      return {
        date: day.date,
        dayOfMonth: day.dayOfMonth,
        dayOfWeekName: day.dayOfWeekName,
        dayOfWeekShort: day.dayOfWeekShort,
        isBusinessDay: day.isBusinessDay,
        isWeekend: day.isWeekend,
        isHoliday: day.isHoliday,
        holidayName: day.holidayName,
        isPastOrToday: day.isPastOrToday,
        startBalance,
        yieldRate: startBalance > 0 ? yieldAmount / startBalance : 0,
        yieldAmount,
        endBalance,
        grossProfitTotal,
        daysElapsedTotal: 0,
        iofRatePercent: 0,
        estimatedIof,
        irRatePercent: 0,
        estimatedIr,
        netBalance,
      };
    });

    return consolidatedDays;
  }, [selectedYearMonth, selectedInv, fixedInvestments, benchmarks, monthDetail]);

  // Projeção do mês
  const monthProjection = useMemo(() => {
    return calculateMonthProjection(
      selectedInv ? [selectedInv] : fixedInvestments,
      selectedYearMonth,
      benchmarks,
    );
  }, [selectedInv, fixedInvestments, selectedYearMonth, benchmarks]);

  // Dados para o gráfico de linha do tempo
  const chartData = useMemo(() => {
    let accRendimento = 0;
    return dailyEvolution.map((d) => {
      accRendimento += d.yieldAmount;
      return {
        dia: `${d.dayOfMonth}`,
        data: d.date,
        rendimentoDia: d.yieldAmount,
        rendimentoAcumulado: accRendimento,
        saldo: d.endBalance,
        status: d.isBusinessDay ? "Útil" : d.isHoliday ? "Feriado" : "Fim de Semana",
      };
    });
  }, [dailyEvolution]);

  const totalFixedBalance = selectedInv
    ? selectedInv.current_balance
    : fixedInvestments.reduce((acc, i) => acc + i.current_balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header com Filtros e Seletor */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between panel p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground sm:text-lg">
              Extrato & Projeção Diária (ANBIMA DU/252)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Cálculo de rentabilidade dia a dia com identificação de dias úteis, fins de semana e feriados nacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Ativo */}
          <select
            value={selectedInvestmentId}
            onChange={(e) => setSelectedInvestmentId(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all_fixed">Toda a Renda Fixa ({fixedInvestments.length} ativos)</option>
            {fixedInvestments.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name} ({inv.institution})
              </option>
            ))}
          </select>

          {/* Seletor de Mês */}
          <select
            value={selectedYearMonth}
            onChange={(e) => setSelectedYearMonth(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {monthLabel(ym)} {ym === currentYM ? " (Mês Atual)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de StatCards do Rendimento Diário */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Rendimento Diário Estimado"
          value={formatCurrency(monthProjection.dailyYieldPortfolioEstimate)}
          hint={
            totalFixedBalance > 0
              ? `Taxa diária: ${(
                  (monthProjection.dailyYieldPortfolioEstimate / totalFixedBalance) *
                  100
                ).toFixed(4)}% por dia útil`
              : "Sem saldo em Renda Fixa"
          }
          icon={TrendingUp}
          tone="positive"
        />

        <StatCard
          label="Dias Úteis no Mês"
          value={`${monthProjection.totalBusinessDays} dias úteis`}
          hint={`${monthProjection.elapsedBusinessDays} transcorridos · ${monthProjection.remainingBusinessDays} restantes`}
          icon={Clock}
        />

        <StatCard
          label="Rendimento até Hoje"
          value={formatCurrency(monthProjection.monthElapsedYieldEstimate)}
          hint={`Base: ${monthProjection.elapsedBusinessDays} dias úteis transcorridos`}
          icon={Coins}
          tone="positive"
        />

        <StatCard
          label="Projeção de Fechamento do Mês"
          value={formatCurrency(monthProjection.monthTotalYieldEstimate)}
          hint={`Restante a render: +${formatCurrency(
            monthProjection.monthRemainingYieldEstimate,
          )} (${formatPercent(monthProjection.monthYieldPercentEstimate)})`}
          icon={Sparkles}
          tone="positive"
        />
      </div>

      {/* Banner Informativo sobre a Regra ANBIMA DU/252 */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs">
        <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Como funciona a Convenção de 252 Dias Úteis (ANBIMA / B3):
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Em dias úteis (Segunda a Sexta), o saldo é corrigido pela taxa diária equivalente à taxa anual pactuada:{" "}
            <span className="font-mono text-primary font-semibold">(1 + Taxa)^(1/252)</span>. Aos sábados, domingos e feriados nacionais oficiais da ANBIMA/B3, não há expediente financeiro e o saldo não sofre variação. O IOF e o IR regressivo continuam sendo contados em dias corridos.
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução Dia a Dia do Mês */}
      <div className="panel p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold">Curva de Rendimento Acumulado no Mês</h3>
            <p className="text-xs text-muted-foreground">
              Progressão do rendimento em R$ a cada dia útil de {monthLabel(selectedYearMonth)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Rendimento Acumulado
            </span>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Nenhum dado disponível para o período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="dia"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickFormatter={(val) => `Dia ${val}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                />
                <RechartsTooltip
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === "rendimentoAcumulado" ? "Rendimento Acumulado" : "Rendimento do Dia",
                  ]}
                  labelFormatter={(dia) => `Dia ${dia} de ${monthLabel(selectedYearMonth)}`}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "0.75rem",
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey="rendimentoAcumulado"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#yieldGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabela / Calendário Dia a Dia */}
      <div className="panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-2">
          <div>
            <h3 className="text-base font-semibold">Extrato Diário Detalhado ({monthLabel(selectedYearMonth)})</h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de cada dia do mês com status de dia útil, feriado nacional ou fim de semana
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded bg-success/15 text-success px-2 py-0.5 text-[10px] font-bold">
              🟢 Dia Útil (Rendeu)
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-warning/15 text-warning px-2 py-0.5 text-[10px] font-bold">
              🟡 Feriado Nacional
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
              ⚪ Fim de Semana
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-semibold">Data / Dia</th>
                <th className="pb-3 font-semibold">Status do Dia</th>
                <th className="pb-3 font-semibold text-right">Saldo Inicial</th>
                <th className="pb-3 font-semibold text-right">Rendimento do Dia</th>
                <th className="pb-3 font-semibold text-right">Saldo Final</th>
                <th className="pb-3 font-semibold text-right">Rend. Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(() => {
                let accRendimento = 0;
                return dailyEvolution.map((d) => {
                  accRendimento += d.yieldAmount;
                  const isToday = d.date === todayISO();

                  return (
                    <tr
                      key={d.date}
                      className={`hover:bg-accent/40 transition-colors ${
                        isToday ? "bg-primary/10 font-medium" : ""
                      }`}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {formatDate(d.date)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({d.dayOfWeekShort})
                          </span>
                          {isToday && (
                            <span className="rounded bg-primary text-primary-foreground px-1.5 py-0.2 text-[9px] font-bold uppercase">
                              Hoje
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5">
                        {d.isBusinessDay ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                            <CheckCircle2 className="h-3 w-3" /> Dia Útil (Rendeu)
                          </span>
                        ) : d.isHoliday ? (
                          <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning" title={d.holidayName}>
                            <AlertCircle className="h-3 w-3" /> {d.holidayName || "Feriado Nacional"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {d.dayOfWeekName}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 text-right num text-muted-foreground">
                        {formatCurrency(d.startBalance)}
                      </td>

                      <td className="py-2.5 text-right">
                        {d.yieldAmount > 0 ? (
                          <span className="num font-bold text-success">
                            +{formatCurrency(d.yieldAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-2.5 text-right num font-semibold text-foreground">
                        {formatCurrency(d.endBalance)}
                      </td>

                      <td className="py-2.5 text-right num font-bold text-primary">
                        {formatCurrency(accRendimento)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
