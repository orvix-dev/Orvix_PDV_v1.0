/**
 * Storage Service - Camada unificada para persistência local
 */
export class StorageService {
  static KEYS = {
    PRODUCTS: 'pdv_products',
    CONFIG: 'pdv_config',
    DISCOUNT: 'pdv_discount',
    CASH_REGISTER: 'pdv_cash_register',
    SALES_HISTORY: 'pdv_sales_history',
    EXPENSES: 'pdv_expenses',
    OPEN_ORDERS: 'pdv_open_orders',
    THEME: 'pdv_theme',
    WEIGHT_PRESETS: 'pdv_weight_presets'
  };

  static get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data !== null ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn(`[StorageService] Erro ao ler chave "${key}":`, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[StorageService] Erro ao salvar chave "${key}":`, e);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[StorageService] Erro ao remover chave "${key}":`, e);
      return false;
    }
  }

  static getRaw(key, defaultValue = '') {
    try {
      const data = localStorage.getItem(key);
      return data !== null ? data : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  static setRaw(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch (e) {
      return false;
    }
  }
}
