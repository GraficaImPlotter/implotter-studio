import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { processChat } from './services/geminiService.js';
import { sendToAdmin } from './services/telegramService.js';
import { supabaseAdmin } from './services/supabaseService.js';
import rateLimit from 'express-rate-limit';
import { logger } from './services/logger.js';

// Resolve problema de caminho rodando pelo CWD
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// SEC-002: CORS restrito — apenas origens confiáveis
const allowedOrigins = [
  'https://graficaimplotter.shop',
  'https://www.graficaimplotter.shop',
  'http://localhost:5173',
  'http://localhost:4173',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '100kb' }));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://graficaimplotter.shop"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.gemini.google.com"],
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`📡 ImPlotter Chat Inteligente V2 (Backend) rodando na porta ${PORT}`);
  logger.info(`🔑 GEMINI_API_KEY Configurada: ${process.env.GEMINI_API_KEY ? "SIM" : "NÃO"}`);
});
