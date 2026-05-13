import { logger } from './logger.js';

/**
 * Sends a WhatsApp message using Evolution API (if configured) or returns a direct WhatsApp Web URL
 * @param {object} params - { phone, message, instance, apiKey, apiUrl }
 * @returns {Promise<{success: boolean, mode: string, url?: string, error?: string}>}
 */
export async function sendWhatsAppMessage({ phone, message, apiKey, apiUrl, instance }) {
  if (!phone) {
    throw new Error("Telefone de destino é obrigatório.");
  }

  const formattedPhone = phone.replace(/\D/g, '');
  
  // Clean credentials
  const api_url = apiUrl || process.env.EVOLUTION_API_URL;
  const api_key = apiKey || process.env.EVOLUTION_API_KEY;
  const inst_name = instance || process.env.EVOLUTION_INSTANCE || "implotter";

  // If we have Evolution API credentials, we send directly from server
  if (api_url && api_key) {
    try {
      logger.info(`Attempting to send WhatsApp message via Evolution API to: ${formattedPhone}`);
      
      const cleanUrl = api_url.endsWith('/') ? api_url : `${api_url}/`;
      const endpoint = `${cleanUrl}message/sendText/${inst_name}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': api_key
        },
        body: JSON.stringify({
          number: formattedPhone,
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: true
          },
          textMessage: {
            text: message
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Evolution API Error (${response.status}): ${errText}`);
      }

      const responseData = await response.json();
      logger.info("WhatsApp message sent successfully via Evolution API.", { messageId: responseData.key?.id });

      return {
        success: true,
        mode: "evolution_api",
        data: responseData
      };

    } catch (error) {
      logger.error("Failed to send WhatsApp via Evolution API, using web fallback", { message: error.message });
      
      // Fallback to generating a WhatsApp web link so the user can send it manually with one click
      const webUrl = `https://web.whatsapp.com/send?phone=55${formattedPhone}&text=${encodeURIComponent(message)}`;
      return {
        success: false,
        mode: "web_fallback",
        url: webUrl,
        error: error.message
      };
    }
  } else {
    // Zero-config mode: Generate direct links for either WhatsApp Web or Mobile
    const webUrl = `https://web.whatsapp.com/send?phone=55${formattedPhone}&text=${encodeURIComponent(message)}`;
    const mobileUrl = `https://api.whatsapp.com/send?phone=55${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    logger.info(`No Evolution API configured. Generating manual links for phone: ${formattedPhone}`);
    return {
      success: true,
      mode: "manual_link",
      webUrl,
      mobileUrl
    };
  }
}
