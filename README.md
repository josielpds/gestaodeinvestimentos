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

## 🔒 Boas Práticas de Segurança

- Todas as tabelas do PostgreSQL utilizam **Row Level Security (RLS)**, garantindo que cada usuário só acesse suas próprias informações (`auth.uid() = user_id`).
- Segredos de backend (como `PLUGGY_CLIENT_SECRET`) são processados estritamente em Server Functions do TanStack Start.
- O `.gitignore` protege todos os arquivos de configuração local e chaves secretas.
