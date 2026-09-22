import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { licenseService } from './license.service.js';

export class PdfService {
  /**
   * Gera o HTML estruturado para o recibo térmico 80mm
   */
  static generateThermalReceiptHtml(sale) {
    const localTenant = licenseService.getLocalTenant();
    const storeName = (localTenant?.nome || localTenant?.tenantName || 'Orvix PDV').toUpperCase();
    const dateFormatted = new Date(sale.createdAt || Date.now()).toLocaleString('pt-BR');
    const payment = sale.paymentMethod || 'Dinheiro';
    const subtotal = (sale.subtotal || sale.total || 0).toFixed(2);
    const fee = (sale.deliveryFee || 0).toFixed(2);
    const total = (sale.total || 0).toFixed(2);
    const cashReceived = (sale.cashReceived || 0).toFixed(2);
    const change = (sale.change || 0).toFixed(2);

    let itemsHtml = '';
    (sale.items || []).forEach(item => {
      itemsHtml += `
        <div style="display:flex; justify-content:space-between; margin-bottom: 3px; font-size: 13px;">
          <span>${item.quantity}x ${item.name}</span>
          <span style="font-weight:bold;">R$ ${(item.totalPrice || item.price || 0).toFixed(2)}</span>
        </div>
      `;
    });

    let deliveryHtml = '';
    if (sale.deliveryMode === 'entrega') {
      deliveryHtml = `
        <div style="border-top: 1px dashed #666; margin: 8px 0; padding-top: 6px; font-size: 12px;">
          <div style="font-weight:bold; margin-bottom:2px;">DADOS DE ENTREGA:</div>
          <div>Cliente: ${sale.deliveryCustomerName || 'Não informado'}</div>
          <div>Endereço: ${sale.deliveryCustomerAddress || 'Não informado'}</div>
          <div>Taxa de Entrega: R$ ${fee}</div>
        </div>
      `;
    }

    let cashDetailsHtml = '';
    if (payment.toLowerCase().includes('dinheiro')) {
      cashDetailsHtml = `
        <div style="display:flex; justify-content:space-between; font-size: 12px; margin-top:2px;">
          <span>Valor Recebido:</span>
          <span>R$ ${cashReceived}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 12px; margin-top:2px;">
          <span>Troco:</span>
          <span style="font-weight:bold;">R$ ${change}</span>
        </div>
      `;
    }

    let durationHtml = '';
    if (sale.orderDuration) {
      durationHtml = `<div style="font-size:11px; text-align:center; color:#555; margin-top:4px;">Tempo de Comanda: ${sale.orderDuration}</div>`;
    }

    return `
      <div id="printable-thermal-receipt" style="font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 320px; margin: 0 auto; color: #000; padding: 12px; background: #fff;">
        <div style="text-align:center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px;">${storeName}</div>
          <div style="font-size: 12px; font-weight: 600;">Ponto de Venda &amp; Gestão</div>
          <div style="font-size: 11px; margin-top: 4px;">Data: ${dateFormatted}</div>
          <div style="font-size: 11px;">Cupom Nº: #${String(sale.id).slice(-6)}</div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-size: 12px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 6px;">ITENS DO PEDIDO:</div>
          ${itemsHtml}
        </div>

        ${deliveryHtml}

        <div style="border-top: 2px dashed #000; margin-top: 8px; padding-top: 8px;">
          <div style="display:flex; justify-content:space-between; font-size: 13px;">
            <span>Subtotal:</span>
            <span>R$ ${subtotal}</span>
          </div>
          ${sale.deliveryMode === 'entrega' ? `
            <div style="display:flex; justify-content:space-between; font-size: 13px;">
              <span>Taxa Entrega:</span>
              <span>R$ ${fee}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; font-size: 16px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
            <span>TOTAL:</span>
            <span>R$ ${total}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size: 12px; margin-top: 4px;">
            <span>Forma Pagamento:</span>
            <span style="font-weight:bold;">${payment}</span>
          </div>
          ${cashDetailsHtml}
        </div>

        ${durationHtml}

        <div style="text-align:center; border-top: 1px dashed #666; margin-top: 12px; padding-top: 8px; font-size: 11px;">
          <div>Obrigado pela preferência! Volte sempre.</div>
          <div style="font-size: 10px; color: #777; margin-top: 3px;">Sistema Orvix PDV</div>
        </div>
      </div>
    `;
  }

  /**
   * Imprime o recibo térmico no navegador
   */
  static printReceipt(sale) {
    const htmlContent = this.generateThermalReceiptHtml(sale);
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o recibo.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo - Orvix PDV</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  /**
   * Exporta Relatório Diário em PDF
   */
  static exportDailyHistoryPdf(dateStr, sales, summary, expenses) {
    const doc = new jsPDF();
    const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    const localTenant = licenseService.getLocalTenant();
    const storeName = (localTenant?.nome || localTenant?.tenantName || 'Orvix PDV').toUpperCase();

    // Cabeçalho
    doc.setFillColor(124, 58, 237); // Brand purple
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${storeName} — RELATÓRIO DIÁRIO DE VENDAS`, 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Referência: ${formattedDate} | Gerado em: ${new Date().toLocaleTimeString('pt-BR')}`, 14, 21);

    // Resumo Financeiro
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro Consolidado', 14, 34);

    const summaryTableData = [
      ['Total Bruto de Vendas', `R$ ${(summary.grandTotal || 0).toFixed(2)}`, 'Vendas em Dinheiro', `R$ ${(summary.cashTotal || 0).toFixed(2)}`],
      ['Total em Produtos', `R$ ${(summary.productsTotal || 0).toFixed(2)}`, 'Vendas em Cartão', `R$ ${(summary.cardTotal || 0).toFixed(2)}`],
      ['Total Taxas de Entrega', `R$ ${(summary.deliveryTotal || 0).toFixed(2)}`, 'Vendas em PIX', `R$ ${(summary.pixTotal || 0).toFixed(2)}`],
      ['Total de Despesas', `R$ ${(summary.expensesTotal || 0).toFixed(2)}`, 'Lucro Líquido do Dia', `R$ ${(summary.netProfit || 0).toFixed(2)}`]
    ];

    doc.autoTable({
      startY: 38,
      body: summaryTableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252] }
      }
    });

    // Tabela de Vendas
    const startSalesY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Detalhamento de Vendas (${sales.length} vendas registradas)`, 14, startSalesY);

