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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveRow } from "@/lib/data";
import {
  TRANSACTION_LABELS,
  todayISO,
  type Investment,
  type Transaction,
} from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investments: Investment[];
  transaction?: Transaction | null;
  defaultInvestmentId?: string | null;
}

export function TransactionDialog({
  open,
  onOpenChange,
  investments,
  transaction,
  defaultInvestmentId,
}: Props) {
  const [form, setForm] = useState({
    investment_id: "",
    type: "aporte",
    date: todayISO(),
    amount: 0,
    quantity: 0,
    unit_price: 0,
    notes: "",
  });
  const save = useSaveRow("transactions");

  useEffect(() => {
    if (!open) return;
    setForm({
      investment_id: transaction?.investment_id ?? defaultInvestmentId ?? investments[0]?.id ?? "",
      type: transaction?.type ?? "aporte",
      date: transaction?.date.slice(0, 10) ?? todayISO(),
      amount: transaction?.amount ?? 0,
      quantity: transaction?.quantity ?? 0,
      unit_price: transaction?.unit_price ?? 0,
      notes: transaction?.notes ?? "",
    });
  }, [open, transaction, defaultInvestmentId, investments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.investment_id) {
      toast.error("Cadastre um investimento antes de lançar movimentações.");
      return;
    }
    try {
      await save.mutateAsync({
        id: transaction?.id,
        values: { ...form, notes: form.notes || null },
      });
      toast.success("Movimentação registrada.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
          <DialogDescription>
            Aportes, resgates, proventos e rendimentos creditados no ativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ativo</Label>
            <Select
              value={form.investment_id}
              onValueChange={(v) => setForm((f) => ({ ...f, investment_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ativo" />
              </SelectTrigger>
              <SelectContent>
                {investments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.ticker ? `${i.ticker} — ` : ""}
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tdate">Data</Label>
              <Input
                id="tdate"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tamount">Valor (R$)</Label>
              <Input
                id="tamount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tqty">Quantidade</Label>
              <Input
                id="tqty"
                type="number"
                step="0.00000001"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tprice">Preço unitário (R$)</Label>
              <Input
                id="tprice"
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tnotes">Observações</Label>
            <Textarea
              id="tnotes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
