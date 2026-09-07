import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Info,
  Key,
  Layers,
  Loader2,
  Lock,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useInvestments, useOpenFinanceConnections } from "@/lib/data";
import { formatCurrency, type OpenFinanceConnection } from "@/lib/finance";
import {
  connectAndSyncInstitution,
  disconnectInstitution,
  POPULAR_CONNECTORS,
  resyncConnection,
  type PluggyConnector,
} from "@/lib/open-finance/pluggy";
import {
  getPluggyConfig,
  getPluggyConnectUrl,
  hasRealPluggyConfig,
  savePluggyConfig,
  syncRealPluggyItem,
} from "@/lib/open-finance/pluggy-api";

interface OpenFinanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenFinanceModal({ open, onOpenChange }: OpenFinanceModalProps) {
  const qc = useQueryClient();
  const { data: connections = [], isLoading: isLoadingConnections } = useOpenFinanceConnections();
  const { data: investments = [] } = useInvestments();

  const [activeTab, setActiveTab] = useState<"connections" | "connect" | "settings">("connections");
  const [searchTerm, setSearchTerm] = useState("");
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [deleteConn, setDeleteConn] = useState<OpenFinanceConnection | null>(null);

  // Widget Iframe URL state
  const [connectIframeUrl, setConnectIframeUrl] = useState<string | null>(null);
  const [activeConnectorName, setActiveConnectorName] = useState<string>("");
  const [activeConnectorLogo, setActiveConnectorLogo] = useState<string | null>(null);

  // Estado de configuração das chaves da API
  const [config, setConfig] = useState(getPluggyConfig());
  const isRealConfigured = hasRealPluggyConfig();

  // Escuta mensagens vindas do iframe do Pluggy Connect
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      const eventType = data.event || data.type || "";
      if (
        eventType === "item/created" ||
        eventType === "item/updated" ||
        eventType === "item/success"
      ) {
        const item = data.data?.item || data.item;
        if (item?.id) {
          setConnectIframeUrl(null);
          const syncToast = toast.loading(
            `Importando saldos e investimentos de ${activeConnectorName || "sua instituição"}...`
          );
          try {
            await syncRealPluggyItem(item.id, activeConnectorName || "Instituição", activeConnectorLogo);
            await qc.invalidateQueries({ queryKey: ["open_finance_connections"] });
            await qc.invalidateQueries({ queryKey: ["investments"] });
            toast.success(
              `${activeConnectorName || "Instituição"} conectada com sucesso! Posições sincronizadas.`,
              { id: syncToast }
            );
            setActiveTab("connections");
          } catch (err: any) {
            console.error("Erro ao sincronizar dados reais:", err);
            toast.error(`Falha ao sincronizar: ${err?.message || ""}`, { id: syncToast });
          }
        }
      } else if (eventType === "close" || eventType === "cancel") {
        setConnectIframeUrl(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeConnectorName, activeConnectorLogo, qc]);

  // Filtra as instituições disponíveis para conectar
  const availableConnectors = POPULAR_CONNECTORS.filter((c) => {
    const isAlreadyConnected = connections.some(
      (conn) => conn.institution_name.toLowerCase() === c.name.toLowerCase()
    );
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadyConnected && matchesSearch;
  });

  const handleSaveConfig = () => {
    savePluggyConfig(config);
    setConfig({ ...config });
    toast.success("Credenciais do Open Finance salvas com sucesso!");
  };

  const handleConnect = async (connector: PluggyConnector) => {
    setConnectingId(connector.id);
    setActiveConnectorName(connector.name);
    setActiveConnectorLogo(connector.imageUrl || null);

    // Se possui chaves reais da Pluggy configuradas, abre o widget oficial via Iframe direto
    if (isRealConfigured) {
      const toastId = toast.loading(`Iniciando autenticação com ${connector.name}...`);
      try {
        const { url } = await getPluggyConnectUrl(connector.id);
        toast.dismiss(toastId);
        setConnectIframeUrl(url);
      } catch (error: any) {
        console.error("Erro ao gerar URL do widget:", error);
        toast.dismiss(toastId);
        toast.error(`Falha ao iniciar conexão: ${error?.message || "Verifique suas chaves de API."}`);
      } finally {
        setConnectingId(null);
      }
      return;
    }

    // Modo Demonstração / Sandbox caso não tenha chaves configuradas
    const toastId = toast.loading(`Conectando com ${connector.name} (Modo Simulação)...`);
    try {
      await connectAndSyncInstitution(connector);
      await qc.invalidateQueries({ queryKey: ["open_finance_connections"] });
      await qc.invalidateQueries({ queryKey: ["investments"] });
      toast.success(`${connector.name} conectada com sucesso!`, { id: toastId });
      setActiveTab("connections");
    } catch (error: any) {
      console.error("Erro ao conectar instituição:", error);
      const msg = error?.message || "Erro desconhecido. Tente novamente.";
      toast.error(`Falha ao conectar ${connector.name}: ${msg}`, { id: toastId });
    } finally {
      setConnectingId(null);
    }
  };

