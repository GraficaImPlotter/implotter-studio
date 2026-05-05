import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { processChat } from './services/geminiService.js';
import { sendToAdmin } from './services/telegramService.js';
import { supabaseAdmin } from './services/supabaseService.js';
import rateLimit from 'express-rate-limit';

// Resolve problema de caminho rodando pelo CWD
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') }); // Pega a env da raiz do react Vite

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
    // Permitir requests sem origin (mobile apps, curl, etc em dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: ['POST'],
}));

app.use(express.json({ limit: '100kb' })); // Limitar tamanho do payload

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://graficaimplotter.shop"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.gemini.google.com"],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// SEC-003: Rate limiting — max 20 reqs/min por IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Formato de mensagens inválido." });
    }

    // Limitar tamanho do histórico para evitar abuso de tokens
    if (messages.length > 50) {
      return res.status(400).json({ error: "Histórico de mensagens muito longo. Máximo 50 mensagens." });
    }

    // Validar que cada mensagem tem role e content válidos
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return res.status(400).json({ error: "Formato de mensagem inválido." });
      }
      if (msg.content.length > 5000) {
        return res.status(400).json({ error: "Mensagem muito longa. Máximo 5000 caracteres." });
      }
    }

    const answerTitle = await processChat(messages);
    
    // Retorna string direta pro react
    res.json({ reply: answerTitle });

  } catch (error) {
    console.error("Endpoint Error:", error?.message || error);
    res.status(500).json({ error: "Erro interno no servidor de chat." });
  }
});

// HUMAN CHAT ENDPOINT
app.post('/api/chat/human', chatLimiter, async (req, res) => {
  try {
    const { message, userId, userName, userEmail } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "Mensagem e ID do usuário são obrigatórios." });
    }

    // 1. Salvar no Banco de Dados
    const { data: dbMsg, error: dbError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender_type: 'client',
        content: message
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Enviar para o Telegram do Admin
    const telegramMsgId = await sendToAdmin(message, { userId, userName, userEmail });

    // 3. Atualizar a mensagem com o ID do Telegram (para mapear a resposta depois)
    if (telegramMsgId) {
      await supabaseAdmin
        .from('chat_messages')
        .update({ telegram_message_id: telegramMsgId })
        .eq('id', dbMsg.id);
    }

    res.json({ success: true, messageId: dbMsg.id });

  } catch (error) {
    console.error("Human Chat Error:", error);
    res.status(500).json({ error: "Erro ao processar mensagem humana." });
  }
});

// TELEGRAM WEBHOOK
app.post('/api/webhooks/telegram', async (req, res) => {
  try {
    const { message } = req.body;

    // Só processamos respostas a mensagens do bot
    if (!message || !message.reply_to_message || !message.text) {
      return res.sendStatus(200); // Telegram espera 200 sempre
    }

    const replyToMsg = message.reply_to_message;
    const adminResponse = message.text;

    // Tentar encontrar o user_id nos metadados da mensagem original ou no banco
    // No nosso telegramService, colocamos o ID: <uuid> no final da legenda
    const userIdMatch = replyToMsg.text?.match(/ID: ([a-z0-9-]+)/i);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      console.warn("Não foi possível extrair o UserID da resposta do Telegram.");
      return res.sendStatus(200);
    }

    // Salvar resposta no Banco de Dados
    const { error: dbError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: userId,
        sender_type: 'admin',
        content: adminResponse
      });

    if (dbError) {
      console.error("Erro ao salvar resposta do admin no DB:", dbError);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    res.sendStatus(200);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`📡 ImPlotter Chat Inteligente V2 (Backend) rodando na porta ${PORT}`);
  console.log(`🔑 GEMINI_API_KEY Configurada: ${process.env.GEMINI_API_KEY ? "SIM" : "NÃO"}`);
});
