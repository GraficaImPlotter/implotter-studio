import qrcode from "qrcode-generator";

export interface LabelOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone?: string | null;
  status: string;
  created_at: string;
  notes?: string | null;
  estimated_days?: number | null;
}

export interface LabelItem {
  product_name: string;
  quantity: number;
  item_width?: number | null;
  item_height?: number | null;
  item_area?: number | null;
  instructions?: string | null;
  pricing_type?: string | null;
}

const STATUS_PT: Record<string, string> = {
  pedido_recebido: "Pedido Recebido", aguardando_pagamento: "Aguardando Pagamento",
  pagamento_confirmado: "Pagamento Confirmado", em_analise: "Em Análise",
  aguardando_arte: "Aguardando Arte", arte_em_conferencia: "Arte em Conferência",
  aprovado_producao: "Aprovado p/ Produção", em_producao: "Em Produção",
  em_acabamento: "Em Acabamento", pronto_envio: "Pronto p/ Envio",
  finalizado: "Finalizado", cancelado: "Cancelado",
};

function makeQR(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(4, 0);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function estimatedDate(created: string, days?: number | null): string {
  if (!days) return "—";
  const d = new Date(created);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("pt-BR");
}

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
  .label { width: 100mm; padding: 5mm; border: 2px solid #222; border-radius: 4px; margin: 4mm auto; page-break-inside: avoid; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3mm; border-bottom: 2px solid #222; padding-bottom: 3mm; }
  .company { font-size: 11pt; font-weight: 800; }
  .company-sub { font-size: 7pt; color: #666; }
  .qr { width: 22mm; height: 22mm; }
  .order-num { font-size: 18pt; font-weight: 900; text-align: center; background: #222; color: #fff; padding: 2mm 4mm; border-radius: 3px; margin-bottom: 3mm; letter-spacing: 1px; }
  .row { display: flex; justify-content: space-between; font-size: 8.5pt; padding: 1mm 0; border-bottom: 1px dotted #ccc; }
  .row:last-child { border-bottom: none; }
  .lbl { font-weight: 700; color: #333; min-width: 28mm; }
  .val { text-align: right; flex: 1; color: #111; }
  .section { margin-top: 3mm; }
  .section-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #555; letter-spacing: 0.5px; margin-bottom: 1.5mm; border-bottom: 1px solid #999; padding-bottom: 0.5mm; }
  .status-box { display: inline-block; font-size: 8pt; font-weight: 700; padding: 1mm 3mm; border-radius: 2px; background: #e8e8e8; }
  .obs { font-size: 7.5pt; color: #444; margin-top: 1mm; font-style: italic; white-space: pre-wrap; max-height: 20mm; overflow: hidden; }
  .stages { display: flex; gap: 1.5mm; margin-top: 2mm; flex-wrap: wrap; }
  .stage { font-size: 6.5pt; padding: 0.8mm 2mm; border: 1px solid #bbb; border-radius: 2px; color: #666; }
  .stage.active { background: #222; color: #fff; border-color: #222; font-weight: 700; }
  .footer { margin-top: 3mm; text-align: center; font-size: 6.5pt; color: #999; border-top: 1px solid #ddd; padding-top: 1.5mm; }
  .item-label .product-name { font-size: 12pt; font-weight: 800; text-align: center; padding: 2mm 0; }
  @media print { body { margin: 0; } .label { border: 2px solid #222; } .no-print { display: none; } }
  .print-bar { text-align: center; padding: 8px; }
  .print-bar button { padding: 8px 24px; font-size: 14px; cursor: pointer; margin: 0 4px; border: 1px solid #222; background: #222; color: #fff; border-radius: 4px; }
  .print-bar button.outline { background: #fff; color: #222; }
`;

const STAGE_LABELS = ["Arte", "Impressão", "Acabamento", "Conferência", "Pronto"];
const STAGE_MAP: Record<string, number> = {
  aguardando_arte: 0, arte_em_conferencia: 0,
  em_producao: 1, aprovado_producao: 1,
  em_acabamento: 2,
  pronto_envio: 3,
  finalizado: 4,
};

function stagesHTML(status: string): string {
  const activeIdx = STAGE_MAP[status] ?? -1;
  return `<div class="stages">${STAGE_LABELS.map((s, i) =>
    `<span class="stage${i <= activeIdx ? " active" : ""}">${s}</span>`
  ).join("")}</div>`;
}

function buildOrderLabel(order: LabelOrder, items: LabelItem[], adminUrl: string): string {
  const qrData = `${adminUrl}/pagamento/${order.id}`;
  const qrImg = makeQR(qrData);
  const prazo = estimatedDate(order.created_at, order.estimated_days);

  return `
    <div class="label">
      <div class="header">
        <div>
          <div class="company">Gráfica ImPlotter</div>
          <div class="company-sub">Etiqueta de Produção</div>
        </div>
        <img class="qr" src="${qrImg}" alt="QR" />
      </div>
      <div class="order-num">PEDIDO #${order.order_number}</div>
      <div class="row"><span class="lbl">Cliente</span><span class="val">${order.customer_name}</span></div>
      ${order.customer_phone ? `<div class="row"><span class="lbl">Telefone</span><span class="val">${order.customer_phone}</span></div>` : ""}
      <div class="row"><span class="lbl">Data</span><span class="val">${fmtDate(order.created_at)}</span></div>
      <div class="row"><span class="lbl">Prazo</span><span class="val">${prazo}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val"><span class="status-box">${STATUS_PT[order.status] || order.status}</span></span></div>

      <div class="section">
        <div class="section-title">Itens (${items.length})</div>
        ${items.map((it, i) => {
          const dims = it.item_width && it.item_height ? `${it.item_width}×${it.item_height} cm` : "";
          return `
            <div class="row"><span class="lbl">${i + 1}. ${it.product_name}</span><span class="val">Qtd: ${it.quantity}${dims ? ` | ${dims}` : ""}</span></div>
          `;
        }).join("")}
      </div>

      ${order.notes ? `<div class="section"><div class="section-title">Observações</div><div class="obs">${order.notes}</div></div>` : ""}

      <div class="section">
        <div class="section-title">Fluxo de Produção</div>
        ${stagesHTML(order.status)}
      </div>

      <div class="footer">Gráfica ImPlotter — Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    </div>`;
}

function buildItemLabel(order: LabelOrder, item: LabelItem, itemIndex: number, totalItems: number, adminUrl: string): string {
  const qrData = `${adminUrl}/pagamento/${order.id}`;
  const qrImg = makeQR(qrData);
  const dims = item.item_width && item.item_height ? `${item.item_width} × ${item.item_height} cm` : "";
  const area = item.item_area ? `${Number(item.item_area).toFixed(2)} m²` : "";
  const prazo = estimatedDate(order.created_at, order.estimated_days);

  return `
    <div class="label item-label">
      <div class="header">
        <div>
          <div class="company">Gráfica ImPlotter</div>
          <div class="company-sub">Etiqueta de Item — Pedido #${order.order_number}</div>
        </div>
        <img class="qr" src="${qrImg}" alt="QR" />
      </div>
      <div class="order-num">#${order.order_number} — Item ${itemIndex + 1}/${totalItems}</div>
      <div class="product-name">${item.product_name}</div>
      <div class="row"><span class="lbl">Cliente</span><span class="val">${order.customer_name}</span></div>
      <div class="row"><span class="lbl">Quantidade</span><span class="val">${item.quantity}</span></div>
      ${dims ? `<div class="row"><span class="lbl">Medidas</span><span class="val">${dims}</span></div>` : ""}
      ${area ? `<div class="row"><span class="lbl">Área</span><span class="val">${area}</span></div>` : ""}
      ${item.pricing_type === "per_sqm" ? `<div class="row"><span class="lbl">Tipo</span><span class="val">Por m²</span></div>` : ""}
      <div class="row"><span class="lbl">Data do Pedido</span><span class="val">${fmtDate(order.created_at)}</span></div>
      <div class="row"><span class="lbl">Prazo</span><span class="val">${prazo}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val"><span class="status-box">${STATUS_PT[order.status] || order.status}</span></span></div>
      ${item.instructions ? `<div class="section"><div class="section-title">Instruções</div><div class="obs">${item.instructions}</div></div>` : ""}
      ${order.notes ? `<div class="section"><div class="section-title">Obs. do Pedido</div><div class="obs">${order.notes}</div></div>` : ""}

      <div class="section">
        <div class="section-title">Fluxo</div>
        ${stagesHTML(order.status)}
      </div>

      <div class="footer">Gráfica ImPlotter — ${new Date().toLocaleString("pt-BR")}</div>
    </div>`;
}

function openLabelWindow(html: string) {
  const w = window.open("", "_blank", "width=450,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiqueta de Produção</title><style>${STYLES}</style></head><body>
    <div class="print-bar no-print">
      <button onclick="window.print()">🖨️ Imprimir</button>
      <button class="outline" onclick="window.close()">Fechar</button>
    </div>
    ${html}
  </body></html>`);
  w.document.close();
}

/** Generate full order label (all items) */
export function generateOrderLabel(order: LabelOrder, items: LabelItem[]) {
  const adminUrl = window.location.origin;
  const html = buildOrderLabel(order, items, adminUrl);
  openLabelWindow(html);
}

/** Generate individual item label */
export function generateItemLabel(order: LabelOrder, item: LabelItem, itemIndex: number, totalItems: number) {
  const adminUrl = window.location.origin;
  const html = buildItemLabel(order, item, itemIndex, totalItems, adminUrl);
  openLabelWindow(html);
}

/** Generate all item labels for an order (one per item) */
export function generateAllItemLabels(order: LabelOrder, items: LabelItem[]) {
  const adminUrl = window.location.origin;
  const html = items.map((item, i) => buildItemLabel(order, item, i, items.length, adminUrl)).join("");
  openLabelWindow(html);
}
