import { StorageService } from './storage.service.js';
import { productsService } from './products.service.js';

export class HistoryService {
  constructor() {
    this.salesHistory = StorageService.get(StorageService.KEYS.SALES_HISTORY, {});
  }

  getSalesForDate(dateStr) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    return this.salesHistory[key] || [];
  }

  addSale(saleData) {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!this.salesHistory[dateKey]) {
      this.salesHistory[dateKey] = [];
    }

    const newSale = {
      id: Date.now(),
      time: timeStr,
      createdAt: now.toISOString(),
      date: dateKey,
      items: JSON.parse(JSON.stringify(saleData.items || [])),
      subtotal: parseFloat((saleData.subtotal || 0).toFixed(2)),
      deliveryFee: parseFloat((saleData.deliveryFee || 0).toFixed(2)),
      deliveryMode: saleData.deliveryMode || 'balcao',
      deliveryCustomerName: saleData.deliveryCustomerName || '',
      deliveryCustomerAddress: saleData.deliveryCustomerAddress || '',
      total: parseFloat((saleData.total || 0).toFixed(2)),
      paymentMethod: saleData.paymentMethod || 'Dinheiro',
      cashReceived: parseFloat((saleData.cashReceived || 0).toFixed(2)),
      change: parseFloat((saleData.change || 0).toFixed(2)),
      orderDuration: saleData.orderDuration || null,
      fromOrder: Boolean(saleData.fromOrder),
      isManualSale: Boolean(saleData.isManualSale)
    };

    this.salesHistory[dateKey].unshift(newSale);
    this.saveSales();
    return newSale;
  }

  deleteSale(dateStr, saleId, inputPassword) {
    const masterPassword = productsService.getDeletePassword();
    if (inputPassword !== masterPassword) {
      throw new Error('Senha de exclusão incorreta.');
    }

    const key = dateStr || new Date().toISOString().split('T')[0];
    if (!this.salesHistory[key]) throw new Error('Venda não encontrada para esta data.');

    const index = this.salesHistory[key].findIndex(s => s.id === Number(saleId));
    if (index === -1) throw new Error('Venda não encontrada.');

    const removed = this.salesHistory[key].splice(index, 1)[0];
    this.saveSales();
    return removed;
  }

  getSummaryForDate(dateStr, expensesTotal = 0) {
    const sales = this.getSalesForDate(dateStr);

    let grandTotal = 0;
    let productsTotal = 0;
    let deliveryTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let pixTotal = 0;

    sales.forEach(sale => {
      const tot = parseFloat(sale.total) || 0;
      const dFee = parseFloat(sale.deliveryFee) || 0;
      const pTot = parseFloat(sale.subtotal) || (tot - dFee);
      const method = (sale.paymentMethod || '').toLowerCase();

      grandTotal += tot;
      productsTotal += pTot;
      deliveryTotal += dFee;

      if (method.includes('dinheiro') || method === 'cash') {
        cashTotal += tot;
      } else if (method.includes('cart') || method === 'card') {
        cardTotal += tot;
      } else if (method.includes('pix')) {
        pixTotal += tot;
      } else {
        cashTotal += tot;
      }
    });

    const netProfit = grandTotal - expensesTotal;

    return {
      count: sales.length,
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      productsTotal: parseFloat(productsTotal.toFixed(2)),
      deliveryTotal: parseFloat(deliveryTotal.toFixed(2)),
      expensesTotal: parseFloat(expensesTotal.toFixed(2)),
      cashTotal: parseFloat(cashTotal.toFixed(2)),
      cardTotal: parseFloat(cardTotal.toFixed(2)),
      pixTotal: parseFloat(pixTotal.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2))
    };
  }

  saveSales() {
    StorageService.set(StorageService.KEYS.SALES_HISTORY, this.salesHistory);
  }
}

export const historyService = new HistoryService();
