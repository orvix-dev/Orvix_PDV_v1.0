/**
 * ==========================================================================
 * ORVIX MASTER — SERVIÇO DE LICENÇAS E FILA DE CLIENTES EM ESPERA
 * ==========================================================================
 */

import {
  firebaseDb,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from '../config/firebase.js';
import { env } from '../config/env.js';

export class MasterLicenseService {
  constructor() {
    this.cachedLicenses = [];
    this.cachedPendingCustomers = [];
  }

  // =========================================================================
  // 1. FILA DE CLIENTES EM ESPERA DE ATIVAÇÃO
  // =========================================================================

  /**
   * Escuta em tempo real novos clientes cadastrados no PDV sem chave vinculada
   */
  subscribePendingCustomers(callback) {
    if (!firebaseDb) {
      callback([]);
      return () => {};
    }

    try {
      const q = collection(firebaseDb, 'users');
      return onSnapshot(q, (snapshot) => {
        const pendingList = [];
        const masterEmail = env.masterAdminEmail;

        snapshot.forEach((docSnap) => {
          const u = docSnap.data() || {};
          const email = (u.email || '').toLowerCase().trim();

          // Ignora a própria conta master
          if (email === masterEmail) return;

          // Detecta clientes que estão pendentes OU sem chave de licença / sem tenant
          const isPendingStatus = u.status === 'pendente' || u.status === 'aguardando_chave';
          const hasNoLicense = !u.chaveLicenca || u.chaveLicenca.trim() === '';
          const hasNoTenant = !u.tenantId || u.tenantId.trim() === '';

          if (isPendingStatus || (hasNoLicense && hasNoTenant && u.status !== 'bloqueado')) {
            pendingList.push({
              uid: docSnap.id,
              email: u.email || 'Sem e-mail',
              displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Novo Cliente'),
              registeredAt: u.registeredAt || u.createdAt || null,
              status: u.status || 'pendente',
              role: u.role || 'Administrador',
              provider: u.provider || 'pdv'
            });
          }
        });

        // Ordena pelos mais recentes primeiro
        pendingList.sort((a, b) => {
          const dateA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
          const dateB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
          return dateB - dateA;
        });

        this.cachedPendingCustomers = pendingList;
        callback(pendingList);
      }, (err) => {
        console.warn('[MasterLicense] Erro ao escutar fila de clientes em espera:', err);
        callback([]);
      });
    } catch (e) {
      console.error('[MasterLicense] Falha ao iniciar listener de clientes:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Finaliza o cadastro de um cliente em espera e ativa imediatamente sua chave
   */
  async finalizeAndActivateCustomer({
    uid,
    email,
    displayName,
    tenantName,
    ownerPhone = '',
    plan = 'Mensal Pro',
    durationDays = 30,
    maxDevices = 3,
    customKey = '',
    notes = ''
  }) {
    if (!uid) throw new Error('Identificador de usuário (UID) não informado.');
    if (!email || !email.includes('@')) throw new Error('E-mail do cliente inválido.');
    if (!tenantName || !tenantName.trim()) throw new Error('Informe o nome do estabelecimento / loja.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanTenantName = tenantName.trim();
    const cleanKey = (customKey && customKey.trim())
      ? customKey.trim().toUpperCase()
      : this.generateRandomLicenseKey(cleanTenantName);

    const tenantId = `tenant-${cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const inviteCode = this.generateRandomInviteCode();
    const now = new Date();
    const days = parseInt(durationDays, 10) || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
    const nowIso = now.toISOString();

    const licenseData = {
      key: cleanKey,
      tenantId: tenantId,
      tenantName: cleanTenantName,
      ownerEmail: cleanEmail,
      donoEmail: cleanEmail,
      ownerName: (displayName || cleanEmail.split('@')[0]).trim(),
      ownerPhone: ownerPhone.trim(),
      plan: plan,
      status: 'ativo', // Já ativado diretamente pelo Master
      createdAt: nowIso,
      activatedAt: nowIso,
      activatedByUid: uid,
      activatedByEmail: cleanEmail,
      expiresAt: expiresAt,
      defaultInviteCode: inviteCode,
      maxDevices: parseInt(maxDevices, 10) || 3,
      notes: (notes || '').trim(),
      activatedByMaster: true
    };

    if (!firebaseDb) {
      throw new Error('Erro de conexão com o banco de dados. Firebase não está inicializado. Verifique as credenciais.');
    }

    // 1. Cria a licença na coleção 'licenses'
    const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
    await setDoc(licenseRef, {
      ...licenseData,
      serverCreated: serverTimestamp()
    });

    // 2. Cria o estabelecimento na coleção 'tenants'
    const tenantRef = doc(firebaseDb, 'tenants', tenantId);
    await setDoc(tenantRef, {
      id: tenantId,
      nome: cleanTenantName,
      plan: plan,
      statusLicenca: 'ativo',
      chaveLicenca: cleanKey,
      codigoConvite: inviteCode,
      dataExpiracao: expiresAt,
      donoEmail: cleanEmail,
      ownerEmail: cleanEmail,
      ownerUid: uid,
      onboardingCompleted: false,
      kgPricesConfigured: false,
      productsConfigured: false,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 3. Atualiza o perfil do usuário na coleção 'users' para ATIVO
    // O PDV escuta 'users/{uid}' via onSnapshot e será liberado instantaneamente!
    const userRef = doc(firebaseDb, 'users', uid);
    await setDoc(userRef, {
      uid: uid,
      email: cleanEmail,
      displayName: (displayName || cleanEmail.split('@')[0]).trim(),
      tenantId: tenantId,
      tenantName: cleanTenantName,
      chaveLicenca: cleanKey,
      role: 'Administrador',
      status: 'ativo',
      approvedAt: nowIso,
      approvedBy: 'master_panel_activation',
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.info(`[MasterLicense] Cliente "${cleanEmail}" ativado com sucesso na loja "${cleanTenantName}" (Chave: ${cleanKey}).`);

    return {
      success: true,
      key: cleanKey,
      tenantId: tenantId,
      tenantName: cleanTenantName,
      expiresAt: expiresAt,
      licenseData
    };
  }

  /**
   * Remove da fila um cadastro pendente que nao deve ser ativado
   */
  async deletePendingCustomer(uid) {
    if (!uid) throw new Error('Identificador de usuário (UID) não informado.');

    if (!firebaseDb) {
      throw new Error('Erro de conexão com o banco de dados. Firebase não está inicializado.');
    }

    await deleteDoc(doc(firebaseDb, 'users', uid));
    return true;
  }

  // =========================================================================
  // 2. GESTÃO DE TODAS AS LICENÇAS (FEED / CARDS)
  // =========================================================================

  /**
   * Escuta em tempo real todas as licenças do sistema
   */
  subscribeAllLicenses(callback) {
    if (!firebaseDb) {
      callback([]);
      return () => {};
    }

    const q = collection(firebaseDb, 'licenses');
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data() || {};
        list.push({
          id: docSnap.id,
          key: d.key || d.chaveLicenca || docSnap.id,
          tenantName: d.tenantName || 'Estabelecimento Licenciado',
          ownerEmail: d.ownerEmail || d.donoEmail || d.email || 'Sem e-mail',
          ownerName: d.ownerName || '',
          ownerPhone: d.ownerPhone || '',
          plan: d.plan || 'Pro',
          status: d.status || 'ativo',
          createdAt: d.createdAt || null,
          expiresAt: d.expiresAt || null,
          maxDevices: d.maxDevices || 3,
          notes: d.notes || '',
          ...d
        });
      });

      // Ordena pelas criadas mais recentemente
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      this.cachedLicenses = list;
      callback(list);
    }, (err) => {
      console.warn('[MasterLicense] Erro ao escutar licenças:', err);
      callback([]);
    });
  }

  /**
   * Cria uma nova chave de licença manual (para envio antecipado ao cliente)
   */
  async createLicenseKey({
    key,
    tenantName,
    ownerEmail,
    ownerName = '',
    ownerPhone = '',
    plan = 'Mensal Pro',
    durationDays = 30,
    maxDevices = 3,
    notes = ''
  }) {
    if (!tenantName || !tenantName.trim()) {
      throw new Error('Informe o nome do estabelecimento.');
    }
    if (!ownerEmail || !ownerEmail.trim() || !ownerEmail.includes('@')) {
      throw new Error('Informe um e-mail válido para o proprietário.');
    }

    const cleanTenantName = tenantName.trim();
    const cleanEmail = ownerEmail.trim().toLowerCase();
    const cleanKey = (key && key.trim()) 
      ? key.trim().toUpperCase() 
      : this.generateRandomLicenseKey(cleanTenantName);

    const tenantId = `tenant-${cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const inviteCode = this.generateRandomInviteCode();
    const now = new Date();
    const days = parseInt(durationDays, 10) || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();

    const licenseData = {
      key: cleanKey,
      tenantId: tenantId,
      tenantName: cleanTenantName,
      ownerEmail: cleanEmail,
      donoEmail: cleanEmail,
      ownerName: ownerName.trim() || cleanEmail.split('@')[0],
      ownerPhone: ownerPhone.trim(),
      plan: plan,
      status: 'ativo',
      createdAt: now.toISOString(),
      activatedAt: null,
      activatedByUid: null,
      activatedByEmail: null,
      expiresAt: expiresAt,
      defaultInviteCode: inviteCode,
      maxDevices: parseInt(maxDevices, 10) || 3,
      notes: notes.trim()
    };

    if (!firebaseDb) {
      throw new Error('Erro de conexão com o banco de dados. Firebase não está inicializado. Verifique as credenciais.');
    }

    const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
    await setDoc(licenseRef, {
      ...licenseData,
      serverCreated: serverTimestamp()
    });

    const tenantRef = doc(firebaseDb, 'tenants', tenantId);
    await setDoc(tenantRef, {
      id: tenantId,
      nome: cleanTenantName,
      plan: plan,
      statusLicenca: 'ativo',
      chaveLicenca: cleanKey,
      codigoConvite: inviteCode,
      dataExpiracao: expiresAt,
      donoEmail: cleanEmail,
      ownerEmail: cleanEmail,
      onboardingCompleted: false,
      kgPricesConfigured: false,
      productsConfigured: false,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return licenseData;
  }

  /**
   * Adiciona uma filial / nova loja para o mesmo proprietário
   */
  async createAdditionalStoreLicense({
    ownerEmail,
    ownerName = '',
    ownerPhone = '',
    tenantName,
    plan = 'Mensal Pro',
    durationDays = 30
  }) {
    return await this.createLicenseKey({
      tenantName,
      ownerEmail,
      ownerName,
      ownerPhone,
      plan,
      durationDays,
      notes: 'Filial cadastrada pelo Master'
    });
  }

  /**
   * Alterna o status da licença (ativo / bloqueado)
   */
  async updateLicenseStatus(key, status) {
    if (!key) throw new Error('Chave não informada.');
    const cleanKey = key.trim().toUpperCase();

    if (!firebaseDb) {
      throw new Error('Erro de conexão com o banco de dados. Firebase não está inicializado.');
    }

    const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
    await updateDoc(licenseRef, {
      status: status,
      updatedAt: serverTimestamp()
    });

    const licSnap = await getDoc(licenseRef);
    if (licSnap.exists() && licSnap.data().tenantId) {
      const tenantRef = doc(firebaseDb, 'tenants', licSnap.data().tenantId);
      await updateDoc(tenantRef, {
        statusLicenca: status,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }

    return true;
  }

  /**
   * Renova a validade da licença (+N dias)
   */
  async renewLicense(key, additionalDays = 30) {
    if (!key) throw new Error('Chave não informada.');
    const cleanKey = key.trim().toUpperCase();
    const days = parseInt(additionalDays, 10) || 30;

    let currentExpiresAt = new Date();
    let tenantId = null;

    if (firebaseDb) {
      const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
      const licSnap = await getDoc(licenseRef);

      if (licSnap.exists()) {
        const data = licSnap.data();
        tenantId = data.tenantId;
        if (data.expiresAt) {
          const expDate = new Date(data.expiresAt);
          currentExpiresAt = expDate > new Date() ? expDate : new Date();
        }
      }

      const newExpiresAt = new Date(currentExpiresAt.getTime() + days * 24 * 3600 * 1000).toISOString();

      await updateDoc(licenseRef, {
        expiresAt: newExpiresAt,
        status: 'ativo',
        updatedAt: serverTimestamp()
      });

      if (tenantId) {
        const tenantRef = doc(firebaseDb, 'tenants', tenantId);
        await updateDoc(tenantRef, {
          dataExpiracao: newExpiresAt,
          statusLicenca: 'ativo',
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      return newExpiresAt;
    }

    throw new Error('Banco de dados indisponível para renovação.');
  }

  /**
   * Exclui permanentemente uma chave de licença
   */
  async deleteLicenseKey(key) {
    if (!key) throw new Error('Chave não informada.');
    const cleanKey = key.trim().toUpperCase();

    if (!firebaseDb) {
      throw new Error('Erro de conexão com o banco de dados. Firebase não está inicializado.');
    }

    const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
    await deleteDoc(licenseRef);

    return true;
  }

  /**
   * Utilitário para gerar chave legível
   */
  generateRandomLicenseKey(tenantName = '') {
    let prefix = 'LOJA';
    if (tenantName) {
      const clean = tenantName.toUpperCase().replace(/[^A-Z]/g, '');
      if (clean.length >= 3) {
        prefix = clean.substring(0, 5);
      }
    }
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORVIX-${prefix}-${rand}`;
  }

  /**
   * Utilitário para código de convite
   */
  generateRandomInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SERRA-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const masterLicenseService = new MasterLicenseService();
