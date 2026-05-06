export const generatePackingSlipPDF = async (orders: any[], itemsByOrder: Record<string, any[]>) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("Romaneio de Produção/Separação", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
  y += 10;

  orders.forEach((order) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Pedido #${order.order_number} - ${order.customer_name}`, 14, y);
    y += 6;

    const items = itemsByOrder[order.id] || [];
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    items.forEach(it => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${it.quantity}x ${it.name} - ${it.dimensions || ''} ${it.finishing || ''}`, 14, y);
      y += 5;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 6;
  });

  doc.save(`romaneio-${Date.now()}.pdf`);
};
