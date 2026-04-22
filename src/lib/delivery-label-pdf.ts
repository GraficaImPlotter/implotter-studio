// Local delivery label and receipt stub generator
import qrcode from "qrcode-generator";

export interface DeliveryLabelData {
  orderNumber: string | number;
  date: string;
  customer: {
    name: string;
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
  }[];
  company: {
    name: string;
    phone?: string;
    address?: string;
  };
}

function esc(text: string): string {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function makeQR(text: string): string {
  try {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createDataURL(4, 0);
  } catch (e) {
    return "";
  }
}

export function generateDeliveryLabelPDF(data: DeliveryLabelData) {
  const dateStr = new Date(data.date).toLocaleDateString("pt-BR");
  const nowStr = new Date().toLocaleString("pt-BR");
  const companyName = data.company.name || "Gráfica ImPlotter";
  const qrImg = makeQR(`${window.location.origin}/admin/pedidos?q=${data.orderNumber}`);

  const itemsHtml = data.items
    .map(it => `• ${it.quantity}x ${esc(it.description)}`)
    .join("<br>");

  const addr = data.customer.address;
  const addressFull = addr 
    ? `${esc(addr.street)}, ${esc(addr.number)}${addr.complement ? ` - ${esc(addr.complement)}` : ""}<br>${esc(addr.neighborhood)} - ${esc(addr.city)}/${esc(addr.state)}<br>CEP: ${esc(addr.zip)}`
    : "Endereço não informado";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha de Entrega #${data.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #000; background: #fff; padding: 20px; }
    
    .sheet { width: 100%; max-width: 800px; margin: 0 auto; border: 2px solid #000; }
    
    /* Label Section */
    .label-section { padding: 30px; border-bottom: 2px dashed #000; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .company-info h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; }
    .company-info p { font-size: 12px; color: #444; }
    
    .order-badge { background: #000; color: #fff; padding: 10px 20px; border-radius: 5px; text-align: center; }
    .order-badge span { font-size: 10px; display: block; text-transform: uppercase; }
    .order-badge strong { font-size: 20px; }

    .destinatario { margin-top: 20px; }
    .destinatario h2 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
    .destinatario .name { font-size: 22px; font-weight: 800; margin-bottom: 5px; }
    .destinatario .addr { font-size: 16px; line-height: 1.4; }
    .destinatario .phone { font-size: 14px; margin-top: 5px; font-weight: 600; }

    .items-box { margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #eee; border-radius: 5px; }
    .items-box h3 { font-size: 10px; text-transform: uppercase; margin-bottom: 5px; color: #888; }
    .items-box p { font-size: 12px; line-height: 1.5; }

    /* Stub Section (Canhoto) */
    .stub-section { padding: 20px 30px; background: #fff; }
    .stub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .stub-title { font-size: 14px; font-weight: 800; text-transform: uppercase; }
    
    .declaration { font-size: 11px; line-height: 1.4; margin-bottom: 20px; }
    
    .signature-area { display: flex; gap: 20px; margin-top: 10px; }
    .sig-box { flex: 1; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
    .sig-box p { font-size: 10px; color: #666; text-transform: uppercase; }

    .qr-side { position: absolute; right: 30px; bottom: 30px; text-align: center; }
    .qr-side img { width: 80px; height: 80px; }
    .qr-side p { font-size: 8px; color: #999; margin-top: 2px; }

    .no-print { text-align: center; margin-bottom: 20px; }
    .btn { background: #000; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 700; margin: 0 5px; }
    
    @media print { .no-print { display: none; } body { padding: 0; } .sheet { border: 2px solid #000; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Ficha de Entrega</button>
    <button class="btn" style="background:#666" onclick="window.close()">Fechar</button>
  </div>

  <div class="sheet">
    <!-- LABEL PART -->
    <div class="label-section">
      <div class="header">
        <div class="company-info">
          <h1>${esc(companyName)}</h1>
          <p>${esc(data.company.address || "")} • Tel: ${esc(data.company.phone || "")}</p>
        </div>
        <div class="order-badge">
          <span>Pedido</span>
          <strong>#${data.orderNumber}</strong>
        </div>
      </div>

      <div class="destinatario">
        <h2>Destinatário</h2>
        <div class="name">${esc(data.customer.name)}</div>
        <div class="addr">${addressFull}</div>
        <div class="phone">Tel: ${esc(data.customer.phone || "Não informado")}</div>
      </div>

      <div class="items-box">
        <h3>Itens do Pedido</h3>
        <p>${itemsHtml}</p>
      </div>

      <div class="qr-side">
        <img src="${qrImg}" alt="QR Code">
        <p>Acompanhe seu pedido</p>
      </div>
    </div>

    <!-- STUB PART (CANHOTO) -->
    <div class="stub-section">
      <div class="stub-header">
        <div class="stub-title">Canhoto de Entrega #${data.orderNumber}</div>
        <div style="font-size: 10px; color: #666;">Data do Pedido: ${dateStr}</div>
      </div>
      
      <div class="declaration">
        Recebi de <strong>${esc(companyName)}</strong> os produtos constantes no pedido <strong>#${data.orderNumber}</strong> em perfeito estado e conforme o solicitado.
      </div>

      <div class="signature-area">
        <div class="sig-box" style="flex: 2;">
          <p>Assinatura do Recebedor</p>
        </div>
        <div class="sig-box">
          <p>RG / CPF</p>
        </div>
        <div class="sig-box">
          <p>Data e Hora</p>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #999; font-style: italic;">
    Gerado em ${nowStr} • Gráfica ImPlotter - Soluções em Impressão
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
