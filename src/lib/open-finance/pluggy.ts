import { supabase } from "@/integrations/supabase/client";
import type { OpenFinanceConnection } from "../finance";

export interface PluggyConnector {
  id: number;
  name: string;
  primaryColor: string;
  institutionUrl?: string;
  imageUrl?: string;
  type: "INVESTMENT" | "BUSINESS" | "PERSONAL";
  hasInvestments: boolean;
}

export const POPULAR_CONNECTORS: PluggyConnector[] = [
  {
    id: 2,
    name: "XP Investimentos",
    primaryColor: "#000000",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/2.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 8,
    name: "BTG Pactual",
    primaryColor: "#0b2046",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/8.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 201,
    name: "Nubank (NuInvest)",
    primaryColor: "#820ad1",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/201.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 4,
    name: "Banco Inter",
    primaryColor: "#ff7a00",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/4.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 1,
    name: "Itaú Corretora",
    primaryColor: "#ec7000",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/1.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 7,
    name: "Rico Investimentos",
    primaryColor: "#ff4d00",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/7.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 11,
    name: "Ágora Investimentos (Bradesco)",
    primaryColor: "#008859",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/11.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
  {
    id: 15,
    name: "Binance Cripto",
    primaryColor: "#F3BA2F",
    imageUrl: "https://cdn.pluggy.ai/assets/connector-icons/15.png",
    type: "INVESTMENT",
    hasInvestments: true,
  },
];

export interface NormalizedInvestmentPayload {
  external_id: string;
  name: string;
  ticker?: string | null;
  category: "renda_fixa" | "renda_variavel" | "internacional" | "cripto";
  sub_type: string;
  institution: string;
  indexer: string;
  contract_rate?: string | null;
  start_date: string;
  due_date?: string | null;
  liquidity: string;
  initial_amount: number;
  current_balance: number;
  quantity: number;
  average_price: number;
  current_price: number;
  tax_exempt: boolean;
  status: "ativo" | "resgatado";
  notes?: string | null;
  is_automated: boolean;
}

// STORAGE LOCAL FALLBACK HELPERS
const STORAGE_KEY = "finantria_open_finance_connections";

function getLocalConnections(userId: string): OpenFinanceConnection[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalConnections(userId: string, conns: OpenFinanceConnection[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(conns));
  } catch (err) {
    console.error("Erro ao salvar conexões locais:", err);
  }
}

/**
 * Busca conexões com fallback local caso a tabela ainda não exista no Supabase
 */
export async function getOpenFinanceConnections(): Promise<OpenFinanceConnection[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const userId = auth.user.id;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("open_finance_connections") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as OpenFinanceConnection[];
    }
  } catch (err) {
    console.warn("Tabela open_finance_connections não encontrada no Supabase, usando armazenamento local:", err);
  }

  return getLocalConnections(userId);
}

/**
 * Gera ativos simulados realistas para o Sandbox do Open Finance de acordo com a instituição
 */
