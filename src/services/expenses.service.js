import { StorageService } from './storage.service.js';

export class ExpensesService {
  constructor() {
    this.expenses = StorageService.get(StorageService.KEYS.EXPENSES, {});
  }

  getExpensesForDate(dateStr) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    return this.expenses[key] || [];
  }

  addExpense(name, value, description = '', dateStr = null) {
    const cleanName = (name || '').trim();
    const val = parseFloat(value);

    if (!cleanName) throw new Error('Informe o nome ou categoria da despesa.');
    if (isNaN(val) || val <= 0) throw new Error('Informe um valor de despesa válido maior que zero.');

    const key = dateStr || new Date().toISOString().split('T')[0];
    if (!this.expenses[key]) {
      this.expenses[key] = [];
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newExpense = {
      id: Date.now(),
      name: cleanName,
      value: parseFloat(val.toFixed(2)),
      description: (description || '').trim(),
      time: timeStr,
      createdAt: now.toISOString()
    };

    this.expenses[key].unshift(newExpense);
    this.saveExpenses();
    return newExpense;
  }

  deleteExpense(expenseId, dateStr = null) {
    const key = dateStr || new Date().toISOString().split('T')[0];
    if (!this.expenses[key]) return false;

    const index = this.expenses[key].findIndex(e => e.id === Number(expenseId));
    if (index === -1) return false;

    this.expenses[key].splice(index, 1);
    this.saveExpenses();
    return true;
  }

  getTotalForDate(dateStr) {
    const list = this.getExpensesForDate(dateStr);
    const total = list.reduce((sum, e) => sum + (parseFloat(e.value) || 0), 0);
    return parseFloat(total.toFixed(2));
  }

  saveExpenses() {
    StorageService.set(StorageService.KEYS.EXPENSES, this.expenses);
  }
}

export const expensesService = new ExpensesService();
