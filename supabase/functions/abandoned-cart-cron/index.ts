import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // O Cron pode ser invocado via GET ou POST
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:8080";

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Variável RESEND_API_KEY não configurada no Supabase" }), { status: 200, headers: corsHeaders });
    }

    // Calcula timestamp de 2 horas atrás
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    // Busca pedidos "aguardando pagamento" mais antigos que 2 horas
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, total, notes, created_at")
      .eq("status", "aguardando_pagamento")
      .lt("created_at", twoHoursAgo);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum carrinho abandonado elegível para envio" }), { status: 200, headers: corsHeaders });
    }

    let sentCount = 0;

    for (const order of orders) {
       // Flag de segurança: Checa se a anotação interna do carrinho já tem [RETENCAO_ENVIADA]
       if (order.notes && order.notes.includes("[RETENCAO_ENVIADA]")) {
           continue;
       }
       
       const paymentUrl = `${appUrl}/pagamento/${order.id}`;

       // Dispara o e-mail pela API do Resend
       const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "Gráfica ImPlotter <onboarding@resend.dev>", // Altere para o domínio validado do seu Resend
                to: [order.customer_email],
                subject: `Esqueceu algo, ${order.customer_name}? 🛒`,
                html: `
                    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Oi ${order.customer_name}, tudo bem?</h2>
                        <p>Notamos que você iniciou o pedido <strong>#${order.order_number}</strong> em nossa loja, mas ainda não finalizou o pagamento.</p>
                        <p>Os seus materiais estão separados! Para garantir o valor orçado e entrar imediatamente na fila de produção, clique no botão e pague com Pix ou Cartão de Crédito:</p>
                        <br>
                        <a href="${paymentUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Finalizar Compra - R$ ${Number(order.total).toFixed(2)}
                        </a>
                        <br><br>
                        <p style="color: #666; font-size: 13px;">Se já pagou via boleto ou Pix recentemente, pode ignorar este e-mail. Caso deseje desistir da compra, nenhuma taxa será cobrada.</p>
                    </div>
                `
            })
       });

       const resendData = await res.json();

       if (res.ok && resendData.id) {
           // Marca o pedido como já notificado para a automação nunca mais enviar SPAM para esse pedido
           const newNotes = order.notes ? `${order.notes}\n[RETENCAO_ENVIADA]` : "[RETENCAO_ENVIADA]";
           await supabase.from("orders").update({ notes: newNotes }).eq("id", order.id);
           sentCount++;
       } else {
           console.error("Erro no Resend para", order.customer_email, resendData);
       }
    }

    return new Response(JSON.stringify({ success: true, emailsDisparados: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
