import { StorageService } from './storage.service.js';
import { firebaseDb, doc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from '../config/firebase.js';

const STORAGE_CASH_SESSIONS_KEY = 'orvix_cash_sessions';
const STORAGE_CURRENT_SESSION_KEY = 'orvix_current_cash_session';

export class CashService {
  constructor() {
    this.currentTenantId = 'acai-da-serra-matriz';
    this.currentSession = StorageService.get(STORAGE_CURRENT_SESSION_KEY, null);
    this.history = StorageService.get(STORAGE_CASH_SESSIONS_KEY, []);
  }

  setTenantId(tenantId) {
    if (tenantId && tenantId !== this.currentTenantId) {
      this.currentTenantId = tenantId;
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getCurrentSessionId() {
    return this.currentSession ? this.currentSession.id : null;
  }

  getCashRegister() {
    return {
      status: this.isOpen() ? 'open' : 'closed',
      openingBills: this.currentSession ? this.currentSession.openingBills : 0,
      openingCoins: this.currentSession ? this.currentSession.openingCoins : 0,
      openingTotal: this.currentSession ? this.currentSession.openingTotal : 0,
      openedAt: this.currentSession ? this.currentSession.openedAt : null,
      closedAt: this.currentSession ? this.currentSession.closedAt : null,
      history: this.getHistory(),
      currentSession: this.currentSession
    };
  }

  isOpen() {
    return Boolean(this.currentSession && this.currentSession.status === 'open');
  }

  /**
   * Abre uma nova sessão de caixa (turno)
   */
  async openRegister(bills, coins, user = null, employee = null) {
    if (this.isOpen()) {
      throw new Error('Já existe um turno de caixa aberto. Feche a sessão atual antes de abrir uma nova.');
    }

    const b = Math.max(0, parseFloat(bills) || 0);
    const c = Math.max(0, parseFloat(coins) || 0);
    const total = parseFloat((b + c).toFixed(2));
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const sessionId = `cash-${Date.now()}`;

    // Determina o número do turno do dia (Caixa #001, Caixa #002...)
    const todaySessions = this.history.filter(s => s.dateStr === dateStr);
    const sessionNumber = todaySessions.length + 1;

    const opName = employee?.name || user?.displayName || user?.email?.split('@')[0] || 'Operador';
    const opRole = employee?.role || 'Operador de Caixa';
    const opId = employee?.id || user?.uid || 'local-user';

    const sessionData = {
      id: sessionId,
      tenantId: this.currentTenantId,
      sessionNumber: sessionNumber,
      sessionCode: `#${String(sessionNumber).padStart(3, '0')}`,
      dateStr: dateStr,
      status: 'open',
      openedAt: now.toISOString(),
      openedByUid: user?.uid || 'local-user',
      openedByName: opName,
      openedByEmployeeId: opId,
      openedByEmployeeName: opName,
      openedByEmployeeRole: opRole,
      openingBills: b,
      openingCoins: c,
      openingTotal: total,
      closedAt: null,
      closedByUid: null,
      closedByName: null,
      closedByEmployeeId: null,
      closedByEmployeeName: null,
      closingBalance: null,
      expectedBalance: null,
      drawerDifference: 0,
      observation: ''
    };

    this.currentSession = sessionData;
    this.saveCurrentSession();

    // Sincroniza com o Firestore se conectado
    if (firebaseDb && this.currentTenantId) {
      try {
        const sessionRef = doc(firebaseDb, 'tenants', this.currentTenantId, 'cash_sessions', sessionId);
        await setDoc(sessionRef, {
          ...sessionData,
          serverCreated: serverTimestamp()
        });
      } catch (err) {
        console.warn('Erro ao salvar abertura de caixa no Firestore:', err);
      }
    }

    return this.currentSession;
  }

  editOpeningRegister(bills, coins) {
    if (!this.isOpen()) throw new Error('O caixa não está aberto.');
    const b = Math.max(0, parseFloat(bills) || 0);
    const c = Math.max(0, parseFloat(coins) || 0);
    const total = parseFloat((b + c).toFixed(2));

    this.currentSession.openingBills = b;
    this.currentSession.openingCoins = c;
    this.currentSession.openingTotal = total;

    this.saveCurrentSession();
    return this.currentSession;
  }

  /**
   * Fecha o turno atual de caixa
   */
  async closeRegister(closingBalance, observation = '', user = null, sessionSales = [], sessionExpenses = [], employee = null) {
    if (!this.isOpen()) throw new Error('O caixa já se encontra fechado.');

    const closeBal = parseFloat(closingBalance) || 0;
    const now = new Date();

    // Métricas específicas das vendas desta sessão de caixa
    let cashSales = 0;
    let cardSales = 0;
    let pixSales = 0;

    sessionSales.forEach(sale => {
      const method = (sale.paymentMethod || '').toLowerCase();
      const val = parseFloat(sale.total) || 0;
      if (method.includes('dinheiro') || method === 'cash') {
        cashSales += val;
      } else if (method.includes('cart') || method === 'card') {
        cardSales += val;
      } else if (method.includes('pix')) {
        pixSales += val;
      } else {
        cashSales += val;
      }
    });

    const totalSalesAmount = sessionSales.reduce((s, v) => s + (v.total || 0), 0);
    const totalExpensesAmount = sessionExpenses.reduce((s, e) => s + (parseFloat(e.value) || 0), 0);
    const openingTotal = this.currentSession.openingTotal || 0;
    const expectedBalance = parseFloat((openingTotal + cashSales - totalExpensesAmount).toFixed(2));
    const drawerDifference = parseFloat((closeBal - expectedBalance).toFixed(2));

    const closerName = employee?.name || user?.displayName || user?.email?.split('@')[0] || this.currentSession.openedByName || 'Operador';
    const closerId = employee?.id || user?.uid || null;

    const closedRecord = {
      ...this.currentSession,
      status: 'closed',
      closedAt: now.toISOString(),
      closedByUid: user?.uid || null,
      closedByName: closerName,
      closedByEmployeeId: closerId,
      closedByEmployeeName: closerName,
      closingBalance: closeBal,
      expectedBalance: expectedBalance,
      drawerDifference: drawerDifference,
      observation: observation.trim(),
      totalSalesCount: sessionSales.length,
      totalSalesAmount: parseFloat(totalSalesAmount.toFixed(2)),
      totalExpensesAmount: parseFloat(totalExpensesAmount.toFixed(2)),
      cashSales: parseFloat(cashSales.toFixed(2)),
      cardSales: parseFloat(cardSales.toFixed(2)),
      pixSales: parseFloat(pixSales.toFixed(2))
    };

    // Adiciona ao histórico (mais recentes primeiro)
    this.history.unshift(closedRecord);
    this.saveHistory();

    // Sincroniza encerramento com o Firestore
    if (firebaseDb && this.currentTenantId && this.currentSession.id) {
      try {
        const sessionRef = doc(firebaseDb, 'tenants', this.currentTenantId, 'cash_sessions', this.currentSession.id);
        await updateDoc(sessionRef, {
          status: 'closed',
          closedAt: closedRecord.closedAt,
          closedByUid: closedRecord.closedByUid,
          closedByName: closedRecord.closedByName,
          closedByEmployeeId: closedRecord.closedByEmployeeId,
          closedByEmployeeName: closedRecord.closedByEmployeeName,
          closingBalance: closedRecord.closingBalance,
          expectedBalance: closedRecord.expectedBalance,
          drawerDifference: closedRecord.drawerDifference,
          observation: closedRecord.observation,
          totalSalesCount: closedRecord.totalSalesCount,
          totalSalesAmount: closedRecord.totalSalesAmount,
          totalExpensesAmount: closedRecord.totalExpensesAmount,
          cashSales: closedRecord.cashSales,
          cardSales: closedRecord.cardSales,
          pixSales: closedRecord.pixSales,
          serverUpdated: serverTimestamp()
        });
      } catch (err) {
        console.warn('Erro ao atualizar fechamento de caixa no Firestore:', err);
      }
    }

    this.currentSession = null;
    this.saveCurrentSession();

    return closedRecord;
  }

  /**
   * Retorna métricas do turno ativo (ou totais acumulados)
   */
  getTodayMetrics(sales = [], expenses = []) {
    const openingTotal = this.isOpen() ? (this.currentSession.openingTotal || 0) : 0;
    const currentSessionId = this.getCurrentSessionId();
    
    let cashSales = 0;
    let cardSales = 0;
    let pixSales = 0;

    // Filtra vendas associadas à sessão atual se houver uma aberta
    const sessionSales = currentSessionId 
      ? sales.filter(s => !s.cashSessionId || s.cashSessionId === currentSessionId)
      : sales;

    sessionSales.forEach(sale => {
      const method = (sale.paymentMethod || '').toLowerCase();
      const val = parseFloat(sale.total) || 0;
      if (method.includes('dinheiro') || method === 'cash') {
        cashSales += val;
      } else if (method.includes('cart') || method === 'card') {
        cardSales += val;
      } else if (method.includes('pix')) {
        pixSales += val;
      } else {
        cashSales += val;
      }
    });

    const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.value) || 0), 0);
    const currentBalance = openingTotal + cashSales - totalExpenses;

    return {
      openingTotal: parseFloat(openingTotal.toFixed(2)),
      cashSales: parseFloat(cashSales.toFixed(2)),
      cardSales: parseFloat(cardSales.toFixed(2)),
      pixSales: parseFloat(pixSales.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      currentBalance: parseFloat(currentBalance.toFixed(2)),
      isOpen: this.isOpen(),
      currentSession: this.currentSession
    };
  }

  /**
   * Retorna todas as sessões de um dia específico
   */
  getSessionsByDate(dateStr) {
    return this.history.filter(s => s.dateStr === dateStr);
  }

  getHistory() {
    return this.history;
  }

  saveCurrentSession() {
    StorageService.set(STORAGE_CURRENT_SESSION_KEY, this.currentSession);
  }

  saveHistory() {
    StorageService.set(STORAGE_CASH_SESSIONS_KEY, this.history);
  }
}

export const cashService = new CashService();
