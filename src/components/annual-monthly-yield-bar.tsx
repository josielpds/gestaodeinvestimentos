import { useMemo } from "react";
import { formatCurrency, formatPercent, type Snapshot } from "@/lib/finance";

const MONTH_COLS = [
  { num: "01", short: "JAN" },
  { num: "02", numStr: "02", short: "FEV" },
  { num: "03", short: "MAR" },
  { num: "04", short: "ABR" },
  { num: "05", short: "MAI" },
  { num: "06", short: "JUN" },
  { num: "07", short: "JUL" },
  { num: "08", short: "AGO" },
  { num: "09", short: "SET" },
  { num: "10", short: "OUT" },
  { num: "11", short: "NOV" },
  { num: "12", short: "DEZ" },
];

interface Props {
  year: number;
  snapshots: Snapshot[];
}

export function AnnualMonthlyYieldBar({ year, snapshots }: Props) {
  // Calcula o rendimento somado de cada mês do ano selecionado (Investimentos + Conta Dia a Dia / CNPJ)
  const monthlyData = useMemo(() => {
    let totalAnnualYield = 0;

    const cols = MONTH_COLS.map((m) => {
      const ym = `${year}-${m.num}`;
      const monthSnapshots = snapshots.filter((s) => s.year_month === ym);

      // Soma o lucro de todos os registros do mês (Consolidado RF + CNPJ)
      const sumProfit = monthSnapshots.reduce((acc, s) => {
        const p = s.profit_amount !== undefined && s.profit_amount !== null
          ? Number(s.profit_amount)
          : (Number(s.final_balance) || 0) - (Number(s.initial_balance) || 0);
        return acc + p;
      }, 0);

      const hasData = monthSnapshots.length > 0;
      if (hasData) {
        totalAnnualYield += sumProfit;
      }

      return {
        short: m.short,
        num: m.num,
        profit: sumProfit,
        hasData,
      };
    });

    return {
      cols,
      totalAnnualYield,
    };
  }, [year, snapshots]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          {/* Linha do Cabeçalho com Verde Estilo Planilha */}
          <thead>
            <tr className="bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider border-b border-emerald-700">
              {monthlyData.cols.map((col) => (
                <th
                  key={col.num}
                  className="py-3 px-2 border-r border-emerald-700/80 min-w-[72px]"
                >
                  {col.short}
                </th>
              ))}
              {/* Coluna TOTAL ANUAL */}
              <th className="py-3 px-4 min-w-[130px] bg-slate-900 text-primary border-l border-slate-700 font-extrabold tracking-wider">
                TOTAL ANUAL
              </th>
            </tr>
          </thead>

          {/* Linha de Valores de Rendimento do Mês */}
          <tbody>
            <tr className="bg-slate-900/60 font-mono text-xs font-bold divide-x divide-border/60">
              {monthlyData.cols.map((col) => {
                const isPositive = col.profit >= 0;
                return (
                  <td
                    key={col.num}
                    className="py-3.5 px-2 text-center"
                  >
                    {col.hasData ? (
                      <span
                        className={
                          isPositive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {formatCurrency(col.profit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 font-normal">—</span>
                    )}
                  </td>
                );
              })}

              {/* Valor TOTAL ANUAL */}
              <td className="py-3.5 px-4 text-center bg-slate-900 text-sm font-extrabold">
                <span
                  className={
                    monthlyData.totalAnnualYield >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {formatCurrency(monthlyData.totalAnnualYield)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
