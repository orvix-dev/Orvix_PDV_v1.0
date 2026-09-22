import { StorageService } from './storage.service.js';

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Água Mineral 500ml", price: 3.00, category: "Bebidas", image: "" },
  { id: 2, name: "Água com Gás 500ml", price: 3.50, category: "Bebidas", image: "" },
  { id: 3, name: "Refrigerante Lata", price: 5.00, category: "Bebidas", image: "" },
  { id: 4, name: "Suco Natural", price: 7.00, category: "Bebidas", image: "" }
];

const DEFAULT_CONFIG = {
  açaíPricePerKg: 45.90,
  sorvetePricePerKg: 45.90,
  deletePassword: '1015',
  weightPresets: [150, 250, 300, 400, 500, 700, 1000]
};

export class ProductsService {
  constructor() {
    this.products = StorageService.get(StorageService.KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    this.config = StorageService.get(StorageService.KEYS.CONFIG, DEFAULT_CONFIG);
    this.weightPresets = StorageService.get(StorageService.KEYS.WEIGHT_PRESETS, this.config.weightPresets || DEFAULT_CONFIG.weightPresets);
  }

  getProducts() {
    return this.products;
  }

  getProductById(id) {
    return this.products.find(p => p.id === Number(id));
  }

  getCategories() {
    const cats = new Set(['all']);
    this.products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }

  addProduct(name, price, category = 'Diversos', image = '') {
    if (!name || isNaN(price) || price <= 0) {
      throw new Error('Preencha um nome válido e um preço maior que zero.');
    }
    const newProduct = {
      id: Date.now(),
      name: name.trim(),
      price: parseFloat(price),
      category: (category || 'Diversos').trim(),
      image: image || ''
    };
    this.products.push(newProduct);
    this.saveProducts();
    return newProduct;
  }

  updateProduct(id, name, price, category = 'Diversos', image = '') {
    const index = this.products.findIndex(p => p.id === Number(id));
    if (index === -1) throw new Error('Produto não encontrado.');
    if (!name || isNaN(price) || price <= 0) {
      throw new Error('Preencha um nome válido e um preço maior que zero.');
    }
    this.products[index] = {
      ...this.products[index],
      name: name.trim(),
      price: parseFloat(price),
      category: (category || 'Diversos').trim(),
      image: image || this.products[index].image
    };
    this.saveProducts();
    return this.products[index];
  }

  deleteProduct(id) {
    const index = this.products.findIndex(p => p.id === Number(id));
    if (index === -1) throw new Error('Produto não encontrado.');
    const removed = this.products.splice(index, 1)[0];
    this.saveProducts();
    return removed;
  }

  saveProducts() {
    StorageService.set(StorageService.KEYS.PRODUCTS, this.products);
  }

  // Preços por KG
  getConfig() {
    return this.config;
  }

  updateAcaiPrice(newPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) throw new Error('Preço do Açaí inválido.');
    this.config.açaíPricePerKg = price;
    this.saveConfig();
    return price;
  }

  updateSorvetePrice(newPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) throw new Error('Preço do Sorvete inválido.');
    this.config.sorvetePricePerKg = price;
    this.saveConfig();
    return price;
  }

  getDeletePassword() {
    return this.config.deletePassword || '1015';
  }

  updateDeletePassword(currentPass, newPass, confirmPass) {
    if (currentPass !== this.getDeletePassword()) {
      throw new Error('A senha atual está incorreta.');
    }
    if (!newPass || newPass.length !== 4 || isNaN(newPass)) {
      throw new Error('A nova senha deve ter exatamente 4 números.');
    }
    if (newPass !== confirmPass) {
      throw new Error('A confirmação da nova senha não confere.');
    }
    this.config.deletePassword = newPass;
    this.saveConfig();
    return true;
  }

  saveConfig() {
    StorageService.set(StorageService.KEYS.CONFIG, this.config);
  }

  // Weight Presets
  getWeightPresets() {
    return this.weightPresets;
  }

  addWeightPreset(grams) {
    const val = parseInt(grams, 10);
    if (isNaN(val) || val <= 0) throw new Error('Peso em gramas inválido.');
    if (this.weightPresets.includes(val)) throw new Error('Este atalho de peso já existe.');
    this.weightPresets.push(val);
    this.weightPresets.sort((a, b) => a - b);
    this.saveWeightPresets();
    return this.weightPresets;
  }

  removeWeightPreset(grams) {
    this.weightPresets = this.weightPresets.filter(w => w !== parseInt(grams, 10));
    this.saveWeightPresets();
    return this.weightPresets;
  }

  resetWeightPresets() {
    this.weightPresets = [...DEFAULT_CONFIG.weightPresets];
    this.saveWeightPresets();
    return this.weightPresets;
  }

  saveWeightPresets() {
    StorageService.set(StorageService.KEYS.WEIGHT_PRESETS, this.weightPresets);
  }
}

export const productsService = new ProductsService();
