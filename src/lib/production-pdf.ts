interface ProductionData {
  orderNumber: string;
  customerName: string;
  productName: string;
  dimensions: string;
  finishing: string[];
  notes?: string;
  designDataUrl?: string;
}

export const generateProductionPDF = async (data: ProductionData) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Pedido #${data.orderNumber}`, 14, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${data.customerName}`, 14, 32);

  let y = 50;
  doc.setTextColor(0, 0, 0);

  // Product info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Produto:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.productName, 40, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Dimensões:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.dimensions, 40, y);
  y += 6;

  if (data.finishing?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Acabamentos:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.finishing.join(", "), 40, y);
    y += 6;
  }

  if (data.notes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notes, w - 28);
    doc.text(splitNotes, 14, y);
  }

  if (data.designDataUrl) {
    try {
      y += 10;
      doc.addImage(data.designDataUrl, "PNG", 14, y, w - 28, 60);
    } catch {
      // Ignore image errors
    }
  }

  doc.save(`producao-${data.orderNumber}.pdf`);
};
