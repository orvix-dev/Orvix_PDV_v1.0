import { StorageService } from './storage.service.js';
import { productsService } from './products.service.js';

const DEFAULT_DISCOUNT = {
  enabled: false,
  percentage: 10,
  targets: {
    acai: true,
    sorvete: true
  },
  days: [0, 1, 2, 3, 4, 5, 6], // Todos os dias da semana ativos por padrão
  allDay: true,
  startTime: '10:00',
  endTime: '21:00',
  active: false
};

export class PosService {
  constructor() {
    this.cart = [];
    this.currentWeightedProduct = 'acai';
    this.currentPaymentMethod = null;
    this.deliveryMode = 'balcao';
    const savedDiscount = StorageService.get(StorageService.KEYS.DISCOUNT, null);
    if (!savedDiscount) {
      this.discount = { ...DEFAULT_DISCOUNT };
    } else {
      this.discount = {
        ...DEFAULT_DISCOUNT,
        ...savedDiscount,
        targets: {
          ...DEFAULT_DISCOUNT.targets,
          ...(savedDiscount.targets || {})
        },
        days: (Array.isArray(savedDiscount.days) && savedDiscount.days.length > 0)
          ? savedDiscount.days.map(Number)
          : [0, 1, 2, 3, 4, 5, 6]
      };
      // Se era a configuração legada que continha apenas [4] (quinta-feira), atualiza para todos os dias para não frustrar a ativação imediata
      if (Array.isArray(this.discount.days) && this.discount.days.length === 1 && this.discount.days[0] === 4) {
        this.discount.days = [0, 1, 2, 3, 4, 5, 6];
      }
    }
    this.checkScheduledDiscount();
  }

  getCart() {
    return this.cart;
  }

  setCart(newCart) {
    this.cart = [...newCart];
  }

  clearCart() {
    this.cart = [];
  }

  getDiscount() {
    return this.discount;
  }

  checkScheduledDiscount() {
    const discount = this.discount;
    if (!discount || !discount.enabled) {
      if (this.discount) this.discount.active = false;
      return false;
    }

    const today = new Date();
    const currentDay = today.getDay();

    const activeDays = (Array.isArray(discount.days) && discount.days.length > 0) 
      ? discount.days.map(Number) 
      : [0, 1, 2, 3, 4, 5, 6];
    const isPromoDay = activeDays.includes(currentDay);

    let isPromoTime = true;
    if (discount.allDay === false) {
      const currentH = String(today.getHours()).padStart(2, '0');
      const currentM = String(today.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;

      const start = discount.startTime || '00:00';
      const end = discount.endTime || '23:59';

      if (start < end) {
        isPromoTime = (currentTimeStr >= start && currentTimeStr <= end);
      } else {
        isPromoTime = false;
      }
    }

    this.discount.active = Boolean(discount.enabled && isPromoDay && isPromoTime);
    return this.discount.active;
  }

  saveDiscountConfig(newConfig) {
    this.discount = {
      ...this.discount,
      ...newConfig
    };
    this.checkScheduledDiscount();
    StorageService.set(StorageService.KEYS.DISCOUNT, this.discount);
    return this.discount;
  }

  isProductDiscounted(productType) {
    if (!this.discount.active) return false;
    if (productType === 'acai' && this.discount.targets?.acai) return true;
    if (productType === 'sorvete' && this.discount.targets?.sorvete) return true;
    return false;
  }

  getEffectiveKgPrice(productType) {
    const config = productsService.getConfig();
    const basePrice = (productType === 'acai') ? config.açaíPricePerKg : config.sorvetePricePerKg;
    
    if (this.isProductDiscounted(productType)) {
      const discountAmount = basePrice * (this.discount.percentage / 100);
      return Math.max(0, basePrice - discountAmount);
    }
    return basePrice;
  }

  getBaseKgPrice(productType) {
    const config = productsService.getConfig();
    return (productType === 'acai') ? config.açaíPricePerKg : config.sorvetePricePerKg;
  }

  validateKgPrice(productType = this.currentWeightedProduct) {
    const baseKgPrice = this.getBaseKgPrice(productType);
    if (!baseKgPrice || isNaN(baseKgPrice) || baseKgPrice <= 0) {
      const typeName = productType === 'acai' ? 'Açaí' : 'Sorvete';
      const err = new Error(`Preço não configurado: Cadastre o preço por KG de ${typeName} antes de realizar uma venda desse tipo.`);
      err.code = 'PRICE_NOT_CONFIGURED';
      err.productType = productType;
      throw err;
    }
    return baseKgPrice;
  }

  calculateWeightedPrice(weightGrams, quantity = 1, productType = this.currentWeightedProduct) {
    if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
      return { unitPrice: 0, totalPrice: 0, originalPrice: 0, hasDiscount: false };
    }

    const baseKgPrice = this.getBaseKgPrice(productType);
    if (!baseKgPrice || isNaN(baseKgPrice) || baseKgPrice <= 0) {
      return { unitPrice: 0, totalPrice: 0, originalPrice: 0, hasDiscount: false, isPriceMissing: true };
    }

    const effectiveKgPrice = this.getEffectiveKgPrice(productType);
    const hasDiscount = this.isProductDiscounted(productType);

    const unitPrice = (weightGrams / 1000) * effectiveKgPrice;
    const originalUnitPrice = (weightGrams / 1000) * baseKgPrice;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    return {
      weightGrams: parseInt(weightGrams, 10),
      quantity: qty,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      totalPrice: parseFloat((unitPrice * qty).toFixed(2)),
      originalUnitPrice: parseFloat(originalUnitPrice.toFixed(2)),
      originalTotalPrice: parseFloat((originalUnitPrice * qty).toFixed(2)),
      hasDiscount: hasDiscount,
      discountPercent: this.discount.percentage
    };
  }

