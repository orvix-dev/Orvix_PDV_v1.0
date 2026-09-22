/**
 * ==========================================================================
 * ORVIX MASTER — SERVIÇO DE AUTENTICAÇÃO RESTRITO (CONTA ÚNICA)
 * ==========================================================================
 */

import {
  firebaseAuth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from '../config/firebase.js';
import { env } from '../config/env.js';

const MASTER_SESSION_KEY = 'orvix_master_auth_active';
const MASTER_USER_KEY = 'orvix_master_user_data';

export class MasterAuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.init();
  }

  init() {
    const localUser = this.getLocalSession();
    if (localUser && env.isAuthorizedMaster(localUser.email)) {
      this.currentUser = localUser;
    }

    if (firebaseAuth) {
      onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          if (env.isAuthorizedMaster(user.email)) {
            this.currentUser = {
              uid: user.uid,
              email: user.email.toLowerCase(),
              displayName: user.displayName || 'Administrador Master',
              photoURL: user.photoURL || null
            };
            this.saveLocalSession(this.currentUser);
            this.notifyListeners(this.currentUser);
          } else {
            // E-mail não autorizado conectado no Firebase -> Desconecta imediatamente
            console.warn(`[MasterAuth] Bloqueio: "${user.email}" não é a conta master autorizada.`);
            this.logout();
          }
        } else {
          this.currentUser = null;
          this.clearLocalSession();
          this.notifyListeners(null);
        }
      });
    }
  }

  /**
   * Login com E-mail e Senha (validação estrita da conta master)
   */
  async loginWithEmail(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail) {
      throw new Error('Informe o e-mail do administrador master.');
    }
    if (!cleanPassword) {
      throw new Error('Informe a senha.');
    }

    if (!env.isAuthorizedMaster(cleanEmail)) {
      throw new Error(`Acesso negado: Somente a conta master (${env.masterAdminEmail}) possui autorização para este painel.`);
    }

    if (firebaseAuth) {
      try {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
        } catch (signInErr) {
          // Se o usuário ainda não existir no Firebase Auth do projeto, cadastra automaticamente na primeira vez
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            try {
              cred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
              console.info('[MasterAuth] Conta master registrada automaticamente no Firebase Auth.');
            } catch (createErr) {
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }

        const user = cred.user;

        if (!env.isAuthorizedMaster(user.email)) {
          await firebaseSignOut(firebaseAuth);
          throw new Error(`Acesso negado: Conta "${user.email}" não autorizada.`);
        }

        this.currentUser = {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName: user.displayName || 'Administrador Master',
          photoURL: user.photoURL || null
        };
        this.saveLocalSession(this.currentUser);
        this.notifyListeners(this.currentUser);
        return this.currentUser;
      } catch (err) {
        throw new Error(this.getFriendlyErrorMessage(err.code || err.message));
      }
    }

    throw new Error('Serviço de autenticação indisponível.');
  }

  /**
   * Login com Google (Popup)
   */
  async loginWithGoogle() {
    if (!firebaseAuth || !googleProvider) {
      throw new Error('Autenticação com Google não configurada.');
    }

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;

      if (!env.isAuthorizedMaster(user.email)) {
        await firebaseSignOut(firebaseAuth);
        throw new Error(`Acesso negado: O e-mail Google "${user.email}" não é a conta master autorizada (${env.masterAdminEmail}).`);
      }

      this.currentUser = {
        uid: user.uid,
        email: user.email.toLowerCase(),
        displayName: user.displayName || 'Administrador Master',
        photoURL: user.photoURL || null
      };
      this.saveLocalSession(this.currentUser);
      this.notifyListeners(this.currentUser);
      return this.currentUser;
    } catch (err) {
      throw new Error(this.getFriendlyErrorMessage(err.code || err.message));
    }
  }

  /**
   * Desconecta o usuário
   */
  async logout() {
    this.currentUser = null;
    this.clearLocalSession();
    if (firebaseAuth) {
      try {
        await firebaseSignOut(firebaseAuth);
      } catch (e) {
        console.warn('Erro ao deslogar Firebase Auth:', e);
      }
    }
    this.notifyListeners(null);
  }

  isAuthenticated() {
    return Boolean(this.currentUser && env.isAuthorizedMaster(this.currentUser.email));
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(user) {
    this.listeners.forEach(cb => {
      try {
        cb(user);
      } catch (err) {
        console.error('Erro em listener do MasterAuth:', err);
      }
    });
  }

  saveLocalSession(user) {
    try {
      localStorage.setItem(MASTER_SESSION_KEY, 'true');
      localStorage.setItem(MASTER_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Erro ao salvar sessão local:', e);
    }
  }

  getLocalSession() {
    try {
      const active = localStorage.getItem(MASTER_SESSION_KEY);
      if (active !== 'true') return null;
      const raw = localStorage.getItem(MASTER_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  clearLocalSession() {
    localStorage.removeItem(MASTER_SESSION_KEY);
    localStorage.removeItem(MASTER_USER_KEY);
  }

  getFriendlyErrorMessage(code) {
    switch (code) {
      case 'auth/user-not-found':
        return 'Nenhum usuário encontrado com este e-mail.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Senha incorreta para a conta master.';
      case 'auth/invalid-email':
        return 'Formato de e-mail inválido.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi desativada.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
      case 'auth/popup-closed-by-user':
        return 'Login com Google cancelado pela janela.';
      default:
        return code || 'Ocorreu um erro ao realizar login.';
    }
  }
}

export const masterAuthService = new MasterAuthService();
