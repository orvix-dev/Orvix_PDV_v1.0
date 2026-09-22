import { authService } from '../../services/auth.service.js';
import { confirmModal } from './ConfirmModal.js';
import { env } from '../../config/env.js';

export class LoginFormComponent {
  constructor() {
    this.currentMode = 'login'; // 'login' | 'register'
    this.overlay = null;
    
    // Tabs & Google
    this.tabLoginBtn = null;
    this.tabRegisterBtn = null;
    this.googleBtn = null;
    this.switchModeBtn = null;

    // Login Form Elements
    this.loginForm = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.rememberCheck = null;
    this.submitBtn = null;
    this.togglePwdBtn = null;
    this.forgotBtn = null;

    // Register Form Elements
    this.registerForm = null;
    this.regNameInput = null;
    this.regEmailInput = null;
    this.regPasswordInput = null;
    this.regConfirmPasswordInput = null;
    this.regSubmitBtn = null;
    this.regTogglePwdBtn = null;
    this.regToggleConfirmPwdBtn = null;

    // Feedback
    this.feedbackBox = null;

    // Reset Password Modal
    this.resetModal = null;
    this.resetEmailInput = null;
    this.resetSubmitBtn = null;
    this.resetCancelBtn = null;
    this.resetCloseBtn = null;
    this.resetFeedback = null;
  }

  mount() {
    this.render();
    this.cacheElements();
    this.bindEvents();
    this.initRememberedEmail();
  }

