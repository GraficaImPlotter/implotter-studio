// Generates a Premium Commercial Proposal PDF (Sales Book style)

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

export function generatePremiumProposalPDF(quote: QuoteData, items: QuoteItemData[]) {
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until + "T12:00:00").toLocaleDateString("pt-BR")
    : "Não informada";
  const createdAt = new Date(quote.created_at).toLocaleDateString("pt-BR");

  const itemsRows = items
    .map(
      (item, i) => `
    <div style="display:flex; justify-content:space-between; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
      <div style="flex:1">
          <p style="font-weight: 800; color: #fff; margin:0; font-size:14px;">${escapeHtml(item.product_name)}</p>
          ${item.description ? `<p style="color:rgba(255,255,255,0.5); font-size:11px; margin:4px 0 0 0;">${escapeHtml(item.description)}</p>` : ""}
      </div>
      <div style="text-align:right">
          <p style="font-weight: 900; color: #f97316; margin:0; font-size:16px;">R$ ${Number(item.subtotal).toFixed(2)}</p>
          <p style="color:rgba(255,255,255,0.3); font-size:10px; margin:2px 0 0 0;">${item.quantity} un. x R$ ${Number(item.unit_price).toFixed(2)}</p>
      </div>
    </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Especial #${quote.quote_number} - ImPlotter Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;400;600;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { 
      font-family: 'Plus Jakarta Sans', sans-serif; 
      color:#fff; 
      background:#050505; 
    }
    .page { padding: 60px; min-height: 100vh; position:relative; overflow:hidden; }
    .accent-glow { 
      position:absolute; top:-100px; right: -100px; 
      width: 400px; height: 400px; 
      background: rgba(249, 115, 22, 0.15); 
      filter: blur(80px); border-radius: 50%; z-index:0;
    }
    .header { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 60px; }
    .brand h1 { font-weight: 800; font-size: 32px; letter-spacing: -1px; text-transform: uppercase; line-height: 0.9; }
    .brand p { font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: #f97316; font-weight: 800; margin-top: 8px; }
    
    .proposal-info { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 30px; border-radius: 32px; margin-bottom: 40px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.4); margin-bottom: 4px; display:block; font-weight: 800; }
    
    .intro-text { font-size: 18px; line-height: 1.5; color: rgba(255,255,255,0.8); margin-bottom: 40px; }
    .intro-text b { color: #fff; }

    .items-container { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 40px; border-radius: 40px; }
    
    .total-area { margin-top: 40px; text-align: right; }
    .total-price { font-size: 48px; font-weight: 800; letter-spacing: -2px; color: #f97316; }
    
    .footer { margin-top: 80px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; }

    .btn-print { 
      background: #f97316; color: #fff; border:none; padding: 15px 40px; border-radius: 20px; 
      font-weight: 800; font-size: 16px; cursor:pointer; box-shadow: 0 10px 20px rgba(249, 115, 22, 0.3);
      transition: transform 0.2s;
    }
    .btn-print:hover { transform: translateY(-2px); }

    @media print {
      .no-print { display:none; }
      body { background: #000; color: #fff; }
      .page { padding: 40px; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:100;">
    <button class="btn-print" onclick="window.print()">
      SALVAR PROPOSTA COMERCIAL
    </button>
  </div>

  <div class="page">
    <div class="accent-glow"></div>
    
    <div class="header">
      <div class="brand">
        <h1>IMPLOTTER<br><span style="color:#f97316">STUDIO</span></h1>
        <p>Soluções Visuais High-End</p>
      </div>
      <div style="text-align:right">
        <span class="label">Proposta Nº</span>
        <h2 style="font-size: 24px; font-weight: 800;">#${quote.quote_number}</h2>
      </div>
    </div>

    <div class="intro-text">
        Olá <b>${escapeHtml(quote.customer_name)}</b>,<br>
        É um prazer apresentar esta curadoria de soluções gráficas pensadas para o seu projeto. 
        Nossa missão na ImPlotter Studio é transformar visão em impacto visual de extrema qualidade.
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
        <div class="proposal-info">
            <span class="label">Para</span>
            <p style="font-weight: 800; font-size: 16px;">${escapeHtml(quote.customer_name)}</p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.5);">${escapeHtml(quote.customer_email || "Email não informado")}</p>
        </div>
        <div class="proposal-info">
            <span class="label">Validade até</span>
            <p style="font-weight: 800; font-size: 16px;">${validUntil}</p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Emitido em: ${createdAt}</p>
        </div>
    </div>

    <div class="items-container">
        <span class="label" style="margin-bottom: 20px;">Especificações Técnicas & Investimento</span>
        ${itemsRows}
        <div class="total-area">
            <span class="label">Investimento Total</span>
            <div class="total-price">R$ ${Number(quote.total).toFixed(2)}</div>
            ${Number(quote.discount) > 0 ? `<p style="font-weight: 800; color: #16a34a; font-size: 12px;">Com desconto especial aplicado de R$ ${Number(quote.discount).toFixed(2)}</p>` : ""}
        </div>
    </div>

    ${quote.notes ? `
    <div style="margin-top: 40px; padding: 30px; background: rgba(249, 115, 22, 0.05); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 32px;">
        <span class="label" style="color:#f97316">Observações Importantes</span>
        <p style="font-size:13px; color: rgba(255,255,255,0.8); line-height: 1.6; white-space: pre-wrap;">${escapeHtml(quote.notes)}</p>
    </div>` : ""}

    <div class="footer">
      <p>ESTA PROPOSTA FOI GERADA DIGITALMENTE PELA INTELIGÊNCIA COMERCIAL DA IMPLOTTER STUDIO.</p>
      <p style="margin-top:6px">CNPJ: XXX.XXX.XXX/0001-XX | (XX) XXXX-XXXX | @implotterstudio</p>
    </div>
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
