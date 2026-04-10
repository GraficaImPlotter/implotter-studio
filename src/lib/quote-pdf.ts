// Generates a professional PDF quote by opening a print-ready window

interface QuoteData {
  quote_number: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
}

interface QuoteItemData {
  product_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export function generateQuotePDF(quote: QuoteData, items: QuoteItemData[]) {
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until + "T12:00:00").toLocaleDateString("pt-BR")
    : "Não informada";
  const createdAt = new Date(quote.created_at).toLocaleDateString("pt-BR");

  const itemsRows = items
    .map(
      (item, i) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">
        <strong>${escapeHtml(item.product_name)}</strong>
        ${item.description ? `<br><small style="color:#6b7280">${escapeHtml(item.description)}</small>` : ""}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right">R$ ${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">R$ ${Number(item.subtotal).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento #${quote.quote_number} - Gráfica ImPlotter</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1f2937; background:#fff; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:20px; border-bottom:3px solid #f97316; }
    .logo-area h1 { font-size:28px; color:#f97316; margin-bottom:4px; }
    .logo-area p { font-size:12px; color:#6b7280; }
    .quote-badge { background:#f97316; color:#fff; padding:8px 20px; border-radius:8px; text-align:center; }
    .quote-badge .num { font-size:24px; font-weight:700; }
    .quote-badge .label { font-size:10px; text-transform:uppercase; letter-spacing:1px; }
    .section { margin-bottom:24px; }
    .section-title { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#f97316; font-weight:700; margin-bottom:8px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .info-box { background:#f9fafb; border-radius:8px; padding:12px; }
    .info-box label { font-size:11px; color:#6b7280; display:block; margin-bottom:2px; }
    .info-box p { font-size:14px; font-weight:500; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    thead th { background:#1f2937; color:#fff; padding:10px 8px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
    thead th:first-child { border-radius:8px 0 0 0; }
    thead th:last-child { border-radius:0 8px 0 0; }
    .totals { margin-top:16px; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .totals .row { display:flex; gap:20px; font-size:14px; }
    .totals .row.total { font-size:20px; font-weight:700; color:#f97316; border-top:2px solid #1f2937; padding-top:8px; margin-top:4px; }
    .notes { background:#fffbeb; border:1px solid #fbbf24; border-radius:8px; padding:16px; margin-top:24px; }
    .notes h4 { font-size:12px; color:#92400e; margin-bottom:6px; }
    .notes p { font-size:13px; color:#78350f; white-space:pre-wrap; }
    .footer { margin-top:40px; text-align:center; padding-top:20px; border-top:1px solid #e5e7eb; }
    .footer p { font-size:11px; color:#9ca3af; }
    @media print {
      body { padding:20px; }
      .no-print { display:none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px">
    <button onclick="window.print()" style="background:#f97316;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600">
      📄 Imprimir / Salvar PDF
    </button>
  </div>

  <div class="header">
    <div class="logo-area">
      <h1>Gráfica ImPlotter</h1>
      <p>Materiais gráficos profissionais</p>
    </div>
    <div class="quote-badge">
      <div class="label">Orçamento</div>
      <div class="num">#${quote.quote_number}</div>
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div>
        <div class="section-title">Dados do Cliente</div>
        <div class="info-box">
          <label>Nome</label><p>${escapeHtml(quote.customer_name)}</p>
          ${quote.customer_phone ? `<label style="margin-top:6px">Telefone</label><p>${escapeHtml(quote.customer_phone)}</p>` : ""}
          ${quote.customer_email ? `<label style="margin-top:6px">Email</label><p>${escapeHtml(quote.customer_email)}</p>` : ""}
        </div>
      </div>
      <div>
        <div class="section-title">Informações</div>
        <div class="info-box">
          <label>Data</label><p>${createdAt}</p>
          <label style="margin-top:6px">Validade</label><p>${validUntil}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Itens do Orçamento</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:left">#</th>
          <th style="text-align:left">Produto / Serviço</th>
          <th style="width:60px;text-align:center">Qtd</th>
          <th style="width:110px;text-align:right">Valor Unit.</th>
          <th style="width:110px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>R$ ${Number(quote.subtotal).toFixed(2)}</span></div>
      ${Number(quote.discount) > 0 ? `<div class="row" style="color:#16a34a"><span>Desconto:</span><span>-R$ ${Number(quote.discount).toFixed(2)}</span></div>` : ""}
      <div class="row total"><span>Total:</span><span>R$ ${Number(quote.total).toFixed(2)}</span></div>
    </div>
  </div>

  ${quote.notes ? `
  <div class="notes">
    <h4>Observações</h4>
    <p>${escapeHtml(quote.notes)}</p>
  </div>` : ""}

  <div class="footer">
    <p>Gráfica ImPlotter • Orçamento #${quote.quote_number} • Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
    <p style="margin-top:4px">Este orçamento é válido até ${validUntil}.</p>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
