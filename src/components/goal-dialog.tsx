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
import { todayISO, type Goal } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

const GOAL_CATEGORIES = [
  "Patrimônio Geral",
  "Reserva de Emergência",
  "Aposentadoria / Liberdade",
  "Imóvel / Casa Própria",
  "Viagem / Experiência",
  "Veículo",
  "Outros",
];

export function GoalDialog({ open, onOpenChange, goal }: Props) {
  const [form, setForm] = useState({
    title: "",
    target_amount: 0,
    target_date: todayISO(),
    category: "Patrimônio Geral",
    notes: "",
  });

  const save = useSaveRow("financial_goals");

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setForm({
        title: goal.title,
        target_amount: goal.target_amount,
        target_date: goal.target_date.slice(0, 10),
        category: goal.category ?? "Patrimônio Geral",
        notes: goal.notes ?? "",
      });
    } else {
      setForm({
        title: "",
        target_amount: 100000,
        target_date: todayISO(),
        category: "Patrimônio Geral",
        notes: "",
      });
    }
  }, [open, goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: goal?.id,
        values: {
          ...form,
          notes: form.notes || null,
        },
      });
      toast.success(goal ? "Meta atualizada." : "Meta financeira cadastrada.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar meta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar Meta Financeira" : "Nova Meta Financeira"}</DialogTitle>
          <DialogDescription>
            Defina objetivos de patrimônio e prazos para acompanhar seu avanço.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gtitle">Título da Meta</Label>
            <Input
              id="gtitle"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: R$ 500 mil até 2030, Reserva de 6 meses..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gamount">Valor Alvo (R$)</Label>
              <Input
                id="gamount"
                type="number"
                step="0.01"
                value={form.target_amount}
                onChange={(e) => setForm((f) => ({ ...f, target_amount: Number(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gdate">Data Alvo</Label>
              <Input
                id="gdate"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria da Meta</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gnotes">Observações</Label>
            <Textarea
              id="gnotes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Estratégia, aportes mensais estimados..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
