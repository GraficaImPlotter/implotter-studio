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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find orders finalized 3+ days ago that haven't received a review request
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, updated_at")
      .eq("status", "finalizado")
      .lt("updated_at", threeDaysAgo)
      .limit(50);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "No orders to request reviews for" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which orders already had a review request notification
    const orderIds = orders.map(o => o.id);
    const { data: existingNotifications } = await supabase
      .from("order_notifications")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("notification_type", "review_request");

    const alreadySent = new Set((existingNotifications ?? []).map(n => n.order_id));
    const toSend = orders.filter(o => !alreadySent.has(o.id));

    const results: string[] = [];

    for (const order of toSend) {
      // Generate review token
      const reviewToken = crypto.randomUUID().split("-")[0];

      // Log the review request
      await supabase.from("order_notifications").insert({
        order_id: order.id,
        status: "finalizado",
        notification_type: "review_request",
        channel: "whatsapp",
        success: true,
      });

      // Build WhatsApp message
      const reviewLink = `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/avaliacoes?token=${reviewToken}`;
      const message = `Olá ${order.customer_name}! 😊\n\nSeu pedido #${order.order_number} foi entregue. Gostaríamos muito de saber sua opinião!\n\nDeixe sua avaliação: ${reviewLink}\n\nObrigado por escolher a Gráfica ImPlotter! ⭐`;

      console.log(`📱 Review request for order #${order.order_number}: ${order.customer_phone || order.customer_email}`);
      console.log(`Message: ${message}`);

      results.push(`Order #${order.order_number} - review request logged`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