    const salesTableData = sales.map(sale => {
      const itemsSummary = (sale.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
      return [
        `#${String(sale.id).slice(-5)}`,
        sale.time || '--:--',
        itemsSummary,
        sale.deliveryMode === 'entrega' ? 'Entrega' : 'Balcão',
        sale.paymentMethod || 'Dinheiro',
        `R$ ${(sale.total || 0).toFixed(2)}`
      ];
    });

    doc.autoTable({
      startY: startSalesY + 4,
      head: [['ID', 'Hora', 'Itens do Pedido', 'Tipo', 'Pagamento', 'Total']],
      body: salesTableData.length > 0 ? salesTableData : [['-', '-', 'Nenhuma venda registrada nesta data.', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    // Tabela de Despesas se houver
    if (expenses && expenses.length > 0) {
      const startExpY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Despesas do Dia (${expenses.length} registros)`, 14, startExpY);

      const expTableData = expenses.map(exp => [
        exp.time || '--:--',
        exp.name,
        exp.description || '-',
        `R$ ${(exp.value || 0).toFixed(2)}`
      ]);

      doc.autoTable({
        startY: startExpY + 4,
        head: [['Hora', 'Nome da Despesa', 'Descrição / Detalhes', 'Valor']],
        body: expTableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });
    }

    // Salva o PDF
    const cleanFileName = (localTenant?.nome || 'Orvix_PDV').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Relatorio_${cleanFileName}_${dateStr || 'dia'}.pdf`);
  }
}