  render() {
    // Se o elemento já existir no DOM, não duplica
    if (document.getElementById('auth-overlay')) return;

    const hasFirebase = env.hasFirebaseCredentials();
    const envBadgeText = hasFirebase ? 'Firebase Conectado' : 'Ambiente de Testes / Demo Ativo';

    const googleSvgIcon = `
      <svg class="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    `;

    const template = `
      <div class="auth-overlay" id="auth-overlay">
        <div class="auth-backdrop-mesh"></div>

        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo-wrapper">
              <img src="/image/acai.png" alt="Açaí da Serra Logo">
            </div>
            <h1 class="auth-title">Orvix <span>PDV</span></h1>
            <p class="auth-subtitle">Açaí da Serra &bull; Ponto de Venda & Gestão</p>
            <div class="auth-env-badge">
              <span class="auth-env-dot"></span>
              <span id="auth-env-status">${envBadgeText}</span>
            </div>
          </div>

          <!-- Abas de Seleção de Modo -->
          <div class="auth-tabs" role="tablist">
            <button type="button" class="auth-tab-btn active" id="auth-tab-login" role="tab" aria-selected="true">
              <i data-lucide="log-in"></i>
              <span>Entrar</span>
            </button>
            <button type="button" class="auth-tab-btn" id="auth-tab-register" role="tab" aria-selected="false">
              <i data-lucide="user-plus"></i>
              <span>Cadastrar</span>
            </button>
          </div>

          <!-- Botão de Login com Google -->
          <div class="auth-social-section">
            <button type="button" class="auth-google-btn" id="auth-google-btn">
              ${googleSvgIcon}
              <span id="auth-google-btn-text">Continuar com o Google</span>
              <span class="auth-spinner auth-google-spinner"></span>
            </button>

            <div class="auth-divider">
              <span id="auth-divider-text">ou continue com e-mail</span>
            </div>
          </div>

          <!-- Feedback de Erro / Sucesso Compartilhado -->
          <div class="auth-feedback-box" id="auth-feedback"></div>

          <!-- FORMULÁRIO DE LOGIN -->
          <form class="auth-form auth-view-active" id="auth-login-form" autocomplete="on">
            <div class="auth-input-group">
              <label class="auth-label" for="auth-email">E-mail ou Usuário</label>
              <div class="auth-input-wrapper">
                <input 
                  type="email" 
                  id="auth-email" 
                  class="auth-input" 
                  placeholder="admin@orvix.com" 
                  required 
                  autocomplete="username"
                />
                <span class="auth-input-icon"><i data-lucide="mail"></i></span>
              </div>
            </div>

            <div class="auth-input-group">
              <div class="auth-label">
                <label for="auth-password">Senha de Acesso</label>
              </div>
              <div class="auth-input-wrapper">
                <input 
                  type="password" 
                  id="auth-password" 
                  class="auth-input" 
                  placeholder="••••••••" 
                  required 
                  autocomplete="current-password"
                />
                <span class="auth-input-icon"><i data-lucide="lock"></i></span>
                <button type="button" class="auth-toggle-pwd" id="auth-toggle-pwd" aria-label="Mostrar senha">
                  <i data-lucide="eye" id="auth-eye-icon"></i>
                </button>
              </div>
            </div>

            <div class="auth-options-row">
              <label class="auth-remember-label">
                <input type="checkbox" id="auth-remember-me" />
                <span>Lembrar meu e-mail</span>
              </label>
              <button type="button" class="auth-forgot-link" id="auth-forgot-btn">Esqueceu a senha?</button>
            </div>

            <button type="submit" class="auth-submit-btn" id="auth-submit-btn">
              <span class="auth-btn-text">Entrar no Sistema</span>
              <span class="auth-spinner"></span>
            </button>
          </form>

          <!-- FORMULÁRIO DE CADASTRO -->
          <form class="auth-form auth-view-hidden" id="auth-register-form" autocomplete="on">
            <div class="auth-input-group">
              <label class="auth-label" for="auth-reg-name">Nome Completo</label>
              <div class="auth-input-wrapper">
                <input 
                  type="text" 
                  id="auth-reg-name" 
                  class="auth-input" 
                  placeholder="Ex: Carlos Silva" 
                  required 
                  autocomplete="name"
                />
                <span class="auth-input-icon"><i data-lucide="user"></i></span>
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-label" for="auth-reg-email">E-mail de Acesso</label>
              <div class="auth-input-wrapper">
                <input 
                  type="email" 
                  id="auth-reg-email" 
                  class="auth-input" 
                  placeholder="seu-email@dominio.com" 
                  required 
                  autocomplete="email"
                />
                <span class="auth-input-icon"><i data-lucide="mail"></i></span>
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-label" for="auth-reg-password">Criar Senha</label>
              <div class="auth-input-wrapper">
                <input 
                  type="password" 
                  id="auth-reg-password" 
                  class="auth-input" 
                  placeholder="Mínimo 6 caracteres" 
                  required 
                  minlength="6"
                  autocomplete="new-password"
                />
                <span class="auth-input-icon"><i data-lucide="lock"></i></span>
                <button type="button" class="auth-toggle-pwd" id="auth-reg-toggle-pwd" aria-label="Mostrar senha">
                  <i data-lucide="eye"></i>
                </button>
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-label" for="auth-reg-confirm-password">Confirmar Senha</label>
              <div class="auth-input-wrapper">
                <input 
                  type="password" 
                  id="auth-reg-confirm-password" 
                  class="auth-input" 
                  placeholder="Repita a senha" 
                  required 
                  minlength="6"
                  autocomplete="new-password"
                />
                <span class="auth-input-icon"><i data-lucide="shield-check"></i></span>
                <button type="button" class="auth-toggle-pwd" id="auth-reg-toggle-confirm-pwd" aria-label="Mostrar senha">
                  <i data-lucide="eye"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="auth-submit-btn auth-reg-btn" id="auth-reg-submit-btn">
              <span class="auth-btn-text">Criar Minha Conta</span>
              <span class="auth-spinner"></span>
            </button>
          </form>

          <!-- Rodapé alternador de Modo -->
          <div class="auth-footer-toggle">
            <span id="auth-footer-text">Não possui uma conta?</span>
            <button type="button" class="auth-switch-mode-btn" id="auth-switch-mode-btn">Cadastre-se agora</button>
          </div>
        </div>

        <!-- Modal de Recuperação de Senha -->
        <div class="auth-modal-backdrop" id="auth-reset-modal">
          <div class="auth-modal-card">
            <div class="auth-modal-header">
              <h3 class="auth-modal-title">Redefinir Senha</h3>
              <button type="button" class="auth-modal-close-btn" id="auth-reset-close">
                <i data-lucide="x"></i>
              </button>
            </div>
            <p class="auth-modal-desc">
              Digite seu e-mail cadastrado para receber o link seguro de recuperação de senha.
            </p>
            <div class="auth-feedback-box" id="auth-reset-feedback"></div>
            <div class="auth-input-group" style="margin-top: 1rem;">
              <div class="auth-input-wrapper">
                <input 
                  type="email" 
                  id="auth-reset-email" 
                  class="auth-input" 
                  placeholder="seu-email@dominio.com" 
                />
                <span class="auth-input-icon"><i data-lucide="mail"></i></span>
              </div>
            </div>
            <div class="auth-modal-actions">
              <button type="button" class="auth-modal-btn-cancel" id="auth-reset-cancel">Cancelar</button>
              <button type="button" class="auth-modal-btn-send" id="auth-reset-send">Enviar Link</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', template);
  }

  cacheElements() {
    this.overlay = document.getElementById('auth-overlay');

    // Tabs & Google
    this.tabLoginBtn = document.getElementById('auth-tab-login');
    this.tabRegisterBtn = document.getElementById('auth-tab-register');
    this.googleBtn = document.getElementById('auth-google-btn');
    this.switchModeBtn = document.getElementById('auth-switch-mode-btn');

    // Login Form Elements
    this.loginForm = document.getElementById('auth-login-form');
    this.emailInput = document.getElementById('auth-email');
    this.passwordInput = document.getElementById('auth-password');
    this.rememberCheck = document.getElementById('auth-remember-me');
    this.submitBtn = document.getElementById('auth-submit-btn');
    this.forgotBtn = document.getElementById('auth-forgot-btn');
    this.togglePwdBtn = document.getElementById('auth-toggle-pwd');

    // Register Form Elements
    this.registerForm = document.getElementById('auth-register-form');
    this.regNameInput = document.getElementById('auth-reg-name');
    this.regEmailInput = document.getElementById('auth-reg-email');
    this.regPasswordInput = document.getElementById('auth-reg-password');
    this.regConfirmPasswordInput = document.getElementById('auth-reg-confirm-password');
    this.regSubmitBtn = document.getElementById('auth-reg-submit-btn');
    this.regTogglePwdBtn = document.getElementById('auth-reg-toggle-pwd');
    this.regToggleConfirmPwdBtn = document.getElementById('auth-reg-toggle-confirm-pwd');

    // Feedback
    this.feedbackBox = document.getElementById('auth-feedback');

    // Reset Modal
    this.resetModal = document.getElementById('auth-reset-modal');
    this.resetEmailInput = document.getElementById('auth-reset-email');
    this.resetSubmitBtn = document.getElementById('auth-reset-send');
    this.resetCancelBtn = document.getElementById('auth-reset-cancel');
    this.resetCloseBtn = document.getElementById('auth-reset-close');
    this.resetFeedback = document.getElementById('auth-reset-feedback');
  }

  bindEvents() {
    // Alternar Abas (Login / Cadastro)
    if (this.tabLoginBtn) {
      this.tabLoginBtn.addEventListener('click', () => this.setMode('login'));
    }
    if (this.tabRegisterBtn) {
      this.tabRegisterBtn.addEventListener('click', () => this.setMode('register'));
    }
    if (this.switchModeBtn) {
      this.switchModeBtn.addEventListener('click', () => {
        this.setMode(this.currentMode === 'login' ? 'register' : 'login');
      });
    }

    // Login com Google
    if (this.googleBtn) {
      this.googleBtn.addEventListener('click', async () => {
        await this.handleGoogleLogin();
      });
    }

    // Login Submit
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    // Register Submit
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegister();
      });
    }

    // Toggle Mostrar/Esconder Senha (Login)
    if (this.togglePwdBtn && this.passwordInput) {
      this.setupPasswordToggle(this.togglePwdBtn, this.passwordInput);
    }

    // Toggle Mostrar/Esconder Senha (Cadastro)
    if (this.regTogglePwdBtn && this.regPasswordInput) {
      this.setupPasswordToggle(this.regTogglePwdBtn, this.regPasswordInput);
    }
    if (this.regToggleConfirmPwdBtn && this.regConfirmPasswordInput) {
      this.setupPasswordToggle(this.regToggleConfirmPwdBtn, this.regConfirmPasswordInput);
    }

    // Modal de Esqueci a Senha
    if (this.forgotBtn) {
      this.forgotBtn.addEventListener('click', () => {
        this.resetModal.classList.add('show');
        this.resetEmailInput.value = this.emailInput.value || this.regEmailInput?.value || '';
        this.clearResetFeedback();
        if (window.lucide) lucide.createIcons();
      });
    }

    const closeResetModal = () => {
      this.resetModal.classList.remove('show');
      this.clearResetFeedback();
    };

    if (this.resetCancelBtn) this.resetCancelBtn.addEventListener('click', closeResetModal);
    if (this.resetCloseBtn) this.resetCloseBtn.addEventListener('click', closeResetModal);
    if (this.resetModal) {
      this.resetModal.addEventListener('click', (e) => {
        if (e.target === this.resetModal) closeResetModal();
      });
    }

    if (this.resetSubmitBtn) {
      this.resetSubmitBtn.addEventListener('click', async () => {
        await this.handlePasswordReset();
      });
    }

    // Escuta estado de autenticação
    authService.onAuthStateChanged((user) => {
      if (user) {
        this.hideOverlay();
        this.updateOperatorSidebar(user);
      } else {
        this.showOverlay();
      }
    });
  }

  setupPasswordToggle(btn, input) {
    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = btn.querySelector('i, svg');
      if (icon) {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    this.clearFeedback();

    const footerText = document.getElementById('auth-footer-text');
    const dividerText = document.getElementById('auth-divider-text');

    if (mode === 'login') {
      this.tabLoginBtn?.classList.add('active');
      this.tabLoginBtn?.setAttribute('aria-selected', 'true');
      this.tabRegisterBtn?.classList.remove('active');
      this.tabRegisterBtn?.setAttribute('aria-selected', 'false');

      this.loginForm?.classList.remove('auth-view-hidden');
      this.loginForm?.classList.add('auth-view-active');
      this.registerForm?.classList.add('auth-view-hidden');
      this.registerForm?.classList.remove('auth-view-active');

      if (footerText) footerText.innerText = 'Não possui uma conta?';
      if (this.switchModeBtn) this.switchModeBtn.innerText = 'Cadastre-se agora';
      if (dividerText) dividerText.innerText = 'ou entre com seu e-mail';
    } else {
      this.tabRegisterBtn?.classList.add('active');
      this.tabRegisterBtn?.setAttribute('aria-selected', 'true');
      this.tabLoginBtn?.classList.remove('active');
      this.tabLoginBtn?.setAttribute('aria-selected', 'false');

      this.registerForm?.classList.remove('auth-view-hidden');
      this.registerForm?.classList.add('auth-view-active');
      this.loginForm?.classList.add('auth-view-hidden');
      this.loginForm?.classList.remove('auth-view-active');

      if (footerText) footerText.innerText = 'Já possui uma conta?';
      if (this.switchModeBtn) this.switchModeBtn.innerText = 'Faça login aqui';
      if (dividerText) dividerText.innerText = 'ou cadastre-se com seu e-mail';
    }

    if (window.lucide) lucide.createIcons();
  }

  initRememberedEmail() {
    const saved = localStorage.getItem('orvix_remembered_email');
    if (saved && this.emailInput) {
      this.emailInput.value = saved;
      if (this.rememberCheck) this.rememberCheck.checked = true;
    }
  }

  showOverlay() {
    const appLayout = document.getElementById('app-layout');
    if (appLayout) appLayout.style.display = 'none';
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  hideOverlay() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }

  async handleLogin() {
    const email = this.emailInput.value;
    const password = this.passwordInput.value;

    this.showLoading(this.submitBtn, true);
    this.clearFeedback();

    try {
      await authService.login(email, password);

      if (this.rememberCheck?.checked) {
        localStorage.setItem('orvix_remembered_email', email);
      } else {
        localStorage.removeItem('orvix_remembered_email');
      }

      this.showFeedback('Login realizado com sucesso! Acessando...', 'success');
      setTimeout(() => {
        this.hideOverlay();
        if (this.passwordInput) this.passwordInput.value = '';
      }, 500);
    } catch (error) {
      this.showFeedback(error.message, 'error');
    } finally {
      this.showLoading(this.submitBtn, false);
    }
  }

  async handleRegister() {
    const name = this.regNameInput.value;
    const email = this.regEmailInput.value;
    const password = this.regPasswordInput.value;
    const confirmPassword = this.regConfirmPasswordInput.value;

    this.clearFeedback();

    if (password !== confirmPassword) {
      this.showFeedback('As senhas não coincidem. Verifique e tente novamente.', 'error');
      return;
    }

    if (password.length < 6) {
      this.showFeedback('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    this.showLoading(this.regSubmitBtn, true);

    try {
      await authService.register(name, email, password);
      this.showFeedback('Conta criada com sucesso! Acessando o sistema...', 'success');
      setTimeout(() => {
        this.hideOverlay();
        if (this.regPasswordInput) this.regPasswordInput.value = '';
        if (this.regConfirmPasswordInput) this.regConfirmPasswordInput.value = '';
      }, 600);
    } catch (error) {
      this.showFeedback(error.message, 'error');
    } finally {
      this.showLoading(this.regSubmitBtn, false);
    }
  }

  async handleGoogleLogin() {
    this.clearFeedback();
    this.showSocialLoading(true);

    try {
      await authService.loginWithGoogle();
      this.showFeedback('Autenticado com o Google com sucesso!', 'success');
      setTimeout(() => {
        this.hideOverlay();
      }, 500);
    } catch (error) {
      this.showFeedback(error.message, 'error');
    } finally {
      this.showSocialLoading(false);
    }
  }

  async handlePasswordReset() {
    const email = this.resetEmailInput.value;
    this.resetSubmitBtn.disabled = true;
    this.resetSubmitBtn.innerText = 'Enviando...';

    try {
      const msg = await authService.sendPasswordReset(email);
      this.showResetFeedback(msg, 'success');
      setTimeout(() => {
        this.resetModal.classList.remove('show');
      }, 2500);
    } catch (error) {
      this.showResetFeedback(error.message, 'error');
    } finally {
      this.resetSubmitBtn.disabled = false;
      this.resetSubmitBtn.innerText = 'Enviar Link';
    }
  }

  showLoading(btn, loading) {
    if (btn) {
      btn.disabled = loading;
      if (loading) {
        btn.classList.add('loading');
      } else {
        btn.classList.remove('loading');
      }
    }
  }

  showSocialLoading(loading) {
    if (this.googleBtn) {
      this.googleBtn.disabled = loading;
      if (loading) {
        this.googleBtn.classList.add('loading');
      } else {
        this.googleBtn.classList.remove('loading');
      }
    }
  }

  showFeedback(message, type = 'error') {
    if (!this.feedbackBox) return;
    this.feedbackBox.className = `auth-feedback-box show ${type}`;
    this.feedbackBox.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
      <span>${message}</span>
    `;
    if (window.lucide) lucide.createIcons();
  }

