import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Obtém a URL base (Se não tiver configurada nas secrets, usa a Sandbox padrão)
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { orderId, creditCard } = await req.json();

    if (!orderId || !creditCard) {
      return new Response(JSON.stringify({ error: "Dados inválidos: orderId e creditCard são obrigatórios" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave API do Asaas não configurada" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the order total and customer details directly from the database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare Asaas Headers
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
    };

    // 1. Check if Customer exists or Create a new Customer in Asaas
    let customerId = "";
    
    if (order.customer_cpf_cnpj) {
      const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${order.customer_cpf_cnpj}`, { headers: asaasHeaders });
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    }

    if (!customerId) {
      // Create Customer
      const customerPayload = {
        name: order.customer_name,
        email: order.customer_email,
        cpfCnpj: order.customer_cpf_cnpj || "00000000000",
        phone: order.customer_phone || "",
        mobilePhone: order.customer_phone || "",
        address: order.address_street || "",
        addressNumber: order.address_number || "",
        complement: order.address_complement || "",
        province: order.address_neighborhood || "",
        postalCode: order.address_zip ? order.address_zip.replace(/\D/g, "") : "",
        externalReference: order.customer_id || undefined
      };

      const createCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload)
      });
      const customerData = await createCustomerRes.json();
      
      if (customerData.errors) {
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: customerData.errors }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customerData.id;
    }

    // 2. Create Payment
    const today = new Date();
    const dueDate = today.toISOString().split("T")[0];

    const paymentPayload = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: Number(order.total),
      dueDate: dueDate,
      description: `Pedido #${order.order_number}`,
      externalReference: order.id,
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv
      },
      creditCardHolderInfo: {
        name: order.customer_name,
        email: order.customer_email,
        cpfCnpj: order.customer_cpf_cnpj || "00000000000",
        postalCode: order.address_zip ? order.address_zip.replace(/\D/g, "") : "00000000",
        addressNumber: order.address_number || "S/N",
        addressComplement: order.address_complement || "",
        phone: order.customer_phone || "0000000000",
        mobilePhone: order.customer_phone || "0000000000"
      }
    };

    const createPaymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(paymentPayload)
    });
    const paymentData = await createPaymentRes.json();

    if (paymentData.errors) {
      return new Response(JSON.stringify({ error: "Erro ao processar pagamento", details: paymentData.errors }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status if approved
    if (paymentData.status === "CONFIRMED" || paymentData.status === "RECEIVED") {
      await supabase
        .from("orders")
        .update({ status: "pagamento_confirmado" })
        .eq("id", orderId);
        
      await supabase
        .from("order_status_history")
        .insert([{ order_id: orderId, status: "pagamento_confirmado" }]);
    } else if (paymentData.status === "REJECTED") {
        return new Response(JSON.stringify({ error: "Pagamento não autorizado pela operadora." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        status: paymentData.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
