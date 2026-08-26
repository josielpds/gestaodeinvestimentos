import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  DollarSign,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useInvestments, useTransactions } from "@/lib/data";
import { formatCurrency, formatPercent, summarize } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/fechamento", label: "Fechamento Mensal", icon: Calendar },
  { to: "/investimentos", label: "Carteira & Ativos", icon: Landmark },
  { to: "/transacoes", label: "Movimentações", icon: Receipt },
  { to: "/proventos", label: "Proventos & Renda", icon: DollarSign },
  { to: "/rebalanceamento", label: "Rebalanceamento & Metas", icon: PieChart },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
] as const;

function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const summary = summarize(investments, transactions);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-glow">
                F
              </div>
              <div>
                <p className="font-display text-base font-bold leading-tight">Finantria Invest</p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Renda fixa & variável
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-5 rounded-xl border border-border bg-surface px-4 py-1.5 lg:flex">
              <div>
                <p className="text-xs text-muted-foreground">Patrimônio bruto</p>
                <p className="num text-base font-bold text-primary">
                  {formatCurrency(summary.totalGross)}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Lucro bruto</p>
                <p
                  className={`num text-sm font-semibold ${summary.grossProfit >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {formatCurrency(summary.grossProfit)}{" "}
                  <span className="text-xs">({formatPercent(summary.grossProfitPercent)})</span>
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        <div className="border-t border-border bg-background/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-surface-strong data-[status=active]:text-primary"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
