import type { Tables } from "@/integrations/supabase/types";

export type Investment = Tables<"investments">;
export type Transaction = Tables<"transactions">;
export type Dividend = Tables<"dividends">;
export type Snapshot = Tables<"monthly_snapshots">;
export type Target = Tables<"portfolio_targets">;
export type Goal = Tables<"financial_goals">;
export type OpenFinanceConnection = Tables<"open_finance_connections">;

export const CATEGORIES = ["renda_fixa", "renda_variavel", "internacional", "cripto"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  renda_fixa: "Renda Fixa",
  renda_variavel: "Renda Variável",
  internacional: "Internacional",
  cripto: "Criptoativos",
};

/** Cores dos gráficos vêm dos tokens de chart do design system. */
export const CATEGORY_CHART_VAR: Record<string, string> = {
  renda_fixa: "var(--color-chart-1)",
  renda_variavel: "var(--color-chart-2)",
  internacional: "var(--color-chart-3)",
  cripto: "var(--color-chart-4)",
};

export const SUBTYPE_LABELS: Record<string, string> = {
  cdb: "CDB",
  lci_lca: "LCI / LCA",
  tesouro: "Tesouro Direto",
  cri_cra: "CRI / CRA",
  debenture: "Debênture",
  poupanca: "Poupança",
  acao: "Ação (B3)",
  fii: "FII (Fundo Imobiliário)",
  etf: "ETF",
  bdr: "BDR",
  crypto: "Criptomoeda",
  exterior: "Stock Exterior",
};

export const INDEXER_LABELS: Record<string, string> = {
  cdi: "CDI",
  ipca: "IPCA +",
  pre: "Pré-fixado",
  selic: "SELIC",
  variavel: "Renda Variável / Cotas",
};

export const LIQUIDITY_OPTIONS = ["Diária", "D+1", "D+30", "No Vencimento"];

export const TRANSACTION_LABELS: Record<string, string> = {
  aporte: "Aporte",
  resgate: "Resgate",
  provento: "Provento",
  rendimento_rf: "Rendimento (RF)",
};

export const DIVIDEND_LABELS: Record<string, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento_fii: "Rendimento de FII",
  juros_semestrais: "Juros Semestrais",
};

