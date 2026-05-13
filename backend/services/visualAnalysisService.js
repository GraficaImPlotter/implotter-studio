import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger.js";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no .env");
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Analyzes visual presence, brand quality, and commercial opportunities for local business leads.
 * Supports multimodal image analysis (photos of logo, facade, or Instagram posts) using Gemini 2.5 Flash.
 * 
 * @param {object} params - { lead, photos, customReviews }
 * @returns {Promise<object>} Detailed visual diagnosis and sales pitch
 */
export async function analyzeLeadPresence({ lead, photos = [], customReviews = "" }) {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const categoryText = lead.category || "Empresa Local";
    const reviewsText = customReviews || `Nota média de ${lead.rating || 4.5} baseada em ${lead.reviews_count || 10} avaliações.`;

    const prompt = `
Você é o Auditor de Branding e Diretor Comercial da Gráfica ImPlotter Studio.
Sua missão é realizar uma Auditoria de Identidade Visual e Comercial completa para esta empresa local capturada do Google Maps.

DADOS DA EMPRESA:
- Nome: "${lead.name}"
- Categoria/Nicho: "${categoryText}"
- Endereço: "${lead.address || "Não informado"}"
- Site: "${lead.website || "Não possui site"}"
- Instagram: "${lead.instagram || "Não informado"}"
- Avaliações/Reputação: "${reviewsText}"

Se fotos foram fornecidas em anexo (como imagem do logotipo, posts de redes sociais ou foto da fachada do estabelecimento), analise as imagens detalhadamente para identificar amadorismos, problemas de contraste, tipografia desalinhada ou fraca presença física.

INSTRUÇÕES DE ANÁLISE:
Gere um JSON estritamente válido contendo o diagnóstico de marca da empresa. A análise deve cobrir obrigatoriamente:

1. "commercialScore": Classificação comercial baseada na urgência e potencial de venda de impressos de alto padrão:
   - "Quente" (Para clínicas, academias, restaurantes ou escritórios com ótima reputação digital que precisam urgente de materiais para recepção/atendimento físico).
   - "Morno" (Para comércios de baixa rotatividade ou com identidade parcialmente estruturada).
   - "Frio" (Empresas estritamente digitais, industriais ou que não atendem público físico).

2. "visualDiagnostics": Um objeto com scores numéricos de 1 a 10 estimando a qualidade da marca:
   - "visualIdentity": Nota para a logo e consistência das cores (se amadora ou desatualizada, dê nota baixa).
   - "professionalism": Nota de credibilidade transmitida visualmente (ex: posts amadores, fotos escuras reduzem a nota).
   - "digitalPresence": Nota para consistência entre Google Maps, site e Instagram.
   - "printNeeds": Nota de necessidade de materiais impressos (quanto maior o atendimento físico, maior a nota).

3. "weaknessesIdentified": Lista de até 3 fragilidades de design encontradas (ex: "Logotipo com tipografia genérica", "Ausência de sinalização externa profissional na fachada", "Identidade visual amadora e sem padrão de cores", "Ausência de papelaria corporativa para fidelização").

4. "nicheProducts": Lista de 4 produtos perfeitamente mapeados para o nicho específico dele de acordo com estas diretrizes oficiais da ImPlotter:
   - Se CLINICA/DENTISTA/MÉDICO: ["Receituário Premium", "Pasta com Orelha Personalizada", "Cartão de Visita Soft Touch", "Bloco de Atestados / Anotações"]
   - Se ACADEMIA/ESTÚDIO: ["Windbanner para Calçada", "Adesivação de Fachada / Vidros", "Placas de Regras Internas", "Adesivo Monomérico para Espelhos"]
   - Se RESTAURANTE/CAFÉ/BAR: ["Cardápio Impermeável Premium", "Jogo Americano Personalizado", "Lacre de Segurança Adesivo", "Adesivo de Lona para Fachada"]
   - Se ADVOGADOS/ESCRITÓRIO: ["Pasta de Processos Premium", "Envelope Saco Timbrado", "Papel Timbrado Ofício", "Cartão de Visita Verniz Localizado"]
   - Se VAREJO/LOJA DE ROUPAS: ["Sacolas de Papel Personalizadas", "Tags para Roupas com Fio", "Adesivo de Vitrine Promocional", "Fita de Cetim Personalizada"]
   - Outros: Mapeie os 4 produtos impressos mais lógicos e sofisticados para a operação.
   Para cada um dos 4 produtos, retorne um objeto contendo:
   - "productName": Nome do produto.
   - "benefit": Benefício direto para este lead em 1 frase (ex: "Aumenta o ticket médio ao destacar pratos premium").

5. "brandAuditVerdict": Um parágrafo resumido e direto (3 a 4 frases) em tom consultivo de design, explicando o diagnóstico da marca (por que a identidade atual parece amadora ou fraca e como a papelaria física premium da ImPlotter elevará a percepção de valor deles).

6. "personalizedPitch": Um texto altamente persuasivo de WhatsApp formatado com emojis e quebras de linha para enviar ao lead:
   - Cumprimente de forma calorosa e elogie a boa reputação dele nas avaliações locais.
   - Aponte, em tom amigável, que percebeu oportunidades para valorizar o espaço de atendimento físico dele com papelaria personalizada.
   - Ofereça enviar o mockup exclusivo do cartão/banner que você preparou para eles visualizarem o potencial.
   - Pergunte se pode enviar uma proposta rápida sem compromisso.

Gere APENAS o JSON válido. Não adicione markdown ou textos introdutórios/explicativos.
`;

    // Setup content parts
    const contentParts = [prompt];

    // Append base64 photos if present for multimodal analysis
    if (photos && photos.length > 0) {
      logger.info(`Adding ${photos.length} photos to Gemini multimodal request for lead "${lead.name}"`);
      for (const photo of photos) {
        if (photo.base64 && photo.mimeType) {
          contentParts.push({
            inlineData: {
              data: photo.base64.replace(/^data:image\/\w+;base64,/, ""), // Strip base64 metadata header if present
              mimeType: photo.mimeType
            }
          });
        }
      }
    }

    const response = await model.generateContent(contentParts);
    const textResponse = response.response.text();
    
    logger.info(`Gemini brand audit successfully generated for "${lead.name}"`);
    return JSON.parse(textResponse);

  } catch (error) {
    logger.error("Failed to perform AI brand audit, executing fallback", { message: error.message });
    return generateFallbackAudit(lead);
  }
}

