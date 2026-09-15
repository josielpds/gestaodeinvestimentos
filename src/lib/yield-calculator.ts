/**
 * Motor de Cálculo de Rendimento Diário e Projeções (Padrão ANBIMA DU/252)
 */

import {
  type DayDetail,
  getMonthDaysDetail,
  isBusinessDay,
  isWeekend,
  getHolidayInfo,
} from "./business-days";
import {
  type Investment,
  type Transaction,
  fixedIncomeTaxRate,
  iofTaxRate,
  daysBetween,
} from "./finance";

export interface BenchmarkRates {
  cdiAnnualRate: number; // ex: 0.1115 (11.15% a.a.)
  selicAnnualRate: number; // ex: 0.1125 (11.25% a.a.)
  ipcaAnnualRate: number; // ex: 0.0450 (4.50% a.a.)
  poupancaAnnualRate: number; // ex: 0.0617 (6.17% a.a. + TR)
}

export const DEFAULT_BENCHMARKS: BenchmarkRates = {
  cdiAnnualRate: 0.1115, // 11.15% a.a.
  selicAnnualRate: 0.1125, // 11.25% a.a.
  ipcaAnnualRate: 0.045, // 4.50% a.a.
  poupancaAnnualRate: 0.0617, // ~6.17% a.a.
};

/**
 * Converte uma taxa anual efetiva em taxa diária considerando 252 dias úteis:
 * TaxaDiaria = (1 + TaxaAnual)^(1/252) - 1
 */
export function annualToDailyRate(annualRate: number): number {
  if (annualRate <= -1) return 0;
  return Math.pow(1 + annualRate, 1 / 252) - 1;
}

/**
 * Calcula a taxa anual efetiva de um ativo com base no indexador e na taxa pactuada.
 */
export function getEffectiveAnnualRate(
  indexer: string,
  indexerRate?: number | null,
  benchmarks: BenchmarkRates = DEFAULT_BENCHMARKS,
): number {
  const rate = indexerRate ?? 100;

  switch (indexer) {
    case "cdi":
      // Ex: 100% do CDI -> rate = 100 -> 1.0 * cdiRate
      // Ex: 110% do CDI -> rate = 110 -> 1.1 * cdiRate
      // Ex: CDI + 2% -> se rate < 15, assume taxa spread sobre CDI
      if (rate > 50) {
        return (rate / 100) * benchmarks.cdiAnnualRate;
      }
      return benchmarks.cdiAnnualRate + rate / 100;

    case "selic":
      if (rate > 50) {
        return (rate / 100) * benchmarks.selicAnnualRate;
      }
      return benchmarks.selicAnnualRate + rate / 100;

    case "pre":
      // Taxa fixa anual informada (ex: 12.5% -> rate = 12.5)
      return rate / 100;

    case "ipca":
      // IPCA + Taxa Pré (ex: IPCA + 6.0% -> rate = 6.0)
      return benchmarks.ipcaAnnualRate + (rate / 100);

    case "poupanca":
      return benchmarks.poupancaAnnualRate;

    default:
      // Para outros ativos de renda fixa, fallback para 100% CDI
      return benchmarks.cdiAnnualRate;
  }
}

/**
 * Retorna o fator diário e a taxa diária em percentual para um investimento.
 */
export function getDailyYieldMetrics(
  inv: Investment,
  benchmarks: BenchmarkRates = DEFAULT_BENCHMARKS,
): {
  effectiveAnnualRate: number; // ex: 0.1115
  dailyRate: number; // ex: 0.000418
  dailyRatePercent: number; // ex: 0.0418%
  dailyYieldAmountEstimate: number; // R$ gerado em 1 dia útil sobre o saldo atual
} {
  const effectiveAnnualRate = getEffectiveAnnualRate(inv.indexer, inv.indexer_rate, benchmarks);
  const dailyRate = annualToDailyRate(effectiveAnnualRate);
  const dailyRatePercent = dailyRate * 100;
  const dailyYieldAmountEstimate = inv.current_balance * dailyRate;

  return {
    effectiveAnnualRate,
    dailyRate,
    dailyRatePercent,
    dailyYieldAmountEstimate,
  };
}

export interface DayEvolution {
  date: string; // "YYYY-MM-DD"
  dayOfMonth: number;
  dayOfWeekName: string;
  dayOfWeekShort: string;
  isBusinessDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isPastOrToday: boolean;
  startBalance: number;
  yieldRate: number; // 0 nos fins de semana/feriados
  yieldAmount: number; // R$ 0 nos fins de semana/feriados
  endBalance: number;
  grossProfitTotal: number;
  daysElapsedTotal: number;
  iofRatePercent: number;
  estimatedIof: number;
  irRatePercent: number;
  estimatedIr: number;
  netBalance: number;
}

/**
 * Simula a evolução dia a dia de um investimento no período especificado.
 */
