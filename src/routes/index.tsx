import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Landmark,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finantria Invest — Gestão de Carteira de Investimentos" },
      {
        name: "description",
        content:
          "Plataforma para acompanhar renda fixa e variável: patrimônio consolidado, aportes, proventos, IR estimado, fechamento mensal e rebalanceamento.",
      },
      { property: "og:title", content: "Finantria Invest — Gestão de Carteira" },
      {
        property: "og:description",
        content:
          "Consolide CDB, Tesouro, LCI, ações, FIIs e cripto em um só painel, com IR estimado e rebalanceamento.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Landmark,
    title: "Carteira consolidada",
    text: "CDB, Tesouro, LCI/LCA, debêntures, ações, FIIs, ETFs, BDRs e cripto num só lugar.",
  },
  {
    icon: ShieldCheck,
    title: "IR estimado automático",
    text: "Tabela regressiva aplicada por ativo, com saldo líquido e isenções.",
  },
  {
    icon: Calendar,
    title: "Fechamento mensal",
    text: "Registre saldo, aportes, resgates e compare com CDI, IPCA e Ibovespa.",
  },
  {
    icon: PieChart,
    title: "Rebalanceamento",
    text: "Defina alvos por classe e veja exatamente quanto aportar ou realocar.",
  },
  {
    icon: TrendingUp,
    title: "Proventos e renda passiva",
    text: "Dividendos, JCP, rendimentos de FII e juros semestrais organizados por mês.",
  },
  {
    icon: BarChart3,
    title: "Relatórios de gestão",
    text: "Evolução patrimonial, alocação por instituição e vencimentos próximos.",
  },
];

function Landing() {
  const { user, loading } = useSession();

  return (
    <div className="min-h-screen aurora">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-glow">
            F
          </div>
          <div>
            <p className="font-display text-lg font-bold">Finantria Invest</p>
            <p className="text-xs text-muted-foreground">Renda fixa & variável</p>
          </div>
        </div>
        {loading ? null : user ? (
          <Button asChild>
            <Link to="/dashboard">
              Abrir painel <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Criar conta
              </Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="pt-10 pb-16 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> Painel de controle patrimonial
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Toda a sua carteira de investimentos sob{" "}
            <span className="text-primary">controle real</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Acompanhe patrimônio, rentabilidade líquida de IR, proventos e alocação por classe e
            instituição. Feito para o investidor brasileiro que fecha o mês com números, não com
            palpite.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Começar agora <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="panel p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
