import { createServerFn } from "@tanstack/react-start";

const PLUGGY_API_URL = "https://api.pluggy.ai";

/**
 * Função de servidor para gerar o Connect Token do Pluggy com segurança e sem problemas de CORS
 */
export const getPluggyConnectTokenServerFn = createServerFn({ method: "POST" })
  .validator((data: { clientId?: string; clientSecret?: string; connectorId?: number }) => data)
  .handler(async ({ data }) => {
    const clientId =
      data.clientId ||
      process.env["PLUGGY_CLIENT_ID"] ||
      process.env["VITE_PLUGGY_CLIENT_ID"];
    const clientSecret =
      data.clientSecret ||
      process.env["PLUGGY_CLIENT_SECRET"] ||
      process.env["VITE_PLUGGY_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error(
        "Credenciais do Pluggy não encontradas. Configure seu CLIENT_ID e CLIENT_SECRET na aba 'Configurar API Real' ou no arquivo .env."
      );
    }

    // 1. Autenticação na Pluggy (Obtém API Key temporária)
    const authController = new AbortController();
    const authTimeout = setTimeout(() => authController.abort(), 12000);

    let authRes: Response;
    try {
      authRes = await fetch(`${PLUGGY_API_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
        signal: authController.signal,
      });
    } catch (err: any) {
      clearTimeout(authTimeout);
      if (err.name === "AbortError") {
        throw new Error("Tempo limite excedido ao conectar nos servidores da Pluggy.");
      }
      throw new Error(`Erro de conexão com o servidor da Pluggy: ${err.message}`);
    } finally {
      clearTimeout(authTimeout);
    }

    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}));
      throw new Error(
        err.message ||
          `Falha de autenticação com a Pluggy (Status: ${authRes.status}). Verifique se seu CLIENT_ID e CLIENT_SECRET estão corretos.`
      );
    }

    const { apiKey } = await authRes.json();

    // 2. Criação do Connect Token
    const bodyPayload: Record<string, unknown> = {};
    if (data.connectorId) {
      bodyPayload["connectorId"] = data.connectorId;
    }

    const tokenRes = await fetch(`${PLUGGY_API_URL}/connect_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      throw new Error(
        err.message || `Erro ao gerar o Connect Token da Pluggy (Status: ${tokenRes.status})`
      );
    }

    const tokenData = await tokenRes.json();
    return {
      accessToken: tokenData.accessToken as string,
      apiKey: apiKey as string,
    };
  });

/**
 * Função de servidor para buscar os dados de investimentos e contas da Pluggy com a apiKey
 */
export const fetchPluggyItemDataServerFn = createServerFn({ method: "POST" })
  .validator((data: { itemId: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    const { itemId, apiKey } = data;

    // Busca investimentos
    const invRes = await fetch(`${PLUGGY_API_URL}/investments?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });
    const invData = invRes.ok ? await invRes.json() : { results: [] };

    // Busca contas bancárias e saldos
    const accRes = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
      headers: { "X-API-KEY": apiKey },
    });
    const accData = accRes.ok ? await accRes.json() : { results: [] };

    return {
      investments: invData.results || [],
      accounts: accData.results || [],
    };
  });
