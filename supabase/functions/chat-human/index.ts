import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

    const body = await req.json();
    console.log("Recebido:", JSON.stringify(body));

    // --- FLUXO 1: WEBHOOK DO TELEGRAM (ADMIN RESPONDENDO) ---
    if (body.message && body.message.chat.id.toString() === ADMIN_CHAT_ID) {
      const { message } = body;
      const replyTo = message.reply_to_message;

      if (!replyTo) {
        console.log("Mensagem ignorada: Não é uma resposta.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Buscar o usuário original associado à mensagem respondida
      const { data: originalMsg, error: fetchError } = await supabaseClient
        .from("chat_messages")
        .select("user_id")
        .eq("telegram_message_id", replyTo.message_id.toString())
        .single();

      if (fetchError || !originalMsg) {
        console.error("Não foi possível encontrar a mensagem original para esta resposta.");
        return new Response(JSON.stringify({ error: "Original message not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let content = message.text || "";
      let fileUrl = null;
      let fileType = null;

      // Tratar Mídia vinda do Telegram
      if (message.photo || message.document) {
        const fileId = message.photo ? message.photo[message.photo.length - 1].file_id : message.document.file_id;
        fileType = message.photo ? "image/jpeg" : message.document.mime_type;
        
        // Obter caminho do arquivo via API do Telegram
        const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (getFileData.ok) {
          const filePath = getFileData.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
          
          // Baixar o arquivo
          const fileRes = await fetch(downloadUrl);
          const fileBuffer = await fileRes.arrayBuffer();

          // Upload para o Supabase Storage
          const fileName = `${originalMsg.user_id}/${Date.now()}_${filePath.split('/').pop()}`;
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from("chat-attachments")
            .upload(fileName, fileBuffer, { contentType: fileType });

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseClient.storage.from("chat-attachments").getPublicUrl(fileName);
            fileUrl = publicUrl;
            if (!content) content = message.photo ? "📷 Foto" : "📄 Arquivo";
          }
        }
      }

      // Salvar a resposta do Admin no banco de dados
      const { error: insertError } = await supabaseClient.from("chat_messages").insert({
        user_id: originalMsg.user_id,
        sender_type: "admin",
        content: content,
        file_url: fileUrl,
        file_type: fileType,
        telegram_message_id: message.message_id.toString()
      });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- FLUXO 2: SITE -> TELEGRAM (CLIENTE ENVIANDO) ---
    const { message: userMsg, userId, userName, userEmail, fileUrl: clientFileUrl, fileType: clientFileType } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "ID do usuário é obrigatório." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Salvar no Banco de Dados
    const { data: dbMsg, error: dbError } = await supabaseClient
      .from("chat_messages")
      .insert({
        user_id: userId,
        sender_type: "client",
        content: userMsg || (clientFileType?.includes("image") ? "📷 Foto" : "📄 Arquivo"),
        file_url: clientFileUrl,
        file_type: clientFileType,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Enviar para o Telegram do Admin
    if (TELEGRAM_TOKEN && ADMIN_CHAT_ID) {
      const caption = `<b>Novo Contato: ${userName || "Cliente"}</b>\n` +
                      `✉️ ${userEmail || "Sem e-mail"}\n\n` +
                      `${userMsg || ""}\n\n` +
                      `<code>ID: ${userId}</code>`;

      let tgMethod = "sendMessage";
      let tgBody: any = {
        chat_id: ADMIN_CHAT_ID,
        parse_mode: "HTML",
      };

      if (clientFileUrl) {
        if (clientFileType?.includes("image")) {
          tgMethod = "sendPhoto";
          tgBody.photo = clientFileUrl;
          tgBody.caption = caption;
        } else {
          tgMethod = "sendDocument";
          tgBody.document = clientFileUrl;
          tgBody.caption = caption;
        }
      } else {
        tgBody.text = caption;
      }

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${tgMethod}`;
      const tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgBody),
      });

      const tgData = await tgRes.json();

      if (tgData.ok) {
        await supabaseClient
          .from("chat_messages")
          .update({ telegram_message_id: tgData.result.message_id.toString() })
          .eq("id", dbMsg.id);
      }
    }

    return new Response(JSON.stringify({ success: true, messageId: dbMsg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("chat-human error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
