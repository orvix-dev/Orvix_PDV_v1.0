import { StorageService } from './storage.service.js';
import { firebaseDb, doc, setDoc, deleteDoc, serverTimestamp } from '../config/firebase.js';

const STORAGE_EMPLOYEES_KEY = 'pdv_employees';
const STORAGE_ACTIVE_EMPLOYEE_KEY = 'pdv_active_employee';

const DEFAULT_EMPLOYEES = [
  {
    id: 'emp_1',
    name: 'Lucas Oliveira',
    role: 'Operador de Caixa',
    pin: '1234',
    status: 'ativo',
    phone: '(11) 98765-4321',
    avatarColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'emp_2',
    name: 'Mariana Santos',
    role: 'Balcão & Caixa',
    pin: '2024',
    status: 'ativo',
    phone: '(11) 97654-3210',
    avatarColor: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    createdAt: '2026-09-05T08:00:00.000Z'
  },
  {
    id: 'emp_3',
    name: 'Carlos Silva',
    role: 'Gerente Geral',
    pin: '9999',
    status: 'ativo',
    phone: '(11) 96543-2109',
    avatarColor: 'linear-gradient(135deg, #10b981, #059669)',
    createdAt: '2026-08-20T08:00:00.000Z'
  }
];

export class EmployeeService {
  constructor() {
    this.currentTenantId = 'acai-da-serra-matriz';
    this.employees = this.loadEmployees();
    this.activeEmployee = StorageService.get(STORAGE_ACTIVE_EMPLOYEE_KEY, null);

    // Se o operador ativo salvo foi desativado ou excluído, reseta
    if (this.activeEmployee) {
      const exists = this.employees.find(e => e.id === this.activeEmployee.id && e.status === 'ativo');
      if (!exists) {
        this.activeEmployee = null;
        StorageService.remove(STORAGE_ACTIVE_EMPLOYEE_KEY);
      }
    }

    // Se não tiver nenhum operador ativo, assume o primeiro ativo
    if (!this.activeEmployee) {
      const firstActive = this.employees.find(e => e.status === 'ativo');
      if (firstActive) {
        this.setActiveEmployee(firstActive);
      }
    }
  }

  setTenantId(tenantId) {
    if (tenantId && tenantId !== this.currentTenantId) {
      this.currentTenantId = tenantId;
    }
  }

  loadEmployees() {
    const saved = StorageService.get(STORAGE_EMPLOYEES_KEY, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      StorageService.set(STORAGE_EMPLOYEES_KEY, DEFAULT_EMPLOYEES);
      return [...DEFAULT_EMPLOYEES];
    }
    return saved;
  }

  getEmployees(onlyActive = false) {
    if (onlyActive) {
      return this.employees.filter(e => e.status === 'ativo');
    }
    return this.employees;
  }

  getEmployeeById(id) {
    return this.employees.find(e => e.id === id) || null;
  }

  getActiveEmployee() {
    if (!this.activeEmployee) {
      const firstActive = this.employees.find(e => e.status === 'ativo');
      if (firstActive) {
        this.setActiveEmployee(firstActive);
      }
    }
    return this.activeEmployee;
  }

  setActiveEmployee(employee) {
    if (!employee) {
      this.activeEmployee = null;
      StorageService.remove(STORAGE_ACTIVE_EMPLOYEE_KEY);
      return;
    }
    this.activeEmployee = {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      avatarColor: employee.avatarColor || 'linear-gradient(135deg, #7c3aed, #ec4899)'
    };
    StorageService.set(STORAGE_ACTIVE_EMPLOYEE_KEY, this.activeEmployee);
  }

  clearActiveEmployee() {
    this.activeEmployee = null;
    StorageService.remove(STORAGE_ACTIVE_EMPLOYEE_KEY);
  }

