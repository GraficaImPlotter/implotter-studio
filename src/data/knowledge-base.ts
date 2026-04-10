export interface FAQItem {
  keywords: string[];
  answer: string;
  category?: 'produto' | 'pagamento' | 'prazo' | 'geral';
}

export const KNOWLEDGE_BASE: FAQItem[] = [
  {
    keywords: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "eai", "opa"],
    answer: "Olá! Tudo bem? Como posso ajudar você hoje com seus materiais impressos?",
    category: "geral"
  },
  {
    keywords: ["quem é você", "quem e voce", "seu nome", "qual seu nome", "quem ai"],
    answer: "Eu sou a ImPlotter IA, a assistente virtual da Gráfica ImPlotter. Estou aqui para tirar suas dúvidas e te ajudar a fazer o melhor pedido!",
    category: "geral"
  },
  {
    keywords: ["cartão", "cartao de visita", "papel couchê", "9x5"],
    answer: "Produzimos cartões de visita de alta qualidade (couchê 250g/300g) com prazo médio de 1 a 2 dias úteis após a aprovação da arte.",
    category: "produto"
  },
  {
    keywords: ["banner", "lona", "ilhos", "faixa", "enrolar"],
    answer: "Nossos banners são feitos em lona front light 240g/440g com acabamento em madeira e cordão ou ilhós. Ficam prontos em 1 dia útil.",
    category: "produto"
  },
  {
    keywords: ["adesivo", "vinil", "recorte", "leitoso", "transparente"],
    answer: "Trabalhamos com adesivos em vinil brilho ou fosco, ideais para vitrines, frotas e decoração. Temos opção de recorte eletrônico sob medida.",
    category: "produto"
  },
  {
    keywords: ["panfleto", "flyer", "folheto", "propaganda"],
    answer: "Panfletos em diversos tamanhos (10x15, 15x21) com papel couchê 90g/115g. O melhor custo-benefício para sua divulgação em massa.",
    category: "produto"
  },
  {
    keywords: ["pagamento", "pix", "cartão", "cartao", "parcela", "asaas", "como pagar"],
    answer: "Trabalhamos com PIX e Cartão de Crédito via Asaas. O processamento do PIX é instantâneo e no cartão o pagamento é feito de forma segura e criptografada.",
    category: "pagamento"
  },
  {
    keywords: ["prazo", "entrega", "sedex", "pac", "envio"],
    answer: "O prazo de produção varia por produto (geralmente 1-3 dias). O prazo de entrega depende da sua região e da transportadora escolhida no checkout.",
    category: "prazo"
  },
  {
    keywords: ["site", "landing page", "webapp", "sistema"],
    answer: "Além de gráfica, criamos sites institucionais, landing pages de alta conversão e sistemas para sua empresa. Peça um orçamento!",
    category: "geral"
  },
  {
    keywords: ["endereço", "local", "onde fica", "retirada"],
    answer: "Nossa sede para retiradas fica localizada na região metropolitana. Você também pode receber via Uber (locais) ou Correios (todo o Brasil).",
    category: "geral"
  },
  {
    keywords: ["arte", "arquivo", "pdf", "corel", "photoshop"],
    answer: "Aceitamos arquivos em PDF/X-1a, CorelDRAW (convertido em curvas), AI ou imagens em alta resolução (mínimo 300 DPI).",
    category: "geral"
  }
];