export function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPercent(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "0,00%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(decimals).replace(".", ",")}%`;
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  const [y, m, d] = val.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function monthLabel(yearMonth: string): string {
  const parts = yearMonth.split("-");
  const y = parts[0] ?? "";
  const m = parts[1] ?? "";
  if (!y || !m) return yearMonth;
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${names[Number(m) - 1] ?? m}/${y.slice(2)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Tabela regressiva de IR para renda fixa. */
export function fixedIncomeTaxRate(days: number, isExempt = false): number {
  if (isExempt) return 0;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

/** Tabela regressiva de IOF (1 a 29 dias) para aplicações de renda fixa. */
export const IOF_REGRESSION_RATES: Record<number, number> = {
  1: 0.96,
  2: 0.93,
  3: 0.90,
  4: 0.86,
  5: 0.83,
  6: 0.80,
  7: 0.76,
  8: 0.73,
  9: 0.70,
  10: 0.66,
  11: 0.63,
  12: 0.60,
  13: 0.56,
  14: 0.53,
  15: 0.50,
  16: 0.46,
  17: 0.43,
  18: 0.40,
  19: 0.36,
  20: 0.33,
  21: 0.30,
  22: 0.26,
  23: 0.23,
  24: 0.20,
  25: 0.16,
  26: 0.13,
  27: 0.10,
  28: 0.06,
  29: 0.03,
};

/** Retorna a alíquota de IOF (0 a 0.96) com base no prazo decorrido em dias. */
export function iofTaxRate(days: number, isExempt = false, isFixedIncome = true): number {
  if (isExempt || !isFixedIncome || days >= 30 || days <= 0) return 0;
  return IOF_REGRESSION_RATES[days] ?? 0;
}

export function daysBetween(start: string, end: string = todayISO()): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export interface InvestmentMetrics {
  daysHeld: number;
  taxRatePercent: number; // Alíquota de IR %
  iofRatePercent: number; // Alíquota de IOF %
  investedTotal: number;
  grossProfit: number;
  estimatedIof: number; // Valor de IOF estimado em R$
  taxableProfitForIR: number; // Base de cálculo do IR (Lucro Bruto - IOF)
  estimatedTax: number; // Valor de IR estimado em R$
  totalTax: number; // Total de tributos (IOF + IR) em R$
  netBalance: number; // Saldo Líquido
  netProfit: number; // Lucro Líquido
  grossProfitPercent: number;
  netProfitPercent: number;
}

export function metricsFor(inv: Investment, transactions: Transaction[] = []): InvestmentMetrics {
  const own = transactions.filter((t) => t.investment_id === inv.id);
  const deposits = own.filter((t) => t.type === "aporte").reduce((a, t) => a + t.amount, 0);
  const withdrawals = own.filter((t) => t.type === "resgate").reduce((a, t) => a + t.amount, 0);
  const investedTotal = Math.max(0, inv.initial_amount + deposits - withdrawals);

  const daysHeld = daysBetween(inv.start_date);
  const isFixed = inv.category === "renda_fixa";
  const irRate = isFixed ? fixedIncomeTaxRate(daysHeld, inv.tax_exempt) : inv.tax_exempt ? 0 : 0.15;
  const iofRate = iofTaxRate(daysHeld, inv.tax_exempt, isFixed);

  const grossProfit = inv.current_balance - investedTotal;
  
  // IOF incide primeiro sobre o lucro bruto
  const estimatedIof = grossProfit > 0 ? grossProfit * iofRate : 0;
  
  // IR incide sobre o lucro após dedução do IOF
  const taxableProfitForIR = Math.max(0, grossProfit - estimatedIof);
  const estimatedTax = taxableProfitForIR > 0 ? taxableProfitForIR * irRate : 0;
  
  const totalTax = estimatedIof + estimatedTax;
  const netBalance = inv.current_balance - totalTax;

  return {
    daysHeld,
    taxRatePercent: irRate * 100,
    iofRatePercent: iofRate * 100,
    investedTotal,
    grossProfit,
    estimatedIof,
    taxableProfitForIR,
    estimatedTax,
    totalTax,
    netBalance,
    netProfit: netBalance - investedTotal,
    grossProfitPercent: investedTotal > 0 ? (grossProfit / investedTotal) * 100 : 0,
    netProfitPercent: investedTotal > 0 ? ((netBalance - investedTotal) / investedTotal) * 100 : 0,
  };
}

export interface PortfolioSummary {
  totalGross: number;
  totalInvested: number;
  totalIof: number;
  totalIr: number;
  totalTax: number;
  totalNet: number;
  grossProfit: number;
  netProfit: number;
  grossProfitPercent: number;
  byCategory: { key: string; label: string; value: number; percent: number }[];
  byInstitution: { institution: string; valor: number }[];
}

export function summarize(
  investments: Investment[],
  transactions: Transaction[] = [],
): PortfolioSummary {
  const active = investments.filter((i) => i.status === "ativo");
  let totalGross = 0;
  let totalInvested = 0;
  let totalIof = 0;
  let totalIr = 0;
  let totalTax = 0;
  const catMap: Record<string, number> = {};
  const instMap: Record<string, number> = {};

  for (const inv of active) {
    const m = metricsFor(inv, transactions);
    totalGross += inv.current_balance;
    totalInvested += m.investedTotal;
    totalIof += m.estimatedIof;
    totalIr += m.estimatedTax;
    totalTax += m.totalTax;
    catMap[inv.category] = (catMap[inv.category] ?? 0) + inv.current_balance;
    const inst = inv.institution || "Outras";
    instMap[inst] = (instMap[inst] ?? 0) + inv.current_balance;
  }

  const totalNet = totalGross - totalTax;
  return {
    totalGross,
    totalInvested,
    totalIof,
    totalIr,
    totalTax,
    totalNet,
    grossProfit: totalGross - totalInvested,
    netProfit: totalNet - totalInvested,
    grossProfitPercent: totalInvested > 0 ? ((totalGross - totalInvested) / totalInvested) * 100 : 0,
    byCategory: CATEGORIES.filter((c) => (catMap[c] ?? 0) > 0).map((c) => ({
      key: c,
      label: CATEGORY_LABELS[c] ?? c,
      value: catMap[c] ?? 0,
      percent: totalGross > 0 ? ((catMap[c] ?? 0) / totalGross) * 100 : 0,
    })),
    byInstitution: Object.entries(instMap)
      .map(([institution, valor]) => ({ institution, valor }))
      .sort((a, b) => b.valor - a.valor),
  };
}
