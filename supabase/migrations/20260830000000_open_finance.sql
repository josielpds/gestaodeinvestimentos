-- =============================================================================
-- MIGRATION: OPEN FINANCE (PLUGGY) & COLUNAS DE SINCRONIZAÇÃO AUTOMÁTICA
-- Este script é 100% idempotente (pode ser executado com segurança no SQL Editor)
-- =============================================================================

-- 1. Criação da tabela de conexões Open Finance
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

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.open_finance_connections TO authenticated;
GRANT ALL ON public.open_finance_connections TO service_role;
ALTER TABLE public.open_finance_connections ENABLE ROW LEVEL SECURITY;

-- Política de RLS (Row Level Security)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'open_finance_connections' 
    AND policyname = 'open_finance_connections_own'
  ) THEN
    CREATE POLICY "open_finance_connections_own" 
      ON public.open_finance_connections 
      FOR ALL TO authenticated 
      USING (auth.uid() = user_id) 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger para updated_at automático
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_open_finance_connections_updated_at'
  ) THEN
    CREATE TRIGGER update_open_finance_connections_updated_at 
      BEFORE UPDATE ON public.open_finance_connections 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Índices de performance
CREATE INDEX IF NOT EXISTS open_finance_connections_user_idx ON public.open_finance_connections (user_id);

-- 2. Alteração da tabela de investimentos para vincular contas Open Finance
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.open_finance_connections (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS investments_external_id_idx ON public.investments (user_id, external_id);
