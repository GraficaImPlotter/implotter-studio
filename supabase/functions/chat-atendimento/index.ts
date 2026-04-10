import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a assistente virtual da Gráfica ImPlotter, uma gráfica profissional especializada em impressão digital de alta qualidade.

## Sobre a Gráfica ImPlotter
- Somos uma gráfica especializada em impressão digital
- Trabalhamos com adesivos, banners, cartões de visita, panfletos, faixas, placas, e muito mais
- Atendemos pessoas físicas e jurídicas em todo o Brasil

## Como funciona o pedido
1. O cliente acessa a loja e escolhe o produto
2. Seleciona as opções (tamanho, quantidade, acabamento)
3. Adiciona ao carrinho
4. Finaliza o pedido com seus dados
5. Realiza o pagamento via PIX
6. Envia a arte (arquivo para impressão)
7. Nossa equipe analisa a arte e inicia a produção
8. O pedido é finalizado e enviado/retirado

## Formas de pagamento
- PIX (pagamento instantâneo)
- O código PIX é gerado automaticamente após finalizar o pedido

## Envio de arte
- O cliente deve enviar arquivos em alta resolução (300 DPI)
- Formatos aceitos: PDF, CDR, AI, PSD, JPG, PNG
- A arte será conferida pela equipe antes da produção
- Se houver problemas, entraremos em contato

## Prazos
- Os prazos variam conforme o produto e quantidade
- Cada produto tem o prazo estimado na página do produto
- O prazo começa a contar após a aprovação da arte e confirmação do pagamento

## Orçamentos
- O cliente pode solicitar orçamentos personalizados
- Basta acessar a página "Fale Conosco" ou falar no WhatsApp

## Acompanhamento
- O cliente pode acompanhar o status do pedido na "Área do Cliente"
- Os status incluem: Recebido, Aguardando Pagamento, Pago, Em Análise, Em Produção, Finalizado

## Direcionamento
- Para falar com atendimento humano: sugira o WhatsApp
- Para fazer pedido: sugira acessar /loja
- Para orçamento: sugira /fale-conosco
- Para acompanhar pedido: sugira /area-do-cliente
- Para dúvidas frequentes: sugira /faq

## Regras de comportamento
- Seja sempre educado, prestativo e objetivo
- Responda em português brasileiro
- Use formatação markdown quando útil (negrito, listas)
- Se não souber uma informação específica, direcione para o WhatsApp ou página de contato
- Nunca invente preços ou prazos específicos que não foram fornecidos
- Mantenha respostas curtas e diretas (máximo 3-4 parágrafos)
- Quando mencionar páginas do site, use links relativos como /loja, /faq, /fale-conosco, /area-do-cliente
- IMPORTANTE PARA VENDAS: Quando você recomendar um produto específico e quiser que o cliente o adicione ao carrinho, VOCÊ DEVE criar um "botão mágico" usando markdown no formato de link exato: \`[NOME DA AÇÃO](action:add-to-cart:SLUG_DO_PRODUTO)\`. Exemplo verdadeiro: \`[Adicionar Lona ao Carrinho](action:add-to-cart:lona-front-light-240g)\`. O slug precisa ser exato da lista de produtos reais abaixo. Use esse recurso sempre que propuser venda!`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, context } = body;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return new Response(JSON.stringify({ error: "Número inválido de mensagens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_MSG_LENGTH = 2000;
    for (const m of messages) {
      if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > MAX_MSG_LENGTH) {
        return new Response(JSON.stringify({ error: "Mensagem inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")?.trim();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")?.trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Fetch product information from database
    let productsInfo = "";
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?is_active=eq.true&select=name,price,sale_price,short_description,estimated_days,pricing_type&order=name`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const products = await response.json();
          if (products && products.length > 0) {
            productsInfo = "\n\n## Produtos Disponíveis\n";
            products.forEach((product: any) => {
              const price = product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price) 
                ? `R$ ${parseFloat(product.sale_price).toFixed(2)} (promoção)`
                : `R$ ${parseFloat(product.price).toFixed(2)}`;
              
              productsInfo += `\n**${product.name}**\n`;
              productsInfo += `- Preço: ${price}`;
              if (product.pricing_type === 'per_sqm') productsInfo += " por m²";
              if (product.estimated_days) productsInfo += `\n- Prazo estimado: ${product.estimated_days} dias úteis`;
              if (product.short_description) productsInfo += `\n- Descrição: ${product.short_description}`;
              productsInfo += "\n";
            });
            productsInfo += "\n**IMPORTANTE**: Estes são os preços e produtos reais cadastrados no sistema. Use essas informações para responder sobre preços e disponibilidade.";
          }
        }
      }
    } catch (error) {
      console.log("Failed to fetch products:", error);
    }

    let userContextStr = "";
    if (context) {
      userContextStr += "\n\n## CONTEXTO ATUAL DO CLIENTE IMPLOTTER\n";
      if (context.userName) {
        userContextStr += `- Nome do cliente logado: **${context.userName}**. Chame-o pelo nome!\n`;
      }
      if (context.cart && context.cart.length > 0) {
        userContextStr += `- O carrinho atual do cliente possui ${context.cart.length} tipo(s) de item(ns):\n`;
        context.cart.forEach((item: any) => {
          userContextStr += `  - ${item.quantity}x ${item.name} (${item.pricing_type === 'per_sqm' ? item.quantity + ' m²' : (item.price ? 'R$ ' + Number(item.price).toFixed(2) + ' cada' : '')})\n`;
        });
        userContextStr += "Considere o carrinho dele ao fazer sugestões! Se ele tiver apenas panfletos, talvez precise de cartões.\n";
      } else {
        userContextStr += "- O carrinho do cliente está vazio no momento.\n";
      }
    }

    const enhancedSystemPrompt = SYSTEM_PROMPT + productsInfo + userContextStr;

// Inicia processamento de resposta da IA


    // Lógica consolidada de seleção de Provedor de IA
    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = LOVABLE_API_KEY;
    let aiModel = "google/gemini-3-flash-preview";

    // Se o usuário providenciou GEMINI_API_KEY, ela tem prioridade total e usa o modo de compatibilidade
    if (GEMINI_API_KEY) {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      apiKey = GEMINI_API_KEY;
      // Usamos o alias gpt-3.5-turbo que o Google mapeia automaticamente para o Gemini mais estável
      // Isso evita o erro 404 de "model not found" em chaves recentes
      aiModel = "gpt-3.5-turbo"; 
    } else if (OPENAI_API_KEY) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      apiKey = OPENAI_API_KEY;
      aiModel = "gpt-4o-mini";
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Configure GEMINI_API_KEY ou OPENAI_API_KEY no Supabase." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorContent = await response.text();
      return new Response(JSON.stringify({ error: `IA Error (${response.status}): ${errorContent.substring(0, 100)}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-atendimento error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
