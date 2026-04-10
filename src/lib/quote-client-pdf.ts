import jsPDF from "jspdf";

interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  dimensions?: string;
  finishings?: string[];
}

interface CustomerData {
  name?: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  company?: string;
}

interface CompanyData {
  name?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface QuoteClientData {
  items: QuoteItem[];
  companyName?: string;
  estimatedDays?: number;
  customer?: CustomerData;
  company?: CompanyData;
}

export const generateClientQuotePDF = (data: QuoteClientData) => {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  const companyName = data.company?.name || data.companyName || "Gráfica ImPlotter";
  const companyCnpj = data.company?.cnpj || "";
  const companyAddress = data.company?.address || "";
  const companyPhone = data.company?.phone || "";
  const companyEmail = data.company?.email || "contato@graficaimplotter.com.br";
  const companyWebsite = data.company?.website || "graficaimplotter.shop";

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, w, 48, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("COTAÇÃO", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companyName, 15, 26);
  if (companyCnpj) doc.text(`CNPJ: ${companyCnpj}`, 15, 32);
  if (companyAddress) doc.text(companyAddress, 15, 38);
  if (companyPhone) doc.text(`Tel: ${companyPhone}`, 15, 44);

  // Right side header info
  doc.setFontSize(9);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, w - 15, 18, { align: "right" });
  if (data.estimatedDays) {
    doc.text(`Prazo estimado: ${data.estimatedDays} dias úteis`, w - 15, 25, { align: "right" });
  }
  doc.text(`Nº ${Date.now().toString(36).toUpperCase()}`, w - 15, 32, { align: "right" });

  y = 58;
  doc.setTextColor(50, 50, 50);

  // Customer info section
  if (data.customer && (data.customer.name || data.customer.email || data.customer.phone)) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, y - 4, w - 30, 32, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 20, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let cy = y + 10;
    if (data.customer.name) { doc.text(`Nome: ${data.customer.name}`, 20, cy); cy += 5; }
    if (data.customer.company) { doc.text(`Empresa: ${data.customer.company}`, 20, cy); cy += 5; }
    if (data.customer.cpfCnpj) { doc.text(`CPF/CNPJ: ${data.customer.cpfCnpj}`, 20, cy); cy += 5; }
    if (data.customer.email) { doc.text(`E-mail: ${data.customer.email}`, w / 2, y + 10); }
    if (data.customer.phone) { doc.text(`Telefone: ${data.customer.phone}`, w / 2, y + 15); }
    y += 38;
  }

  // Table header
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(15, y - 5, w - 30, 10, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Produto", 18, y + 1);
  doc.text("Qtd", 120, y + 1);
  doc.text("Unit.", 140, y + 1);
  doc.text("Total", 175, y + 1, { align: "right" });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  let grandTotal = 0;

  data.items.forEach((item, idx) => {
    // Zebra striping
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(15, y - 4, w - 30, item.dimensions || (item.finishings && item.finishings.length > 0) ? 18 : 8, "F");
    }

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(item.name.substring(0, 50), 18, y);
    doc.text(String(item.quantity), 120, y);
    doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 140, y);
    doc.setFont("helvetica", "bold");
    doc.text(`R$ ${item.total.toFixed(2)}`, 175, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    grandTotal += item.total;
    y += 6;

    if (item.dimensions) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`📐 Dimensões: ${item.dimensions}`, 20, y);
      y += 5;
    }
    if (item.finishings && item.finishings.length > 0) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`✨ Acabamentos: ${item.finishings.join(", ")}`, 20, y);
      y += 5;
    }
    doc.setTextColor(50, 50, 50);
    y += 3;
  });

  // Total
  y += 5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(100, y, w - 15, y);
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Total:", 120, y);
  doc.setTextColor(37, 99, 235);
  doc.text(`R$ ${grandTotal.toFixed(2)}`, 175, y, { align: "right" });

  // Footer
  y += 25;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(15, y, w - 15, y);
  y += 8;
  doc.setTextColor(130, 130, 130);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Esta cotação é válida por 7 dias. Valores sujeitos a alteração sem aviso prévio.", 15, y);
  doc.text("Preços não incluem frete. Consulte condições de pagamento.", 15, y + 5);
  y += 12;
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text(`${companyWebsite} | ${companyEmail}`, 15, y);

  doc.save(`cotacao-implotter-${Date.now()}.pdf`);
};
