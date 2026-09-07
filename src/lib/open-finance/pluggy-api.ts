import { supabase } from "@/integrations/supabase/client";
import type { OpenFinanceConnection } from "../finance";
import {
  getPluggyConnectTokenServerFn,
  fetchPluggyItemDataServerFn,
} from "./pluggy-server";

const LOCAL_CONFIG_KEY = "finantria_pluggy_api_config";
let cachedApiKey: string | null = null;

export interface PluggyConfig {
  clientId: string;
  clientSecret: string;
}

export function getPluggyConfig(): PluggyConfig {
  const envClientId = import.meta.env["VITE_PLUGGY_CLIENT_ID"] || "";
  const envClientSecret = import.meta.env["VITE_PLUGGY_CLIENT_SECRET"] || "";

  if (envClientId && envClientSecret) {
    return { clientId: envClientId.trim(), clientSecret: envClientSecret.trim() };
  }

  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.clientId && parsed.clientSecret) {
        return { clientId: parsed.clientId.trim(), clientSecret: parsed.clientSecret.trim() };
      }
    }
  } catch {
    // ignore
  }

  return { clientId: "", clientSecret: "" };
}

export function savePluggyConfig(config: PluggyConfig) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Erro ao salvar configuração do Pluggy:", e);
  }
}

export function hasRealPluggyConfig(): boolean {
  const { clientId, clientSecret } = getPluggyConfig();
  return Boolean(
    clientId &&
      clientSecret &&
      clientId.trim().length >= 8 &&
      clientSecret.trim().length >= 8
  );
}

/**
 * Gera a URL oficial do Pluggy Connect para exibição em iframe ou popup seguro
 */
export async function getPluggyConnectUrl(connectorId?: number): Promise<{ url: string; apiKey: string }> {
  const config = getPluggyConfig();

  const { accessToken, apiKey } = await getPluggyConnectTokenServerFn({
    data: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      ...(connectorId ? { connectorId } : {}),
    },
  });

  cachedApiKey = apiKey;

  const baseUrl = "https://connect.pluggy.ai";
  const params = new URLSearchParams({
    connect_token: accessToken,
    include_sandbox: "true",
  });
  if (connectorId) {
    params.set("connector_id", String(connectorId));
  }

  return {
    url: `${baseUrl}?${params.toString()}`,
    apiKey,
  };
}

/**
 * Busca os dados reais de investimentos e saldos via API do Pluggy e grava no Supabase
 */
