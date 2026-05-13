import { supabase } from '@/integrations/supabase/client';

// API URL hardcoded for testing (TODO: restore import.meta.env.VITE_API_URL later)
// Base URL for backend API; defaults to same origin if VITE_API_URL not set
const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}`;

export interface EmitenteConfig {
  id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual: string;
  crt: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    codigo_municipio: string;
    uf: string;
    cep: string;
  };
  telefone?: string;
  serie?: number;
  proximo_numero?: number;
}

export interface NFeItem {
  id: string;
  codigo: string;
  descricao: string;
  NCM: string;
  CFOP: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  aliquotaICMS: string;
  valorICMS: number;
  aliquotaPIS: string;
  valorPIS: number;
  aliquotaCOFINS: string;
  valorCOFINS: number;
}

export interface NFeRecord {
  id: string;
  order_id: string;
  access_key: string;
  numero: number;
  serie: number;
  status: 'gerada' | 'assinada' | 'enviada' | 'autorizada' | 'rejeitada' | 'cancelada';
  valor_total: number;
  xml_gerado?: string;
  xml_assinado?: string;
  protocolo?: string;
  data_autorizacao?: string;
  cancel_reason?: string;
  canceled_at?: string;
  created_at: string;
  emitente_config?: EmitenteConfig;
  destinatario_data?: Record<string, unknown>;
  itens_data?: NFeItem[];
}

export interface NFeConfigResponse {
  success: boolean;
  config: EmitenteConfig | null;
}

export interface NFeListResponse {
  success: boolean;
  nfe: NFeRecord[];
}

export interface NFeResponse {
  success: boolean;
  nfe?: NFeRecord;
  xml?: string;
  accessKey?: string;
  needsSigning?: boolean;
  signType?: string;
  message?: string;
  error?: string;
}

export interface SignerInfo {
  description: string;
  purpose: string;
  defaultPort: number;
  endpoints: Record<string, string>;
  installHint: string;
}

export interface SignerInfoResponse {
  success: boolean;
  info: SignerInfo;
  certificates?: unknown;
}

const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }
  return session.access_token;
};

const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  headers['Authorization'] = `Bearer ${token}`;

  // Merge custom headers
  if (options.headers) {
    const custom = options.headers as Record<string, string>;
    for (const key in custom) {
      headers[key] = custom[key];
    }
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = options.body;
  }

  console.log('[nfeService] Fetching:', url, 'Options:', fetchOptions);

  const response = await fetch(url, fetchOptions);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
};

/**
 * Get NF-e configuration (emitente data)
 */
export const getNFeConfig = async (): Promise<EmitenteConfig | null> => {
  const data = await apiRequest(`${API_URL}/api/nfe/config`);
  return data.config;
};

/**
 * Save NF-e configuration
 */
export const saveNFeConfig = async (config: EmitenteConfig): Promise<EmitenteConfig> => {
  const data = await apiRequest(`${API_URL}/api/nfe/config`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return data.config;
};

/**
 * Prepare NF-e data from an order for review
 */
export const prepararNFe = async (orderId: string): Promise<any> => {
  return apiRequest(`${API_URL}/api/nfe/preparar`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
};

/**
 * Delete a draft or unsubmitted NF-e record locally
 */
export const deleteNFe = async (nfeId: string): Promise<any> => {
  return apiRequest(`${API_URL}/api/nfe/delete`, {
    method: 'POST',
    body: JSON.stringify({ nfe_id: nfeId }),
  });
};

/**
 * Issue NF-e from an order
 */
export const emitirNFe = async (
  orderId: string,
  certificateType: 'A1' | 'A3' = 'A3',
  customDestinatario?: any,
  customItens?: any[]
): Promise<NFeResponse> => {
  return apiRequest(`${API_URL}/api/nfe/emitir`, {
    method: 'POST',
    body: JSON.stringify({
      order_id: orderId,
      certificate_type: certificateType,
      custom_destinatario: customDestinatario,
      custom_itens: customItens,
    }),
  });
};

/**
 * Sign NF-e XML (for A3 certificates)
 */
export const signNFeXML = async (
  xml: string,
  nfeId: string,
  signerUrl?: string
): Promise<NFeResponse> => {
  return apiRequest(`${API_URL}/api/nfe/sign`, {
    method: 'POST',
    body: JSON.stringify({ xml, nfe_id: nfeId, signer_url: signerUrl }),
  });
};

/**
 * Send signed NF-e to SEFAZ
 */
export const enviarNFeSEFAZ = async (nfeId: string): Promise<NFeResponse> => {
  return apiRequest(`${API_URL}/api/nfe/enviar`, {
    method: 'POST',
    body: JSON.stringify({ nfe_id: nfeId }),
  });
};

/**
 * List NF-e records
 */
export const listNFe = async (filters?: {
  status?: string;
  order_id?: string;
}): Promise<NFeRecord[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.order_id) params.append('order_id', filters.order_id);

  const query = params.toString();
  const data = await apiRequest(
    `${API_URL}/api/nfe/listar${query ? '?' + query : ''}`
  );
  return data.nfe;
};

/**
 * Get single NF-e
 */
export const getNFe = async (id: string): Promise<NFeRecord> => {
  const data = await apiRequest(`${API_URL}/api/nfe/${id}`);
  return data.nfe;
};

/**
 * Cancel NF-e
 */
export const cancelNFe = async (nfeId: string, reason: string): Promise<NFeResponse> => {
  return apiRequest(`${API_URL}/api/nfe/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ nfe_id: nfeId, reason }),
  });
};

