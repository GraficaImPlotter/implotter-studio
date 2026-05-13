import { supabaseAdmin } from './supabaseService.js';
import { logger } from './logger.js';
import crypto from 'crypto';
import { format } from 'date-fns';

/**
 * NF-e Service - Handles NF-e XML generation and SEFAZ integration
 * Follows SEFAZ NF-e 4.00 specification
 */

// NF-e model (1 = NFe, 2 = NFC-e) - default 1
const NF_MODE = '1';

// SEFAZ Web Service URLs (Production / Homologation)
const SEFAZ_ENV = process.env.NFE_ENV || 'homologacao'; // homologacao or producao
const SEFAZ_STATE = process.env.NFE_STATE || 'SP';

const SEFAZ_URLS = {
  SP: {
    homologacao: {
      autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao.asmx',
      retAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao.asmx',
      consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsulta2.asmx',
      cancelamento: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfecancela2.asmx',
      status: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico2.asmx',
    },
    producao: {
      autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao.asmx',
      retAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao.asmx',
      consulta: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsulta2.asmx',
      cancelamento: 'https://nfe.fazenda.sp.gov.br/ws/nfecancela2.asmx',
      status: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico2.asmx',
    },
  },
};

function getSEFAZUrl(service) {
  const env = SEFAZ_ENV === 'producao' ? 'producao' : 'homologacao';
  const state = SEFAZ_STATE.toUpperCase();
  return SEFAZ_URLS[state]?.[env]?.[service] || SEFAZ_URLS.SP[env][service];
}

/**
 * Generate a unique access key (chave de acesso) for NF-e
 * 44 digits: UF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + num(9) + tpEmis(1) + cod(8) + dv(1)
 */
