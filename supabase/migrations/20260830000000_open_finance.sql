-- OPEN FINANCE CONNECTIONS
CREATE TABLE IF NOT EXISTS public.open_finance_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  connector_id INTEGER,
  institution_name TEXT NOT NULL,
  institution_logo TEXT,
  status TEXT NOT NULL DEFAULT 'UPDATED',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.open_finance_connections TO authenticated;
GRANT ALL ON public.open_finance_connections TO service_role;
ALTER TABLE public.open_finance_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_finance_connections_own" ON public.open_finance_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_open_finance_connections_updated_at BEFORE UPDATE ON public.open_finance_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS open_finance_connections_user_idx ON public.open_finance_connections (user_id);

-- Alter investments table to support open finance linking
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.open_finance_connections (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS investments_external_id_idx ON public.investments (user_id, external_id);
