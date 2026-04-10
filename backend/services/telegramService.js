import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

/**
 * Envia uma mensagem para o administrador no Telegram.
 * @param {string} text O conteúdo da mensagem.
 * @param {Object} metadata Metadados para o administrador (nome do cliente, e-mail, etc).
 * @returns {Promise<string|null>} O ID da mensagem enviada no Telegram ou null em caso de erro.
 */
export const sendToAdmin = async (text, metadata = {}) => {
  if (!TELEGRAM_TOKEN || !ADMIN_CHAT_ID) {
    console.warn("TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurados.");
    return null;
  }

  const caption = `<b>Novo Contato: ${metadata.userName || 'Cliente'}</b>\n` +
                  `✉️ ${metadata.userEmail || 'Sem e-mail'}\n\n` +
                  `${text}\n\n` +
                  `<code>ID: ${metadata.userId}</code>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: caption,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return data.result.message_id.toString();
    } else {
      console.error("Erro Telegram API:", data);
      return null;
    }
  } catch (error) {
    console.error("Falha ao enviar para Telegram:", error);
    return null;
  }
};

/**
 * Responde a uma mensagem no chat do cliente. (Opcional, se quisermos usar o bot para falar no grupo)
 */
export const replyToTelegram = async (chatId, text, replyToMessageId) => {
    // Implementação futura se necessário
};