function generateAccessKey(emitenteCNPJ, serie, numero, tpEmis = '1') {
  const uf = '35'; // SP
  const now = new Date();
  const aamm = format(now, 'yyMM');
  const mod = '55'; // NF-e model
  const seriePadded = String(serie).padStart(3, '0');
  const numPadded = String(numero).padStart(9, '0');
  const cnpjPadded = emitenteCNPJ.replace(/\D/g, '').padStart(14, '0');

  // Random 8-digit code
  const cod = String(Math.floor(Math.random() * 99999999) + 1).padStart(8, '0');

  const baseKey = uf + aamm + cnpjPadded + mod + seriePadded + numPadded + tpEmis + cod;

  // Calculate check digit (mod 11)
  let sum = 0;
  let weight = 2;
  for (let i = baseKey.length - 1; i >= 0; i--) {
    sum += parseInt(baseKey[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const dv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

  return baseKey + dv;
}

/**
 * Generate NF-e XML from order data
 */
function generateNFeXML(data) {
  const {
    accessKey,
    emitente: emitenteRaw,
    destinatario,
    itens,
    numero,
    serie,
    valorTotal,
    valorFrete = 0,
    valorSeguro = 0,
    valorDesconto = 0,
    tipoPagamento = '1', // 1=À vista, 2=A prazo, 3=Outros
    formaPagamento = '01', // 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, etc.
    valorPago,
  } = data;

  const emitente = {
    cnpj: emitenteRaw.cnpj || '',
    razaoSocial: emitenteRaw.razao_social || emitenteRaw.razaoSocial || '',
    nomeFantasia: emitenteRaw.nome_fantasia || emitenteRaw.nomeFantasia || '',
    inscricaoEstadual: emitenteRaw.inscricao_estadual || emitenteRaw.inscricaoEstadual || '',
    crt: emitenteRaw.crt || '',
    telefone: emitenteRaw.telefone || '',
    codigoMunicipio: emitenteRaw.endereco?.codigo_municipio || emitenteRaw.endereco?.codigoMunicipio || emitenteRaw.codigoMunicipio || '3550308',
    endereco: {
      logradouro: emitenteRaw.endereco?.logradouro || '',
      numero: emitenteRaw.endereco?.numero || '',
      complemento: emitenteRaw.endereco?.complemento || '',
      bairro: emitenteRaw.endereco?.bairro || '',
      municipio: emitenteRaw.endereco?.municipio || '',
      codigoMunicipio: emitenteRaw.endereco?.codigo_municipio || emitenteRaw.endereco?.codigoMunicipio || '3550308',
      uf: emitenteRaw.endereco?.uf || 'SP',
      cep: emitenteRaw.endereco?.cep || '',
    }
  };

  const now = new Date();
  const dhEmissao = format(now, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const dhSaiEnt = format(now, "yyyy-MM-dd'T'HH:mm:ssXXX");

  let itensXML = '';
  let totalICMS = 0;
  let totalIPI = 0;
  let totalPIS = 0;
  let totalCOFINS = 0;

  itens.forEach((item, index) => {
    const nItem = index + 1;
    const vICMS = item.valorICMS || 0;
    const vIPI = item.valorIPI || 0;
    const vPIS = item.valorPIS || 0;
    const vCOFINS = item.valorCOFINS || 0;
    const vProd = item.valorTotal;
    const vBC = item.valorBaseCalculo || vProd;

    totalICMS += vICMS;
    totalIPI += vIPI;
    totalPIS += vPIS;
    totalCOFINS += vCOFINS;

    itensXML += `
    <det nItem="${nItem}">
      <prod>
        <cProd>${escapeXML(item.codigo || item.id)}</cProd>
        <cEAN>${item.cEAN || 'SEM GTIN'}</cEAN>
        <xProd>${escapeXML(item.descricao)}</xProd>
        <NCM>${item.NCM || '99999999'}</NCM>
        <CFOP>${item.CFOP || '5102'}</CFOP>
        <uCom>${escapeXML(item.unidade || 'UN')}</uCom>
        <qCom>${item.quantidade.toFixed(4)}</qCom>
        <vUnCom>${item.valorUnitario.toFixed(4)}</vUnCom>
        <vProd>${vProd.toFixed(2)}</vProd>
        <cEANTrib>${item.cEANTrib || 'SEM GTIN'}</cEANTrib>
        <uTrib>${escapeXML(item.unidade || 'UN')}</uTrib>
        <qTrib>${item.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${item.valorUnitario.toFixed(4)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${(vICMS + vIPI + vPIS + vCOFINS).toFixed(2)}</vTotTrib>
        <ICMS>
          <ICMS00>
            <orig>${item.origem || '0'}</orig>
            <CST>00</CST>
            <modBC>0</modBC>
            <vBC>${vBC.toFixed(2)}</vBC>
            <pICMS>${item.aliquotaICMS || '18.00'}</pICMS>
            <vICMS>${vICMS.toFixed(2)}</vICMS>
          </ICMS00>
        </ICMS>
        <PIS>
          <PISAliq>
            <CST>01</CST>
            <vBC>${vBC.toFixed(2)}</vBC>
            <pPIS>${item.aliquotaPIS || '1.65'}</pPIS>
            <vPIS>${vPIS.toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>01</CST>
            <vBC>${vBC.toFixed(2)}</vBC>
            <pCOFINS>${item.aliquotaCOFINS || '7.60'}</pCOFINS>
            <vCOFINS>${vCOFINS.toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${accessKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${accessKey.substring(35, 43)}</cNF>
        <natOp>${escapeXML(data.naturezaOperacao || 'Venda de Mercadoria')}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${dhEmissao}</dhEmi>
        <dhSaiEnt>${dhSaiEnt}</dhSaiEnt>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${emitente.codigoMunicipio || '3550308'}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${accessKey.slice(-1)}</cDV>
        <tpAmb>${SEFAZ_ENV === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>${data.finalidade || '1'}</finNFe>
        <indFinal>${data.indFinal || '0'}</indFinal>
        <indPres>${data.indPres || '2'}</indPres>
        <procEmi>0</procEmi>
        <verProc>ImPlotter_1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${emitente.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${escapeXML(emitente.razaoSocial)}</xNome>
        <xFant>${escapeXML(emitente.nomeFantasia || emitente.razaoSocial)}</xFant>
        <enderEmit>
          <xLgr>${escapeXML(emitente.endereco.logradouro)}</xLgr>
          <nro>${escapeXML(emitente.endereco.numero)}</nro>
          ${emitente.endereco.complemento ? `<xCpl>${escapeXML(emitente.endereco.complemento)}</xCpl>` : ''}
          <xBairro>${escapeXML(emitente.endereco.bairro)}</xBairro>
          <cMun>${emitente.endereco.codigoMunicipio || '3550308'}</cMun>
          <xMun>${escapeXML(emitente.endereco.municipio)}</xMun>
          <UF>${emitente.endereco.uf || 'SP'}</UF>
          <CEP>${emitente.endereco.cep.replace(/\D/g, '')}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
          <fone>${emitente.telefone ? emitente.telefone.replace(/\D/g, '') : ''}</fone>
        </enderEmit>
        <IE>${emitente.inscricaoEstadual.replace(/\D/g, '')}</IE>
        <CRT>${emitente.crt || '3'}</CRT>
      </emit>
      <dest>
        ${destinatario.cnpj ? `<CNPJ>${destinatario.cnpj.replace(/\D/g, '')}</CNPJ>` : `<CPF>${destinatario.cpf.replace(/\D/g, '')}</CPF>`}
        <xNome>${escapeXML(destinatario.nome)}</xNome>
        <enderDest>
          <xLgr>${escapeXML(destinatario.endereco.logradouro)}</xLgr>
          <nro>${escapeXML(destinatario.endereco.numero)}</nro>
          ${destinatario.endereco.complemento ? `<xCpl>${escapeXML(destinatario.endereco.complemento)}</xCpl>` : ''}
          <xBairro>${escapeXML(destinatario.endereco.bairro)}</xBairro>
          <cMun>${destinatario.endereco.codigoMunicipio || '3550308'}</cMun>
          <xMun>${escapeXML(destinatario.endereco.municipio)}</xMun>
          <UF>${destinatario.endereco.uf || 'SP'}</UF>
          <CEP>${destinatario.endereco.cep.replace(/\D/g, '')}</CEP>
          <cPais>1058</cPais>
          <xPais>Brasil</xPais>
          ${destinatario.telefone ? `<fone>${destinatario.telefone.replace(/\D/g, '')}</fone>` : ''}
        </enderDest>
        <indIEDest>${destinatario.indIEDest || '9'}</indIEDest>
        ${destinatario.inscricaoEstadual ? `<IE>${destinatario.inscricaoEstadual.replace(/\D/g, '')}</IE>` : ''}
        <email>${escapeXML(destinatario.email || '')}</email>
      </dest>
      ${itensXML}
      <total>
        <ICMSTot>
          <vBC>${totalICMS > 0 ? (valorTotal - totalICMS).toFixed(2) : valorTotal.toFixed(2)}</vBC>
          <vICMS>${totalICMS.toFixed(2)}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${valorTotal.toFixed(2)}</vProd>
          <vFrete>${valorFrete.toFixed(2)}</vFrete>
          <vSeg>${valorSeguro.toFixed(2)}</vSeg>
          <vDesc>${valorDesconto.toFixed(2)}</vDesc>
          <vII>0.00</vII>
          <vIPI>${totalIPI.toFixed(2)}</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>${totalPIS.toFixed(2)}</vPIS>
          <vCOFINS>${totalCOFINS.toFixed(2)}</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${(valorTotal + valorFrete + valorSeguro - valorDesconto).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>${data.modalidadeFrete || '9'}</modFrete>
        ${data.transportadora ? `
        <transporta>
          ${data.transportadora.cnpj ? `<CNPJ>${data.transportadora.cnpj.replace(/\D/g, '')}</CNPJ>` : ''}
          <xNome>${escapeXML(data.transportadora.nome)}</xNome>
          <IE>${data.transportadora.ie.replace(/\D/g, '')}</IE>
          <xEnder>${escapeXML(data.transportadora.endereco)}</xEnder>
          <xMun>${escapeXML(data.transportadora.municipio)}</xMun>
          <UF>${data.transportadora.uf}</UF>
        </transporta>` : ''}
      </transp>
      <pag>
        <detPag>
          <indPag>${tipoPagamento}</indPag>
          <tPag>${formaPagamento}</tPag>
          <vPag>${(valorPago || valorTotal).toFixed(2)}</vPag>
        </detPag>
      </pag>
      <infAdic>
        ${data.informacoesComplementares ? `<infCpl>${escapeXML(data.informacoesComplementares)}</infCpl>` : ''}
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;

  return xml;
}

/**
 * Sign NF-e XML with digital certificate
 * For A3 certificates, the signing should be done via a local signer service
 * For A1 certificates, we can sign directly here
 */
async function signNFeXML(xml, certificateData) {
  // For A3 certificates, the XML should be sent to a local signer service
  // that interfaces with the USB token/smartcard
  // The local signer typically runs on localhost:port

  if (certificateData.type === 'A1') {
    return signWithA1(xml, certificateData);
  } else if (certificateData.type === 'A3') {
    return signWithA3(xml, certificateData);
  }

  throw new Error('Tipo de certificado não suportado');
}

/**
 * Sign XML with A1 certificate (file-based)
 */
async function signWithA1(xml, certData) {
  try {
    logger.info('A1 certificate signing (simulated)');
    
    const fakeSignature = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#c14n#"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <DigestValue>f2jDnd8323NDjs=</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>MC0CFQCM7...</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>MIIE3DCCA8SgAwIBAgIQ...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>`;

    const signedXml = xml.replace('</infNFe>', `</infNFe>${fakeSignature}`);

    return {
      success: true,
      signed: true,
      signedXML: signedXml,
      message: 'NF-e assinada com sucesso com Certificado A1 (simulado)',
    };
  } catch (error) {
    logger.error('A1 signing error', { message: error.message });
    throw error;
  }
}

/**
 * Sign XML with A3 certificate via local signer service
 * The local signer service interfaces with the USB token
 */
async function signWithA3(xml, certData) {
  try {
    // The local signer service should be running on the client machine
    // We communicate with it via HTTP to localhost
    const signerUrl = process.env.LOCAL_SIGNER_URL || 'http://localhost:8443';

    // In a real implementation, the frontend would:
    // 1. Request XML from backend
    // 2. Send XML to local signer (via frontend JavaScript)
    // 3. Local signer signs with A3 token
    // 4. Signed XML sent back to backend for SEFAZ submission

    logger.info('A3 certificate signing via local signer', { signerUrl });
    return {
      signed: false,
      xml,
      needsLocalSigner: true,
      signerUrl,
      message: 'A3 signing requires local signer service',
    };
  } catch (error) {
    logger.error('A3 signing error', { message: error.message });
    throw error;
  }
}

/**
 * Send signed XML to SEFAZ for authorization
 */
async function sendToSEFAZ(signedXML, accessKey) {
  try {
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap:Header/>
  <soap:Body>
    <nfe:nfeDadosMsg>
      <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>1</idLote>
        <indSinc>1</indSinc>
        ${signedXML}
      </enviNFe>
    </nfe:nfeDadosMsg>
  </soap:Body>
</soap:Envelope>`;

    const url = getSEFAZUrl('autorizacao');

    logger.info('Sending to SEFAZ', { url, accessKey });

    // In production, use a SOAP client or fetch with proper headers
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    //   body: soapEnvelope,
    // });

    // Placeholder response
    return {
      success: false,
      message: 'SEFAZ integration pending - requires SOAP client implementation',
      soapEnvelope,
    };
  } catch (error) {
    logger.error('SEFAZ send error', { message: error.message });
    throw error;
  }
}

/**
 * Issue NF-e from an order
 */
async function emitirNFe(orderId, emitenteConfig, certificateData, customData = null) {
  try {
    // Fetch order data from Supabase (excluding profiles due to missing foreign key constraint)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(*, products(*))
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    // Get next NF-e number
    const { data: config } = await supabaseAdmin
      .from('nfe_config')
      .select('*')
      .single();

    const serie = config?.serie || 1;
    const numero = config?.proximo_numero || 1;

    let destinatario;
    let itens;
    let valorTotal;

    if (customData && customData.destinatario && customData.itens) {
      destinatario = customData.destinatario;
      itens = customData.itens;
      valorTotal = customData.valorTotal || itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0) || order.total || 0;
    } else {
      // Fetch profile manually if customer_id exists
      let profile = null;
      if (order.customer_id) {
        try {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', order.customer_id)
            .maybeSingle();
          profile = profileData;
        } catch (err) {
          logger.error('Error fetching profile for NFe', { message: err.message, customerId: order.customer_id });
        }
      }

      const cleanCpfCnpj = (order.customer_cpf_cnpj || '').replace(/\D/g, '');
      const isCnpj = cleanCpfCnpj.length === 14;
      const isCpf = cleanCpfCnpj.length === 11;

      // Build destinatario from order
      destinatario = {
        nome: profile?.full_name || order.customer_name || 'Consumidor Final',
        cpf: profile?.cpf || (isCpf ? cleanCpfCnpj : ''),
        cnpj: profile?.cnpj || (isCnpj ? cleanCpfCnpj : ''),
        email: profile?.email || order.customer_email || '',
        endereco: {
          logradouro: order.shipping_address?.street || order.address_street || '',
          numero: order.shipping_address?.number || order.address_number || '',
          complemento: order.shipping_address?.complement || order.address_complement || '',
          bairro: order.shipping_address?.neighborhood || order.address_neighborhood || '',
          municipio: order.shipping_address?.city || order.address_city || '',
          uf: order.shipping_address?.state || order.address_state || 'SP',
          cep: order.shipping_address?.zip || order.address_zip || '',
        },
        indIEDest: profile?.tipo_pessoa === 'juridica' ? '1' : '9',
        inscricaoEstadual: profile?.ie || '',
      };

      // Build items
      itens = order.order_items.map((item) => {
        const vTotal = item.subtotal || item.total_price || 0;
        return {
          id: item.product_id,
          codigo: item.products?.sku || item.product_id,
          descricao: item.products?.name || item.product_name || 'Produto',
          NCM: item.products?.ncm || '99999999',
          CFOP: '5102',
          unidade: 'UN',
          quantidade: item.quantity,
          valorUnitario: item.unit_price,
          valorTotal: vTotal,
          valorBaseCalculo: vTotal,
          aliquotaICMS: '18.00',
          valorICMS: vTotal * 0.18,
          aliquotaPIS: '1.65',
          valorPIS: vTotal * 0.0165,
          aliquotaCOFINS: '7.60',
          valorCOFINS: vTotal * 0.076,
          origem: '0',
        };
      });

      valorTotal = order.total || 0;
    }

    const accessKey = generateAccessKey(emitenteConfig.cnpj, serie, numero);

    // Generate XML
    const xmlData = {
      accessKey,
      emitente: emitenteConfig,
      destinatario,
      itens,
      numero,
      serie,
      valorTotal,
      naturezaOperacao: 'Venda de Mercadoria',
      finalidade: '1',
      indFinal: '1',
      indPres: '2',
      modalidadeFrete: '9',
    };

    const xml = generateNFeXML(xmlData);

    // Save NF-e record to database
    const { data: nfeRecord, error: nfeError } = await supabaseAdmin
      .from('nfe')
      .insert({
        order_id: orderId,
        access_key: accessKey,
        numero,
        serie,
        xml_gerado: xml,
        status: 'gerada',
        valor_total: valorTotal,
        emitente_config: emitenteConfig,
        destinatario_data: destinatario,
        itens_data: itens,
      })
      .select()
      .single();

    if (nfeError) throw nfeError;

    // Update next number
    await supabaseAdmin
      .from('nfe_config')
      .update({ proximo_numero: numero + 1 })
      .eq('id', config?.id);

    logger.info('NF-e generated', { accessKey, numero, orderId });

    return {
      success: true,
      nfe: nfeRecord,
      xml,
      accessKey,
      needsSigning: true,
      signType: certificateData?.type || 'A3',
    };
  } catch (error) {
    logger.error('Error issuing NF-e', { message: error.message, orderId });
    throw error;
  }
}

/**
 * Get NF-e by ID
 */
async function getNFe(nfeId) {
  const { data, error } = await supabaseAdmin
    .from('nfe')
    .select('*')
    .eq('id', nfeId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * List NF-e with filters
 */
async function listNFe(filters = {}) {
  let query = supabaseAdmin
    .from('nfe')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Cancel NF-e
 */
async function cancelNFe(nfeId, reason) {
  try {
    const nfe = await getNFe(nfeId);

    if (!nfe) throw new Error('NF-e não encontrada');
    if (nfe.status !== 'autorizada') {
      throw new Error('Apenas NF-e autorizada pode ser cancelada');
    }

    // In production: send cancellation request to SEFAZ
    // For now, just update status
    const { error } = await supabaseAdmin
      .from('nfe')
      .update({
        status: 'cancelada',
        cancel_reason: reason,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', nfeId);

    if (error) throw error;

    logger.info('NF-e cancelled', { nfeId, reason });
    return { success: true, message: 'NF-e cancelada com sucesso' };
  } catch (error) {
    logger.error('Error cancelling NF-e', { message: error.message, nfeId });
    throw error;
  }
}

/**
 * Generate DANFE (PDF representation of NF-e)
 */
async function generateDANFE(nfeId) {
  try {
    const nfe = await getNFe(nfeId);
    if (!nfe) throw new Error('NF-e não encontrada');

    // In production, use a DANFE generation library or service
    // For now, return a placeholder
    return {
      success: false,
      message: 'DANFE generation requires implementation with PDF library (jspdf)',
    };
  } catch (error) {
    logger.error('Error generating DANFE', { message: error.message, nfeId });
    throw error;
  }
}

async function prepararNFe(orderId) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(*, products(*))
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    let profile = null;
    if (order.customer_id) {
      try {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', order.customer_id)
          .maybeSingle();
        profile = profileData;
      } catch (err) {
        logger.error('Error fetching profile for preparing NFe', { message: err.message, customerId: order.customer_id });
      }
    }

    const cleanCpfCnpj = (order.customer_cpf_cnpj || '').replace(/\D/g, '');
    const isCnpj = cleanCpfCnpj.length === 14;
    const isCpf = cleanCpfCnpj.length === 11;

    const destinatario = {
      nome: profile?.full_name || order.customer_name || 'Consumidor Final',
      cpf: profile?.cpf || (isCpf ? cleanCpfCnpj : ''),
      cnpj: profile?.cnpj || (isCnpj ? cleanCpfCnpj : ''),
      email: profile?.email || order.customer_email || '',
      endereco: {
        logradouro: order.shipping_address?.street || order.address_street || '',
        numero: order.shipping_address?.number || order.address_number || '',
        complemento: order.shipping_address?.complement || order.address_complement || '',
        bairro: order.shipping_address?.neighborhood || order.address_neighborhood || '',
        municipio: order.shipping_address?.city || order.address_city || '',
        uf: order.shipping_address?.state || order.address_state || 'SP',
        cep: order.shipping_address?.zip || order.address_zip || '',
      },
      indIEDest: profile?.tipo_pessoa === 'juridica' ? '1' : '9',
      inscricaoEstadual: profile?.ie || '',
    };

    const itens = order.order_items.map((item) => {
      const vTotal = item.subtotal || item.total_price || 0;
      return {
        id: item.product_id,
        codigo: item.products?.sku || item.product_id,
        descricao: item.products?.name || item.product_name || 'Produto',
        NCM: item.products?.ncm || '99999999',
        CFOP: '5102',
        unidade: 'UN',
        quantidade: item.quantity,
        valorUnitario: item.unit_price,
        valorTotal: vTotal,
        valorBaseCalculo: vTotal,
        aliquotaICMS: '18.00',
        valorICMS: vTotal * 0.18,
        aliquotaPIS: '1.65',
        valorPIS: vTotal * 0.0165,
        aliquotaCOFINS: '7.60',
        valorCOFINS: vTotal * 0.076,
        origem: '0',
      };
    });

    const valorTotal = order.total || 0;

    return {
      destinatario,
      itens,
      valorTotal,
    };
  } catch (error) {
    logger.error('Error preparing NFe', { message: error.message, orderId });
    throw error;
  }
}

function escapeXML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export {
  emitirNFe,
  prepararNFe,
  getNFe,
  listNFe,
  cancelNFe,
  generateDANFE,
  signNFeXML,
  sendToSEFAZ,
  generateNFeXML,
  generateAccessKey,
};
