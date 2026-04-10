// Receipt / proof-of-sale PDF generator (opens print-ready window)

export interface ReceiptData {
  type: "recibo" | "comprovante";
  documentNumber: string | number;
  date: string; // ISO string
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    cpf_cnpj?: string | null;
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
  company?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  } | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  boleto: "Boleto",
  outro: "Outro",
};

function esc(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function generateReceiptPDF(data: ReceiptData) {
  const title = data.type === "recibo" ? "Recibo" : "Comprovante de Venda";
  const dateStr = new Date(data.date).toLocaleDateString("pt-BR");
  const nowStr = new Date().toLocaleDateString("pt-BR");
  const payment = data.paymentMethod ? (PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod) : "—";

  const co = data.company;
  const companyName = co?.name || "Gráfica ImPlotter";
  const contactLines: string[] = [];
  if (co?.phone) contactLines.push(`Tel: ${esc(co.phone)}`);
  if (co?.email) contactLines.push(esc(co.email));
  if (co?.address) contactLines.push(esc(co.address));
  if (co?.city) contactLines.push(esc(co.city));
  const contactHtml = contactLines.length > 0
    ? contactLines.join(" &bull; ")
    : "Materiais gráficos profissionais";

  const itemsRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;color:#6b7280">${i + 1}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top">${esc(item.description)}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top">${item.quantity}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top">R$ ${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-weight:600">R$ ${Number(item.subtotal).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} #${data.documentNumber} - ${esc(companyName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1f2937;background:#fff;padding:40px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #2563eb}
    .logo-area h1{font-size:26px;color:#2563eb;margin-bottom:6px}
    .logo-area .contact{font-size:11px;color:#6b7280;line-height:1.8}
    .doc-badge{background:#2563eb;color:#fff;padding:10px 20px;border-radius:10px;text-align:center;flex-shrink:0}
    .doc-badge .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:.85}
    .doc-badge .num{font-size:22px;font-weight:700}
    .section{margin-bottom:24px}
    .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#2563eb;font-weight:700;margin-bottom:8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .info-box{background:#f9fafb;border-radius:8px;padding:14px}
    .info-box label{font-size:11px;color:#6b7280;display:block;margin-bottom:2px}
    .info-box p{font-size:13px;font-weight:500}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    thead th{background:#1e293b;color:#fff;padding:12px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    thead th:first-child{border-radius:8px 0 0 0}
    thead th:last-child{border-radius:0 8px 0 0}
    tbody td{font-size:13px}
    .totals{margin-top:16px;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
    .totals .row{display:flex;gap:24px;font-size:14px}
    .totals .row.total{font-size:20px;font-weight:700;color:#2563eb;border-top:2px solid #1e293b;padding-top:8px;margin-top:4px}
    .payment-box{background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin-top:20px}
    .payment-box h4{font-size:12px;color:#1e40af;margin-bottom:4px}
    .payment-box p{font-size:14px;font-weight:600;color:#1e3a5f}
    .notes{background:#fefce8;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin-top:16px}
    .notes h4{font-size:12px;color:#92400e;margin-bottom:4px}
    .notes p{font-size:13px;color:#78350f;white-space:pre-wrap}
    .signature{margin-top:48px;display:flex;justify-content:space-between;gap:40px}
    .sig-line{flex:1;text-align:center;padding-top:8px;border-top:1px solid #9ca3af}
    .sig-line p{font-size:11px;color:#6b7280;margin-top:4px}
    .footer{margin-top:32px;text-align:center;padding-top:16px;border-top:1px solid #e5e7eb}
    .footer p{font-size:10px;color:#9ca3af}
    @media print{body{padding:20px}.no-print{display:none!important}}
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:24px">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:600;margin-right:8px">
      🖨️ Imprimir / Salvar PDF
    </button>
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:12px 24px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:500">
      Fechar
    </button>
  </div>

  <div class="header">
    <div class="logo-area">
      <h1>${esc(companyName)}</h1>
      <div class="contact">${contactHtml}</div>
    </div>
    <div class="doc-badge">
      <div class="label">${title}</div>
      <div class="num">#${data.documentNumber}</div>
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div>
        <div class="section-title">Dados do Cliente</div>
        <div class="info-box">
          <label>Nome</label><p>${esc(data.customer.name)}</p>
          ${data.customer.cpf_cnpj ? `<label style="margin-top:6px">CPF/CNPJ</label><p>${esc(data.customer.cpf_cnpj)}</p>` : ""}
          ${data.customer.phone ? `<label style="margin-top:6px">Telefone</label><p>${esc(data.customer.phone)}</p>` : ""}
          ${data.customer.email ? `<label style="margin-top:6px">Email</label><p>${esc(data.customer.email)}</p>` : ""}
          ${data.customer.address?.street ? `<label style="margin-top:6px">Endereço</label><p>${esc([data.customer.address.street, data.customer.address.number].filter(Boolean).join(", "))}${data.customer.address.complement ? `, ${esc(data.customer.address.complement)}` : ""}</p>` : ""}
          ${data.customer.address?.neighborhood ? `<label style="margin-top:6px">Bairro</label><p>${esc(data.customer.address.neighborhood)}</p>` : ""}
          ${data.customer.address?.city ? `<label style="margin-top:6px">Cidade</label><p>${esc([data.customer.address.city, data.customer.address.state].filter(Boolean).join(" - "))}${data.customer.address.zip ? ` (CEP: ${esc(data.customer.address.zip)})` : ""}</p>` : ""}
        </div>
      </div>
      <div>
        <div class="section-title">Informações do Documento</div>
        <div class="info-box">
          <label>Tipo</label><p>${title}</p>
          <label style="margin-top:6px">Data</label><p>${dateStr}</p>
          <label style="margin-top:6px">Emissão</label><p>${nowStr}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Itens</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center">#</th>
          <th style="text-align:left">Descrição</th>
          <th style="width:60px;text-align:center">Qtd</th>
          <th style="width:110px;text-align:right">Valor Unit.</th>
          <th style="width:110px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>R$ ${Number(data.subtotal).toFixed(2)}</span></div>
      ${Number(data.discount) > 0 ? `<div class="row" style="color:#16a34a"><span>Desconto:</span><span>-R$ ${Number(data.discount).toFixed(2)}</span></div>` : ""}
      <div class="row total"><span>Total:</span><span>R$ ${Number(data.total).toFixed(2)}</span></div>
    </div>
  </div>

  <div class="payment-box">
    <h4>Forma de Pagamento</h4>
    <p>${esc(payment)}</p>
  </div>

  ${data.notes ? `<div class="notes"><h4>Observações</h4><p>${esc(data.notes)}</p></div>` : ""}

  <div class="signature">
    <div class="sig-line"><p>${esc(companyName)}</p></div>
    <div class="sig-line"><p>${esc(data.customer.name)}</p></div>
  </div>

  <div class="footer">
    <p>${esc(companyName)} • ${title} #${data.documentNumber} • Gerado em ${nowStr}</p>
    <p style="margin-top:4px">Documento válido como comprovante de transação comercial.</p>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
