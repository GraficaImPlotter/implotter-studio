import jsPDF from "jspdf";
import { format } from "date-fns";

interface ProductionData {
  orderNumber: string;
  customerName: string;
  productName: string;
  dimensions: string;
  finishing: string[];
  notes?: string;
  designDataUrl?: string; // High-res PNG from Studio
}

export const generateProductionPDF = async (data: ProductionData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Header - Dark industrial theme
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, w, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE PRODUÇÃO", 15, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`CRIADO EM: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, w - 15, 25, { align: "right" });

  // Order Summary Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(10, 45, w - 20, 50, 3, 3, "F");
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`PEDIDO: #${data.orderNumber}`, 15, 58);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`CLIENTE: ${data.customerName.toUpperCase()}`, 15, 68);
  doc.text(`PRODUTO: ${data.productName}`, 15, 74);
  doc.text(`DIMENSÕES TÉCNICAS: ${data.dimensions}`, 15, 80);

  // Finishing Details
  if (data.finishing.length > 0) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(w / 2 + 5, 55, w / 2 - 20, 30, 2, 2, "F");
    doc.setTextColor(5, 150, 105);
    doc.setFont("helvetica", "bold");
    doc.text("ACABAMENTOS:", w / 2 + 10, 65);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.finishing.join(" | "), w / 2 + 10, 72, { maxWidth: w / 2 - 30 });
  }

  // Design Preview Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("VISUALIZAÇÃO DA ARTE", 15, 110);
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(10, 115, w - 20, 140);
  
  if (data.designDataUrl) {
    try {
      // Calculate aspect ratio for best fit in the box
      // We assume the designDataUrl is a high-res PNG
      doc.addImage(data.designDataUrl, "PNG", 15, 120, w - 30, 130, undefined, 'FAST');
    } catch (e) {
      doc.setTextColor(150, 150, 150);
      doc.text("Erro ao renderizar prévia da arte.", w / 2, 180, { align: "center" });
    }
  } else {
    doc.setTextColor(150, 150, 150);
    doc.text("ARTE NÃO DISPONÍVEL NESTES DADOS.", w / 2, 180, { align: "center" });
  }

  // Footer Instructions
  doc.setFillColor(15, 23, 42);
  doc.rect(0, h - 25, w, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CONTROLE DE QUALIDADE: ___________________________________", 15, h - 12);
  doc.text("RESPONSÁVEL: ___________________________________", w - 15, h - 12, { align: "right" });

  doc.save(`PRODUCAO_PEDIDO_${data.orderNumber}.pdf`);
};
