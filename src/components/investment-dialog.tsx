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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveRow } from "@/lib/data";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  INDEXER_LABELS,
  LIQUIDITY_OPTIONS,
  SUBTYPE_LABELS,
  todayISO,
  type Investment,
} from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
}

const empty = {
  name: "",
  ticker: "",
  category: "renda_fixa",
  sub_type: "cdb",
  institution: "",
  indexer: "cdi",
  contract_rate: "",
  start_date: todayISO(),
  due_date: "",
  liquidity: "Diária",
  initial_amount: 0,
  current_balance: 0,
  quantity: 1,
  average_price: 0,
  current_price: 0,
  tax_exempt: false,
  status: "ativo",
  notes: "",
};

export function InvestmentDialog({ open, onOpenChange, investment }: Props) {
  const [form, setForm] = useState({ ...empty });
  const save = useSaveRow("investments");

  useEffect(() => {
    if (!open) return;
    if (investment) {
      setForm({
        name: investment.name,
        ticker: investment.ticker ?? "",
        category: investment.category,
        sub_type: investment.sub_type,
        institution: investment.institution,
        indexer: investment.indexer,
        contract_rate: investment.contract_rate ?? "",
        start_date: investment.start_date.slice(0, 10),
        due_date: investment.due_date?.slice(0, 10) ?? "",
        liquidity: investment.liquidity,
        initial_amount: investment.initial_amount,
        current_balance: investment.current_balance,
        quantity: investment.quantity,
        average_price: investment.average_price,
        current_price: investment.current_price,
        tax_exempt: investment.tax_exempt,
        status: investment.status,
        notes: investment.notes ?? "",
      });
    } else {
      setForm({ ...empty });
    }
  }, [open, investment]);

  const isVariable = form.category !== "renda_fixa";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: investment?.id,
        values: {
          ...form,
          ticker: form.ticker || null,
          contract_rate: form.contract_rate || null,
          due_date: form.due_date || null,
          notes: form.notes || null,
          current_balance: form.current_balance || form.initial_amount,
        },
      });
      toast.success(investment ? "Investimento atualizado." : "Investimento cadastrado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{investment ? "Editar ativo" : "Novo investimento"}</DialogTitle>
          <DialogDescription>
            Cadastre os dados do ativo. O saldo atual é usado para calcular rentabilidade e IR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do ativo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="CDB Banco XP 110% CDI"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Ticker (opcional)</Label>
              <Input
                id="ticker"
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                placeholder="PETR4 / HGLG11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.sub_type} onValueChange={(v) => set("sub_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBTYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="institution">Instituição</Label>
              <Input
                id="institution"
                value={form.institution}
                onChange={(e) => set("institution", e.target.value)}
                placeholder="XP, BTG, Nubank, Avenue..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Indexador</Label>
              <Select value={form.indexer} onValueChange={(v) => set("indexer", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INDEXER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract_rate">Taxa contratada</Label>
              <Input
                id="contract_rate"
                value={form.contract_rate}
                onChange={(e) => set("contract_rate", e.target.value)}
                placeholder="110% CDI / IPCA + 6,5%"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Liquidez</Label>
              <Select value={form.liquidity} onValueChange={(v) => set("liquidity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIQUIDITY_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_date">Data de aplicação</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Vencimento (opcional)</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="initial_amount">Valor aplicado (R$)</Label>
              <Input
                id="initial_amount"
                type="number"
                step="0.01"
                value={form.initial_amount}
                onChange={(e) => set("initial_amount", Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current_balance">Saldo atual (R$)</Label>
              <Input
                id="current_balance"
                type="number"
                step="0.01"
                value={form.current_balance}
                onChange={(e) => set("current_balance", Number(e.target.value))}
              />
            </div>

            {isVariable && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.00000001"
                    value={form.quantity}
                    onChange={(e) => set("quantity", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="average_price">Preço médio (R$)</Label>
                  <Input
                    id="average_price"
                    type="number"
                    step="0.01"
                    value={form.average_price}
                    onChange={(e) => set("average_price", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current_price">Preço atual (R$)</Label>
                  <Input
                    id="current_price"
                    type="number"
                    step="0.01"
                    value={form.current_price}
                    onChange={(e) => set("current_price", Number(e.target.value))}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="resgatado">Resgatado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-medium">Isento de Imposto de Renda</p>
              <p className="text-xs text-muted-foreground">
                LCI, LCA, CRI, CRA, poupança e dividendos de ações.
              </p>
            </div>
            <Switch checked={form.tax_exempt} onCheckedChange={(v) => set("tax_exempt", v)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
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