/**
 * Download NF-e XML
 */
export const downloadNFeXML = async (nfeId: string): Promise<void> => {
  const token = await getAuthToken();
  const url = `${API_URL}/api/nfe/${nfeId}/xml`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Erro ao baixar XML');
  }

  const xmlText = await response.text();
  const blob = new Blob([xmlText], { type: 'application/xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `NFe-${nfeId}.xml`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Download DANFE (PDF)
 */
export const downloadDANFE = async (nfeId: string): Promise<void> => {
  const token = await getAuthToken();
  const url = `${API_URL}/api/nfe/${nfeId}/danfe`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Erro ao gerar DANFE');
  }

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `DANFE-${nfeId}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Get local signer info
 */
export const getSignerInfo = async (): Promise<SignerInfoResponse> => {
  return apiRequest(`${API_URL}/api/nfe/signer-info`);
};

/**
 * Upload A1 certificate (.pfx/.p12)
 */
export const uploadCertificate = async (file: File, password: string): Promise<any> => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('certificate', file);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/api/nfe/certificate/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro no upload do certificado');
  }
  return data;
};

/**
 * Status labels for display
 */
export const NFE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  gerada: { label: 'Gerada', color: 'bg-blue-100 text-blue-800' },
  assinada: { label: 'Assinada', color: 'bg-yellow-100 text-yellow-800' },
  enviada: { label: 'Enviada', color: 'bg-purple-100 text-purple-800' },
  autorizada: { label: 'Autorizada', color: 'bg-green-100 text-green-800' },
  rejeitada: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

/**
 * UF list for select
 */
export const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/**
 * CRT options
 */
export const CRT_OPTIONS = [
  { value: '1', label: '1 - Simples Nacional' },
  { value: '2', label: '2 - Simples Nacional - Excesso de Sublimite' },
  { value: '3', label: '3 - Regime Normal' },
];

/**
 * Lookup CNPJ data from BrasilAPI
 * Returns company information based on CNPJ number
 */
export const lookupCNPJ = async (cnpj: string): Promise<any> => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) {
    throw new Error('CNPJ inválido');
  }
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
  if (!response.ok) {
    throw new Error('CNPJ não encontrado');
  }
  return response.json();
};

/**
 * Lookup CEP (ZIP code) data from ViaCEP
 * Returns address information based on CEP
 */
export const lookupCEP = async (cep: string): Promise<any> => {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) {
    throw new Error('CEP inválido');
  }
  const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
  if (!response.ok) {
    throw new Error('CEP não encontrado');
  }
  const data = await response.json();
  if (data.erro) {
    throw new Error('CEP não encontrado');
  }
  return data;
};
