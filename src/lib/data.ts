import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Dividend, Goal, Investment, OpenFinanceConnection, Snapshot, Target, Transaction } from "./finance";
import { getOpenFinanceConnections } from "./open-finance/pluggy";

export type TableName =
  | "investments"
  | "transactions"
  | "dividends"
  | "monthly_snapshots"
  | "portfolio_targets"
  | "financial_goals"
  | "open_finance_connections";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function selectAll<T>(table: TableName, order: string, ascending = false): Promise<T[]> {
  const { data, error } = await (supabase.from(table) as any)
    .select("*")
    .order(order, { ascending });
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useInvestments() {
  return useQuery({
    queryKey: ["investments"],
    queryFn: () => selectAll<Investment>("investments", "created_at"),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => selectAll<Transaction>("transactions", "date"),
  });
}

export function useDividends() {
  return useQuery({
    queryKey: ["dividends"],
    queryFn: () => selectAll<Dividend>("dividends", "payment_date"),
  });
}

export function useSnapshots() {
  return useQuery({
    queryKey: ["monthly_snapshots"],
    queryFn: () => selectAll<Snapshot>("monthly_snapshots", "year_month", true),
  });
}

export function useTargets() {
  return useQuery({
    queryKey: ["portfolio_targets"],
    queryFn: () => selectAll<Target>("portfolio_targets", "category", true),
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["financial_goals"],
    queryFn: () => selectAll<Goal>("financial_goals", "target_date", true),
  });
}

export function useOpenFinanceConnections() {
  return useQuery({
    queryKey: ["open_finance_connections"],
    queryFn: () => getOpenFinanceConnections(),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [
    "investments",
    "transactions",
    "dividends",
    "monthly_snapshots",
    "portfolio_targets",
    "financial_goals",
    "open_finance_connections",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

/** Insere ou atualiza uma linha; user_id é sempre o usuário autenticado. */
export function useSaveRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | null | undefined; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await (supabase.from(table) as any).update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada. Entre novamente.");
      const { error } = await (supabase.from(table) as any).insert({
        ...values,
        user_id: auth.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSaveTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { category: string; target_percent: number }[]) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada. Entre novamente.");
      const { error } = await supabase
        .from("portfolio_targets")
        .upsert(
          rows.map((r) => ({ ...r, user_id: auth.user!.id })),
          { onConflict: "user_id,category" },
        );
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
