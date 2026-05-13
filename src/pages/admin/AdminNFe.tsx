import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Plus, Search, Download, Send, XCircle,
  Settings, Shield, ExternalLink, RefreshCw, CheckCircle,
  AlertCircle, FileX, Upload, Lock, FileSignature, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNFe, getNFeConfig, saveNFeConfig, emitirNFe, prepararNFe, deleteNFe,
  signNFeXML, enviarNFeSEFAZ, cancelNFe, downloadNFeXML,
  downloadDANFE, getSignerInfo, uploadCertificate,
  NFeRecord, EmitenteConfig, NFE_STATUS_LABELS,
  lookupCNPJ, lookupCEP,
} from "@/services/nfeService";
import { UF_LIST, CRT_OPTIONS } from "@/services/nfeService";

const AdminNFe = () => {
  const { toast } = useToast();
  const [nfeList, setNfeList] = useState<NFeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [configOpen, setConfigOpen] = useState(false);
  const [signerInfoOpen, setSignerInfoOpen] = useState(false);
  const [emitDialogOpen, setEmitDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedNFe, setSelectedNFe] = useState<NFeRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [config, setConfig] = useState<Partial<EmitenteConfig>>({
    razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "", crt: "3",
    endereco: { logradouro: "", numero: "", complemento: "", bairro: "", municipio: "", codigo_municipio: "", uf: "SP", cep: "" },
    telefone: "", serie: 1, proximo_numero: 1,
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [signerInfo, setSignerInfo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [certInfo, setCertInfo] = useState<any>(null);
  const [certUploading, setCertUploading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [draftDestinatario, setDraftDestinatario] = useState<any>(null);
  const [draftItens, setDraftItens] = useState<any[]>([]);
  const [preparingDraft, setPreparingDraft] = useState<boolean>(false);

  const formatCNPJ = (value: string) => {
    if (!value) return '';
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const limited = clean.slice(0, 14);
    if (limited.length <= 2) return limited;
    if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    if (limited.length <= 11) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12, 14)}`;
  };

  const formatCEP = (value: string) => {
    if (!value) return '';
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const limited = clean.slice(0, 8);
    if (limited.length <= 5) return limited;
    return `${limited.slice(0, 5)}-${limited.slice(5)}`;
  };

  const formatTelefone = (value: string) => {
    if (!value) return '';
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const limited = clean.slice(0, 11);
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  };

  const loadNFe = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== "todos") filters.status = statusFilter;
      const data = await listNFe(filters);
      setNfeList(data || []);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const loadConfig = async () => {
    try { const data = await getNFeConfig(); if (data) setConfig(data); }
    catch { }
  };

  const loadOrders = async () => {
    try {
      const { data } = await supabase.from("orders")
        .select("id, total, customer_name, customer_email, created_at, status")
        .or("status.eq.pagamento_confirmado,status.eq.finalizado,origin.eq.manual,origin.eq.orcamento")
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders(data ?? []);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Busca CNPJ e auto-preence dados da empresa
  const handleCNPJBlur = async () => {
    const cnpj = config.cnpj || "";
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return;
    setCnpjLoading(true);
    try {
      const data = await lookupCNPJ(cnpj);
      const newConfig = { ...config };
      if (data.razao_social) newConfig.razao_social = data.razao_social;
      if (data.nome_fantasia) newConfig.nome_fantasia = data.nome_fantasia;
      if (data.inscricao_estadual) newConfig.inscricao_estadual = data.inscricao_estadual;
      if (data.ddd_telefone_1) newConfig.telefone = data.ddd_telefone_1;
      
      if (!newConfig.endereco) newConfig.endereco = { logradouro: "", numero: "", complemento: "", bairro: "", municipio: "", codigo_municipio: "", uf: "SP", cep: "" };
      
      if (data.logradouro) newConfig.endereco.logradouro = data.logradouro;
      if (data.numero) newConfig.endereco.numero = data.numero;
      if (data.complemento) newConfig.endereco.complemento = data.complemento;
      if (data.bairro) newConfig.endereco.bairro = data.bairro;
      if (data.municipio) newConfig.endereco.municipio = data.municipio;
      if (data.uf) newConfig.endereco.uf = data.uf;
      if (data.cep) newConfig.endereco.cep = data.cep;
      setConfig(newConfig);
      toast({ title: "Sucesso", description: "Dados da empresa carregados via CNPJ!" });
    } catch (error: any) {
      // No toast on error
    } finally { setCnpjLoading(false); }
  };

  // Busca CEP e auto-preence o endereço
  const handleCEPBlur = async () => {
    const cep = config.endereco?.cep || "";
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await lookupCEP(cep);
      const newConfig = { ...config };
      if (newConfig.endereco) {
        if (data.logradouro) newConfig.endereco.logradouro = data.logradouro;
        if (data.complemento) newConfig.endereco.complemento = data.complemento;
        if (data.bairro) newConfig.endereco.bairro = data.bairro;
        if (data.localidade) newConfig.endereco.municipio = data.localidade;
        if (data.uf) newConfig.endereco.uf = data.uf;
        if (data.cep) newConfig.endereco.cep = data.cep;
      }
      setConfig(newConfig);
      toast({ title: "Sucesso", description: "Endereço carregado via CEP!" });
    } catch (error: any) {
      // No toast on error
    } finally { setCepLoading(false); }
  };

  useEffect(() => { loadNFe(); loadConfig(); }, [statusFilter]);

  useEffect(() => {
    if (!selectedOrderId) {
      setDraftDestinatario(null);
      setDraftItens([]);
      return;
    }

    const loadDraft = async () => {
      setPreparingDraft(true);
      try {
        const result = await prepararNFe(selectedOrderId);
        if (result) {
          setDraftDestinatario(result.destinatario);
          setDraftItens(result.itens || []);
        }
      } catch (error: any) {
        toast({ title: "Erro ao preparar nota", description: error.message, variant: "destructive" });
      } finally {
        setPreparingDraft(false);
      }
    };

    loadDraft();
  }, [selectedOrderId]);

  const handleSaveConfig = async () => {
    setConfigLoading(true);
    try {
      await saveNFeConfig(config as EmitenteConfig);
      toast({ title: "Sucesso", description: "Configuração salva com sucesso!" });
      setConfigOpen(false);
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setConfigLoading(false); }
  };

  const handleEmitNFe = async () => {
    if (!selectedOrderId) { toast({ title: "Atenção", description: "Selecione um pedido", variant: "destructive" }); return; }
    if (!draftDestinatario || draftItens.length === 0) { toast({ title: "Atenção", description: "Aguarde o carregamento dos dados para revisão", variant: "destructive" }); return; }
    
    setActionLoading("emit");
    try {
      const result = await emitirNFe(selectedOrderId, "A1", draftDestinatario, draftItens);
      toast({ title: "NF-e Gerada", description: "Chave: " + (result.accessKey?.slice(-10) || "") + "..." });
      setEmitDialogOpen(false); 
      setSelectedOrderId(""); 
      setDraftDestinatario(null);
      setDraftItens([]);
      loadNFe();
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleDeleteNFe = async (nfeId: string) => {
    if (!confirm("Deseja realmente excluir/descartar esta Nota Fiscal local? Como ela ainda não foi enviada para a SEFAZ, você poderá gerar uma nova nota para este pedido.")) return;
    
    setActionLoading(`delete-${nfeId}`);
    try {
      await deleteNFe(nfeId);
      
      toast({ title: "Sucesso", description: "Nota Fiscal excluída localmente!" });
      loadNFe();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSign = async (nfe: NFeRecord) => {
    setActionLoading(`sign-${nfe.id}`);
    try {
      const result = await signNFeXML(nfe.xml_gerado || "", nfe.id);
      if (result.success) {
        toast({ title: "Sucesso!", description: "NF-e assinada com sucesso! Agora você pode enviá-la para a SEFAZ." });
      } else {
        toast({ title: "Erro ao assinar", description: result.message || result.error || "Erro desconhecido", variant: "destructive" });
      }
      loadNFe();
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleSendToSEFAZ = async (nfe: NFeRecord) => {
    setActionLoading(`send-${nfe.id}`);
    try {
      const result = await enviarNFeSEFAZ(nfe.id);
      toast({ title: result.success ? "Enviada" : "Erro", description: result.message || "NF-e enviada para SEFAZ", variant: result.success ? "default" : "destructive" });
      loadNFe();
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!selectedNFe || cancelReason.length < 15) { toast({ title: "Atenção", description: "Motivo deve ter pelo menos 15 caracteres", variant: "destructive" }); return; }
    setActionLoading("cancel");
    try {
      await cancelNFe(selectedNFe.id, cancelReason);
      toast({ title: "Sucesso", description: "NF-e cancelada com sucesso!" });
      setCancelDialogOpen(false); setCancelReason(""); setSelectedNFe(null); loadNFe();
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleDownloadXML = async (nfeId: string) => {
    try { await downloadNFeXML(nfeId); }
    catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
  };

  const handleDownloadDANFE = async (nfeId: string) => {
    try { await downloadDANFE(nfeId); }
    catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
  };

  const handleCertUpload = async () => {
    if (!certFile || !certPassword) { toast({ title: "Atenção", description: "Selecione o arquivo .pfx e informe a senha", variant: "destructive" }); return; }
    setCertUploading(true);
    try {
      const result = await uploadCertificate(certFile, certPassword);
      setCertInfo(result.certInfo);
      toast({ title: "Sucesso", description: "Certificado enviado e validado com sucesso!" });
      if (result.warning) toast({ title: "Atenção", description: result.warning, variant: "destructive" });
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setCertUploading(false); }
  };

  const loadSignerInfo = async () => {
    try { const info = await getSignerInfo(); setSignerInfo(info); }
    catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
  };

  const filteredList = nfeList.filter((nfe) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return nfe.access_key?.toLowerCase().includes(term) || nfe.numero?.toString().includes(term) || nfe.order_id?.toLowerCase().includes(term);
  });

  const statusCounts = nfeList.reduce((acc: any, nfe) => { acc[nfe.status] = (acc[nfe.status] || 0) + 1; acc.total++; return acc; }, { total: 0 });

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FileText className="h-8 w-8 text-primary" /> NF-e</h1>
            <p className="text-muted-foreground">Emissão de Nota Fiscal Eletrônica com certificado A1 (.pfx)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { loadSignerInfo(); setSignerInfoOpen(true); }}><Shield className="mr-2 h-4 w-4" />Certificado</Button>
            <Button variant="outline" onClick={() => { loadConfig(); setConfigOpen(true); }}><Settings className="mr-2 h-4 w-4" />Configurações</Button>
            <Button onClick={() => { loadOrders(); setEmitDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Emitir NF-e</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statusCounts.total || 0}</div></CardContent></Card>
          {Object.entries(NFE_STATUS_LABELS).map(([status, { label, color }]: any) => (
            <Card key={status}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statusCounts[status] || 0}</div></CardContent></Card>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por chave, numero ou pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="gerada">Gerada</SelectItem>
              <SelectItem value="assinada">Assinada</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="autorizada">Autorizada</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadNFe}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        <Card><CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground"><FileX className="h-12 w-12 mb-4" /><p>Nenhuma NF-e encontrada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b">
                  <th className="text-left p-4 font-medium">Numero</th>
                  <th className="text-left p-4 font-medium">Chave de Acesso</th>
                  <th className="text-left p-4 font-medium">Pedido</th>
                  <th className="text-left p-4 font-medium">Valor</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-right p-4 font-medium">Acoes</th>
                </tr></thead>
                <tbody>
                  {filteredList.map((nfe) => {
                    const statusInfo = NFE_STATUS_LABELS[nfe.status] || { label: nfe.status, color: "bg-gray-100 text-gray-800" };
                    return (
                      <tr key={nfe.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{nfe.serie}/{nfe.numero}</td>
                        <td className="p-4 font-mono text-xs">{nfe.access_key ? nfe.access_key.slice(0,10) + "..." + nfe.access_key.slice(-10) : "-"}</td>
                        <td className="p-4 text-sm">{nfe.order_id?.slice(0, 8)}...</td>
                        <td className="p-4">{nfe.valor_total ? "R$ " + Number(nfe.valor_total).toFixed(2) : "-"}</td>
                        <td className="p-4"><Badge className={cn("text-xs", statusInfo.color)}>{statusInfo.label}</Badge></td>
                        <td className="p-4 text-sm text-muted-foreground">{new Date(nfe.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {nfe.status === "gerada" && (
                              <Button variant="ghost" size="sm" onClick={() => handleSign(nfe)} disabled={actionLoading === `sign-${nfe.id}`} title="Assinar com A1">
                                {actionLoading === `sign-${nfe.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                              </Button>
                            )}
                            {(nfe.status === "gerada" || nfe.status === "rejeitada" || nfe.status === "assinada") && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteNFe(nfe.id)} disabled={actionLoading === `delete-${nfe.id}`} title="Excluir/Descartar Nota Local" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                {actionLoading === `delete-${nfe.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                            {nfe.status === "assinada" && (
                              <Button variant="ghost" size="sm" onClick={() => handleSendToSEFAZ(nfe)} disabled={actionLoading === `send-${nfe.id}`} title="Enviar para SEFAZ">
                                {actionLoading === `send-${nfe.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              </Button>
                            )}
                            {(nfe.status === "autorizada" || nfe.status === "assinada") && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadXML(nfe.id)} title="Baixar XML"><Download className="h-4 w-4" /></Button>
                            )}
                            {nfe.status === "autorizada" && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadDANFE(nfe.id)} title="Baixar DANFE"><FileText className="h-4 w-4" /></Button>
                            )}
                            {nfe.status === "autorizada" && (
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedNFe(nfe); setCancelDialogOpen(true); }} title="Cancelar NF-e"><XCircle className="h-4 w-4 text-red-500" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configurações da NF-e (Emitente)</DialogTitle><DialogDescription>Configure os dados da empresa emitente para emissão de NF-e</DialogDescription></DialogHeader>
          <Tabs defaultValue="empresa" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="certificado">Certificado Digital</TabsTrigger>
            </TabsList>
            <TabsContent value="empresa" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Razão Social *</Label><Input value={config.razao_social || ""} onChange={(e) => setConfig({ ...config, razao_social: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={config.nome_fantasia || ""} onChange={(e) => setConfig({ ...config, nome_fantasia: e.target.value })} /></div>
                <div className="space-y-2"><Label>CNPJ *</Label>
                  <div className="relative">
                    <Input value={config.cnpj || ""} onChange={(e) => { const formatted = formatCNPJ(e.target.value); setConfig({ ...config, cnpj: formatted }); }} onBlur={handleCNPJBlur} placeholder="00.000.000/0001-00" />
                    {cnpjLoading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
                  </div>
                </div>
                <div className="space-y-2"><Label>Inscrição Estadual *</Label><Input value={config.inscricao_estadual || ""} onChange={(e) => setConfig({ ...config, inscricao_estadual: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>CRT (Regime Tributario)</Label>
                  <Select value={config.crt || "3"} onValueChange={(v) => setConfig({ ...config, crt: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CRT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={config.telefone || ""} onChange={(e) => { const formatted = formatTelefone(e.target.value); setConfig({ ...config, telefone: formatted }); }} /></div>
                <div className="space-y-2"><Label>Serie NF-e</Label><Input type="number" value={config.serie || 1} onChange={(e) => setConfig({ ...config, serie: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Proximo Numero</Label><Input type="number" value={config.proximo_numero || 1} onChange={(e) => setConfig({ ...config, proximo_numero: Number(e.target.value) })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Logradouro *</Label><Input value={config.endereco?.logradouro || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, logradouro: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Numero *</Label><Input value={config.endereco?.numero || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, numero: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Complemento</Label><Input value={config.endereco?.complemento || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, complemento: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Bairro *</Label><Input value={config.endereco?.bairro || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, bairro: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Municipio *</Label><Input value={config.endereco?.municipio || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, municipio: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Codigo Municipio</Label><Input value={config.endereco?.codigo_municipio || ""} onChange={(e) => setConfig({ ...config, endereco: { ...config.endereco!, codigo_municipio: e.target.value } })} /></div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select value={config.endereco?.uf || "SP"} onValueChange={(v) => setConfig({ ...config, endereco: { ...config.endereco!, uf: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>CEP *</Label>
                  <div className="relative">
                    <Input value={config.endereco?.cep || ""} onChange={(e) => { const formatted = formatCEP(e.target.value); setConfig({ ...config, endereco: { ...(config.endereco || {}), logradouro: config.endereco?.logradouro || "", numero: config.endereco?.numero || "", bairro: config.endereco?.bairro || "", municipio: config.endereco?.municipio || "", codigo_municipio: config.endereco?.codigo_municipio || "", uf: config.endereco?.uf || "SP", cep: formatted } }); }} onBlur={handleCEPBlur} placeholder="00000-000" />
                    {cepLoading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="certificado" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><FileSignature className="h-4 w-4" />Certificado Digital A1 (.pfx/.p12)</h4>
                  <p className="text-sm text-muted-foreground mb-4">Faca upload do seu certificado digital no formato .pfx ou .p12</p>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Arquivo .pfx/.p12 *</Label><Input type="file" accept=".pfx,.p12" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="cursor-pointer" /></div>
                    <div className="space-y-2"><Label>Senha do Certificado *</Label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" value={certPassword} onChange={(e) => setCertPassword(e.target.value)} placeholder="Senha do certificado" className="pl-9" /></div>
                    </div>
                    <Button onClick={handleCertUpload} disabled={certUploading || !certFile || !certPassword} className="w-full">
                      {certUploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Enviar Certificado
                    </Button>
                  </div>
                </div>
                {certInfo && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Certificado Valido</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Subject:</strong> {certInfo.subject}</p>
                      <p><strong>Emissor:</strong> {certInfo.issuer}</p>
                      <p><strong>Valido ate:</strong> {new Date(certInfo.validTo).toLocaleDateString("pt-BR")}</p>
                      {certInfo.daysUntilExpiry < 30 && <p className="text-red-600 font-medium">Atenção: Certificado expira em {certInfo.daysUntilExpiry} dias!</p>}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={configLoading}>
              {configLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emit NF-e Dialog */}
      <Dialog open={emitDialogOpen} onOpenChange={(open) => { setEmitDialogOpen(open); if(!open) { setSelectedOrderId(""); setDraftDestinatario(null); setDraftItens([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Emitir Nova NF-e</DialogTitle><DialogDescription>Selecione um pedido e revise os dados antes de gerar a nota fiscal</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Pedido *</Label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger><SelectValue placeholder="Selecione um pedido pago" /></SelectTrigger>
                <SelectContent><ScrollArea className="h-48">
                  {orders.map((order) => <SelectItem key={order.id} value={order.id}>#{order.id.slice(0,8)} - {order.customer_name} - R$ {Number(order.total_amount || order.total || 0).toFixed(2)}</SelectItem>)}
                </ScrollArea></SelectContent>
              </Select>
            </div>

            {preparingDraft && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Preparando dados para revisão...</p>
              </div>
            )}

            {!preparingDraft && draftDestinatario && (
              <Tabs defaultValue="cliente" className="w-full mt-4 border rounded-lg p-4">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="cliente">Destinatário</TabsTrigger>
                  <TabsTrigger value="endereco_dest">Endereço de Entrega</TabsTrigger>
                  <TabsTrigger value="itens_dest">Produtos / Itens ({draftItens.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="cliente" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Nome / Razão Social *</Label>
                      <Input value={draftDestinatario.nome || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, nome: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input value={draftDestinatario.email || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input value={draftDestinatario.inscricaoEstadual || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, inscricaoEstadual: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={draftDestinatario.cpf || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, cpf: e.target.value, cnpj: "" })} placeholder="Apenas números" />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={draftDestinatario.cnpj || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, cnpj: e.target.value, cpf: "" })} placeholder="Apenas números" />
                    </div>
                    <div className="space-y-2">
                      <Label>Indicador IE Destinatário</Label>
                      <Select value={draftDestinatario.indIEDest || "9"} onValueChange={(v) => setDraftDestinatario({ ...draftDestinatario, indIEDest: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Contribuinte ICMS</SelectItem>
                          <SelectItem value="2">2 - Contribuinte Isento</SelectItem>
                          <SelectItem value="9">9 - Não Contribuinte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="endereco_dest" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Logradouro *</Label>
                      <Input value={draftDestinatario.endereco?.logradouro || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, logradouro: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número *</Label>
                      <Input value={draftDestinatario.endereco?.numero || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, numero: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input value={draftDestinatario.endereco?.complemento || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, complemento: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro *</Label>
                      <Input value={draftDestinatario.endereco?.bairro || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, bairro: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP *</Label>
                      <Input value={draftDestinatario.endereco?.cep || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, cep: e.target.value } })} placeholder="00000000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Município *</Label>
                      <Input value={draftDestinatario.endereco?.municipio || ""} onChange={(e) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, municipio: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF *</Label>
                      <Select value={draftDestinatario.endereco?.uf || "SP"} onValueChange={(v) => setDraftDestinatario({ ...draftDestinatario, endereco: { ...draftDestinatario.endereco, uf: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="itens_dest" className="space-y-4">
                  <ScrollArea className="h-72 border rounded-md p-2">
                    {draftItens.map((item, idx) => (
                      <div key={idx} className="p-4 border border-slate-100 rounded-md mb-2 space-y-3 bg-muted/10">
                        <div className="font-semibold text-sm flex justify-between items-center bg-muted/40 p-2 rounded">
                          <span>Item #{idx + 1} - {item.descricao}</span>
                          <span className="text-primary font-mono text-xs">Subtotal: R$ {Number(item.quantidade * item.valorUnitario).toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="space-y-1 col-span-2 md:col-span-2">
                            <Label className="text-2xs">Descrição Comercial</Label>
                            <Input className="h-8 text-xs" value={item.descricao || ""} onChange={(e) => {
                              const newItens = [...draftItens];
                              newItens[idx].descricao = e.target.value;
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">Código do Prod.</Label>
                            <Input className="h-8 text-xs" value={item.codigo || ""} onChange={(e) => {
                              const newItens = [...draftItens];
                              newItens[idx].codigo = e.target.value;
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">Unidade</Label>
                            <Input className="h-8 text-xs" value={item.unidade || "UN"} onChange={(e) => {
                              const newItens = [...draftItens];
                              newItens[idx].unidade = e.target.value;
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">NCM *</Label>
                            <Input className="h-8 text-xs" value={item.NCM || ""} onChange={(e) => {
                              const newItens = [...draftItens];
                              newItens[idx].NCM = e.target.value;
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">CFOP *</Label>
                            <Input className="h-8 text-xs" value={item.CFOP || ""} onChange={(e) => {
                              const newItens = [...draftItens];
                              newItens[idx].CFOP = e.target.value;
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">Qtd *</Label>
                            <Input type="number" step="any" className="h-8 text-xs" value={item.quantidade} onChange={(e) => {
                              const qty = Number(e.target.value);
                              const newItens = [...draftItens];
                              newItens[idx].quantidade = qty;
                              newItens[idx].valorTotal = qty * newItens[idx].valorUnitario;
                              newItens[idx].valorBaseCalculo = qty * newItens[idx].valorUnitario;
                              newItens[idx].valorICMS = qty * newItens[idx].valorUnitario * (Number(newItens[idx].aliquotaICMS || 18) / 100);
                              setDraftItens(newItens);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs">Val. Unitário (R$)</Label>
                            <Input type="number" step="any" className="h-8 text-xs" value={item.valorUnitario} onChange={(e) => {
                              const val = Number(e.target.value);
                              const newItens = [...draftItens];
                              newItens[idx].valorUnitario = val;
                              newItens[idx].valorTotal = newItens[idx].quantidade * val;
                              newItens[idx].valorBaseCalculo = newItens[idx].quantidade * val;
                              newItens[idx].valorICMS = newItens[idx].quantidade * val * (Number(newItens[idx].aliquotaICMS || 18) / 100);
                              setDraftItens(newItens);
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEmitDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmitNFe} disabled={actionLoading === "emit" || preparingDraft || !selectedOrderId || !draftDestinatario}>
              {actionLoading === "emit" ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}Gerar NF-e
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel NF-e Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar NF-e</DialogTitle><DialogDescription>NF-e: Serie {selectedNFe?.serie} / Nº {selectedNFe?.numero}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Motivo do Cancelamento * (min. 15 caracteres)</Label>
              <textarea className="w-full min-h-[100px] p-3 border rounded-md text-sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Informe o motivo do cancelamento..." />
              <p className="text-xs text-muted-foreground">{cancelReason.length} caracteres</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCancelDialogOpen(false); setCancelReason(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading === "cancel" || cancelReason.length < 15}>
              {actionLoading === "cancel" ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signer Info Dialog */}
      <Dialog open={signerInfoOpen} onOpenChange={setSignerInfoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Certificado Digital</DialogTitle>
            <DialogDescription>Informacoes sobre o uso do certificado</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold">Usando Certificado A1 (.pfx):</h4>
              <p className="text-muted-foreground">O certificado A1 (.pfx) e suportado diretamente pelo servidor. Faca o upload na aba "Certificado Digital" nas configuracoes.</p>
            </div>
            {signerInfo?.info && (
              <div className="space-y-2 text-sm"><h4 className="font-semibold">Informacoes:</h4>
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-1"><p><strong>Descricao:</strong> {signerInfo.info.description}</p></div>
              </div>
            )}
          </div>
          <div className="flex justify-end"><Button variant="outline" onClick={() => setSignerInfoOpen(false)}>Fechar</Button></div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminNFe;
