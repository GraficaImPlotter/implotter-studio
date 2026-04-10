import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status } = await req.json();

    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: "order_id and new_status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusLabels: Record<string, string> = {
      pedido_recebido: "Pedido Recebido",
      aguardando_pagamento: "Aguardando Pagamento",
      pagamento_confirmado: "Pagamento Confirmado",
      em_analise: "Em Análise",
      aguardando_arte: "Aguardando Arte",
      arte_em_conferencia: "Arte em Conferência",
      aprovado_producao: "Aprovado para Produção",
      em_producao: "Em Produção",
      em_acabamento: "Em Acabamento",
      pronto_envio: "Pronto para Envio",
      finalizado: "Finalizado",
      cancelado: "Cancelado",
    };

    const statusLabel = statusLabels[new_status] || new_status;

    // Log notification (email integration can be added here)
    console.log(`📧 Notification: Order #${order.order_number} status changed to "${statusLabel}" for ${order.customer_email}`);

    // Save notification record
    await supabase.from("order_notifications").insert({
      order_id,
      status: new_status,
      notification_type: "status_change",
      channel: "email",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification logged for order #${order.order_number}`,
        customer_email: order.customer_email,
        new_status: statusLabel,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
