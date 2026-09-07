# 📈 Finantria - Sistema de Gestão de Investimentos & Patrimônio

Um sistema moderno, completo e intuitivo para gerenciamento de investimentos financeiros pessoais, controle de patrimônio líquido, proventos/dividendos, rebalanceamento automático de carteira e integração bancária Open Finance via Pluggy.

---

## 🚀 Funcionalidades Principais

- **📊 Dashboard Interativo**: Visão consolidada de patrimônio, rentabilidade total, metas de patrimônio, evolução mensal e divisão por classes de ativos (Renda Fixa, Ações, FIIs, Fundos, Criptos, etc.).
- **💼 Gestão de Investimentos**: Cadastro e acompanhamento detalhado de ativos com cálculo automático de preço médio, rentabilidade percentual e absoluta, indexadores (CDI, IPCA, Pré) e prazos de vencimento.
- **🔄 Transações & Histórico**: Registro de Aportes, Resgates, Vendas e Compras com atualização automática do saldo da carteira.
- **💰 Controle de Proventos**: Registro e projeção de dividendos e JCP por mês, ticker e tipo de provento.
- **📅 Fechamento Mensal (Snapshots)**: Histórico mês a mês com rendimentos consolidados e taxa média alcançada.
- **🎯 Rebalanceamento de Carteira**: Defina percentuais ideais para cada categoria e receba recomendações automáticas de quanto aportar em cada ativo.
- **📑 Relatórios & Extratos**: Exportação de dados e extratos detalhados para declaração de IRPF e auditoria pessoal.
- **🌐 Open Finance (Pluggy API)**: Sincronização automatizada de contas e investimentos bancários.
- **🔐 Segurança Total**: Autenticação nativa com Supabase Auth e Row Level Security (RLS) garantindo isolamento estrito dos dados por usuário.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [TanStack Start](https://tanstack.com/start) / React 19 / TypeScript
- **Roteamento**: [TanStack Router](https://tanstack.com/router)
- **Estilização**: Tailwind CSS + Radix UI + Lucide Icons + Sonner (Toasts)
- **Gráficos**: Recharts
- **Banco de Dados & Auth**: [Supabase](https://supabase.com) (PostgreSQL + RLS)
- **Open Finance**: [Pluggy API](https://pluggy.ai)
- **Bundler & Server**: Vite + Nitro

---

## ⚙️ Configuração do Ambiente Local

### 1. Clonar o Repositório
```bash
git clone https://github.com/josielpds/gestaodeinvestimentos.git
cd gestaodeinvestimentos
```

### 2. Instalar as Dependências
```bash
npm install
# ou
bun install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Abra o arquivo `.env` e preencha com as chaves do seu projeto Supabase:
```env
VITE_SUPABASE_URL="https://seu-projeto-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_chave_anon_publica_aqui"
VITE_SUPABASE_PROJECT_ID="seu-projeto-id"

# Variáveis para SSR / Server Functions
SUPABASE_URL="https://seu-projeto-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sua_chave_anon_publica_aqui"

# Open Finance - Pluggy API (Opcional)
PLUGGY_CLIENT_ID=""
PLUGGY_CLIENT_SECRET=""
```

> ⚠️ **IMPORTANTE SOBRE SEGURANÇA:**
> O arquivo `.env` está no `.gitignore` e **nunca deve ser enviado ao GitHub**. As chaves de serviço (`service_role`) do Supabase ou segredos de API nunca devem ser adicionados a variáveis iniciadas com `VITE_` no código frontend.

---

## 🗄️ Sincronização com o Supabase (Banco de Dados)

As migrações SQL completas estão na pasta `supabase/migrations/`:
1. `20260825211833_39eae058-346c-4ea3-b20b-8863ac7462f3.sql` (Estrutura base, tabelas de perfil, investimentos, transações, proventos, metas e RLS)
2. `20260830000000_open_finance.sql` (Tabelas e políticas para conexões Open Finance)

### Como aplicar no Supabase:
- **Opção 1 (Via Dashboard Supabase)**:
  1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
  2. Selecione seu projeto e vá em **SQL Editor**.
  3. Execute o conteúdo dos arquivos da pasta `supabase/migrations/`.
- **Opção 2 (Via Supabase CLI)**:
  ```bash
  supabase link --project-ref <SEU_PROJECT_ID>
  supabase db push
  ```

---

## 💻 Executando o Projeto

### Modo de Desenvolvimento:
```bash
npm run dev
```
O app estará acessível em `http://localhost:3000` (ou na porta informada pelo Vite).

### Gerar Build de Produção:
```bash
npm run build
```

### Visualizar Build Localmente:
```bash
npm run preview
```

---

## 🌐 Publicação Online (Deploy)

O projeto é compatível com os principais provedores de hospedagem:

### Cloudflare Pages / Workers
1. Conecte o repositório GitHub no painel do Cloudflare.
2. Defina o comando de build: `npm run build`.
3. Configure as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.) no painel do Cloudflare.

### Vercel / Netlify
1. Importe o repositório na plataforma.
2. Framework Preset: **Vite** ou **TanStack Start**.
3. Adicione as variáveis de ambiente listadas em `.env.example`.
4. Clique em **Deploy**.

---

## 🔒 Boas Práticas de Segurança

- Todas as tabelas do PostgreSQL utilizam **Row Level Security (RLS)**, garantindo que cada usuário só acesse suas próprias informações (`auth.uid() = user_id`).
- Segredos de backend (como `PLUGGY_CLIENT_SECRET`) são processados estritamente em Server Functions do TanStack Start.
- O `.gitignore` protege todos os arquivos de configuração local e chaves secretas.
