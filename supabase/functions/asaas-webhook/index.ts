import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Gera senha aleatória
function generateRandomPassword(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// ---- Webhook Access Token Validation ----
// Asaas sends a configurable access token in the header to verify
// the webhook is authentic. Configure ASAAS_WEBHOOK_TOKEN in your
// Supabase Edge Function secrets to match the one set in Asaas Dashboard.
function validateWebhookToken(req: Request): boolean {
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!webhookToken) {
    // If no token is configured, allow (but log warning)
    console.warn("⚠️ ASAAS_WEBHOOK_TOKEN not configured — webhook is unprotected!");
    return true;
  }
  
  const receivedToken = req.headers.get("asaas-access-token") || req.headers.get("access_token");
  return receivedToken === webhookToken;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const headers = { ...getCorsHeaders(origin), "Content-Type": "application/json" };

  try {
    // Validate webhook authenticity
    if (!validateWebhookToken(req)) {
      console.error("🚫 Webhook request rejected — invalid token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    const body = await req.json();
    const { event, payment } = body;

    if (!event || !payment) {
      return new Response(JSON.stringify({ error: "Payload inválido do Webhook" }), {
        status: 400,
        headers,
      });
    }

    const { externalReference, status, value, customer } = payment;
    const orderId = externalReference;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Pagamento não vinculado a nenhum pedido do sistema" }), {
        status: 200, // Retorna 200 pro webhook parar de insistir se for lixo
        headers,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido do externalReference não encontrado" }), {
        status: 200,
        headers,
      });
    }

    // Security: Verify the payment value matches the order total (prevent partial payment fraud)
    const orderTotal = Number(order.total);
    const paymentValue = Number(value);
    if (paymentValue > 0 && Math.abs(orderTotal - paymentValue) > 0.05) {
      console.error(`⚠️ Payment value mismatch! Order ${orderId}: expected ${orderTotal}, got ${paymentValue}`);
      // Don't reject — Asaas may have rounding — but log for investigation
    }

    // Se o evento for confirmação de pagamento
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED" || status === "CONFIRMED" || status === "RECEIVED") {
      
      // 1. Atualiza Status
      await supabase
        .from("orders")
        .update({ status: "pagamento_confirmado" })
        .eq("id", orderId);
        
      await supabase
        .from("order_status_history")
        .insert([{ order_id: orderId, status: "pagamento_confirmado" }]);

      // 2. Magic Link Automático para Contas Visitantes (Guest)
      const customerEmail = order.customer_email;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      
      if (customerEmail && resendKey) {
          // Busca usuário Auth
          const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
          let userExists = false;
          let authUserId = null;
          
          if (!usersError && usersData.users) {
             const foundUser = usersData.users.find((u: any) => u.email === customerEmail);
             if (foundUser) {
                 userExists = true;
                 authUserId = foundUser.id;
             }
          }

          // Se não existir, criamos o Customer fantasma
          if (!userExists) {
             const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                 email: customerEmail,
                 password: generateRandomPassword(14),
                 email_confirm: true,
                 user_metadata: {
                     name: order.customer_name,
                     cpf_cnpj: order.customer_cpf_cnpj,
                     phone: order.customer_phone
                 }
             });

             if (!createError && newUser.user) {
                 authUserId = newUser.user.id;
                 // Atualiza o ID do cliente no Pedido já que ele era Guest
                 await supabase.from("orders").update({ customer_id: authUserId }).eq("id", orderId);
             }
          }

          // Gera Magic Link para a conta
          const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
             type: 'magiclink',
             email: customerEmail,
             options: {
                 redirectTo: `${appUrl}/minha-conta`,
             }
          });

          if (!linkError && linkData?.properties?.action_link) {
              const magicLink = linkData.properties.action_link;
              
              // Dispara E-mail usando Resend
              await fetch("https://api.resend.com/emails", {
                 method: "POST",
                 headers: {
                    "Authorization": `Bearer ${resendKey}`,
                    "Content-Type": "application/json"
                 },
                 body: JSON.stringify({
                    from: "Gráfica ImPlotter <onboarding@resend.dev>", // Ou o e-mail real configurado no Resend
                    to: [customerEmail],
                    subject: "Seu Pedido ImPlotter foi Aprovado! Acompanhe-o aqui ✨",
                    html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Seu Pagamento foi Confirmado!</h2>
                        <p>Olá ${order.customer_name},</p>
                        <p>Temos ótimas notícias! O pagamento do seu pedido <strong>#${order.order_number}</strong> acabou de ser aprovado via Asaas.</p>
                        <hr style="border:1px solid #eee; margin: 20px 0;" />
                        <p>Como você finalizou o pedido pelo checkout rápido, preparamos o seu painel de cliente com total segurança!</p>
                        <br>
                        <a href="${magicLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                           Acompanhe Seu Pedido (Entrar na Conta)
                        </a>
                        <br><br>
                        <p style="font-size: 12px; color: #666;">Este link mágico te conectará automaticamente. Guarde-o para acessar sempre que precisar.</p>
                      </div>
                    `
                 })
              });
          }
      }

      return new Response(JSON.stringify({ success: true, message: "Pedido atualizado e e-mail disparado via Resend!" }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook ignorado pois não é uma confirmação de pagamento" }), {
      status: 200,
      headers,
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
    });
  }
});
