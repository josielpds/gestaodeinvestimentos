import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Coins,
  FileSpreadsheet,
  Landmark,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AnnualSpreadsheetTable } from "@/components/annual-spreadsheet-table";
import { AnnualMonthlyYieldBar } from "@/components/annual-monthly-yield-bar";
import { useInvestments, useSaveRow, useSnapshots } from "@/lib/data";
import {
  currentYearMonth,
  formatCurrency,
  monthLabel,
  todayISO,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/renda-fixa")({
  head: () => ({
    meta: [{ title: "Renda Fixa — PatrimônioInvest" }],
  }),
  component: RendaFixaPage,
});

export function RendaFixaPage() {
  const { data: investments = [], isLoading: loadingInvestments, refetch: refetchInvestments } = useInvestments();
  const { data: snapshots = [], refetch: refetchSnapshots } = useSnapshots();
  const saveInv = useSaveRow("investments");
  const saveSnapshot = useSaveRow("monthly_snapshots");

  // Ano de referência selecionado para as planilhas
  const currentYear = new Date().getFullYear();
  const currentYM = currentYearMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Filtra apenas ativos de renda fixa
  const fixedInvestments = useMemo(() => {
    return investments.filter((i) => i.category === "renda_fixa");
  }, [investments]);

  // Identifica ou define o ativo de Saldo Conta Dia a Dia / CNPJ
  const cnpjAccount = useMemo(() => {
    return fixedInvestments.find(
      (i) =>
        i.name.toLowerCase().includes("cnpj") ||
        i.name.toLowerCase().includes("conta dia a dia") ||
        i.institution.toLowerCase().includes("cnpj") ||
        i.notes?.toLowerCase().includes("cnpj"),
    );
  }, [fixedInvestments]);

  // ID garantido da conta CNPJ / Dia a Dia
  const [cnpjAccountId, setCnpjAccountId] = useState<string | null>(cnpjAccount?.id ?? null);

  useEffect(() => {
    if (cnpjAccount?.id) {
      setCnpjAccountId(cnpjAccount.id);
    }
  }, [cnpjAccount]);

  // Garante a existência do registro de conta CNPJ / Dia a Dia para isolamento absoluto das planilhas
  async function ensureCnpjAccountId(): Promise<string> {
    if (cnpjAccountId) return cnpjAccountId;
    if (cnpjAccount?.id) return cnpjAccount.id;

    try {
      await saveInv.mutateAsync({
        values: {
          name: "Saldo Conta Dia a Dia e CNPJ",
          category: "renda_fixa",
          sub_type: "conta_corrente",
          institution: "Conta Dia a Dia / CNPJ",
          current_balance: 0,
          initial_amount: 0,
          status: "ativo",
          start_date: todayISO(),
        },
      });
      const { data: updatedInvs } = await refetchInvestments();
      const found = (updatedInvs || []).find(
        (i) =>
          i.name.toLowerCase().includes("cnpj") ||
          i.name.toLowerCase().includes("conta dia a dia") ||
          i.institution.toLowerCase().includes("cnpj"),
      );
      if (found) {
        setCnpjAccountId(found.id);
        return found.id;
      }
    } catch (err) {
      console.error("Erro ao inicializar conta CNPJ:", err);
    }
    return "";
  }

  // Criação automática no primeiro carregamento caso ainda não exista
  useEffect(() => {
    if (!loadingInvestments && !cnpjAccount && !cnpjAccountId) {
      ensureCnpjAccountId();
    }
  }, [loadingInvestments, cnpjAccount, cnpjAccountId]);

  // Totais agregados da Renda Fixa tradicional
  const fixedTotalGross = useMemo(() => {
    return fixedInvestments.reduce((acc, i) => acc + (i.status === "ativo" ? i.current_balance : 0), 0);
  }, [fixedInvestments]);

  // Cálculo Dinâmico do Saldo do Patrimônio em RF e Rendimento do Mês Atual baseado nas Planilhas
  const spreadsheetMetrics = useMemo(() => {
    const yearSnaps = snapshots.filter((s) => s.year_month.startsWith(String(selectedYear)));
    const invSnaps = yearSnaps.filter((s) => !s.investment_id || s.investment_id === "null");
    const cnpjSnaps = cnpjAccountId
      ? yearSnaps.filter((s) => s.investment_id === cnpjAccountId)
      : cnpjAccount
        ? yearSnaps.filter((s) => s.investment_id === cnpjAccount.id)
        : [];

    // Snapshot do mês atual
    const currentInvSnap = invSnaps.find((s) => s.year_month === currentYM);
    const currentCnpjSnap = cnpjSnaps.find((s) => s.year_month === currentYM);

    // Último snapshot preenchido do ano
    const latestInvSnap =
      currentInvSnap ??
      [...invSnaps].sort((a, b) => b.year_month.localeCompare(a.year_month))[0];
    const latestCnpjSnap =
      currentCnpjSnap ??
      [...cnpjSnaps].sort((a, b) => b.year_month.localeCompare(a.year_month))[0];

    const invFinal = Number(latestInvSnap?.final_balance) || 0;
    const cnpjFinal = Number(latestCnpjSnap?.final_balance) || 0;

    // Saldo do Patrimônio: soma dos saldos finais das planilhas ou fallback
    const totalPatrimonioRF =
      invFinal + cnpjFinal > 0 ? invFinal + cnpjFinal : fixedTotalGross;

    // Rendimento do Mês Atual somado (Investimentos + Conta Dia a Dia)
    const currentInvProfit = Number(currentInvSnap?.profit_amount) || 0;
    const currentCnpjProfit = Number(currentCnpjSnap?.profit_amount) || 0;
    const currentMonthTotalYield = currentInvProfit + currentCnpjProfit;

    // Lucro Total no Ano Selecionado
    const totalYearProfit = yearSnaps.reduce((acc, s) => {
      const p =
        s.profit_amount !== undefined && s.profit_amount !== null
          ? Number(s.profit_amount)
          : (Number(s.final_balance) || 0) - (Number(s.initial_balance) || 0);
      return acc + p;
    }, 0);

    const refMonth = currentInvSnap?.year_month ?? latestInvSnap?.year_month ?? currentYM;

    return {
      totalPatrimonioRF,
      currentMonthTotalYield,
      totalYearProfit,
      refMonth,
    };
  }, [snapshots, selectedYear, currentYM, cnpjAccountId, cnpjAccount, fixedTotalGross]);

  return (
    <div className="space-y-6">
      {/* Header Principal da Renda Fixa */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Renda Fixa & Contas
              </h1>
              <p className="text-xs text-muted-foreground">
                Planilhas anuais com Capital Inicial, Capital Atual, Lucro Mês (R$) e Lucro % para Investimentos e Contas CNPJ.
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Ano */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-surface border border-border px-3.5 py-1.5 rounded-xl text-xs shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-muted-foreground">Ano de Referência:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais (Sempre pegando o saldo final e rendimento do mês atual) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Patrimônio em Renda Fixa (Saldo Final do Mês) */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/5 p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrimônio em Renda Fixa
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="num text-2xl font-bold text-foreground">
              {formatCurrency(spreadsheetMetrics.totalPatrimonioRF)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo Final ({spreadsheetMetrics.refMonth}): Investimentos + CNPJ
            </p>
          </div>
        </div>

        {/* Rendimento do Mês Atual */}
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rendimento do Mês ({monthLabel(currentYM)})
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                spreadsheetMetrics.currentMonthTotalYield >= 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                spreadsheetMetrics.currentMonthTotalYield >= 0
                  ? "text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(spreadsheetMetrics.currentMonthTotalYield)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Investimentos + Saldo Conta Dia a Dia
            </p>
          </div>
        </div>

        {/* Lucro Total do Ano */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-glow/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Rendimento Total ({selectedYear})
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`num text-2xl font-bold ${
                spreadsheetMetrics.totalYearProfit >= 0 ? "text-emerald-400" : "text-destructive"
              }`}
            >
              {formatCurrency(spreadsheetMetrics.totalYearProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consolidado dos 12 meses do ano
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL: PLANILHAS ANUAIS & BARRA HORIZONTAL DE RESUMO */}
      {/* ========================================================================= */}
      <div className="space-y-8">
        {/* BARRA RESUMO HORIZONTAL: JAN A DEZ + TOTAL ANUAL (EXATAMENTE COMO NA IMAGEM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Resumo de Rendimento Mensal ({selectedYear})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Soma Investimentos + Conta Dia a Dia / CNPJ
            </span>
          </div>

          <AnnualMonthlyYieldBar year={selectedYear} snapshots={snapshots} />
        </div>

        {/* TABELA 1: INVESTIMENTOS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Planilha 1 · Investimentos em Renda Fixa
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Ano: {selectedYear}
            </span>
          </div>

          <AnnualSpreadsheetTable
            title="INVESTIMENTOS"
            year={selectedYear}
            snapshots={snapshots}
            investmentId={null}
            allowEditProfit={false}
            onSaveRowCustom={async ({ yearMonth, snapshotId, initial, final, profit, percent }) => {
              await saveSnapshot.mutateAsync({
                id: snapshotId,
                values: {
                  year_month: yearMonth,
                  investment_id: null,
                  initial_balance: initial,
                  deposits: 0,
                  withdrawals: 0,
                  earnings: profit > 0 ? profit : 0,
                  final_balance: final,
                  profit_amount: profit,
                  profit_percent: percent,
                },
              });
              refetchSnapshots();
            }}
            onSnapshotSaved={() => refetchSnapshots()}
          />
        </div>

        {/* TABELA 2: SALDO CONTA DIA A DIA E CNPJ (LUCRO MÊS EDITÁVEL - 100% INDEPENDENTE) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                Planilha 2 · Saldo Conta Dia a Dia e CNPJ (Lucro Mês Editável)
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Ano: {selectedYear}
            </span>
          </div>

          <AnnualSpreadsheetTable
            title="SALDO CONTA DIA A DIA E CNPJ"
            year={selectedYear}
            snapshots={snapshots}
            investmentId={cnpjAccountId || cnpjAccount?.id || "cnpj_guard"}
            allowEditProfit={true}
            onSaveRowCustom={async ({ yearMonth, snapshotId, initial, final, profit, percent }) => {
              const accId = await ensureCnpjAccountId();
              if (!accId) {
                throw new Error("Não foi possível identificar ou inicializar a Conta CNPJ.");
              }
              await saveSnapshot.mutateAsync({
                id: snapshotId,
                values: {
                  year_month: yearMonth,
                  investment_id: accId,
                  initial_balance: initial,
                  deposits: 0,
                  withdrawals: 0,
                  earnings: profit > 0 ? profit : 0,
                  final_balance: final,
                  profit_amount: profit,
                  profit_percent: percent,
                },
              });
              // Sincroniza também o saldo do ativo CNPJ na tabela investments
              await saveInv.mutateAsync({
                id: accId,
                values: {
                  current_balance: final,
                },
              });
              refetchSnapshots();
              refetchInvestments();
            }}
            onSnapshotSaved={() => {
              refetchSnapshots();
              refetchInvestments();
            }}
          />
        </div>
      </div>
    </div>
  );
}
