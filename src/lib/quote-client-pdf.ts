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
  customer?: CustomerData;
  company?: CompanyData;
  notes?: string;
}

export const generateClientQuotePDF = async (data: QuoteClientData) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(30, 30, 46);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Orçamento", 14, 20);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  y = 40;

  if (data.customer?.name) {
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente: ${data.customer.name}`, 14, y);
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  const total = data.items.reduce((sum, it) => sum + it.total, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: R$ ${total.toFixed(2)}`, pageW - 14, y, { align: "right" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  data.items.forEach(it => {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(`${it.quantity}x ${it.name} - R$ ${it.unitPrice.toFixed(2)} = R$ ${it.total.toFixed(2)}`, 14, y);
    y += 5;
  });

  doc.save(`orcamento-${Date.now()}.pdf`);
};
