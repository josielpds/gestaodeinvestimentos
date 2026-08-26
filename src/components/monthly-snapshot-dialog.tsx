import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { currentYearMonth, type Snapshot } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot?: Snapshot | null;
  defaultCurrentBalance?: number;
}

export function MonthlySnapshotDialog({
  open,
  onOpenChange,
  snapshot,
  defaultCurrentBalance,
}: Props) {
  const [form, setForm] = useState({
    year_month: currentYearMonth(),
    initial_balance: 0,
    deposits: 0,
    withdrawals: 0,
    earnings: 0,
    final_balance: defaultCurrentBalance ?? 0,
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
      setForm((f) => ({
        ...f,
        year_month: currentYearMonth(),
        final_balance: defaultCurrentBalance ?? f.final_balance,
      }));
    }
  }, [open, snapshot, defaultCurrentBalance]);

  // Recalcula lucro e rentabilidade quando saldos e fluxos mudam
  function handleBalanceChange(field: string, val: number) {
    const updated = { ...form, [field]: val };
    const base = updated.initial_balance + updated.deposits - updated.withdrawals;
    const profit = updated.final_balance - base;
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
      await save.mutateAsync({
        id: snapshot?.id,
        values: form,
      });
      toast.success(snapshot ? "Fechamento atualizado." : "Fechamento mensal registrado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar fechamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{snapshot ? "Editar Fechamento" : "Novo Fechamento Mensal"}</DialogTitle>
          <DialogDescription>
            Registre o resultado consolidado do mês para acompanhar o histórico da carteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="year_month">Mês de Referência (AAAA-MM)</Label>
              <Input
                id="year_month"
                type="month"
                value={form.year_month}
                onChange={(e) => setForm((f) => ({ ...f, year_month: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="initial_balance">Saldo Inicial (R$)</Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                value={form.initial_balance}
                onChange={(e) => handleBalanceChange("initial_balance", Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="final_balance">Saldo Final (R$)</Label>
              <Input
                id="final_balance"
                type="number"
                step="0.01"
                value={form.final_balance}
                onChange={(e) => handleBalanceChange("final_balance", Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposits">Aportes no Mês (R$)</Label>
              <Input
                id="deposits"
                type="number"
                step="0.01"
                value={form.deposits}
                onChange={(e) => handleBalanceChange("deposits", Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="withdrawals">Resgates no Mês (R$)</Label>
              <Input
                id="withdrawals"
                type="number"
                step="0.01"
                value={form.withdrawals}
                onChange={(e) => handleBalanceChange("withdrawals", Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profit_amount">Lucro / Variação (R$)</Label>
              <Input
                id="profit_amount"
                type="number"
                step="0.01"
                value={form.profit_amount}
                onChange={(e) => setForm((f) => ({ ...f, profit_amount: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profit_percent">Rentabilidade do Mês (%)</Label>
              <Input
                id="profit_percent"
                type="number"
                step="0.01"
                value={form.profit_percent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, profit_percent: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Benchmarks do Mês (%)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cdi_b" className="text-xs">CDI (%)</Label>
                <Input
                  id="cdi_b"
                  type="number"
                  step="0.01"
                  value={form.cdi_benchmark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cdi_benchmark: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ipca_b" className="text-xs">IPCA (%)</Label>
                <Input
                  id="ipca_b"
                  type="number"
                  step="0.01"
                  value={form.ipca_benchmark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ipca_benchmark: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ibov_b" className="text-xs">Ibovespa (%)</Label>
                <Input
                  id="ibov_b"
                  type="number"
                  step="0.01"
                  value={form.ibovespa_benchmark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ibovespa_benchmark: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Fechamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
