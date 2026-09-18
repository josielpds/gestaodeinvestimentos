import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, DollarSign, Info, Loader2, Sparkles, TrendingUp, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveRow } from "@/lib/data";
import { currentYearMonth, formatCurrency, formatPercent, type Investment, type Snapshot } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot?: Snapshot | null;
  fixedInvestments?: Investment[];
  defaultInitialBalance?: number;
  defaultFinalBalance?: number;
}

export function RendaFixaSnapshotDialog({
  open,
  onOpenChange,
  snapshot,
  fixedInvestments = [],
  defaultInitialBalance = 0,
  defaultFinalBalance = 0,
}: Props) {
  const [form, setForm] = useState({
    year_month: currentYearMonth(),
    investment_id: "" as string | null,
    initial_balance: defaultInitialBalance,
    deposits: 0,
    withdrawals: 0,
    earnings: 0,
    final_balance: defaultFinalBalance,
    profit_amount: 0,
    profit_percent: 0,
    cdi_benchmark: 0.9,
    ipca_benchmark: 0.35,
    ibovespa_benchmark: 1.5,
  });

  const save = useSaveRow("monthly_snapshots");

  useEffect(() => {
    if (!open) return;
    if (snapshot) {
      setForm({
        year_month: snapshot.year_month,
        investment_id: snapshot.investment_id ?? "",
        initial_balance: snapshot.initial_balance,
        deposits: snapshot.deposits,
        withdrawals: snapshot.withdrawals,
        earnings: snapshot.earnings,
        final_balance: snapshot.final_balance,
        profit_amount: snapshot.profit_amount,
        profit_percent: snapshot.profit_percent,
        cdi_benchmark: snapshot.cdi_benchmark,
        ipca_benchmark: snapshot.ipca_benchmark,
        ibovespa_benchmark: snapshot.ibovespa_benchmark,
      });
    } else {
      const initial = defaultInitialBalance;
      const final = defaultFinalBalance;
      const base = initial;
      const profit = final - base;
      const percent = base > 0 ? (profit / base) * 100 : 0;

      setForm((f) => ({
        ...f,
        year_month: currentYearMonth(),
        investment_id: "",
        initial_balance: initial,
        deposits: 0,
        withdrawals: 0,
        final_balance: final,
        profit_amount: profit,
        profit_percent: percent,
      }));
    }
  }, [open, snapshot, defaultInitialBalance, defaultFinalBalance]);

  // Recalcula o rendimento e a rentabilidade instantaneamente
  function handleValueChange(field: string, val: number) {
    const updated = { ...form, [field]: val };
    const base = Number(updated.initial_balance) + Number(updated.deposits) - Number(updated.withdrawals);
    const profit = Number(updated.final_balance) - base;
    const percent = base > 0 ? (profit / base) * 100 : 0;

    setForm({
      ...updated,
      profit_amount: profit,
      profit_percent: percent,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        year_month: form.year_month,
        investment_id: form.investment_id ? form.investment_id : null,
        initial_balance: Number(form.initial_balance) || 0,
        deposits: Number(form.deposits) || 0,
        withdrawals: Number(form.withdrawals) || 0,
        final_balance: Number(form.final_balance) || 0,
        profit_amount: Number(form.profit_amount) || 0,
        profit_percent: Number(form.profit_percent) || 0,
        cdi_benchmark: Number(form.cdi_benchmark) || 0.9,
        ipca_benchmark: Number(form.ipca_benchmark) || 0.35,
        ibovespa_benchmark: Number(form.ibovespa_benchmark) || 1.5,
      };

      await save.mutateAsync({
        id: snapshot?.id,
        values: payload,
      });

      toast.success(
        snapshot
          ? "Fechamento de Renda Fixa atualizado com sucesso!"
          : "Fechamento mensal de Renda Fixa registrado com sucesso!",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar fechamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {snapshot ? "Editar Fechamento de Renda Fixa" : "Registrar Saldo & Aporte Mensal (RF)"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Informe o saldo no início e no final do mês, e os aportes realizados para calcular o rendimento exato.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Mês de Referência */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_year_month" className="text-xs font-semibold">
                Mês de Referência
              </Label>
              <Input
                id="rf_year_month"
                type="month"
                value={form.year_month}
                onChange={(e) => setForm((f) => ({ ...f, year_month: e.target.value }))}
                className="text-xs"
                required
              />
            </div>

            {/* Ativo ou Consolidado */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_inv_select" className="text-xs font-semibold">
                Ativo de Renda Fixa
              </Label>
              <select
                id="rf_inv_select"
                value={form.investment_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, investment_id: e.target.value || null }))}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Toda a Renda Fixa (Consolidada)</option>
                {fixedInvestments.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.institution})
                  </option>
                ))}
              </select>
            </div>

            {/* Saldo Inicial */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_initial_balance" className="text-xs font-semibold flex items-center justify-between">
                <span>Saldo Inicial do Mês (R$)</span>
                <span className="text-[10px] text-muted-foreground">Dia 1º</span>
              </Label>
              <Input
                id="rf_initial_balance"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.initial_balance || ""}
                onChange={(e) => handleValueChange("initial_balance", Number(e.target.value))}
                className="text-xs num font-semibold"
                required
              />
            </div>

            {/* Aportes no Mês */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_deposits" className="text-xs font-semibold flex items-center justify-between">
                <span>Aportes no Mês (R$)</span>
                <span className="text-[10px] text-primary font-medium">+ Depósitos</span>
              </Label>
              <Input
                id="rf_deposits"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.deposits || ""}
                onChange={(e) => handleValueChange("deposits", Number(e.target.value))}
                className="text-xs num font-semibold"
              />
            </div>

            {/* Resgates no Mês */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_withdrawals" className="text-xs font-semibold flex items-center justify-between">
                <span>Resgates no Mês (R$)</span>
                <span className="text-[10px] text-muted-foreground font-medium">- Retiradas</span>
              </Label>
              <Input
                id="rf_withdrawals"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.withdrawals || ""}
                onChange={(e) => handleValueChange("withdrawals", Number(e.target.value))}
                className="text-xs num"
              />
            </div>

            {/* Saldo Final */}
            <div className="space-y-1.5">
              <Label htmlFor="rf_final_balance" className="text-xs font-semibold flex items-center justify-between">
                <span>Saldo Final do Mês (R$)</span>
                <span className="text-[10px] text-muted-foreground">Último dia</span>
              </Label>
              <Input
                id="rf_final_balance"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.final_balance || ""}
                onChange={(e) => handleValueChange("final_balance", Number(e.target.value))}
                className="text-xs num font-bold text-primary"
                required
              />
            </div>
          </div>

          {/* Card de Cálculo em Tempo Real */}
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Resultado do Mês Calculado:
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Base: {formatCurrency(Number(form.initial_balance) + Number(form.deposits) - Number(form.withdrawals))}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
              <div>
                <p className="text-[11px] text-muted-foreground">Rendimento Líquido (R$)</p>
                <p
                  className={`num text-base font-bold ${
                    form.profit_amount >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(form.profit_amount)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Rentabilidade do Mês (%)</p>
                <p
                  className={`num text-base font-bold ${
                    form.profit_percent >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPercent(form.profit_percent)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Salvar Registro Mensal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
