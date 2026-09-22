/**
 * ==========================================================================
 * ORVIX PDV — LICENSE & MULTI-TENANT ACCESS SERVICE
 * ==========================================================================
 * Gerencia licenças de estabelecimentos, códigos de convite de equipe,
 * validação de chaves e aprovação/controle de usuários.
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
import { StorageService } from './storage.service.js';
import { env } from '../config/env.js';

const STORAGE_TENANT_KEY = 'orvix_tenant_data';
const STORAGE_TEAM_KEY = 'orvix_team_members';
const STORAGE_LICENSES_KEY = 'orvix_predefined_licenses';

// Chaves de licença padrão embutidas para ativação inicial
const DEFAULT_PREDEFINED_LICENSES = {
  'ORVIX-MASTER-2026': {
    key: 'ORVIX-MASTER-2026',
    tenantId: 'acai-da-serra-matriz',
    tenantName: 'Açaí da Serra - Matriz',
    ownerEmail: 'carlos@acaiserra.com',
    ownerName: 'Carlos Silva',
    ownerPhone: '11987654321',
    plan: 'Enterprise',
    status: 'ativo',
    createdAt: '2026-08-01T10:00:00.000Z',
    expiresAt: '2026-12-31T23:59:59.000Z',
    defaultInviteCode: 'SERRA-2026',
    maxDevices: 5
  },
  'ORVIX-SERRA-2026': {
    key: 'ORVIX-SERRA-2026',
    tenantId: 'acai-da-serra-filial',
    tenantName: 'Açaí da Serra - Filial Centro',
    ownerEmail: 'carlos@acaiserra.com', // Exemplo: mesmo dono com 2 estabelecimentos
    ownerName: 'Carlos Silva',
    ownerPhone: '11987654321',
    plan: 'Pro Multi-User',
    status: 'ativo',
    createdAt: '2026-08-15T14:30:00.000Z',
    expiresAt: '2026-12-31T23:59:59.000Z',
    defaultInviteCode: 'SERRA-8492',
    maxDevices: 3
  },
  'DEMO-TESTE-PDV': {
    key: 'DEMO-TESTE-PDV',
    tenantId: 'demo-estabelecimento',
    tenantName: 'Estabelecimento Demonstração',
    ownerEmail: 'teste@exemplo.com',
    ownerName: 'Lojista Teste',
    ownerPhone: '11999998888',
    plan: 'Trial 30 Dias',
    status: 'ativo',
    createdAt: '2026-08-20T09:00:00.000Z',
    expiresAt: '2026-09-20T23:59:59.000Z',
    defaultInviteCode: 'DEMO-1234',
    maxDevices: 2
  }
};

export class LicenseService {
  constructor() {
    this.initLocalStore();
  }

  initLocalStore() {
    if (!StorageService.get(STORAGE_LICENSES_KEY)) {
      StorageService.set(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    }
  }

  /**
   * Valida uma Chave (Chave de Licença de Loja OU Código de Convite de Equipe)
   */
  async redeemAccessKey(key, user) {
    if (!key || !key.trim()) {
      throw new Error('Por favor, informe uma chave de licença ou código de convite.');
    }
    if (!user || !user.uid) {
      throw new Error('Usuário não autenticado.');
    }

    const cleanKey = key.trim().toUpperCase();

    // 1. Tenta validar no Firestore com timeout de 2.5s se disponível
    if (firebaseDb) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 2500)
        );
        return await Promise.race([this._redeemFirestore(cleanKey, user), timeoutPromise]);
      } catch (err) {
        console.warn('[LicenseService] Firestore indisponível ou timeout, utilizando ativação local:', err.message);
      }
    }

    // 2. Fallback / Modo Local
    return this._redeemLocal(cleanKey, user);
  }

  /**
   * Resgate via Firestore
   */
  async _redeemFirestore(cleanKey, user) {
    // 1. Verifica se é uma Chave de Licença de Estabelecimento na coleção 'licenses'
    const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
    const licenseSnap = await getDoc(licenseRef);

    let licenseData = licenseSnap.exists() ? licenseSnap.data() : null;

    // Se não existir no Firestore, checa as chaves pré-definidas e cria se for o caso
    if (!licenseData && DEFAULT_PREDEFINED_LICENSES[cleanKey]) {
      licenseData = DEFAULT_PREDEFINED_LICENSES[cleanKey];
      try {
        await setDoc(licenseRef, {
          ...licenseData,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Erro ao salvar licença padrão no firestore:', e);
      }
    }

    if (licenseData) {
      // 1. Validações de status e uso da chave
      if (licenseData.status === 'bloqueado') {
        throw new Error('Esta licença está bloqueada. Entre em contato com o administrador.');
      }
      if (licenseData.status === 'expirado' || (licenseData.expiresAt && new Date(licenseData.expiresAt) < new Date())) {
        throw new Error('Esta chave expirou.');
      }
      // Regra crítica: chave utilizada uma única vez
      if (licenseData.status === 'ativada' || (licenseData.activatedAt && licenseData.activatedByUid && licenseData.activatedByUid !== user.uid)) {
        throw new Error('Esta chave já foi utilizada. Solicite uma nova chave ao administrador.');
      }

      // É uma Chave de Licença -> Torna o usuário ADMINISTRADOR / DONO do estabelecimento
      const nowIso = new Date().toISOString();
      const tenantId = licenseData.tenantId || `tenant-${cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const tenantRef = doc(firebaseDb, 'tenants', tenantId);

      // Marca a chave como ATIVADA no Firestore (single-use)
      try {
        await updateDoc(licenseRef, {
          status: 'ativada',
          activatedAt: nowIso,
          activatedByUid: user.uid,
          activatedByEmail: user.email,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Erro ao atualizar status da licença para ativada:', err);
      }

      // Cria / Atualiza Estabelecimento com flags de onboarding
      await setDoc(tenantRef, {
        id: tenantId,
        nome: licenseData.tenantName || 'Estabelecimento Licenciado',
        plan: licenseData.plan || 'Pro',
        statusLicenca: 'ativo',
        chaveLicenca: cleanKey,
        codigoConvite: licenseData.defaultInviteCode || this.generateRandomInviteCode(),
        dataExpiracao: licenseData.expiresAt || new Date(Date.now() + 30*24*3600*1000).toISOString(),
        ownerUid: user.uid,
        ownerEmail: user.email,
        donoEmail: user.email,
        onboardingCompleted: false,
        kgPricesConfigured: false,
        productsConfigured: false,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Atualiza perfil do usuário como Administrador Ativo
      const userRef = doc(firebaseDb, 'users', user.uid);
      const updatedProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        tenantId: tenantId,
        tenantName: licenseData.tenantName || 'Estabelecimento Licenciado',
        role: 'Administrador',
        status: 'ativo',
        approvedAt: new Date().toISOString(),
        approvedBy: 'license_key_activation'
      };

      await setDoc(userRef, {
        ...updatedProfile,
        updatedAt: serverTimestamp()
      }, { merge: true });

      this.saveLocalTenant({
        id: tenantId,
        nome: licenseData.tenantName,
        codigoConvite: licenseData.defaultInviteCode,
        chaveLicenca: cleanKey
      });

      return {
        success: true,
        type: 'license_activated',
        role: 'Administrador',
        message: `Licença "${licenseData.tenantName}" ativada com sucesso! Você é o Administrador deste estabelecimento.`,
        userProfile: updatedProfile
      };
    }

    // 2. Verifica se é um Código de Convite de Equipe na coleção 'tenants'
    const tenantsQuery = query(
      collection(firebaseDb, 'tenants'),
      where('codigoConvite', '==', cleanKey)
    );
    const tenantQuerySnap = await getDocs(tenantsQuery);

    let matchingTenant = null;
    if (!tenantQuerySnap.empty) {
      matchingTenant = tenantQuerySnap.docs[0].data();
    } else {
      // Checa se corresponde ao código de convite de alguma licença pré-definida
      for (const licKey of Object.keys(DEFAULT_PREDEFINED_LICENSES)) {
        const item = DEFAULT_PREDEFINED_LICENSES[licKey];
        if (item.defaultInviteCode === cleanKey) {
          matchingTenant = {
            id: item.tenantId,
            nome: item.tenantName,
            codigoConvite: item.defaultInviteCode
          };
          break;
        }
      }
    }

    if (matchingTenant) {
      // É um Código de Convite de Equipe -> Ativa o usuário como OPERADOR do estabelecimento
      const userRef = doc(firebaseDb, 'users', user.uid);
      const updatedProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        tenantId: matchingTenant.id,
        tenantName: matchingTenant.nome || 'Estabelecimento Vinculado',
        role: 'Operador PDV',
        status: 'ativo',
        approvedAt: new Date().toISOString(),
        approvedBy: `invite_code_${cleanKey}`
      };

      await setDoc(userRef, {
        ...updatedProfile,
        updatedAt: serverTimestamp()
      }, { merge: true });

      this.saveLocalTenant(matchingTenant);

      return {
        success: true,
        type: 'invite_accepted',
        role: 'Operador PDV',
        message: `Você foi vinculado com sucesso à equipe de "${matchingTenant.nome}"!`,
        userProfile: updatedProfile
      };
    }

    throw new Error('Chave de licença ou código de convite inválido ou expirado. Verifique os dados digitados.');
  }

  /**
   * Resgate via LocalStorage (Modo Demo / Offline)
   */
  _redeemLocal(cleanKey, user) {
    const licenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);

    // 1. Checa licença de loja
    if (licenses[cleanKey]) {
      const lic = licenses[cleanKey];

      if (lic.status === 'bloqueado') {
        throw new Error('Esta licença está bloqueada. Entre em contato com o suporte.');
      }
      if (lic.status === 'expirado' || (lic.expiresAt && new Date(lic.expiresAt) < new Date())) {
        throw new Error('Esta chave expirou.');
      }
      if (lic.status === 'ativada' || (lic.activatedAt && lic.activatedByUid && lic.activatedByUid !== user.uid)) {
        throw new Error('Esta chave já foi utilizada. Solicite uma nova chave ao administrador.');
      }

      lic.status = 'ativada';
      lic.activatedAt = new Date().toISOString();
      lic.activatedByUid = user.uid;
      lic.activatedByEmail = user.email;
      StorageService.set(STORAGE_LICENSES_KEY, licenses);

      const updatedProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        tenantId: lic.tenantId,
        tenantName: lic.tenantName,
        role: 'Administrador',
        status: 'ativo',
        approvedAt: new Date().toISOString(),
        approvedBy: 'license_key_local'
      };

      this.saveLocalTenant({
        id: lic.tenantId,
        nome: lic.tenantName,
        codigoConvite: lic.defaultInviteCode,
        chaveLicenca: cleanKey,
        dataExpiracao: lic.expiresAt,
        donoEmail: user.email,
        ownerEmail: user.email,
        onboardingCompleted: false,
        kgPricesConfigured: false,
        productsConfigured: false
      });

      this._saveLocalTeamMember(updatedProfile);

      return {
        success: true,
        type: 'license_activated',
        role: 'Administrador',
        message: `Licença "${lic.tenantName}" ativada localmente com sucesso!`,
        userProfile: updatedProfile
      };
    }

    // 2. Checa código de convite
    let matchingLic = null;
    for (const k of Object.keys(licenses)) {
      if (licenses[k].defaultInviteCode === cleanKey) {
        matchingLic = licenses[k];
        break;
      }
    }

    const currentTenant = this.getLocalTenant();
    if (currentTenant && currentTenant.codigoConvite === cleanKey) {
      matchingLic = {
        tenantId: currentTenant.id,
        tenantName: currentTenant.nome,
        defaultInviteCode: currentTenant.codigoConvite
      };
    }

    if (matchingLic) {
      const updatedProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        tenantId: matchingLic.tenantId,
        tenantName: matchingLic.tenantName,
        role: 'Operador PDV',
        status: 'ativo',
        approvedAt: new Date().toISOString(),
        approvedBy: `invite_code_${cleanKey}`
      };

      this.saveLocalTenant(matchingLic);
      this._saveLocalTeamMember(updatedProfile);

      return {
        success: true,
        type: 'invite_accepted',
        role: 'Operador PDV',
        message: `Vinculado à equipe "${matchingLic.tenantName}" com sucesso!`,
        userProfile: updatedProfile
      };
    }

    throw new Error('Chave de licença ou código de convite inválido. Verifique os dados digitados.');
  }

  /**
   * Salva dados do estabelecimento no LocalStorage
   */
  saveLocalTenant(tenant) {
    StorageService.set(STORAGE_TENANT_KEY, tenant);
  }

  /**
   * Obtém dados do estabelecimento do LocalStorage
   */
  getLocalTenant() {
    return StorageService.get(STORAGE_TENANT_KEY, {
      id: 'acai-da-serra-matriz',
      nome: 'Açaí da Serra',
      codigoConvite: 'SERRA-8492',
      chaveLicenca: 'ORVIX-SERRA-2026',
      statusLicenca: 'ativo'
    });
  }

  /**
   * Atualiza o nome do estabelecimento (Máximo 20 caracteres)
   * Restrito a Administradores / Master Admin / Dono
   */
  async updateTenantName(tenantId, newName, currentUser) {
    const cleanName = (newName || '').trim();

    if (!cleanName) {
      throw new Error('O nome do estabelecimento não pode ficar vazio.');
    }

    if (cleanName.length < 2) {
      throw new Error('O nome do estabelecimento deve ter pelo menos 2 caracteres.');
    }

    if (cleanName.length > 20) {
      throw new Error('O nome do estabelecimento deve ter no máximo 20 caracteres.');
    }

    // Validação de Permissão (RBAC)
    const isAdmin = currentUser && (
      currentUser.role === 'Administrador' ||
      env.isMasterAdmin(currentUser.email) ||
      currentUser.isMaster === true
    );

    if (!isAdmin) {
      throw new Error('Permissão negada. Apenas Administradores podem editar o nome do estabelecimento.');
    }

    const currentTenant = this.getLocalTenant() || {};
    const tId = tenantId || currentTenant.id || 'acai-da-serra-matriz';

    const updatedTenant = {
      ...currentTenant,
      id: tId,
      nome: cleanName,
      tenantName: cleanName
    };

    // 1. Atualização imediata no armazenamento local
    this.saveLocalTenant(updatedTenant);

    // 2. Atualizações no Firestore se conectado
    if (firebaseDb) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', tId);
        await setDoc(tenantRef, {
          nome: cleanName,
          tenantName: cleanName,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Atualiza a licença vinculada se existir chave de licença
        if (currentTenant.chaveLicenca) {
          try {
            const licenseRef = doc(firebaseDb, 'licenses', currentTenant.chaveLicenca);
            await setDoc(licenseRef, {
              tenantName: cleanName,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (licErr) {
            console.warn('[LicenseService] Aviso ao atualizar nome na licença:', licErr);
          }
        }

        // Atualiza o perfil do usuário ativo
        if (currentUser?.uid) {
          try {
            const userRef = doc(firebaseDb, 'users', currentUser.uid);
            await setDoc(userRef, {
              tenantName: cleanName,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (uErr) {
            console.warn('[LicenseService] Aviso ao atualizar perfil de usuário:', uErr);
          }
        }
      } catch (err) {
        console.warn('[LicenseService] Aviso ao salvar nome no Firestore (usando versão local):', err);
      }
    }

    return {
      success: true,
      name: cleanName,
      tenant: updatedTenant
    };
  }

  /**
   * Escuta atualizações do documento do tenant em tempo real
   */
  subscribeTenant(tenantId, callback) {
    if (!tenantId) return () => {};

    // Notificação imediata dos dados locais
    const localTenant = this.getLocalTenant();
    if (localTenant && (localTenant.id === tenantId || !localTenant.id)) {
      callback(localTenant);
    }

    if (firebaseDb) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', tenantId);
        const unsubscribe = onSnapshot(tenantRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const current = this.getLocalTenant() || {};
            const merged = { ...current, ...data };
            this.saveLocalTenant(merged);
            callback(merged);
          }
        }, (err) => {
          console.warn('[LicenseService] Erro ao escutar dados do tenant no Firestore:', err);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('[LicenseService] Falha ao iniciar subscribeTenant:', err);
      }
    }

    return () => {};
  }

  /**
   * Escuta a lista de membros da equipe do estabelecimento em tempo real
   */
  subscribeTeamMembers(tenantId, callback) {
    if (firebaseDb && tenantId) {
      const q = query(
        collection(firebaseDb, 'users'),
        where('tenantId', '==', tenantId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const members = [];
        snapshot.forEach((docSnap) => {
          members.push(docSnap.data());
        });
        callback(members);
      }, (err) => {
        console.warn('Erro ao escutar equipe Firestore, usando fallback local:', err);
        callback(this._getLocalTeamMembers(tenantId));
      });

      return unsubscribe;
    }

    // Modo Local
    callback(this._getLocalTeamMembers(tenantId));
    return () => {};
  }

  /**
   * Aprova um usuário pendente
   */
  async approveUser(uid, role = 'Operador PDV', approverUid = 'admin') {
    if (firebaseDb) {
      try {
        const userRef = doc(firebaseDb, 'users', uid);
        await updateDoc(userRef, {
          status: 'ativo',
          role: role,
          approvedAt: new Date().toISOString(),
          approvedBy: approverUid,
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (e) {
        console.warn('Erro ao aprovar no Firestore, atualizando localmente:', e);
      }
    }

    this._updateLocalUserStatus(uid, { status: 'ativo', role });
    return true;
  }

  /**
   * Bloqueia ou altera o status de um usuário
   */
  async updateUserStatus(uid, status) {
    if (firebaseDb) {
      try {
        const userRef = doc(firebaseDb, 'users', uid);
        await updateDoc(userRef, {
          status: status,
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (e) {
        console.warn('Erro ao atualizar status no Firestore:', e);
      }
    }

    this._updateLocalUserStatus(uid, { status });
    return true;
  }

  /**
   * Altera a função/cargo do usuário (Administrador / Operador PDV)
   */
  async updateUserRole(uid, role) {
    if (firebaseDb) {
      try {
        const userRef = doc(firebaseDb, 'users', uid);
        await updateDoc(userRef, {
          role: role,
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (e) {
        console.warn('Erro ao atualizar cargo no Firestore:', e);
      }
    }

    this._updateLocalUserStatus(uid, { role });
    return true;
  }

  /**
   * Remove um membro da equipe
   */
  async removeUser(uid) {
    if (firebaseDb) {
      try {
        const userRef = doc(firebaseDb, 'users', uid);
        await updateDoc(userRef, {
          tenantId: null,
          status: 'pendente',
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (e) {
        console.warn('Erro ao remover do Firestore:', e);
      }
    }

    const members = StorageService.get(STORAGE_TEAM_KEY, []);
    const filtered = members.filter(m => m.uid !== uid);
    StorageService.set(STORAGE_TEAM_KEY, filtered);
    return true;
  }

  /**
   * Gera um novo código de convite para a loja
   */
  async regenerateInviteCode(tenantId) {
    const newCode = this.generateRandomInviteCode();

    if (firebaseDb && tenantId) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', tenantId);
        await updateDoc(tenantRef, {
          codigoConvite: newCode,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Erro ao atualizar código de convite no Firestore:', e);
      }
    }

    const currentTenant = this.getLocalTenant();
    if (currentTenant) {
      currentTenant.codigoConvite = newCode;
      this.saveLocalTenant(currentTenant);
    }

    return newCode;
  }

  generateRandomInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SERRA-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Escuta alterações no documento do estabelecimento (tenant) em tempo real
   */
  subscribeTenant(tenantId, callback) {
    if (firebaseDb && tenantId) {
      const tenantRef = doc(firebaseDb, 'tenants', tenantId);
      const unsubscribe = onSnapshot(tenantRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback(data);
        }
      }, (err) => {
        console.warn('[LicenseService] Erro ao escutar tenant no Firestore:', err);
      });
      return unsubscribe;
    }
    return () => {};
  }

  /**
   * Atualiza o nome do estabelecimento (requer privilégio de Administrador)
   * Limite estrito solicitado pelo usuário: máximo de 20 caracteres
   */
  async updateTenantName(tenantId, newName, currentUser) {
    if (!newName || !newName.trim()) {
      throw new Error('O nome do estabelecimento não pode ficar em branco.');
    }
    const cleanName = newName.trim();
    if (cleanName.length < 2) {
      throw new Error('O nome deve ter pelo menos 2 caracteres.');
    }
    if (cleanName.length > 20) {
      throw new Error('O nome do estabelecimento deve ter no máximo 20 caracteres.');
    }

    const localTenant = this.getLocalTenant() || {};
    const tId = tenantId || localTenant.id;

    // Verificação de permissões do usuário
    const isMaster = currentUser?.email && env.isMasterAdmin(currentUser.email);
    const isAdmin = currentUser?.role === 'Administrador';
    const isOwner = (localTenant.ownerUid && currentUser?.uid && localTenant.ownerUid === currentUser.uid) ||
                    (localTenant.donoEmail && currentUser?.email && localTenant.donoEmail.toLowerCase() === currentUser.email.toLowerCase());

    if (!isMaster && !isAdmin && !isOwner) {
      throw new Error('Apenas Administradores têm permissão para alterar o nome do estabelecimento.');
    }

    // 1. Atualiza LocalStorage
    localTenant.nome = cleanName;
    localTenant.tenantName = cleanName;
    this.saveLocalTenant(localTenant);

    // 2. Se Firebase estiver conectado, propaga para o Firestore
    if (firebaseDb && tId) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', tId);
        await updateDoc(tenantRef, {
          nome: cleanName,
          tenantName: cleanName,
          updatedAt: serverTimestamp()
        });

        // Atualiza na licença vinculada (se houver)
        if (localTenant.chaveLicenca) {
          try {
            const licRef = doc(firebaseDb, 'licenses', localTenant.chaveLicenca);
            await updateDoc(licRef, {
              tenantName: cleanName,
              updatedAt: serverTimestamp()
            });
          } catch (licErr) {
            console.warn('[LicenseService] Aviso ao atualizar nome na licença:', licErr);
          }
        }

        // Atualiza no registro do próprio usuário conectado
        if (currentUser?.uid) {
          try {
            const userRef = doc(firebaseDb, 'users', currentUser.uid);
            await updateDoc(userRef, {
              tenantName: cleanName,
              updatedAt: serverTimestamp()
            });
          } catch (uErr) {
            console.warn('[LicenseService] Aviso ao atualizar tenantName no usuário:', uErr);
          }
        }
      } catch (err) {
        console.warn('[LicenseService] Erro ao sincronizar nome com Firestore, salvo localmente:', err);
      }
    }

    return localTenant;
  }

  // --- Helpers de Armazenamento Local ---

  _getLocalTeamMembers(tenantId) {
    const members = StorageService.get(STORAGE_TEAM_KEY, []);
    if (members.length === 0) {
      // Inicializa com membros de exemplo para demonstração local
      const defaultMembers = [
        {
          uid: 'demo-admin-01',
          displayName: 'Carlos Administrador',
          email: 'admin@orvixpdv.com',
          role: 'Administrador',
          status: 'ativo',
          tenantId: tenantId || 'acai-da-serra-matriz',
          createdAt: new Date(Date.now() - 30*24*3600*1000).toISOString()
        },
        {
          uid: 'demo-op-01',
          displayName: 'Mariana Caixa',
          email: 'mariana.caixa@email.com',
          role: 'Operador PDV',
          status: 'ativo',
          tenantId: tenantId || 'acai-da-serra-matriz',
          createdAt: new Date(Date.now() - 5*24*3600*1000).toISOString()
        }
      ];
      StorageService.set(STORAGE_TEAM_KEY, defaultMembers);
      return defaultMembers;
    }
    return members;
  }

  _saveLocalTeamMember(user) {
    const members = StorageService.get(STORAGE_TEAM_KEY, []);
    const idx = members.findIndex(m => m.uid === user.uid || m.email === user.email);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...user };
    } else {
      members.push(user);
    }
    StorageService.set(STORAGE_TEAM_KEY, members);
  }

  _updateLocalUserStatus(uid, updates) {
    const members = StorageService.get(STORAGE_TEAM_KEY, []);
    const idx = members.findIndex(m => m.uid === uid);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...updates };
      StorageService.set(STORAGE_TEAM_KEY, members);
    }
  }

  // =========================================================================
  // GESTÃO MASTER DE LICENÇAS & CHAVES (PORTAL SUPERADMIN)
  // =========================================================================

  /**
   * Escuta em tempo real todas as licenças (Firestore com fallback Local)
   */
  subscribeAllLicenses(callback) {
    if (firebaseDb) {
      const q = collection(firebaseDb, 'licenses');
      return onSnapshot(q, (snapshot) => {
        const licenses = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() || {};
          licenses.push({ 
            id: docSnap.id, 
            key: data.key || data.chaveLicenca || docSnap.id,
            ...data 
          });
        });
        
        if (licenses.length === 0) {
          const local = this._getAllLocalLicenses();
          callback(local);
        } else {
          licenses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          callback(licenses);
        }
      }, (err) => {
        console.warn('[LicenseService] Erro ao escutar licenças Firestore:', err);
        callback(this._getAllLocalLicenses());
      });
    }

    callback(this._getAllLocalLicenses());
    return () => {};
  }

  /**
   * Obtém todas as licenças
   */
  async getAllLicenses() {
    if (firebaseDb) {
      try {
        const snap = await getDocs(collection(firebaseDb, 'licenses'));
        const list = [];
        snap.forEach(d => {
          const data = d.data() || {};
          list.push({ 
            id: d.id, 
            key: data.key || data.chaveLicenca || d.id,
            ...data 
          });
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          return list;
        }
      } catch (e) {
        console.warn('Erro ao buscar licenças no Firestore:', e);
      }
    }
    return this._getAllLocalLicenses();
  }

  /**
   * Cria uma nova chave de licença de ativação
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
      status: 'disponivel', // Inicialmente disponível até ativação no PDV
      createdAt: now.toISOString(),
      activatedAt: null,
      activatedByUid: null,
      activatedByEmail: null,
      expiresAt: expiresAt,
      defaultInviteCode: inviteCode,
      maxDevices: parseInt(maxDevices, 10) || 3,
      notes: notes.trim()
    };

    if (firebaseDb) {
      try {
        const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
        await setDoc(licenseRef, {
          ...licenseData,
          serverCreated: serverTimestamp()
        });

        // Cria registro inicial do tenant no Firestore
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
      } catch (err) {
        console.warn('Erro ao salvar licença no Firestore, salvando local:', err);
      }
    }

    // Salva no LocalStorage
    const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    localLicenses[cleanKey] = licenseData;
    StorageService.set(STORAGE_LICENSES_KEY, localLicenses);

    return licenseData;
  }

  /**
   * Alterna o status da licença (ativo / bloqueado / expirado / disponivel)
   */
  async updateLicenseStatus(key, status) {
    const cleanKey = key.trim().toUpperCase();

    if (firebaseDb) {
      try {
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
      } catch (err) {
        console.warn('Erro ao atualizar status de licença no Firestore:', err);
      }
    }

    const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    if (localLicenses[cleanKey]) {
      localLicenses[cleanKey].status = status;
      StorageService.set(STORAGE_LICENSES_KEY, localLicenses);
    }
    return true;
  }

  /**
   * Renova a validade da licença (+N dias) consultando Firestore real
   */
  async renewLicense(key, additionalDays = 30) {
    if (!key) throw new Error('Chave de licença não informada.');
    const cleanKey = key.trim().toUpperCase();
    const days = parseInt(additionalDays, 10) || 30;

    let currentExpiresAt = new Date();
    let tenantId = null;

    if (firebaseDb) {
      try {
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

        // Atualiza cache local
        const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
        if (localLicenses[cleanKey]) {
          localLicenses[cleanKey].expiresAt = newExpiresAt;
          localLicenses[cleanKey].status = 'ativo';
          StorageService.set(STORAGE_LICENSES_KEY, localLicenses);
        }

        return newExpiresAt;
      } catch (e) {
        console.warn('Erro ao renovar licença Firestore, usando fallback local:', e);
      }
    }

    // Fallback Local
    const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    const lic = localLicenses[cleanKey];

    if (lic && lic.expiresAt) {
      const expDate = new Date(lic.expiresAt);
      currentExpiresAt = expDate > new Date() ? expDate : new Date();
    }

    const newExpiresAt = new Date(currentExpiresAt.getTime() + days * 24 * 3600 * 1000).toISOString();

    if (lic) {
      lic.expiresAt = newExpiresAt;
      lic.status = 'ativo';
      StorageService.set(STORAGE_LICENSES_KEY, localLicenses);
    }

    return newExpiresAt;
  }

  /**
   * Obtém todos os estabelecimentos vinculados a um usuário (multi-lojas por e-mail)
   */
  async getUserTenants(user) {
    if (!user) return [];
    if (user.status === 'pendente' || user.status === 'bloqueado') return [];

    const list = [];
    const seen = new Set();

    if (firebaseDb && user.email) {
      try {
        const cleanEmail = user.email.toLowerCase().trim();
        
        const fetchFirestoreTenants = async () => {
          const qDono = query(collection(firebaseDb, 'tenants'), where('donoEmail', '==', cleanEmail));
          const snapDono = await getDocs(qDono);
          snapDono.forEach(docSnap => {
            const t = docSnap.data();
            if (t && t.id && !seen.has(t.id)) {
              seen.add(t.id);
              list.push(t);
            }
          });

          if (user.uid) {
            const qOwner = query(collection(firebaseDb, 'tenants'), where('ownerUid', '==', user.uid));
            const snapOwner = await getDocs(qOwner);
            snapOwner.forEach(docSnap => {
              const t = docSnap.data();
              if (t && t.id && !seen.has(t.id)) {
                seen.add(t.id);
                list.push(t);
              }
            });
          }

          // Busca também caso o usuário tenha um tenantId diretamente vinculado no seu perfil
          if (user.tenantId && !seen.has(user.tenantId)) {
            try {
              const tDoc = await getDoc(doc(firebaseDb, 'tenants', user.tenantId));
              if (tDoc.exists()) {
                const t = tDoc.data();
                if (t && t.id && !seen.has(t.id)) {
                  seen.add(t.id);
                  list.push(t);
                }
              }
            } catch (err) {
              console.warn('[LicenseService] Erro ao buscar tenant vinculado:', err);
            }
          }

          return list;
        };

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FIRESTORE_GET_TENANTS_TIMEOUT')), 2000)
        );

        await Promise.race([fetchFirestoreTenants(), timeoutPromise]);
        if (list.length > 0) {
          return list;
        }
      } catch (err) {
        console.warn('[LicenseService] Firestore timeout ou offline ao buscar lojas, usando dados locais:', err.message);
      }
    }

    // Modo Local / Fallback Seguro:
    // Nunca concede acesso ao tenant matriz se o usuário for novo/pendente ou não for administrador
    const isMaster = user.email && env.isMasterAdmin(user.email);
    const local = this.getLocalTenant();
    const isLinkedToLocal = local && (
      (user.tenantId && user.tenantId === local.id) ||
      (local.donoEmail && user.email && local.donoEmail.toLowerCase() === user.email.toLowerCase()) ||
      (local.ownerEmail && user.email && local.ownerEmail.toLowerCase() === user.email.toLowerCase())
    );

    if (isMaster || isLinkedToLocal) {
      list.push(local);
    }

    return list;
  }

  /**
   * Adiciona uma nova loja/ponto para um cliente existente gerando nova chave de uso único
   */
  async createAdditionalStoreLicense({
    ownerEmail,
    ownerName = '',
    ownerPhone = '',
    tenantName,
    plan = 'Mensal Pro',
    durationDays = 30
  }) {
    if (!ownerEmail || !ownerEmail.trim()) {
      throw new Error('Informe o e-mail do cliente.');
    }
    if (!tenantName || !tenantName.trim()) {
      throw new Error('Informe o nome da nova loja.');
    }

    return await this.createLicenseKey({
      tenantName,
      ownerEmail,
      ownerName,
      ownerPhone,
      plan,
      durationDays,
      notes: 'Filial / Novo Ponto cadastrado pelo Master'
    });
  }

  /**
   * Exclui uma licença
   */
  async deleteLicenseKey(key) {
    const cleanKey = key.trim().toUpperCase();

    if (firebaseDb) {
      try {
        const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
        await deleteDoc(licenseRef);
      } catch (e) {
        console.warn('Erro ao deletar licença no Firestore:', e);
      }
    }

    const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    delete localLicenses[cleanKey];
    StorageService.set(STORAGE_LICENSES_KEY, localLicenses);
    return true;
  }

  /**
   * Escuta em tempo real o status da licença do estabelecimento atual (usado pelo PDV para bloquear caso suspensa)
   */
  subscribeLicenseStatus(key, callback) {
    if (!key) return () => {};
    const cleanKey = key.trim().toUpperCase();

    // Notificação imediata dos dados locais para evitar qualquer atraso na tela
    const localLicenses = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    if (localLicenses && localLicenses[cleanKey]) {
      callback(localLicenses[cleanKey]);
    }

    if (firebaseDb) {
      const licenseRef = doc(firebaseDb, 'licenses', cleanKey);
      return onSnapshot(licenseRef, (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        }
      }, (err) => {
        console.warn('Erro ao escutar status da licença ativa no Firestore:', err);
      });
    }

    return () => {};
  }

  /**
   * Gera uma chave de licença amigável (ex: ORVIX-SERRA-9281)
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

  _getAllLocalLicenses() {
    const licensesMap = StorageService.get(STORAGE_LICENSES_KEY, DEFAULT_PREDEFINED_LICENSES);
    const list = Object.values(licensesMap);
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }
}

export const licenseService = new LicenseService();