export function calculateDailyEvolution(
  inv: Investment,
  startDate: string,
  endDate: string,
  benchmarks: BenchmarkRates = DEFAULT_BENCHMARKS,
): DayEvolution[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  const [sy, sm, sd] = startDate.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endDate.slice(0, 10).split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return [];

  const metrics = getDailyYieldMetrics(inv, benchmarks);
  const isFixed = inv.category === "renda_fixa";
  const isExempt = !!inv.tax_exempt;

  const todayStr = new Date().toISOString().slice(0, 10);
  const days: DayEvolution[] = [];

  let currentBalance = inv.initial_amount || inv.current_balance;
  const investedTotal = inv.initial_amount || inv.current_balance;

  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  const DAY_NAMES = [
    { short: "Dom", full: "Domingo" },
    { short: "Seg", full: "Segunda-feira" },
    { short: "Ter", full: "Terça-feira" },
    { short: "Qua", full: "Quarta-feira" },
    { short: "Qui", full: "Quinta-feira" },
    { short: "Sex", full: "Sexta-feira" },
    { short: "Sáb", full: "Sábado" },
  ];

  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    const dateISO = `${y}-${m}-${d}`;

    const dow = cur.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const holiday = getHolidayInfo(dateISO);
    const busDay = !weekend && !holiday.isHoliday;
    const isPastOrToday = dateISO <= todayStr;

    const startBalance = currentBalance;
    let yieldRate = 0;
    let yieldAmount = 0;

    if (busDay) {
      yieldRate = metrics.dailyRate;
      yieldAmount = startBalance * yieldRate;
      currentBalance += yieldAmount;
    }

    const endBalance = currentBalance;
    const grossProfitTotal = Math.max(0, endBalance - investedTotal);

    // Contagem de dias corridos desde o início do ativo
    const daysElapsedTotal = daysBetween(inv.start_date, dateISO);
    const iofRate = iofTaxRate(daysElapsedTotal, isExempt, isFixed);
    const estimatedIof = grossProfitTotal > 0 ? grossProfitTotal * iofRate : 0;

    const taxableProfit = Math.max(0, grossProfitTotal - estimatedIof);
    const irRate = isExempt
      ? 0
      : isFixed
        ? fixedIncomeTaxRate(daysElapsedTotal, false)
        : 0.15;
    const estimatedIr = taxableProfit > 0 ? taxableProfit * irRate : 0;

    const totalTax = estimatedIof + estimatedIr;
    const netBalance = endBalance - totalTax;

    days.push({
      date: dateISO,
      dayOfMonth: Number(d),
      dayOfWeekName: DAY_NAMES[dow]?.full ?? "",
      dayOfWeekShort: DAY_NAMES[dow]?.short ?? "",
      isBusinessDay: busDay,
      isWeekend: weekend,
      isHoliday: holiday.isHoliday,
      holidayName: holiday.name,
      isPastOrToday,
      startBalance,
      yieldRate,
      yieldAmount,
      endBalance,
      grossProfitTotal,
      daysElapsedTotal,
      iofRatePercent: iofRate * 100,
      estimatedIof,
      irRatePercent: irRate * 100,
      estimatedIr,
      netBalance,
    });

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return days;
}

export interface MonthYieldProjection {
  yearMonth: string;
  totalDays: number;
  totalBusinessDays: number;
  elapsedBusinessDays: number;
  remainingBusinessDays: number;
  dailyYieldPortfolioEstimate: number; // Ganho em R$ estimado a cada dia útil
  monthElapsedYieldEstimate: number; // Ganho estimado até a data de hoje no mês
  monthRemainingYieldEstimate: number; // Ganho estimado restante até o fim do mês
  monthTotalYieldEstimate: number; // Ganho total previsto para o mês completo
  monthYieldPercentEstimate: number; // % acumulado previsto para o mês
  dailyBreakdown: {
    dayDetail: DayDetail;
    yieldEstimate: number;
    accumulatedMonthYield: number;
  }[];
}

/**
 * Calcula a projeção consolidada de rendimento para o mês atual para uma lista de investimentos.
 */
export function calculateMonthProjection(
  investments: Investment[],
  yearMonth: string = new Date().toISOString().slice(0, 7),
  benchmarks: BenchmarkRates = DEFAULT_BENCHMARKS,
): MonthYieldProjection {
  const monthInfo = getMonthDaysDetail(yearMonth);
  const activeFixed = investments.filter(
    (i) => i.status === "ativo" && (i.category === "renda_fixa" || !i.category),
  );

  // Soma de rendimento diário estimado por dia útil da carteira
  let dailyYieldPortfolioEstimate = 0;
  let totalBalance = 0;

  for (const inv of activeFixed) {
    const m = getDailyYieldMetrics(inv, benchmarks);
    dailyYieldPortfolioEstimate += m.dailyYieldAmountEstimate;
    totalBalance += inv.current_balance;
  }

  const monthElapsedYieldEstimate = dailyYieldPortfolioEstimate * monthInfo.elapsedBusinessDays;
  const monthRemainingYieldEstimate = dailyYieldPortfolioEstimate * monthInfo.remainingBusinessDays;
  const monthTotalYieldEstimate = dailyYieldPortfolioEstimate * monthInfo.totalBusinessDays;
  const monthYieldPercentEstimate =
    totalBalance > 0 ? (monthTotalYieldEstimate / totalBalance) * 100 : 0;

  let accYield = 0;
  const dailyBreakdown = monthInfo.days.map((day) => {
    let yieldEstimate = 0;
    if (day.isBusinessDay) {
      yieldEstimate = dailyYieldPortfolioEstimate;
      accYield += yieldEstimate;
    }
    return {
      dayDetail: day,
      yieldEstimate,
      accumulatedMonthYield: accYield,
    };
  });

  return {
    yearMonth,
    totalDays: monthInfo.totalDays,
    totalBusinessDays: monthInfo.totalBusinessDays,
    elapsedBusinessDays: monthInfo.elapsedBusinessDays,
    remainingBusinessDays: monthInfo.remainingBusinessDays,
    dailyYieldPortfolioEstimate,
    monthElapsedYieldEstimate,
    monthRemainingYieldEstimate,
    monthTotalYieldEstimate,
    monthYieldPercentEstimate,
    dailyBreakdown,
  };
}
