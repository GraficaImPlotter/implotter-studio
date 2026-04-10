// Order document generator (invoice-like, not official NF)

export interface OrderDocumentData {
  orderNumber: number;
  date: string;
  company: {
    name?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  };
  customer: {
    name: string;
    cpf_cnpj?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zip?: string;
    } | null;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: string | null;
  notes?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX", dinheiro: "Dinheiro", cartao: "Cartão", boleto: "Boleto", outro: "Outro",
};

function esc(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function fmtAddr(addr: NonNullable<OrderDocumentData["customer"]["address"]>): string {
  const parts: string[] = [];
  if (addr.street) parts.push(`${addr.street}${addr.number ? `, ${addr.number}` : ""}`);
  if (addr.complement) parts.push(addr.complement);
  if (addr.neighborhood) parts.push(addr.neighborhood);
  if (addr.city) parts.push(`${addr.city}${addr.state ? ` - ${addr.state}` : ""}`);
  if (addr.zip) parts.push(`CEP: ${addr.zip}`);
  return parts.join(" • ");
}

export function generateOrderDocument(data: OrderDocumentData) {
  const dateStr = new Date(data.date).toLocaleDateString("pt-BR");
  const nowStr = new Date().toLocaleString("pt-BR");
  const payment = data.paymentMethod ? (PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod) : "—";
  const co = data.company;
  const companyName = co.name || "Gráfica ImPlotter";

  const itemsRows = data.items.map((item, i) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b">${i + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${esc(item.description)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">R$ ${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">R$ ${Number(item.subtotal).toFixed(2)}</td>
    </tr>`).join("");

  const customerAddr = data.customer.address ? fmtAddr(data.customer.address) : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documento de Venda #${data.orderNumber} - ${esc(companyName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;background:#fff;padding:32px;max-width:800px;margin:0 auto;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #1e293b;margin-bottom:24px}
    .company-info h1{font-size:22px;color:#1e293b;margin-bottom:4px}
    .company-info p{font-size:11px;color:#64748b;line-height:1.6}
    .doc-badge{text-align:right}
    .doc-badge .title{font-size:18px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px}
    .doc-badge .num{font-size:28px;font-weight:900;color:#2563eb}
    .doc-badge .date{font-size:11px;color:#64748b;margin-top:4px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .info-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
    .info-block h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#2563eb;font-weight:700;margin-bottom:8px}
    .info-block p{font-size:12px;line-height:1.8;color:#334155}
    .info-block strong{color:#1e293b}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    thead th{background:#1e293b;color:#fff;padding:10px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
    thead th:first-child{border-radius:6px 0 0 0}
    thead th:last-child{border-radius:0 6px 0 0}
    .totals{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-bottom:20px}
    .totals .row{display:flex;gap:20px;font-size:13px}
    .totals .row.total{font-size:18px;font-weight:800;color:#2563eb;border-top:2px solid #1e293b;padding-top:8px;margin-top:4px}
    .payment{background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;margin-bottom:16px}
    .payment h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#1e40af;margin-bottom:4px}
    .payment p{font-size:14px;font-weight:600;color:#1e3a5f}
    .notes{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:20px}
    .notes h4{font-size:10px;text-transform:uppercase;color:#92400e;margin-bottom:4px}
    .notes p{font-size:12px;color:#78350f;white-space:pre-wrap}
    .footer{text-align:center;padding-top:16px;border-top:1px solid #e2e8f0;margin-top:32px}
    .footer p{font-size:9px;color:#94a3b8}
    .disclaimer{text-align:center;font-size:9px;color:#94a3b8;margin-top:8px;font-style:italic}
    @media print{body{padding:16px}.no-print{display:none!important}}
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px">
    <button onclick="window.print()" style="background:#1e293b;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;margin-right:8px">🖨️ Imprimir / Salvar PDF</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:10px 20px;border-radius:6px;font-size:14px;cursor:pointer">Fechar</button>
  </div>

  <div class="header">
    <div class="company-info">
      <h1>${esc(companyName)}</h1>
      ${co.cnpj ? `<p><strong>CNPJ:</strong> ${esc(co.cnpj)}</p>` : ""}
      ${co.phone ? `<p><strong>Tel:</strong> ${esc(co.phone)}${co.email ? ` • ${esc(co.email)}` : ""}</p>` : ""}
      ${co.address ? `<p>${esc(co.address)}${co.city ? ` • ${esc(co.city)}` : ""}</p>` : ""}
    </div>
    <div class="doc-badge">
      <div class="title">Documento de Venda</div>
      <div class="num">#${data.orderNumber}</div>
      <div class="date">Emitido em ${dateStr}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="info-block">
      <h3>Dados do Cliente</h3>
      <p><strong>${esc(data.customer.name)}</strong></p>
      ${data.customer.cpf_cnpj ? `<p>CPF/CNPJ: ${esc(data.customer.cpf_cnpj)}</p>` : ""}
      ${data.customer.phone ? `<p>Tel: ${esc(data.customer.phone)}</p>` : ""}
      ${data.customer.email ? `<p>${esc(data.customer.email)}</p>` : ""}
      ${customerAddr ? `<p>${esc(customerAddr)}</p>` : ""}
    </div>
    <div class="info-block">
      <h3>Informações do Pedido</h3>
      <p><strong>Pedido:</strong> #${data.orderNumber}</p>
      <p><strong>Data:</strong> ${dateStr}</p>
      <p><strong>Pagamento:</strong> ${esc(payment)}</p>
      <p><strong>Itens:</strong> ${data.items.length}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center">#</th>
        <th style="text-align:left">Descrição</th>
        <th style="width:60px;text-align:center">Qtd</th>
        <th style="width:100px;text-align:right">Valor Unit.</th>
        <th style="width:100px;text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal:</span><span>R$ ${Number(data.subtotal).toFixed(2)}</span></div>
    ${Number(data.discount) > 0 ? `<div class="row" style="color:#16a34a"><span>Desconto:</span><span>-R$ ${Number(data.discount).toFixed(2)}</span></div>` : ""}
    <div class="row total"><span>Total:</span><span>R$ ${Number(data.total).toFixed(2)}</span></div>
  </div>

  <div class="payment">
    <h4>Forma de Pagamento</h4>
    <p>${esc(payment)}</p>
  </div>

  ${data.notes ? `<div class="notes"><h4>Observações</h4><p>${esc(data.notes)}</p></div>` : ""}

  <div class="footer">
    <p>${esc(companyName)}${co.cnpj ? ` • CNPJ: ${esc(co.cnpj)}` : ""} • Documento de Venda #${data.orderNumber}</p>
    <p style="margin-top:4px">Gerado em ${nowStr}</p>
  </div>
  <div class="disclaimer">Este documento não possui valor fiscal. Trata-se de um comprovante interno de venda.</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
