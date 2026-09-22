import { 
  firebaseAuth,
  firebaseDb,
  googleProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut as firebaseSignOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from '../config/firebase.js';
import { env } from '../config/env.js';
import { licenseService } from './license.service.js';

const AUTH_STORAGE_KEY = 'orvix_authenticated_user';

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.userDocUnsubscribe = null;
    this.init();
  }

  init() {
    // Modo Offline/Demo: carrega sessão salva localmente se existir inicialmente
    const saved = this.getLocalSession();
    if (saved) {
      this.currentUser = saved;
    }

    // Se Firebase estiver disponível, escuta mudanças de autenticação do Firebase Auth
    if (firebaseAuth) {
      onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          await this.handleUserAuthenticated(user);
        } else {
          this.handleUserSignedOut();
        }
      });
    }
  }

  /**
   * Trata o usuário autenticado, sincronizando o documento Firestore em tempo real
   */
  handleUserAuthenticated(firebaseUser) {
    if (this.userDocUnsubscribe) {
      this.userDocUnsubscribe();
      this.userDocUnsubscribe = null;
    }

    const baseUserData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuário'),
      photoURL: firebaseUser.photoURL || null,
      provider: firebaseUser.providerData?.[0]?.providerId || 'firebase'
    };

    if (firebaseDb) {
      return new Promise((resolve) => {
        let hasResolved = false;

        // Timeout de 2s para o Firestore: se a rede estiver offline/lenta, aplica fallback imediatamente
        const connectionTimeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            console.warn('[AuthService] Firestore demorou a responder, aplicando fallback local.');
            this._fallbackLocalUser(baseUserData);
            resolve(this.currentUser);
          }
        }, 2000);

        try {
          const userRef = doc(firebaseDb, 'users', firebaseUser.uid);

          // Listener em tempo real para atualizações de status/permissões
          this.userDocUnsubscribe = onSnapshot(userRef, async (docSnap) => {
            clearTimeout(connectionTimeout);

            if (docSnap.exists()) {
              const dbData = docSnap.data();
              const isMaster = env.isMasterAdmin(baseUserData.email);
              this.currentUser = {
                ...baseUserData,
                displayName: dbData.displayName || baseUserData.displayName,
                photoURL: dbData.photoURL || baseUserData.photoURL,
                role: dbData.role || (isMaster ? 'Administrador' : 'Operador PDV'),
                status: dbData.status || (isMaster ? 'ativo' : 'pendente'), // 'ativo' | 'pendente' | 'bloqueado'
                tenantId: dbData.tenantId || (isMaster ? 'acai-da-serra-matriz' : null),
                tenantName: dbData.tenantName || (isMaster ? 'Açaí da Serra - Matriz' : null),
                approvedAt: dbData.approvedAt || null
              };
            } else {
              // Documento ainda não existe no Firestore (primeiro acesso)
              const isInitialAdmin = env.isMasterAdmin(baseUserData.email);

              const initialProfile = {
                ...baseUserData,
                role: isInitialAdmin ? 'Administrador' : 'Operador PDV',
                status: isInitialAdmin ? 'ativo' : 'pendente',
                tenantId: isInitialAdmin ? 'acai-da-serra-matriz' : null,
                tenantName: isInitialAdmin ? 'Açaí da Serra - Matriz' : null,
                chaveLicenca: null,
                registeredAt: new Date().toISOString(),
                createdAt: serverTimestamp()
              };

              try {
                await setDoc(userRef, initialProfile, { merge: true });
              } catch (err) {
                console.warn('[AuthService] Falha ao salvar perfil inicial:', err);
              }

              this.currentUser = {
                ...initialProfile,
                createdAt: new Date().toISOString()
              };
            }

            this.saveLocalSession(this.currentUser);
            this.notifyListeners(this.currentUser);

            if (!hasResolved) {
              hasResolved = true;
              resolve(this.currentUser);
            }
          }, (error) => {
            clearTimeout(connectionTimeout);
            console.warn('[AuthService] Erro no listener do usuário Firestore:', error);
            this._fallbackLocalUser(baseUserData);
            if (!hasResolved) {
              hasResolved = true;
              resolve(this.currentUser);
            }
          });
        } catch (err) {
          clearTimeout(connectionTimeout);
          console.warn('[AuthService] Falha ao conectar ao perfil do usuário no Firestore:', err);
          this._fallbackLocalUser(baseUserData);
          if (!hasResolved) {
            hasResolved = true;
            resolve(this.currentUser);
          }
        }
      });
    }

    // Fallback Local
    this._fallbackLocalUser(baseUserData);
    return Promise.resolve(this.currentUser);
  }

  _fallbackLocalUser(baseUserData) {
    const isMaster = env.isMasterAdmin(baseUserData.email);
    const localSaved = this.getLocalSession();

    this.currentUser = {
      ...baseUserData,
      role: localSaved?.role || (isMaster ? 'Administrador' : 'Operador PDV'),
      status: localSaved?.status || (isMaster ? 'ativo' : 'pendente'),
      tenantId: localSaved?.tenantId || (isMaster ? 'acai-da-serra-matriz' : null),
      tenantName: localSaved?.tenantName || (isMaster ? 'Açaí da Serra - Matriz' : null)
    };

    this.saveLocalSession(this.currentUser);
    this.notifyListeners(this.currentUser);
  }

  handleUserSignedOut() {
    if (this.userDocUnsubscribe) {
      this.userDocUnsubscribe();
      this.userDocUnsubscribe = null;
    }
    this.currentUser = null;
    this.clearLocalSession();
    this.notifyListeners(null);
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    // Notifica imediatamente o estado atual
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
        console.error('Erro em listener de auth:', err);
      }
    });
  }

  saveLocalSession(user) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Erro ao salvar sessão local:', e);
    }
  }

  getLocalSession() {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  clearLocalSession() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Erro ao limpar sessão local:', e);
    }
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  isApproved() {
    return this.currentUser && this.currentUser.status === 'ativo';
  }

  isPending() {
    return this.currentUser && this.currentUser.status === 'pendente';
  }

  isBlocked() {
    return this.currentUser && this.currentUser.status === 'bloqueado';
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'Administrador';
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserInitials() {
    if (!this.currentUser) return 'OP';
    const name = this.currentUser.displayName || this.currentUser.email || 'Operador';
    const parts = name.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /**
   * Resgata uma chave de licença ou código de convite para ativar o acesso
   */
  async redeemAccessKey(key) {
    if (!this.currentUser) {
      throw new Error('Nenhum usuário conectado para ativar a chave.');
    }

    const result = await licenseService.redeemAccessKey(key, this.currentUser);
    if (result && result.userProfile) {
      this.currentUser = {
        ...this.currentUser,
        ...result.userProfile
      };
      this.saveLocalSession(this.currentUser);
      this.notifyListeners(this.currentUser);
    }
    return result;
  }

  /**
   * Realiza login por E-mail e Senha no sistema
   */
  async login(email, password) {
    const cleanEmail = email ? email.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Por favor, preencha o e-mail e a senha.');
    }

    if (firebaseAuth) {
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
        const user = userCredential.user;
        await this.handleUserAuthenticated(user);
        return this.currentUser;
      } catch (error) {
        throw new Error(this.getFriendlyErrorMessage(error.code || error.message));
      }
    }

    // Modo de teste / Demonstração se o Firebase não estiver configurado
    if (env.allowOfflineDemo) {
      if (cleanPassword.length < 4) {
        throw new Error('A senha deve conter no mínimo 4 caracteres.');
      }
      
      const isInitialAdmin = env.isMasterAdmin(cleanEmail);

      const mockUser = {
        uid: 'demo-' + Date.now(),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0].toUpperCase(),
        role: isInitialAdmin ? 'Administrador' : 'Operador PDV',
        status: isInitialAdmin ? 'ativo' : 'pendente',
        tenantId: isInitialAdmin ? 'acai-da-serra-matriz' : null,
        tenantName: isInitialAdmin ? 'Açaí da Serra - Matriz' : null,
        provider: 'demo-local'
      };

      this.currentUser = mockUser;
      this.saveLocalSession(mockUser);
      this.notifyListeners(mockUser);
      return mockUser;
    }

    throw new Error('Serviço de autenticação indisponível no momento.');
  }

  /**
   * Realiza cadastro de novo usuário por E-mail e Senha
   */
  async register(name, email, password) {
    const cleanName = name ? name.trim() : '';
    const cleanEmail = email ? email.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    if (!cleanName) {
      throw new Error('Por favor, informe seu nome completo.');
    }
    if (!cleanEmail) {
      throw new Error('Por favor, informe um endereço de e-mail.');
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    if (firebaseAuth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
        const user = userCredential.user;

        // Atualiza perfil no Firebase com o nome
        try {
          await updateProfile(user, {
            displayName: cleanName
          });
        } catch (profileErr) {
          console.warn('Erro ao atualizar nome do perfil:', profileErr);
        }

        const isInitialAdmin = env.isMasterAdmin(cleanEmail);

        // Cria o registro inicial do usuário no Firestore explicitamente
        if (firebaseDb) {
          try {
            const userRef = doc(firebaseDb, 'users', user.uid);
            await setDoc(userRef, {
              uid: user.uid,
              email: cleanEmail,
              displayName: cleanName,
              photoURL: null,
              provider: 'firebase',
              role: isInitialAdmin ? 'Administrador' : 'Operador PDV',
              status: isInitialAdmin ? 'ativo' : 'pendente',
              tenantId: isInitialAdmin ? 'acai-da-serra-matriz' : null,
              tenantName: isInitialAdmin ? 'Açaí da Serra - Matriz' : null,
              chaveLicenca: null,
              registeredAt: new Date().toISOString(),
              createdAt: serverTimestamp()
            }, { merge: true });
          } catch (docErr) {
            console.warn('[AuthService] Erro ao gravar perfil inicial no registro:', docErr);
          }
        }

        await this.handleUserAuthenticated(user);
        return this.currentUser;
      } catch (error) {
        throw new Error(this.getFriendlyErrorMessage(error.code || error.message));
      }
    }

    // Modo de teste / Demonstração
    if (env.allowOfflineDemo) {
      const isInitialAdmin = env.isMasterAdmin(cleanEmail);

      const mockUser = {
        uid: 'demo-reg-' + Date.now(),
        email: cleanEmail,
        displayName: cleanName,
        role: isInitialAdmin ? 'Administrador' : 'Operador PDV',
        status: isInitialAdmin ? 'ativo' : 'pendente',
        tenantId: isInitialAdmin ? 'acai-da-serra-matriz' : null,
        tenantName: isInitialAdmin ? 'Açaí da Serra - Matriz' : null,
        provider: 'demo-local'
      };

      this.currentUser = mockUser;
      this.saveLocalSession(mockUser);
      this.notifyListeners(mockUser);
      return mockUser;
    }

    throw new Error('Serviço de autenticação indisponível no momento.');
  }

  /**
   * Realiza login / cadastro via Google (OAuth Popup)
   */
  async loginWithGoogle() {
    if (firebaseAuth && googleProvider) {
      try {
        const result = await signInWithPopup(firebaseAuth, googleProvider);
        const user = result.user;
        await this.handleUserAuthenticated(user);
        return this.currentUser;
      } catch (error) {
        throw new Error(this.getFriendlyErrorMessage(error.code || error.message));
      }
    }

    // Modo de teste / Demonstração
    if (env.allowOfflineDemo) {
      const mockGoogleUser = {
        uid: 'demo-google-' + Date.now(),
        email: 'usuario.google@orvixpdv.com',
        displayName: 'Operador Google (Demo)',
        photoURL: null,
        role: 'Operador PDV',
        status: 'pendente',
        tenantId: null,
        tenantName: null,
        provider: 'google-demo'
      };

      this.currentUser = mockGoogleUser;
      this.saveLocalSession(mockGoogleUser);
      this.notifyListeners(mockGoogleUser);
      return mockGoogleUser;
    }

    throw new Error('Serviço Google Auth indisponível.');
  }

  /**
   * Encerra a sessão
   */
  async logout() {
    if (firebaseAuth && (this.currentUser?.provider === 'firebase' || this.currentUser?.provider === 'google.com')) {
      try {
        await firebaseSignOut(firebaseAuth);
      } catch (error) {
        console.warn('Erro ao deslogar do Firebase:', error);
      }
    }
    this.currentUser = null;
    this.clearLocalSession();
    this.notifyListeners(null);
  }

  /**
   * Envia e-mail de redefinição de senha
   */
  async sendPasswordReset(email) {
    const cleanEmail = email ? email.trim() : '';
    if (!cleanEmail) {
      throw new Error('Informe o e-mail cadastrado para redefinir a senha.');
    }

    if (firebaseAuth) {
      try {
        await firebaseSendPasswordResetEmail(firebaseAuth, cleanEmail);
        return 'Link de redefinição de senha enviado para o seu e-mail.';
      } catch (error) {
        throw new Error(this.getFriendlyErrorMessage(error.code || error.message));
      }
    }

    if (env.allowOfflineDemo) {
      return 'Modo de Testes: E-mail de redefinição simulado com sucesso para ' + cleanEmail;
    }

    throw new Error('Serviço de recuperação de senha indisponível.');
  }

  /**
   * Traduz códigos de erro do Firebase para mensagens amigáveis em Português
   */
  getFriendlyErrorMessage(code) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'E-mail ou senha incorretos. Verifique suas credenciais.';
      case 'auth/invalid-email':
        return 'O formato do e-mail digitado é inválido.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Faça login ou use a opção "Esqueceu a senha".';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Ela deve conter pelo menos 6 caracteres.';
      case 'auth/user-disabled':
        return 'Esta conta de usuário foi desativada pelo administrador.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.';
      case 'auth/network-request-failed':
        return 'Falha de conexão com o servidor. Verifique sua conexão com a internet.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação do Google foi fechada antes de concluir.';
      case 'auth/popup-blocked':
        return 'A janela pop-up do Google foi bloqueada pelo navegador. Permita pop-ups para continuar.';
      case 'auth/cancelled-popup-request':
        return 'Solicitação de login com Google cancelada.';
      case 'auth/account-exists-with-different-credential':
        return 'Já existe uma conta cadastrada com este e-mail usando outro método de login.';
      case 'auth/operation-not-allowed':
        return 'Este método de autenticação não está habilitado no Firebase Console. Ative E-mail/Senha e Google nas configurações de Auth do Firebase.';
      case 'auth/unauthorized-domain':
        return 'Domínio não autorizado para autenticação no Firebase. Adicione localhost ou seu domínio no Firebase Console.';
      default:
        return code || 'Ocorreu um erro ao processar a autenticação. Tente novamente.';
    }
  }
}

export const authService = new AuthService();