export function generateSandboxInvestments(institutionName: string): NormalizedInvestmentPayload[] {
  const today = new Date().toISOString().slice(0, 10);

  switch (institutionName) {
    case "XP Investimentos":
      return [
        {
          external_id: "xp_cdb_banco_master_120",
          name: "CDB Banco Master 120% CDI",
          ticker: "CDB-MASTER-120",
          category: "renda_fixa",
          sub_type: "cdb",
          institution: "XP Investimentos",
          indexer: "cdi",
          contract_rate: "120% CDI",
          start_date: "2024-01-15",
          due_date: "2027-01-15",
          liquidity: "No Vencimento",
          initial_amount: 15000,
          current_balance: 17450.8,
          quantity: 1,
          average_price: 15000,
          current_price: 17450.8,
          tax_exempt: false,
          status: "ativo",
          notes: "Sincronizado via Open Finance (XP Investimentos)",
          is_automated: true,
        },
        {
          external_id: "xp_petr4",
          name: "Petróleo Brasileiro S.A. - Petrobras PN",
          ticker: "PETR4",
          category: "renda_variavel",
          sub_type: "acao",
          institution: "XP Investimentos",
          indexer: "variavel",
          contract_rate: null,
          start_date: "2023-08-10",
          due_date: null,
          liquidity: "D+2",
          initial_amount: 10500,
          current_balance: 12840,
          quantity: 300,
          average_price: 35.0,
          current_price: 42.8,
          tax_exempt: false,
          status: "ativo",
          notes: "Posição custodiada na XP",
          is_automated: true,
        },
        {
          external_id: "xp_hglg11",
          name: "CSHG Logística FII",
          ticker: "HGLG11",
          category: "renda_variavel",
          sub_type: "fii",
          institution: "XP Investimentos",
          indexer: "variavel",
          contract_rate: null,
          start_date: "2023-05-20",
          due_date: null,
          liquidity: "D+2",
          initial_amount: 16200,
          current_balance: 17150,
          quantity: 100,
          average_price: 162.0,
          current_price: 171.5,
          tax_exempt: true,
          status: "ativo",
          notes: "Fundo imobiliário logístico",
          is_automated: true,
        },
      ];

    case "BTG Pactual":
      return [
        {
          external_id: "btg_lci_ipca_62",
          name: "LCI BTG Pactual IPCA+ 6.2%",
          ticker: "LCI-BTG-IPCA",
          category: "renda_fixa",
          sub_type: "lci_lca",
          institution: "BTG Pactual",
          indexer: "ipca",
          contract_rate: "IPCA + 6.20% a.a.",
          start_date: "2024-03-01",
          due_date: "2026-03-01",
          liquidity: "No Vencimento",
          initial_amount: 20000,
          current_balance: 22180.45,
          quantity: 1,
          average_price: 20000,
          current_price: 22180.45,
          tax_exempt: true,
          status: "ativo",
          notes: "Isento de IR - BTG Pactual",
          is_automated: true,
        },
        {
          external_id: "btg_wege3",
          name: "WEG S.A. ON",
          ticker: "WEGE3",
          category: "renda_variavel",
          sub_type: "acao",
          institution: "BTG Pactual",
          indexer: "variavel",
          contract_rate: null,
          start_date: "2023-11-15",
          due_date: null,
          liquidity: "D+2",
          initial_amount: 8000,
          current_balance: 10600,
          quantity: 200,
          average_price: 40.0,
          current_price: 53.0,
          tax_exempt: false,
          status: "ativo",
          notes: "Custódia BTG Pactual",
          is_automated: true,
        },
      ];

    case "Nubank (NuInvest)":
      return [
        {
          external_id: "nu_reserva_cdi",
          name: "Reserva de Emergência RDB 100% CDI",
          ticker: "RDB-NUBANK",
          category: "renda_fixa",
          sub_type: "cdb",
          institution: "Nubank (NuInvest)",
          indexer: "cdi",
          contract_rate: "100% CDI",
          start_date: "2024-02-01",
          due_date: "2026-02-01",
          liquidity: "Diária",
          initial_amount: 10000,
          current_balance: 10940.12,
          quantity: 1,
          average_price: 10000,
          current_price: 10940.12,
          tax_exempt: false,
          status: "ativo",
          notes: "Liquidez imediata Nubank",
          is_automated: true,
        },
        {
          external_id: "nu_mxrf11",
          name: "Maxi Renda FII",
          ticker: "MXRF11",
          category: "renda_variavel",
          sub_type: "fii",
          institution: "Nubank (NuInvest)",
          indexer: "variavel",
          contract_rate: null,
          start_date: "2023-09-01",
          due_date: null,
          liquidity: "D+2",
          initial_amount: 5150,
          current_balance: 5080,
          quantity: 500,
          average_price: 10.3,
          current_price: 10.16,
          tax_exempt: true,
          status: "ativo",
          notes: "NuInvest Open Finance",
          is_automated: true,
        },
      ];

    case "Binance Cripto":
      return [
        {
          external_id: "binance_btc",
          name: "Bitcoin",
          ticker: "BTC",
          category: "cripto",
          sub_type: "crypto",
          institution: "Binance Cripto",
          indexer: "variavel",
          contract_rate: null,
          start_date: "2023-01-10",
          due_date: null,
          liquidity: "Diária",
          initial_amount: 18000,
          current_balance: 34500,
          quantity: 0.065,
          average_price: 276923,
          current_price: 530769,
          tax_exempt: false,
          status: "ativo",
          notes: "Carteira Spot Binance",
          is_automated: true,
        },
      ];

    default:
      return [
        {
          external_id: `of_${Date.now()}_cdb`,
          name: `CDB Liquidez Diária 102% CDI - ${institutionName}`,
          ticker: "CDB-102-CDI",
          category: "renda_fixa",
          sub_type: "cdb",
          institution: institutionName,
          indexer: "cdi",
          contract_rate: "102% CDI",
          start_date: today,
          due_date: "2026-12-31",
          liquidity: "Diária",
          initial_amount: 5000,
          current_balance: 5120.5,
          quantity: 1,
          average_price: 5000,
          current_price: 5120.5,
          tax_exempt: false,
          status: "ativo",
          notes: `Conexão Open Finance via ${institutionName}`,
          is_automated: true,
        },
      ];
  }
}

/**
 * Conecta uma nova instituição (Sandbox / Open Finance) e sincroniza os ativos no Supabase
 */