  addWeightedItemToCart(weightGrams, quantity = 1, productType = this.currentWeightedProduct) {
    this.validateKgPrice(productType);
    const calc = this.calculateWeightedPrice(weightGrams, quantity, productType);
    if (calc.unitPrice <= 0) {
      throw new Error('Informe um peso válido maior que zero.');
    }

    const typeName = productType === 'acai' ? 'Açaí' : 'Sorvete';
    const item = {
      name: `${typeName} (${calc.weightGrams}g)`,
      price: calc.unitPrice,
      quantity: calc.quantity,
      totalPrice: calc.totalPrice,
      isWeighted: true,
      productType: productType,
      weightGrams: calc.weightGrams,
      hasDiscount: calc.hasDiscount,
      originalPrice: calc.originalUnitPrice
    };

    this.cart.push(item);
    return item;
  }

  addFixedProductToCart(productId, quantity = 1) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const product = productsService.getProductById(productId);
    if (!product) throw new Error('Produto não encontrado.');

    const existingIndex = this.cart.findIndex(i => !i.isWeighted && i.productId === product.id);
    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += qty;
      this.cart[existingIndex].totalPrice = parseFloat((this.cart[existingIndex].price * this.cart[existingIndex].quantity).toFixed(2));
      return this.cart[existingIndex];
    } else {
      const item = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        totalPrice: parseFloat((product.price * qty).toFixed(2)),
        isWeighted: false,
        category: product.category
      };
      this.cart.push(item);
      return item;
    }
  }

  getCartItemQuantity(productId) {
    const item = this.cart.find(i => !i.isWeighted && i.productId === Number(productId));
    return item ? item.quantity : 0;
  }

  updateItemQuantity(index, delta) {
    const idx = parseInt(index, 10);
    if (idx < 0 || idx >= this.cart.length) return;

    this.cart[idx].quantity += delta;
    if (this.cart[idx].quantity <= 0) {
      this.cart.splice(idx, 1);
    } else {
      this.cart[idx].totalPrice = parseFloat((this.cart[idx].price * this.cart[idx].quantity).toFixed(2));
    }
  }

  removeItemFromCart(index) {
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < this.cart.length) {
      this.cart.splice(idx, 1);
    }
  }

  getCartSubtotal() {
    return this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  getCartTotal(deliveryFee = 0) {
    const subtotal = this.getCartSubtotal();
    const fee = this.deliveryMode === 'entrega' ? Math.max(0, parseFloat(deliveryFee) || 0) : 0;
    return parseFloat((subtotal + fee).toFixed(2));
  }

  calculateChange(receivedAmount, totalAmount) {
    const received = parseFloat(receivedAmount) || 0;
    const total = parseFloat(totalAmount) || 0;
    const change = received - total;
    return {
      received,
      total,
      change: Math.max(0, parseFloat(change.toFixed(2))),
      isSufficient: received >= total
    };
  }
}

export const posService = new PosService();