  const handleResync = async (connection: OpenFinanceConnection) => {
    setResyncingId(connection.id);
    const toastId = toast.loading(`Sincronizando ${connection.institution_name}...`);
    try {
      await resyncConnection(connection);
      await qc.invalidateQueries({ queryKey: ["open_finance_connections"] });
      await qc.invalidateQueries({ queryKey: ["investments"] });
      toast.success(`Saldos e posições de ${connection.institution_name} atualizados!`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(`Erro ao sincronizar ${connection.institution_name}.`, { id: toastId });
    } finally {
      setResyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (connections.length === 0) return;
    setIsSyncingAll(true);
    const toastId = toast.loading("Sincronizando todas as contas conectadas...");
    try {
      for (const conn of connections) {
        await resyncConnection(conn);
      }
      await qc.invalidateQueries({ queryKey: ["open_finance_connections"] });
      await qc.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Todas as instituições foram sincronizadas!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao sincronizar algumas conexões.", { id: toastId });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDisconnect = async () => {
    if (!deleteConn) return;
    const toastId = toast.loading(`Desconectando ${deleteConn.institution_name}...`);
    try {
      await disconnectInstitution(deleteConn.id, false);
      await qc.invalidateQueries({ queryKey: ["open_finance_connections"] });
      await qc.invalidateQueries({ queryKey: ["investments"] });
      toast.success(`${deleteConn.institution_name} desconectada.`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desconectar instituição.", { id: toastId });
    } finally {
      setDeleteConn(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-card/60 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <Zap className="h-5 w-5 fill-primary/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold tracking-tight">
                      Open Finance Brasil
                    </DialogTitle>
                    {isRealConfigured ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        API Real Ativa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        Modo Demonstração
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Sincronização automática de saldos e custódia de corretoras e bancos
                  </DialogDescription>
                </div>
              </div>

              {connections.length > 0 && activeTab === "connections" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncAll}
                  disabled={isSyncingAll}
                  className="h-8 gap-1.5 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? "animate-spin text-primary" : ""}`} />
                  Sincronizar Todas
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "connections" | "connect" | "settings")}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 border-b border-border/40 bg-muted/20">
              <TabsList className="bg-transparent h-12 p-0 gap-6">
                <TabsTrigger
                  value="connections"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 font-medium text-xs gap-2"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Instituições Conectadas
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                    {connections.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="connect"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 font-medium text-xs gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Conectar Nova Instituição
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1 font-medium text-xs gap-2"
                >
                  <Key className="h-3.5 w-3.5" />
                  Configurar API Real
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ABA 1: INSTITUIÇÕES CONECTADAS */}
            <TabsContent value="connections" className="flex-1 overflow-y-auto p-6 m-0 space-y-4">
              {isLoadingConnections ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Carregando conexões...</span>
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed rounded-2xl bg-card/30 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Nenhuma instituição conectada</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Conecte suas contas da XP, BTG, Nubank, Inter ou Itaú para importar e manter seus
                      investimentos atualizados automaticamente.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("connect")}
                    className="gap-2 mt-2 h-9 text-xs"
                  >
                    <Plus className="h-4 w-4" /> Conectar Primeira Instituição
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {connections.map((conn) => {
                    const connInvestments = investments.filter(
                      (inv) => inv.connection_id === conn.id || inv.institution === conn.institution_name
                    );
                    const totalBalance = connInvestments.reduce(
                      (acc, inv) => acc + (inv.current_balance || 0),
                      0
                    );

                    return (
                      <div
                        key={conn.id}
                        className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-all flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {conn.institution_logo ? (
                            <img
                              src={conn.institution_logo}
                              alt={conn.institution_name}
                              className="h-10 w-10 rounded-xl object-contain p-1 border bg-white shadow-xs"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {conn.institution_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">{conn.institution_name}</h4>
                              <Badge
                                variant="outline"
                                className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Conectado
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{connInvestments.length} ativos sincronizados</span>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                Total: {formatCurrency(totalBalance)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResync(conn)}
                            disabled={resyncingId === conn.id}
                            className="h-8 gap-1.5 text-xs"
                            title="Sincronizar saldos e ativos"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                resyncingId === conn.id ? "animate-spin text-primary" : ""
                              }`}
                            />
                            <span className="hidden sm:inline">Sincronizar</span>
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConn(conn)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Desconectar conta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Informações de Segurança e Banco Central */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-3 mt-4 text-xs text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Ambiente Seguro Regulamentado</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    Os dados são transmitidos via conexão criptografada ponta a ponta autorizada pelo Banco
                    Central do Brasil. O sistema possui apenas permissão de <strong>leitura de saldos e custódia</strong>,
                    não sendo possível realizar transações financeiras.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CONECTAR NOVA INSTITUIÇÃO */}
            <TabsContent value="connect" className="flex-1 overflow-y-auto p-6 m-0 space-y-4">
              {!isRealConfigured && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">Modo Demonstração Ativo</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Para conectar na sua <strong>conta real com CPF e aplicativo do banco</strong>, configure suas chaves gratuitas na aba{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("settings")}
                        className="underline font-medium text-primary hover:opacity-80"
                      >
                        Configurar API Real
                      </button>.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar banco ou corretora (ex: XP, Nubank, BTG, Itaú)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {availableConnectors.map((connector) => (
                  <div
                    key={connector.id}
                    className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {connector.imageUrl ? (
                        <img
                          src={connector.imageUrl}
                          alt={connector.name}
                          className="h-10 w-10 rounded-xl object-contain p-1 border bg-white shadow-xs"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {connector.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs truncate group-hover:text-primary transition-colors">
                          {connector.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {connector.hasInvestments ? "Renda Fixa, Ações e Fundos" : "Conta e Saldos"}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleConnect(connector)}
                      disabled={connectingId === connector.id}
                      className="h-8 text-xs font-medium gap-1.5 shrink-0"
                    >
                      {connectingId === connector.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isRealConfigured ? (
                        <>
                          <span>Autenticar</span>
                          <QrCode className="h-3.5 w-3.5 opacity-70" />
                        </>
                      ) : (
                        <>
                          <span>Conectar</span>
                          <Lock className="h-3 w-3 opacity-70" />
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {availableConnectors.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma instituição encontrada com o termo "{searchTerm}".
                </div>
              )}
            </TabsContent>

            {/* ABA 3: CONFIGURAR API REAL (PLUGGY) */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 m-0 space-y-5">
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold">Credenciais da API Pluggy (Open Finance)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Para autenticar no Nubank, XP, Itaú e outros bancos reais com seu CPF e aplicativo,
                      obtenha suas chaves no painel da Pluggy.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 text-xs gap-1.5 shrink-0 border-primary/30"
                  >
                    <a href="https://dashboard.pluggy.ai/" target="_blank" rel="noreferrer">
                      Criar Conta Grátis
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="client_id" className="text-xs font-medium">
                      PLUGGY_CLIENT_ID
                    </Label>
                    <Input
                      id="client_id"
                      type="text"
                      placeholder="Ex: 8c3e41c4-1234-5678-9abc-..."
                      value={config.clientId}
                      onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client_secret" className="text-xs font-medium">
                      PLUGGY_CLIENT_SECRET
                    </Label>
                    <Input
                      id="client_secret"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={config.clientSecret}
                      onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      * As credenciais também podem ser adicionadas no arquivo <code className="bg-muted px-1 py-0.5 rounded">.env</code> como <code className="bg-muted px-1 py-0.5 rounded">VITE_PLUGGY_CLIENT_ID</code>.
                    </p>
                    <Button onClick={handleSaveConfig} size="sm" className="h-8 text-xs gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Salvar Credenciais
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Como funciona a autenticação?</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ao clicar em "Autenticar", o widget oficial da Pluggy solicita seu CPF e envia uma notificação segura para o aplicativo do seu banco autorizar o compartilhamento.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Segurança dos Dados</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    O sistema só tem acesso de <strong>leitura de saldos e investimentos</strong>. Não são permitidas transações, saques ou transferências.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* MODAL DO WIDGET OFICIAL PLUGGY CONNECT (IFRAME SEGURO) */}
      <Dialog open={Boolean(connectIframeUrl)} onOpenChange={(o) => !o && setConnectIframeUrl(null)}>
        <DialogContent className="sm:max-w-[460px] p-0 h-[650px] max-h-[92vh] overflow-hidden rounded-2xl flex flex-col border-border/60 bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary fill-primary/20" />
              <span className="font-bold text-xs tracking-tight">
                Conectar {activeConnectorName || "Instituição"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setConnectIframeUrl(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 w-full h-full relative bg-background">
            {connectIframeUrl && (
              <iframe
                src={connectIframeUrl}
                title="Pluggy Connect"
                className="w-full h-full border-0 rounded-b-2xl"
                allow="clipboard-read; clipboard-write"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE DESCONEXÃO */}
      <AlertDialog open={!!deleteConn} onOpenChange={(open) => !open && setDeleteConn(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Desconectar {deleteConn?.institution_name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              A sincronização automática de saldos para esta instituição será interrompida.
              Os investimentos já cadastrados continuarão na sua carteira como lançamentos manuais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