export async function syncRealPluggyItem(itemId: string, connectorName: string, connectorLogo?: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Usuário não autenticado.");

  const userId = auth.user.id;
  const now = new Date().toISOString();

  if (!cachedApiKey) {
    const config = getPluggyConfig();
    const res = await getPluggyConnectTokenServerFn({
      data: { clientId: config.clientId, clientSecret: config.clientSecret },
    });
    cachedApiKey = res.apiKey;
  }

  // 1. Salva a conexão ativa
  const connection: OpenFinanceConnection = {
    id: `of_conn_${itemId}`,
    user_id: userId,
    item_id: itemId,
    connector_id: null,
    institution_name: connectorName,
    institution_logo: connectorLogo || null,
    status: "UPDATED",
    last_synced_at: now,
    created_at: now,
    updated_at: now,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("open_finance_connections") as any).upsert({
      user_id: userId,
      item_id: itemId,
      institution_name: connectorName,
      institution_logo: connectorLogo || null,
      status: "UPDATED",
      last_synced_at: now,
    });
  } catch {
    // fallback local
  }

  // 2. Busca investimentos e contas via server function
  const { investments: rawInvestments, accounts: rawAccounts } = await fetchPluggyItemDataServerFn({
    data: { itemId, apiKey: cachedApiKey },
  });

  // 3. Processa Investimentos
  for (const inv of rawInvestments) {
    const type = (inv.type || "").toUpperCase();
    let category: "renda_fixa" | "renda_variavel" | "internacional" | "cripto" = "renda_fixa";
    let subType = "cdb";
    let indexer = "cdi";

    if (type.includes("EQUITY") || type.includes("MUTUAL_FUND") || type.includes("ETF")) {
      category = "renda_variavel";
      subType = inv.subtype === "REAL_ESTATE_FUND" || (inv.name || "").includes("FII") ? "fii" : "acao";
      indexer = "variavel";
    } else if (type.includes("SECURITY") || type.includes("CRYPTO")) {
      category = "cripto";
      subType = "crypto";
      indexer = "variavel";
    } else {
      // Renda fixa
      category = "renda_fixa";
      const upperName = (inv.name || "").toUpperCase();
      if (upperName.includes("LCI") || upperName.includes("LCA")) subType = "lci_lca";
      else if (upperName.includes("TESOURO") || upperName.includes("NTN") || upperName.includes("LFT")) subType = "tesouro";
      else if (upperName.includes("DEBENTURE") || upperName.includes("DEBÊNTURE")) subType = "debenture";
      else if (upperName.includes("CRI") || upperName.includes("CRA")) subType = "cri_cra";
      else subType = "cdb";

      if (upperName.includes("IPCA")) indexer = "ipca";
      else if (upperName.includes("SELIC")) indexer = "selic";
      else if (upperName.includes("PRE") || upperName.includes("PRÉ")) indexer = "pre";
      else indexer = "cdi";
    }

    const balance = Number(inv.balance || inv.amount || 0);
    const quantity = Number(inv.quantity || 1);
    const unitPrice = Number(inv.unitPrice || (quantity > 0 ? balance / quantity : balance));

    const payload = {
      name: inv.name || `Investimento ${connectorName}`,
      ticker: inv.code || null,
      category,
      sub_type: subType,
      institution: connectorName,
      indexer,
      contract_rate: inv.annualRate ? `${inv.annualRate}%` : null,
      start_date: inv.issueDate ? inv.issueDate.slice(0, 10) : now.slice(0, 10),
      due_date: inv.dueDate ? inv.dueDate.slice(0, 10) : null,
      liquidity: "Diária",
      initial_amount: balance,
      current_balance: balance,
      quantity: quantity || 1,
      average_price: unitPrice || balance,
      current_price: unitPrice || balance,
      tax_exempt: subType === "lci_lca" || subType === "cri_cra",
      status: "ativo",
      notes: `Sincronizado via Open Finance Real (${connectorName})`,
      user_id: userId,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from("investments") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("name", payload.name)
        .eq("institution", connectorName)
        .maybeSingle();

      if (existing?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("investments") as any)
          .update({
            current_balance: payload.current_balance,
            current_price: payload.current_price,
            quantity: payload.quantity,
            updated_at: now,
          })
          .eq("id", existing.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("investments") as any).insert(payload);
      }
    } catch (e) {
      console.error("Erro ao sincronizar ativo:", e);
    }
  }

  // 4. Processa Contas / Saldos
  for (const acc of rawAccounts) {
    const balance = Number(acc.balance || 0);
    if (balance > 0) {
      const accPayload = {
        name: `Saldo em Conta (${acc.name || "Principal"})`,
        ticker: null,
        category: "renda_fixa",
        sub_type: "cdb",
        institution: connectorName,
        indexer: "cdi",
        contract_rate: "100% CDI",
        start_date: now.slice(0, 10),
        due_date: null,
        liquidity: "Diária",
        initial_amount: balance,
        current_balance: balance,
        quantity: 1,
        average_price: balance,
        current_price: balance,
        tax_exempt: false,
        status: "ativo",
        notes: `Saldo de conta corrente sincronizado via Open Finance (${connectorName})`,
        user_id: userId,
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingAcc } = await (supabase.from("investments") as any)
          .select("id")
          .eq("user_id", userId)
          .eq("name", accPayload.name)
          .eq("institution", connectorName)
          .maybeSingle();

        if (existingAcc?.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("investments") as any)
            .update({ current_balance: balance, updated_at: now })
            .eq("id", existingAcc.id);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("investments") as any).insert(accPayload);
        }
      } catch (e) {
        console.error("Erro ao salvar saldo em conta:", e);
      }
    }
  }

  return connection;
}
