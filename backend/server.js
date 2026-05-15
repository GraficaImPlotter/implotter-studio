import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { processChat } from './services/geminiService.js';
import { sendToAdmin } from './services/telegramService.js';
import { supabaseAdmin } from './services/supabaseService.js';
import rateLimit from 'express-rate-limit';
import { logger } from './services/logger.js';
import {
  emitirNFe,
  prepararNFe,
  getNFe,
  listNFe,
  cancelNFe,
  generateDANFE,
  signNFeXML,
} from './services/nfeService.js';
import {
  signWithA3,
  signWithA1,
  getLocalSignerInfo,
} from './services/certificateService.js';
import { scrapeGoogleMaps } from './services/googleMapsService.js';
import { analyzeLeadPresence } from './services/visualAnalysisService.js';
import { sendWhatsAppMessage } from './services/whatsappService.js';
import { 
  processIncomingXML, 
  listIncomingInvoices, 
  listExpenses, 
  createExpense,
  resyncAllInvoices
} from './services/incomingNfeService.js';



// Resolve problema de caminho rodando pelo CWD
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Storage path for certificates
const CERT_STORAGE_PATH = process.env.CERT_STORAGE_PATH || path.join(__dirname, 'certs');

// Ensure cert storage directory exists
try { mkdirSync(CERT_STORAGE_PATH, { recursive: true }); } catch {}

// Multer config for .pfx uploads
const upload = multer({
  dest: CERT_STORAGE_PATH,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.pfx') && !file.originalname.endsWith('.p12')) {
      return cb(new Error('Apenas arquivos .pfx ou .p12 são permitidos'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Multer config for XML uploads
const xmlUpload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});


const app = express();

// SEC-002: CORS - aceita qualquer origem (desenvolvimento)
app.use(cors({
  origin: ['https://graficaimplotter.com.br', 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '100kb' }));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://graficaimplotter.com.br"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.gemini.google.com", "http://localhost:*", "http://127.0.0.1:*", "https://graficaimplotter.com.br", "https://graficaimplotter.com.br:3001"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// SEC-003: Rate limiting — general (100 req/15min) and chat-specific (20 req/min)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});

// JWT verification middleware for protected endpoints
async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }
  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  } catch (err) {
    logger.error('Erro na verificação do JWT', { message: err.message });
    res.status(401).json({ error: 'Falha na autenticação.' });
  }
}

// Apply general rate limiter to all requests
app.use(generalLimiter);

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Formato de mensagens inválido." });
    }

    if (messages.length > 50) {
      return res.status(400).json({ error: "Histórico de mensagens muito longo. Máximo 50 mensagens." });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return res.status(400).json({ error: "Formato de mensagem inválido." });
      }
      if (msg.content.length > 5000) {
        return res.status(400).json({ error: "Mensagem muito longa. Máximo 5000 caracteres." });
      }
    }

    const answerTitle = await processChat(messages);
    res.json({ reply: answerTitle });

  } catch (error) {
    logger.error("Endpoint Error:", { message: error?.message || error });
    res.status(500).json({ error: "Erro interno no servidor de chat." });
  }
});

// HUMAN CHAT ENDPOINT — protegido por JWT
app.post('/api/chat/human', chatLimiter, verifyAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const userName = req.user.email || req.user.user_metadata?.name;
    const userEmail = req.user.email;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória." });
    }

    const { data: dbMsg, error: dbError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender_type: 'client',
        content: message,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const telegramMsgId = await sendToAdmin(message, { userId, userName, userEmail });

    if (telegramMsgId) {
      await supabaseAdmin
        .from('chat_messages')
        .update({ telegram_message_id: telegramMsgId })
        .eq('id', dbMsg.id);
    }

    res.json({ success: true, messageId: dbMsg.id });

  } catch (error) {
    logger.error("Human Chat Error:", { message: error.message });
    res.status(500).json({ error: "Erro ao processar mensagem humana." });
  }
});

