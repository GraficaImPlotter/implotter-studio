export const ORDER_STATUS_LABELS: Record<string, string> = {
  pedido_recebido: "Pedido Recebido",
  aguardando_pagamento: "Aguardando Pagamento",
  pagamento_confirmado: "Pagamento Confirmado",
  em_analise: "Em Análise",
  aguardando_arte: "Aguardando Arte",
  arte_em_conferencia: "Arte em Conferência",
  aprovado_producao: "Aprovado p/ Produção",
  em_producao: "Em Produção",
  em_acabamento: "Em Acabamento",
  pronto_envio: "Pronto p/ Envio",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;
