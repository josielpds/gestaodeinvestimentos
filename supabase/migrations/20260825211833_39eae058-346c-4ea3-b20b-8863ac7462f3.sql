-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INVESTMENTS
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticker TEXT,
  category TEXT NOT NULL DEFAULT 'renda_fixa',
  sub_type TEXT NOT NULL DEFAULT 'cdb',
  institution TEXT NOT NULL DEFAULT '',
  indexer TEXT NOT NULL DEFAULT 'cdi',
  contract_rate TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  liquidity TEXT NOT NULL DEFAULT 'Diária',
  initial_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  average_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_exempt BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments_own" ON public.investments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX investments_user_idx ON public.investments (user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments (id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'aporte',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX transactions_user_idx ON public.transactions (user_id);

-- DIVIDENDS
CREATE TABLE public.dividends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments (id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'dividendo',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  amount_per_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'recebido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dividends TO authenticated;
GRANT ALL ON public.dividends TO service_role;
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dividends_own" ON public.dividends FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_dividends_updated_at BEFORE UPDATE ON public.dividends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX dividends_user_idx ON public.dividends (user_id);

-- MONTHLY SNAPSHOTS
CREATE TABLE public.monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investment_id UUID REFERENCES public.investments (id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  initial_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposits DOUBLE PRECISION NOT NULL DEFAULT 0,
  withdrawals DOUBLE PRECISION NOT NULL DEFAULT 0,
  earnings DOUBLE PRECISION NOT NULL DEFAULT 0,
  final_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  cdi_benchmark DOUBLE PRECISION NOT NULL DEFAULT 0,
  ipca_benchmark DOUBLE PRECISION NOT NULL DEFAULT 0,
  ibovespa_benchmark DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_snapshots TO authenticated;
GRANT ALL ON public.monthly_snapshots TO service_role;
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_own" ON public.monthly_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_snapshots_updated_at BEFORE UPDATE ON public.monthly_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX snapshots_user_idx ON public.monthly_snapshots (user_id);

-- PORTFOLIO TARGETS
CREATE TABLE public.portfolio_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  target_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_targets TO authenticated;
GRANT ALL ON public.portfolio_targets TO service_role;
ALTER TABLE public.portfolio_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "targets_own" ON public.portfolio_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_targets_updated_at BEFORE UPDATE ON public.portfolio_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FINANCIAL GOALS
CREATE TABLE public.financial_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  target_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;
GRANT ALL ON public.financial_goals TO service_role;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_own" ON public.financial_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.financial_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();