// TELEGRAM WEBHOOK
app.post('/api/webhooks/telegram', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.reply_to_message || !message.text) {
      return res.sendStatus(200);
    }

    const replyToMsg = message.reply_to_message;
    const adminResponse = message.text;

    const userIdMatch = replyToMsg.text?.match(/ID: ([a-z0-9-]+)/i);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      logger.warn("Não foi possível extrair o UserID da resposta do Telegram.");
      return res.sendStatus(200);
    }

    const { error: dbError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender_type: 'admin',
        content: adminResponse,
      });

    if (dbError) {
      logger.error("Erro ao salvar resposta do admin no DB:", { message: dbError.message });
    }

    res.sendStatus(200);

  } catch (error) {
    logger.error("Telegram Webhook Error:", { message: error.message });
    res.sendStatus(200);
  }
});

// ==================== NF-e ROUTES ====================

// Get NF-e configuration (emitente data)
app.get('/api/nfe/config', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('nfe_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ success: true, config: data || null });
  } catch (error) {
    logger.error('Error fetching NF-e config', { message: error.message });
    res.status(500).json({ error: 'Erro ao buscar configuração de NF-e' });
  }
});

// Save NF-e configuration (emitente data)
app.post('/api/nfe/config', verifyAuth, async (req, res) => {
  try {
    const { certificado_a1_url, certificado_a1_password, certificado_info, ...config } = req.body;
    const userId = req.user.id;

    const { data: existing } = await supabaseAdmin
      .from('nfe_config')
      .select('id')
      .single();

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from('nfe_config')
        .update({ ...config, updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from('nfe_config')
        .insert({ ...config, created_by: userId })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json({ success: true, config: result.data });
  } catch (error) {
    logger.error('Error saving NF-e config', { message: error.message });
    res.status(500).json({ error: 'Erro ao salvar configuração de NF-e' });
  }
});

// Prepare NF-e data for review before generation
app.post('/api/nfe/preparar', verifyAuth, async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    const result = await prepararNFe(order_id);
    res.json(result);
  } catch (error) {
    logger.error('Error preparing NF-e', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao preparar dados da NF-e' });
  }
});

// Delete/Discard draft NFe local record (only if status is gerada, rejeitada, or assinada)
app.post('/api/nfe/delete', verifyAuth, async (req, res) => {
  try {
    const { nfe_id } = req.body;

    if (!nfe_id) {
      return res.status(400).json({ error: 'ID da NF-e é obrigatório' });
    }

    // Check status first to prevent deleting authorized/canceled invoices
    const { data: nfe, error: fetchError } = await supabaseAdmin
      .from('nfe')
      .select('status')
      .eq('id', nfe_id)
      .single();

    if (fetchError || !nfe) {
      return res.status(404).json({ error: 'NF-e não encontrada' });
    }

    if (!['gerada', 'assinada', 'rejeitada'].includes(nfe.status)) {
      return res.status(400).json({ error: 'Apenas NF-es não enviadas ou rejeitadas podem ser excluídas localmente' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('nfe')
      .delete()
      .eq('id', nfe_id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Nota Fiscal excluída localmente com sucesso' });
  } catch (error) {
    logger.error('Error deleting NFe', { message: error.message, nfeId: req.body.nfe_id });
    res.status(500).json({ error: error.message || 'Erro ao excluir NF-e' });
  }
});

// Issue NF-e from order
app.post('/api/nfe/emitir', verifyAuth, async (req, res) => {
  try {
    const { order_id, certificate_type = 'A3', custom_destinatario, custom_itens } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // Get emitente config
    const { data: config } = await supabaseAdmin
      .from('nfe_config')
      .select('*')
      .single();

    if (!config) {
      return res.status(400).json({ error: 'Configuração do emitente não encontrada' });
    }

    const customData = (custom_destinatario && custom_itens) ? { destinatario: custom_destinatario, itens: custom_itens } : null;
    const result = await emitirNFe(order_id, config, { type: certificate_type }, customData);

    res.json(result);
  } catch (error) {
    logger.error('Error issuing NF-e', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao emitir NF-e' });
  }
});

// Sign NF-e XML — always uses server-side signing (A1 simulation)
app.post('/api/nfe/sign', verifyAuth, async (req, res) => {
  try {
    const { xml, nfe_id } = req.body;

    if (!xml || !nfe_id) {
      return res.status(400).json({ error: 'XML e nfe_id são obrigatórios' });
    }

    // Always sign directly on the server (A1 simulation / production: use real PFX)
    const signResult = await signNFeXML(xml, { type: 'A1' });

    if (signResult.success) {
      const { error: updateErr } = await supabaseAdmin
        .from('nfe')
        .update({
          xml_assinado: signResult.signedXML,
          status: 'assinada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', nfe_id);

      if (updateErr) {
        logger.error('Failed to update NF-e status after signing', { error: updateErr.message, nfe_id });
        return res.status(500).json({ error: `Assinatura OK mas falha ao salvar: ${updateErr.message}` });
      }

      logger.info('NF-e signed and status updated', { nfe_id });
    }

    res.json(signResult);
  } catch (error) {
    logger.error('Error signing NF-e', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao assinar NF-e' });
  }
});

// Send signed NF-e to SEFAZ
app.post('/api/nfe/enviar', verifyAuth, async (req, res) => {
  try {
    const { nfe_id } = req.body;

    if (!nfe_id) {
      return res.status(400).json({ error: 'nfe_id é obrigatório' });
    }

    const nfe = await getNFe(nfe_id);
    if (!nfe) {
      return res.status(404).json({ error: 'NF-e não encontrada' });
    }

    if (nfe.status !== 'assinada') {
      return res.status(400).json({ error: `NF-e deve estar assinada antes de enviar. Status atual: ${nfe.status}` });
    }

    // In production: send to SEFAZ
    // For now, simulate the process
    const sefazResult = {
      success: true,
      status: 'autorizada',
      protocolo: `PROTO-${Date.now()}`,
      dataAutorizacao: new Date().toISOString(),
      message: 'NF-e autorizada (simulação)',
    };

    const { error: updateErr } = await supabaseAdmin
      .from('nfe')
      .update({
        status: 'autorizada',
        protocolo: sefazResult.protocolo,
        data_autorizacao: sefazResult.dataAutorizacao,
        sefaz_response: sefazResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nfe_id);

    if (updateErr) {
      logger.error('Failed to update NF-e after SEFAZ authorization', { error: updateErr.message, nfe_id });
      return res.status(500).json({ error: `Autorização OK mas falha ao salvar: ${updateErr.message}` });
    }

    logger.info('NF-e authorized by SEFAZ (simulated)', { nfe_id, protocolo: sefazResult.protocolo });
    res.json(sefazResult);
  } catch (error) {
    logger.error('Error sending NF-e to SEFAZ', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao enviar NF-e para SEFAZ' });
  }
});

// List NF-e
app.get('/api/nfe/listar', verifyAuth, async (req, res) => {
  try {
    const { status, order_id } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (order_id) filters.orderId = order_id;

    const nfeList = await listNFe(filters);
    res.json({ success: true, nfe: nfeList });
  } catch (error) {
    logger.error('Error listing NF-e', { message: error.message });
    res.status(500).json({ error: 'Erro ao listar NF-e' });
  }
});

// Get Local Signer info
app.get('/api/nfe/signer-info', verifyAuth, async (req, res) => {
  try {
    const info = getLocalSignerInfo();
    res.json({ success: true, info });
  } catch (error) {
    res.json({ success: true, info: getLocalSignerInfo() });
  }
});

// Get single NF-e
app.get('/api/nfe/:id', verifyAuth, async (req, res) => {
  try {
    const nfe = await getNFe(req.params.id);
    if (!nfe) {
      return res.status(404).json({ error: 'NF-e não encontrada' });
    }
    res.json({ success: true, nfe });
  } catch (error) {
    logger.error('Error fetching NF-e', { message: error.message });
    res.status(500).json({ error: 'Erro ao buscar NF-e' });
  }
});

// Cancel NF-e
app.post('/api/nfe/cancelar', verifyAuth, async (req, res) => {
  try {
    const { nfe_id, reason } = req.body;

    if (!nfe_id || !reason) {
      return res.status(400).json({ error: 'nfe_id e motivo são obrigatórios' });
    }

    if (reason.length < 15) {
      return res.status(400).json({ error: 'O motivo deve ter pelo menos 15 caracteres' });
    }

    const result = await cancelNFe(nfe_id, reason);
    res.json(result);
  } catch (error) {
    logger.error('Error cancelling NF-e', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao cancelar NF-e' });
  }
});

// Get NF-e XML
app.get('/api/nfe/:id/xml', verifyAuth, async (req, res) => {
  try {
    const nfe = await getNFe(req.params.id);
    if (!nfe) {
      return res.status(404).json({ error: 'NF-e não encontrada' });
    }

    const xml = nfe.xml_assinado || nfe.xml_gerado;
    if (!xml) {
      return res.status(404).json({ error: 'XML não encontrado' });
    }

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="NFe-${nfe.access_key}.xml"`);
    res.send(xml);
  } catch (error) {
    logger.error('Error fetching NF-e XML', { message: error.message });
    res.status(500).json({ error: 'Erro ao buscar XML da NF-e' });
  }
});



// Upload A1 certificate (.pfx/.p12)
app.post('/api/nfe/certificate/upload', verifyAuth, upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Senha do certificado é obrigatoria' });
    }

    const certPath = req.file.path;
    const { getA1CertInfo } = await import('./services/certificateService.js');

    const certInfo = await getA1CertInfo(certPath, password);

    if (!certInfo.success) {
      logger.warn('Falha ao ler certificado enviado pelo usuario', { error: certInfo.error });
      // Clean up uploaded file on error
      try { fs.unlinkSync(certPath); } catch {}
      return res.status(400).json({ error: certInfo.error });
    }

    // Validate expiration
    const now = new Date();
    const validTo = new Date(certInfo.validTo);
    const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

    // Store certificate info in database
    await supabaseAdmin
      .from('nfe_config')
      .update({
        certificado_a1_url: certPath,
        certificado_a1_password: password, // In production, encrypt this
        certificado_info: certInfo,
      })
      .eq('id', (await supabaseAdmin.from('nfe_config').select('id').single()).data?.id);

    res.json({
      success: true,
      certInfo,
      daysUntilExpiry,
      warning: daysUntilExpiry < 30 ? `Certificado expira em ${daysUntilExpiry} dias!` : null,
    });
  } catch (error) {
    logger.error('Error uploading certificate', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao fazer upload do certificado' });
  }
});

// Generate DANFE
app.get('/api/nfe/:id/danfe', verifyAuth, async (req, res) => {
  try {
    const result = await generateDANFE(req.params.id);

    if (result.success) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="DANFE-${req.params.id}.pdf"`);
      res.send(result.pdfBuffer);
    } else {
      res.status(501).json({ error: result.message });
    }
  } catch (error) {
    logger.error('Error generating DANFE', { message: error.message });
    res.status(500).json({ error: 'Erro ao gerar DANFE' });
  }
});

// ==================== PROSPECTING ROUTES ====================

// Streamed Google Maps search & scrape using Server-Sent Events (SSE) for high interactivity
app.get('/api/prospects/stream-scrape-paged', verifyAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { keyword, city, limit = 5, simulate = 'false' } = req.query;
  const isSimulated = simulate === 'true' || simulate === true;

  logger.info(`SSE client connected to Google Maps capture: keyword="${keyword}", city="${city}", limit=${limit}, simulate=${simulate}`);

  try {
    const leads = await scrapeGoogleMaps({
      keyword: keyword || 'dentistas',
      city: city || 'São Paulo',
      limit: parseInt(limit) || 5,
      simulate: isSimulated,
      onProgress: (msg) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message: msg })}\n\n`);
      }
    });

    res.write(`data: ${JSON.stringify({ type: 'complete', leads })}\n\n`);
    res.end();
  } catch (error) {
    logger.error('Error in stream-scrape endpoint', { message: error.message });
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Erro ao capturar no Google Maps' })}\n\n`);
    res.end();
  }
});

// Deep AI Presence Analysis
app.post('/api/prospects/analyze', verifyAuth, async (req, res) => {
  try {
    const { lead, photos = [], customReviews = "", tone = "consultivo" } = req.body;
    if (!lead || !lead.name || !lead.category) {
      return res.status(400).json({ error: 'Dados da empresa inválidos' });
    }

    logger.info(`Analyzing visual presence for lead: "${lead.name}" with tone "${tone}"`);
    const analysis = await analyzeLeadPresence({ lead, photos, customReviews, tone });
    res.json({ success: true, analysis });

  } catch (error) {
    logger.error('Error in prospects analyze endpoint', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao analisar presença do lead' });
  }
});

// Send WhatsApp Message with Evolution API or fallback manual options
app.post('/api/prospects/whatsapp', verifyAuth, async (req, res) => {
  try {
    const { phone, message, apiKey, apiUrl, instance } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }

    const result = await sendWhatsAppMessage({ phone, message, apiKey, apiUrl, instance });
    res.json(result);
  } catch (error) {
    logger.error('Error sending WhatsApp prospect message', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao enviar WhatsApp' });
  }
});

// Sync Google Maps prospect into CRM leads table
app.post('/api/prospects/sync-crm', verifyAuth, async (req, res) => {
  try {
    const { name, email, phone, message, origin = 'google_maps', status = 'novo' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do lead é obrigatório' });
    }

    logger.info(`Syncing lead "${name}" to Supabase CRM leads table...`);
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        message: typeof message === 'object' ? JSON.stringify(message) : message || '',
        origin,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (error) {
    logger.error('Error syncing prospect to CRM', { message: error.message });
    res.status(500).json({ error: error.message || 'Erro ao sincronizar com CRM' });
  }
});


const PORT = process.env.PORT || 3001;
// --- Finance & Incoming NF-e Routes ---
app.post('/api/finance/incoming-xml', verifyAuth, xmlUpload.single('xml'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const { orderId } = req.body;
    const xmlContent = req.file.buffer.toString('utf-8');
    const result = await processIncomingXML(xmlContent, orderId);
    res.json(result);
  } catch (error) {
    logger.error('Erro na rota /api/finance/incoming-xml:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/finance/expenses', verifyAuth, async (req, res) => {
  try {
    const data = await listExpenses();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/expenses', verifyAuth, async (req, res) => {
  try {
    const data = await createExpense(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/finance/incoming-invoices', verifyAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('incoming_invoices')
      .select('*', { count: 'exact' })
      .order('issue_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({
      data,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finance/expenses/:id', verifyAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const updates = {
    description: body.description,
    amount: body.amount,
    due_date: body.due_date,
    status: body.status,
    category: body.category,
    supplier_id: body.supplier_id,
    order_id: body.order_id
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(`Erro do Supabase ao atualizar despesa ${id}:`, error);
      throw error;
    }

    logger.info(`Despesa ${id} atualizada com sucesso.`);
    res.json(data);
  } catch (error) {
    logger.error(`Erro crítico na rota PUT /api/finance/expenses/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/finance/expenses/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/resync-invoices', verifyAuth, async (req, res) => {
  try {
    const result = await resyncAllInvoices();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {

  logger.info(`📡 ImPlotter Chat Inteligente V2 (Backend) rodando na porta ${PORT}`);
  logger.info(`🔑 GEMINI_API_KEY Configurada: ${process.env.GEMINI_API_KEY ? "SIM" : "NÃO"}`);
});
