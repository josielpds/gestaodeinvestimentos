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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveRow } from "@/lib/data";
import { DIVIDEND_LABELS, todayISO, type Dividend, type Investment } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investments: Investment[];
  dividend?: Dividend | null;
}

export function DividendDialog({ open, onOpenChange, investments, dividend }: Props) {
  const [form, setForm] = useState({
    investment_id: "",
    type: "dividendo",
    payment_date: todayISO(),
    amount: 0,
    amount_per_share: 0,
    status: "recebido",
  });
  const save = useSaveRow("dividends");

  useEffect(() => {
    if (!open) return;
    setForm({
      investment_id: dividend?.investment_id ?? investments[0]?.id ?? "",
      type: dividend?.type ?? "dividendo",
      payment_date: dividend?.payment_date.slice(0, 10) ?? todayISO(),
      amount: dividend?.amount ?? 0,
      amount_per_share: dividend?.amount_per_share ?? 0,
      status: dividend?.status ?? "recebido",
    });
  }, [open, dividend, investments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.investment_id) {
      toast.error("Cadastre um ativo antes de lançar proventos.");
      return;
    }
    try {
      await save.mutateAsync({ id: dividend?.id, values: form });
      toast.success("Provento registrado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dividend ? "Editar provento" : "Novo provento"}</DialogTitle>
          <DialogDescription>
            Dividendos, JCP, rendimentos de FII e juros semestrais.
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
                  {Object.entries(DIVIDEND_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdate">Data de pagamento</Label>
              <Input
                id="pdate"
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pamount">Valor total (R$)</Label>
              <Input
                id="pamount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pshare">Valor por cota / ação (R$)</Label>
              <Input
                id="pshare"
                type="number"
                step="0.0001"
                value={form.amount_per_share}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount_per_share: Number(e.target.value) }))
                }
              />
            </div>
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