export async function connectAndSyncInstitution(connector: PluggyConnector): Promise<OpenFinanceConnection> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Usuário não autenticado. Faça login novamente.");

  const userId = auth.user.id;
  const itemId = `of_item_${connector.id}_${Date.now()}`;
  const now = new Date().toISOString();

  let connection: OpenFinanceConnection = {
    id: `local_of_${connector.id}_${Date.now()}`,
    user_id: userId,
    item_id: itemId,
    connector_id: connector.id,
    institution_name: connector.name,
    institution_logo: connector.imageUrl || null,
    status: "UPDATED",
    last_synced_at: now,
    created_at: now,
    updated_at: now,
  };

  // 1. Tenta salvar no Supabase (ou usa fallback localStorage)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connData, error: connError } = await (supabase.from("open_finance_connections") as any)
      .insert({
        user_id: userId,
        item_id: itemId,
        connector_id: connector.id,
        institution_name: connector.name,
        institution_logo: connector.imageUrl || null,
        status: "UPDATED",
        last_synced_at: now,
      })
      .select()
      .single();

    if (!connError && connData) {
      connection = connData as OpenFinanceConnection;
    } else {
      throw connError;
    }
  } catch (err) {
    console.warn("Salvando conexão no armazenamento local:", err);
    const existingList = getLocalConnections(userId).filter(
      (c) => c.institution_name.toLowerCase() !== connector.name.toLowerCase()
    );
    existingList.push(connection);
    saveLocalConnections(userId, existingList);
  }

  // 2. Busca/Gera os investimentos da instituição
  const items = generateSandboxInvestments(connector.name);

  // 3. Upsert nos investimentos do usuário
  for (const item of items) {
    let existingId: string | null = null;

    // Tenta buscar por external_id ou por nome + instituição
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from("investments") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing?.id) existingId = existing.id;
    } catch {
      // Caso coluna external_id não exista, busca por nome e instituição
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingByName } = await (supabase.from("investments") as any)
          .select("id")
          .eq("user_id", userId)
          .eq("name", item.name)
          .eq("institution", item.institution)
          .maybeSingle();

        if (existingByName?.id) existingId = existingByName.id;
      } catch (e) {
        console.error("Erro ao buscar ativo existente:", e);
      }
    }

    if (existingId) {
      // Atualiza valores de mercado e saldo
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("investments") as any)
          .update({
            current_balance: item.current_balance,
            current_price: item.current_price,
            quantity: item.quantity,
            connection_id: connection.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
      } catch {
        // Fallback sem connection_id se coluna não existir
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("investments") as any)
          .update({
            current_balance: item.current_balance,
            current_price: item.current_price,
            quantity: item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
      }
    } else {
      // Insere novo ativo no Supabase
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertErr } = await (supabase.from("investments") as any).insert({
          ...item,
          user_id: userId,
          connection_id: connection.id,
        });
        if (insertErr) throw insertErr;
      } catch (insertError) {
        console.warn("Inserindo com schema padrão (sem colunas estendidas):", insertError);
        // Fallback: Remove colunas estendidas (external_id, connection_id, is_automated) caso a migration ainda não tenha rodado no banco remoto
        const { external_id, is_automated, ...standardItem } = item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: fallbackErr } = await (supabase.from("investments") as any).insert({
          ...standardItem,
          user_id: userId,
        });
        if (fallbackErr) {
          console.error("Erro final ao inserir investimento:", fallbackErr);
          throw fallbackErr;
        }
      }
    }
  }

  return connection;
}

/**
 * Sincroniza novamente uma conexão existente
 */
export async function resyncConnection(connection: OpenFinanceConnection) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Usuário não autenticado.");

  const userId = auth.user.id;
  const now = new Date().toISOString();

  // Atualiza status no Supabase ou localmente
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("open_finance_connections") as any)
      .update({ status: "UPDATING", updated_at: now })
      .eq("id", connection.id);
  } catch {
    const list = getLocalConnections(userId);
    const item = list.find((c) => c.id === connection.id);
    if (item) {
      item.status = "UPDATING";
      item.updated_at = now;
      saveLocalConnections(userId, list);
    }
  }

  // Simula pequena variação diária de mercado nos ativos sincronizados
  const items = generateSandboxInvestments(connection.institution_name);

  for (const item of items) {
    let existingId: string | null = null;
    let currBal = item.current_balance;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from("investments") as any)
        .select("id, current_balance, current_price")
        .eq("user_id", userId)
        .eq("name", item.name)
        .maybeSingle();

      if (existing?.id) {
        existingId = existing.id;
        currBal = existing.current_balance || item.current_balance;
      }
    } catch {
      // ignore
    }

    if (existingId) {
      const variance = 1 + (Math.random() * 0.008 - 0.002);
      const newBal = Number((currBal * variance).toFixed(2));
      const newPrice = Number((item.current_price * variance).toFixed(2));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("investments") as any)
        .update({
          current_balance: newBal,
          current_price: newPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);
    }
  }

  // Atualiza conexão para UPDATED com timestamp atual
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("open_finance_connections") as any)
      .update({
        status: "UPDATED",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  } catch {
    const list = getLocalConnections(userId);
    const item = list.find((c) => c.id === connection.id);
    if (item) {
      item.status = "UPDATED";
      item.last_synced_at = new Date().toISOString();
      item.updated_at = new Date().toISOString();
      saveLocalConnections(userId, list);
    }
  }
}

/**
 * Remove uma conexão Open Finance
 */
export async function disconnectInstitution(connectionId: string, removeAssets = false) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  try {
    if (removeAssets) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("investments") as any).delete().eq("connection_id", connectionId);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("investments") as any)
        .update({ is_automated: false, connection_id: null })
        .eq("connection_id", connectionId);
    }
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("open_finance_connections") as any).delete().eq("id", connectionId);
  } catch {
    // ignore
  }

  if (userId) {
    const list = getLocalConnections(userId).filter((c) => c.id !== connectionId);
    saveLocalConnections(userId, list);
  }
}