  validatePin(employeeId, inputPin) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return false;
    return String(emp.pin).trim() === String(inputPin).trim();
  }

  findEmployeeByPin(inputPin) {
    const pinStr = String(inputPin).trim();
    if (!pinStr) return null;
    return this.employees.find(e => e.status === 'ativo' && String(e.pin).trim() === pinStr) || null;
  }

  async saveEmployee(empData) {
    const now = new Date().toISOString();
    let savedRecord = null;

    if (empData.id) {
      // Edição
      const index = this.employees.findIndex(e => e.id === empData.id);
      if (index === -1) throw new Error('Colaborador não encontrado.');

      // Validação de PIN duplicado em outro colaborador
      if (empData.pin) {
        const pinDuplicate = this.employees.find(e => e.id !== empData.id && String(e.pin) === String(empData.pin));
        if (pinDuplicate) {
          throw new Error(`Este PIN já está sendo utilizado pelo colaborador "${pinDuplicate.name}".`);
        }
      }

      this.employees[index] = {
        ...this.employees[index],
        name: empData.name ? empData.name.trim() : this.employees[index].name,
        role: empData.role || this.employees[index].role,
        pin: empData.pin ? String(empData.pin).trim() : this.employees[index].pin,
        status: empData.status || this.employees[index].status,
        phone: empData.phone !== undefined ? empData.phone : this.employees[index].phone,
        avatarColor: empData.avatarColor || this.employees[index].avatarColor,
        updatedAt: now
      };
      savedRecord = this.employees[index];

      // Se editou o operador ativo, atualiza
      if (this.activeEmployee && this.activeEmployee.id === savedRecord.id) {
        this.setActiveEmployee(savedRecord);
      }
    } else {
      // Novo Colaborador
      if (!empData.name || !empData.name.trim()) {
        throw new Error('Informe o nome do colaborador.');
      }
      const pinStr = empData.pin ? String(empData.pin).trim() : '1234';
      if (pinStr.length < 4) {
        throw new Error('O PIN de segurança deve ter pelo menos 4 dígitos.');
      }

      const pinDuplicate = this.employees.find(e => String(e.pin) === pinStr);
      if (pinDuplicate) {
        throw new Error(`Este PIN já está sendo utilizado por "${pinDuplicate.name}". Escolha outro PIN.`);
      }

      const colors = [
        'linear-gradient(135deg, #3b82f6, #06b6d4)',
        'linear-gradient(135deg, #ec4899, #8b5cf6)',
        'linear-gradient(135deg, #10b981, #059669)',
        'linear-gradient(135deg, #f59e0b, #ef4444)',
        'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        'linear-gradient(135deg, #06b6d4, #10b981)'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      savedRecord = {
        id: `emp_${Date.now()}`,
        name: empData.name.trim(),
        role: empData.role || 'Operador de Caixa',
        pin: pinStr,
        status: empData.status || 'ativo',
        phone: empData.phone ? empData.phone.trim() : '',
        avatarColor: empData.avatarColor || randomColor,
        createdAt: now
      };

      this.employees.unshift(savedRecord);
    }

    this.persistEmployees();

    // Sincroniza com o Firestore se conectado
    if (firebaseDb && this.currentTenantId) {
      try {
        const empRef = doc(firebaseDb, 'tenants', this.currentTenantId, 'employees', savedRecord.id);
        await setDoc(empRef, {
          ...savedRecord,
          tenantId: this.currentTenantId,
          serverTimestamp: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('[EmployeeService] Erro ao sincronizar funcionário no Firestore:', err);
      }
    }

    return savedRecord;
  }

  async deleteEmployee(id) {
    const emp = this.getEmployeeById(id);
    if (!emp) throw new Error('Colaborador não encontrado.');

    if (this.employees.filter(e => e.status === 'ativo').length <= 1 && emp.status === 'ativo') {
      throw new Error('Você deve manter pelo menos um colaborador ativo para operar o caixa.');
    }

    this.employees = this.employees.filter(e => e.id !== id);
    this.persistEmployees();

    if (this.activeEmployee && this.activeEmployee.id === id) {
      const nextActive = this.employees.find(e => e.status === 'ativo');
      if (nextActive) {
        this.setActiveEmployee(nextActive);
      } else {
        this.clearActiveEmployee();
      }
    }

    if (firebaseDb && this.currentTenantId) {
      try {
        const empRef = doc(firebaseDb, 'tenants', this.currentTenantId, 'employees', id);
        await deleteDoc(empRef);
      } catch (err) {
        console.warn('[EmployeeService] Erro ao excluir funcionário do Firestore:', err);
      }
    }

    return true;
  }

  async toggleStatus(id) {
    const emp = this.getEmployeeById(id);
    if (!emp) throw new Error('Colaborador não encontrado.');

    const newStatus = emp.status === 'ativo' ? 'inativo' : 'ativo';
    if (newStatus === 'inativo' && this.employees.filter(e => e.status === 'ativo').length <= 1) {
      throw new Error('Não é possível inativar o único colaborador ativo do sistema.');
    }

    emp.status = newStatus;
    emp.updatedAt = new Date().toISOString();
    this.persistEmployees();

    if (newStatus === 'inativo' && this.activeEmployee && this.activeEmployee.id === id) {
      const nextActive = this.employees.find(e => e.status === 'ativo');
      if (nextActive) {
        this.setActiveEmployee(nextActive);
      } else {
        this.clearActiveEmployee();
      }
    }

    return emp;
  }

  persistEmployees() {
    StorageService.set(STORAGE_EMPLOYEES_KEY, this.employees);
  }

  /**
   * Calcula o Ranking de Vendas por Turno e por Funcionário
   * @param {string} period - 'today' | '7days' | 'month' | 'all'
   * @param {Object} salesHistory - objeto de histórico de vendas por data
   * @param {Array} cashSessions - histórico de sessões/turnos de caixa
   */
  getShiftSalesRanking(period = 'today', salesHistory = {}, cashSessions = []) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Determina datas válidas conforme o filtro
    let validDates = [];
    if (period === 'today') {
      validDates = [todayStr];
    } else if (period === '7days') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        validDates.push(d.toISOString().split('T')[0]);
      }
    } else if (period === 'month') {
      const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM
      validDates = Object.keys(salesHistory).filter(d => d.startsWith(currentYearMonth));
    } else {
      validDates = Object.keys(salesHistory);
    }

    // Coleta todas as vendas do período
    const periodSales = [];
    validDates.forEach(dateKey => {
      const daySales = salesHistory[dateKey] || [];
      daySales.forEach(s => {
        periodSales.push({ ...s, dateKey });
      });
    });

    // Coleta as sessões de caixa relevantes
    const periodSessions = cashSessions.filter(s => {
      if (period === 'today') return s.dateStr === todayStr;
      if (period === '7days') return validDates.includes(s.dateStr);
      if (period === 'month') return s.dateStr && s.dateStr.startsWith(todayStr.slice(0, 7));
      return true;
    });

    // Mapeamento por Colaborador
    const employeeMap = {};

    // Inicializa todos os colaboradores cadastrados para aparecerem no ranking
    this.employees.forEach(emp => {
      employeeMap[emp.id] = {
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        avatarColor: emp.avatarColor,
        status: emp.status,
        totalSalesAmount: 0,
        salesCount: 0,
        shiftsCount: 0,
        cashTotal: 0,
        cardTotal: 0,
        pixTotal: 0,
        averageTicket: 0,
        shifts: []
      };
    });

    // Vincula sessões de caixa aos colaboradores
    periodSessions.forEach(session => {
      const empId = session.openedByEmployeeId || this.findEmployeeByName(session.openedByName)?.id;
      if (empId && employeeMap[empId]) {
        employeeMap[empId].shiftsCount += 1;
        employeeMap[empId].shifts.push(session);
      }
    });

    // Agrupa as vendas por funcionário
    periodSales.forEach(sale => {
      let empId = sale.employeeId;
      if (!empId && sale.operatorName) {
        const found = this.findEmployeeByName(sale.operatorName);
        if (found) empId = found.id;
      }

      // Se ainda não encontrou, atribui ao primeiro operador ativo ou cria entrada genérica
      if (!empId) {
        const defaultEmp = this.getActiveEmployee() || this.employees[0];
        empId = defaultEmp ? defaultEmp.id : 'unknown';
      }

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employeeId: empId,
          name: sale.employeeName || sale.operatorName || 'Operador',
          role: sale.employeeRole || 'Operador',
          avatarColor: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          status: 'ativo',
          totalSalesAmount: 0,
          salesCount: 0,
          shiftsCount: 0,
          cashTotal: 0,
          cardTotal: 0,
          pixTotal: 0,
          averageTicket: 0,
          shifts: []
        };
      }

      const total = parseFloat(sale.total) || 0;
      const method = (sale.paymentMethod || '').toLowerCase();

      employeeMap[empId].totalSalesAmount += total;
      employeeMap[empId].salesCount += 1;

      if (method.includes('dinheiro') || method === 'cash') {
        employeeMap[empId].cashTotal += total;
      } else if (method.includes('cart') || method === 'card') {
        employeeMap[empId].cardTotal += total;
      } else if (method.includes('pix')) {
        employeeMap[empId].pixTotal += total;
      } else {
        employeeMap[empId].cashTotal += total;
      }
    });

    // Calcula ticket médio e formata valores
    const rankedEmployees = Object.values(employeeMap).map(e => {
      const avg = e.salesCount > 0 ? e.totalSalesAmount / e.salesCount : 0;
      return {
        ...e,
        totalSalesAmount: parseFloat(e.totalSalesAmount.toFixed(2)),
        cashTotal: parseFloat(e.cashTotal.toFixed(2)),
        cardTotal: parseFloat(e.cardTotal.toFixed(2)),
        pixTotal: parseFloat(e.pixTotal.toFixed(2)),
        averageTicket: parseFloat(avg.toFixed(2))
      };
    });

    // Ordena pelo maior faturamento
    rankedEmployees.sort((a, b) => b.totalSalesAmount - a.totalSalesAmount || b.salesCount - a.salesCount);

    // Atribui posições (1º, 2º, 3º...)
    rankedEmployees.forEach((emp, index) => {
      emp.rank = index + 1;
    });

    // Detalhamento de Turnos Individuais
    const shiftRankings = periodSessions.map(session => {
      const emp = this.getEmployeeById(session.openedByEmployeeId) || this.findEmployeeByName(session.openedByName);
      return {
        sessionId: session.id,
        sessionCode: session.sessionCode || '#001',
        sessionNumber: session.sessionNumber || 1,
        dateStr: session.dateStr,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        status: session.status,
        employeeName: emp ? emp.name : (session.openedByName || 'Operador'),
        employeeRole: emp ? emp.role : 'Operador',
        avatarColor: emp ? emp.avatarColor : 'linear-gradient(135deg, #7c3aed, #ec4899)',
        openingTotal: session.openingTotal || 0,
        totalSalesAmount: session.totalSalesAmount || 0,
        totalSalesCount: session.totalSalesCount || 0,
        closingBalance: session.closingBalance || 0,
        observation: session.observation || ''
      };
    }).sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));

    return {
      period,
      totalRevenue: rankedEmployees.reduce((sum, e) => sum + e.totalSalesAmount, 0),
      totalSalesCount: rankedEmployees.reduce((sum, e) => sum + e.salesCount, 0),
      employeesRank: rankedEmployees,
      topEmployee: rankedEmployees[0] || null,
      shiftRankings: shiftRankings
    };
  }

  findEmployeeByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    return this.employees.find(e => e.name.toLowerCase() === clean || clean.includes(e.name.toLowerCase())) || null;
  }
}

export const employeeService = new EmployeeService();