  clearFeedback() {
    if (this.feedbackBox) {
      this.feedbackBox.className = 'auth-feedback-box';
      this.feedbackBox.innerHTML = '';
    }
  }

  showResetFeedback(message, type = 'error') {
    if (!this.resetFeedback) return;
    this.resetFeedback.className = `auth-feedback-box show ${type}`;
    this.resetFeedback.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
      <span>${message}</span>
    `;
    if (window.lucide) lucide.createIcons();
  }

  clearResetFeedback() {
    if (this.resetFeedback) {
      this.resetFeedback.className = 'auth-feedback-box';
      this.resetFeedback.innerHTML = '';
    }
  }

  updateOperatorSidebar(user) {
    const nameEl = document.getElementById('sidebar-operator-name');
    const roleEl = document.getElementById('sidebar-operator-role');
    const initialsEl = document.getElementById('operator-initials');

    if (nameEl) nameEl.innerText = user.displayName || user.email;
    if (roleEl) roleEl.innerText = user.role || 'Operador PDV';
    if (initialsEl) initialsEl.innerText = authService.getUserInitials();

    // Garante que o botão de logout esteja no sidebar
    let logoutBtn = document.getElementById('operator-logout-btn');
    const profileContainer = document.querySelector('.operator-profile');
    if (!logoutBtn && profileContainer) {
      logoutBtn = document.createElement('button');
      logoutBtn.id = 'operator-logout-btn';
      logoutBtn.className = 'operator-logout-btn';
      logoutBtn.title = 'Sair do Sistema';
      logoutBtn.innerHTML = '<i data-lucide="log-out"></i>';
      logoutBtn.addEventListener('click', async () => {
        const confirmed = await confirmModal.show({
          title: 'Sair do Sistema',
          message: 'Deseja realmente encerrar sua sessão e sair do PDV?',
          confirmText: 'Sim, Sair',
          cancelText: 'Permanecer',
          type: 'warning',
          icon: 'log-out'
        });
        if (confirmed) {
          await authService.logout();
        }
      });
      profileContainer.appendChild(logoutBtn);
      if (window.lucide) lucide.createIcons();
    }
  }
}