/**
 * Solid, high-fidelity brand audit fallback in case Gemini is unavailable.
 * Strictly implements niche-specific rules and commercial scores.
 */
function generateFallbackAudit(lead) {
  const categoryLower = (lead.category || "").toLowerCase();
  const nameLower = (lead.name || "").toLowerCase();
  
  let commercialScore = "Morno";
  let visualDiagnostics = {
    visualIdentity: 6,
    professionalism: 7,
    digitalPresence: 6,
    printNeeds: 7
  };
  let weaknessesIdentified = [
    "Ausência de papelaria física para recepção",
    "Identidade visual inconsistente nos canais digitais"
  ];
  let nicheProducts = [];
  let brandAuditVerdict = "";

  // Segment: CLINIC / HEALTH / DENTIST
  if (categoryLower.includes("médic") || categoryLower.includes("dentista") || categoryLower.includes("odont") || categoryLower.includes("clínica") || categoryLower.includes("saúde") || categoryLower.includes("pediatr")) {
    commercialScore = "Quente";
    visualDiagnostics = {
      visualIdentity: 5,
      professionalism: 7,
      digitalPresence: 5,
      printNeeds: 9
    };
    weaknessesIdentified = [
      "Falta de receituários timbrados de alta gramatura",
      "Pastas de exames genéricas sem personalização profissional",
      "Cartões de visita simples sem acabamento refinado"
    ];
    nicheProducts = [
      { productName: "Receituário Premium", benefit: "Transmite extrema autoridade e cuidado no momento da prescrição médica." },
      { productName: "Pasta com Orelha Personalizada", benefit: "Organiza exames e receitas e faz sua marca acompanhar o paciente em casa." },
      { productName: "Cartão de Visita Soft Touch", benefit: "Toque aveludado e elegante que destaca o profissionalismo do médico." },
      { productName: "Bloco de Atestados / Anotações", benefit: "Padroniza as declarações oficiais da clínica com agilidade e clareza." }
    ];
    brandAuditVerdict = `Apesar do excelente atendimento médico prestado pela ${lead.name}, a falta de receituários e pastas coordenadas diminui a percepção de autoridade clínica. Pacientes de consultórios particulares buscam acolhimento e sofisticação; papelaria premium com laminação fosca e relevo agregará valor imediato à consulta.`;
  }
  // Segment: GYM / STUDIO / CROSSFIT
  else if (categoryLower.includes("academia") || categoryLower.includes("crossfit") || categoryLower.includes("studio fit") || categoryLower.includes("fitness") || categoryLower.includes("treino") || categoryLower.includes("pilates")) {
    commercialScore = "Quente";
    visualDiagnostics = {
      visualIdentity: 6,
      professionalism: 6,
      digitalPresence: 7,
      printNeeds: 8
    };
    weaknessesIdentified = [
      "Falta de sinalização externa de calçada para captar transeuntes",
      "Vidros e espelhos amplos sem sinalização motivacional ou jateada",
      "Aparência visual amadora nas regras de convívio internas"
    ];
    nicheProducts = [
      { productName: "Windbanner para Calçada", benefit: "Gera movimento visual na calçada e atrai moradores do entorno para conhecer o espaço." },
      { productName: "Adesivação de Fachada / Vidros", benefit: "Garante privacidade nas salas de treino e promove a marca na rua de forma imponente." },
      { productName: "Placas de Regras Internas", benefit: "Organiza a convivência no salão de musculação com design limpo e esportivo." },
      { productName: "Adesivo Monomérico para Espelhos", benefit: "Adesivos com frases de superação nos espelhos perfeitos para selfies e divulgação espontânea." }
    ];
    brandAuditVerdict = `A ${lead.name} possui ótimo engajamento digital, mas carece de elementos visuais de impacto na sua fachada física e recepção. Academias dependem fortemente do tráfego local; sinalização externa com Windbanners vibrantes e frases motivacionais nos espelhos de musculação impulsionarão matrículas locais instantaneamente.`;
  }
  // Segment: RESTAURANT / BAR / CAFE
  else if (categoryLower.includes("restaurante") || categoryLower.includes("bistrô") || categoryLower.includes("comida") || categoryLower.includes("café") || categoryLower.includes("pizza") || categoryLower.includes("hambúrguer")) {
    commercialScore = "Quente";
    visualDiagnostics = {
      visualIdentity: 5,
      professionalism: 5,
      digitalPresence: 6,
      printNeeds: 9
    };
    weaknessesIdentified = [
      "Cardápios deteriorados ou sem laminação protetora impermeável",
      "Falta de jogos americanos personalizados para organizar as mesas",
      "Lacre de segurança simples que prejudica a experiência do delivery"
    ];
    nicheProducts = [
      { productName: "Cardápio Impermeável Premium", benefit: "Cores vivas que valorizam os pratos e acabamento super resistente que permite higienização fácil." },
      { productName: "Jogo Americano Personalizado", benefit: "Deixa a mesa mais convidativa e protege as toalhas, reduzindo custos de lavanderia." },
      { productName: "Lacre de Segurança Adesivo", benefit: "Garante a integridade do alimento no delivery e passa profissionalismo aos clientes em casa." },
      { productName: "Adesivo de Lona para Fachada", benefit: "Sinaliza a identidade do restaurante na entrada com alta durabilidade e cores vibrantes." }
    ];
    brandAuditVerdict = `A experiência gastronômica do cliente da ${lead.name} é afetada pela falta de consistência tátil na mesa. Cardápios de papel comum mancham facilmente, transmitindo desleixo. Cardápios impermeáveis e jogos americanos com o branding da casa elevam o ticket médio, pois justificam preços de pratos mais sofisticados.`;
  }
  // Segment: LAWYER / LAW OFFICE
  else if (categoryLower.includes("advogado") || categoryLower.includes("advocacia") || categoryLower.includes("escritório") || categoryLower.includes("lei") || categoryLower.includes("jurídic")) {
    commercialScore = "Quente";
    visualDiagnostics = {
      visualIdentity: 7,
      professionalism: 8,
      digitalPresence: 6,
      printNeeds: 8
    };
    weaknessesIdentified = [
      "Envelopes e pastas de contratos sem personalização de alto padrão",
      "Uso de papel sulfite simples de baixa gramatura para petições importantes",
      "Cartões de visita básicos sem acabamento texturizado ou metalizado"
    ];
    nicheProducts = [
      { productName: "Pasta de Processos Premium", benefit: "Apresentação impecável para carregar contratos de alto valor e documentos judiciais." },
      { productName: "Envelope Saco Timbrado", benefit: "Garante o envio seguro e solene de pareceres jurídicos para clientes executivos." },
      { productName: "Papel Timbrado Ofício", benefit: "Papel de alta textura e gramatura que confere peso oficial a contratos e notificações." },
      { productName: "Cartão de Visita Verniz Localizado", benefit: "Brilho seletivo em fundo fosco que transmite sobriedade e prestígio na advocacia." }
    ];
    brandAuditVerdict = `Para o escritório ${lead.name}, credibilidade e discrição são ativos fundamentais. Apresentar contratos em pastas simples desvaloriza o valor dos honorários. Papelaria corporativa texturizada com acabamentos refinados como verniz localizado chancela a competência técnica e o renome dos advogados.`;
  }
  // Default Segment: RETAIL / VAREDIST
  else {
    commercialScore = "Morno";
    visualDiagnostics = {
      visualIdentity: 6,
      professionalism: 6,
      digitalPresence: 6,
      printNeeds: 7
    };
    weaknessesIdentified = [
      "Sacolas de entrega genéricas e sem identificação da marca",
      "Tags de produtos simples ou ausentes, transmitindo desvalorização do item",
      "Vidros de entrada vazios, perdendo oportunidades de vitrine"
    ];
    nicheProducts = [
      { productName: "Sacolas de Papel Personalizadas", benefit: "Sua marca circula pelas ruas da cidade de forma elegante nas mãos dos compradores." },
      { productName: "Tags para Roupas com Fio", benefit: "Valoriza a peça de vestuário e informa preços e cuidados com sofisticação." },
      { productName: "Adesivo de Vitrine Promocional", benefit: "Sinaliza liquidações e coleções sazonais na entrada com aplicação limpa." },
      { productName: "Fita de Cetim Personalizada", benefit: "Toque final para fechamento de caixas de presentes e embrulhos premium." }
    ];
    brandAuditVerdict = `O varejo físico depende inteiramente da experiência de compra e do pós-venda. A sacola e a tag de preço são o elo de conexão do cliente com a marca após ele sair da loja. Investir em sacolas corporativas de papel e tags de toque aveludado eleva as roupas/produtos comuns ao patamar de presentes desejáveis.`;
  }

  const firstWord = lead.name.split(' ')[0];

  const personalizedPitch = `Olá, equipe da *${lead.name}*! Tudo bem? 🌟

Nós da *ImPlotter Studio* acompanhamos de perto os negócios locais de destaque e ficamos impressionados com as avaliações e a reputação que vocês possuem com *${lead.rating || "4.8"}★* estrelas! Parabéns pelo atendimento de excelência!

Como trabalhamos com design e impressos corporativos de alto padrão, nosso setor de criação fez uma análise visual cortesia e percebeu uma grande oportunidade para alinhar essa qualidade digital fantástica com o seu espaço físico.

Para nichos de prestígio como o seu, percebemos que o uso de materiais como o *${nicheProducts[0].productName}* e o *${nicheProducts[1].productName}* (para ${nicheProducts[1].benefit.toLowerCase()}) geram conexões táticas que encantam os clientes e justificam tickets mais elevados.

Para ajudar a ilustrar, nosso designer elaborou um *Mockup Visual Interativo* mostrando como esses materiais ficariam com a sua marca e cores aplicadas. 

Ficou super elegante! Posso enviar o link dessa apresentação para você dar uma olhada (sem compromisso)?

Um abraço,
*Time ImPlotter Studio* 🚀`;

  return {
    commercialScore,
    visualDiagnostics,
    weaknessesIdentified,
    nicheProducts,
    brandAuditVerdict,
    personalizedPitch
  };
}
