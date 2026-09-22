import { StorageService } from './storage.service.js';

export class OrdersService {
  constructor() {
    this.openOrders = StorageService.get(StorageService.KEYS.OPEN_ORDERS, []);
  }

  getOpenOrders() {
    this.openOrders = StorageService.get(StorageService.KEYS.OPEN_ORDERS, []) || [];
    return this.openOrders;
  }

  formatDuration(createdAt) {
    return OrdersService.formatDuration(createdAt);
  }

  getOpenOrdersCount() {
    return this.openOrders.length;
  }

  getOrderById(id) {
    return this.openOrders.find(o => o.id === Number(id));
  }

  saveHoldSale(customerName, existingOrderId, cart, deliveryInfo = {}) {
    if (!cart || cart.length === 0) {
      throw new Error('O carrinho está vazio.');
    }

    if (existingOrderId) {
      const order = this.getOrderById(existingOrderId);
      if (!order) throw new Error('Comanda não encontrada.');
      
      // Agrupa itens
      cart.forEach(item => {
        const existingItem = order.items.find(i => 
          i.name === item.name && 
          i.price === item.price && 
          i.isWeighted === item.isWeighted &&
          i.weightGrams === item.weightGrams
        );
        if (existingItem && !item.isWeighted) {
          existingItem.quantity += item.quantity;
          existingItem.totalPrice = parseFloat((existingItem.price * existingItem.quantity).toFixed(2));
        } else {
          order.items.push({ ...item });
        }
      });

      order.total = parseFloat(order.items.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2));
      order.updatedAt = new Date().toISOString();
      this.saveOrders();
      return order;
    }

    const cleanName = (customerName || '').trim();
    if (!cleanName) {
      throw new Error('Informe o nome ou número da comanda/mesa.');
    }

    const newOrder = {
      id: Date.now(),
      customerName: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(cart)),
      deliveryMode: deliveryInfo.deliveryMode || 'balcao',
      deliveryFee: deliveryInfo.deliveryFee || 0,
      deliveryCustomerName: deliveryInfo.customerName || '',
      deliveryCustomerAddress: deliveryInfo.customerAddress || '',
      total: parseFloat(cart.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2))
    };

    this.openOrders.unshift(newOrder);
    this.saveOrders();
    return newOrder;
  }

  deleteOrder(id) {
    const index = this.openOrders.findIndex(o => o.id === Number(id));
    if (index === -1) throw new Error('Comanda não encontrada.');
    const removed = this.openOrders.splice(index, 1)[0];
    this.saveOrders();
    return removed;
  }

  saveOrders() {
    StorageService.set(StorageService.KEYS.OPEN_ORDERS, this.openOrders);
  }

  static formatDuration(createdAt) {
    if (!createdAt) return '00:00:00';
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}

export const ordersService = new OrdersService();
