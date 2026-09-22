/**
 * ==========================================================================
 * ORVIX PDV — PENDING APPROVAL & LICENSE ACTIVATION COMPONENT
 * ==========================================================================
 * Tela de bloqueio e ativação por chave exibida para usuários cujo status
 * ainda está "pendente" ou "bloqueado".
 */

import { authService } from '../../services/auth.service.js';

export class PendingApprovalModalComponent {
  constructor() {
    this.overlay = null;
    this.keyInput = null;
    this.submitBtn = null;
    this.logoutBtn = null;
    this.feedbackBox = null;
    this.userNameEl = null;
    this.userEmailEl = null;
    this.statusBadgeEl = null;
    this.statusDescEl = null;
  }

  mount() {
    this.render();
    this.cacheElements();
    this.bindEvents();
  }

  render() {
    if (document.getElementById('auth-pending-overlay')) return;

    const template = `
      <div class="auth-overlay auth-pending-overlay hidden" id="auth-pending-overlay">
        <div class="auth-backdrop-mesh"></div>

        <div class="auth-card auth-pending-card">
          <!-- Header do Status -->
          <div class="auth-pending-header">
            <div class="auth-pending-icon-wrapper" id="auth-pending-icon-box">
              <i data-lucide="shield-alert" id="auth-pending-main-icon"></i>
            </div>
            
            <div class="auth-pending-badge" id="auth-pending-status-badge">
              <span class="auth-pending-dot"></span>
              <span id="auth-pending-status-text">Aguardando Autorização</span>
            </div>

            <h2 class="auth-title" style="font-size: 1.5rem; margin-top: 0.75rem;">Acesso ao <span>PDV</span></h2>
            
            <div class="auth-pending-user-box">
              <div class="auth-pending-user-avatar">
                <i data-lucide="user"></i>
              </div>
              <div class="auth-pending-user-info">
                <strong id="auth-pending-user-name">Usuário</strong>
                <span id="auth-pending-user-email">email@exemplo.com</span>
              </div>
            </div>

            <p class="auth-pending-desc" id="auth-pending-desc-text">
              Sua conta foi criada no sistema! Para iniciar o atendimento, seu acesso precisa ser autorizado pelo administrador da loja ou ativado com uma chave de convite.
            </p>
          </div>

          <!-- Caixa de Feedback -->
          <div class="auth-feedback-box" id="auth-pending-feedback"></div>

          <!-- Seção de Ativação por Chave / Código -->
          <div class="auth-pending-activation-section">
            <div class="auth-pending-activation-label">
              <i data-lucide="key-round"></i>
              <span>Possui uma Chave de Licença ou Código da Loja?</span>
            </div>

            <form id="auth-pending-key-form" class="auth-pending-form">
              <div class="auth-input-wrapper">
                <input 
                  type="text" 
                  id="auth-pending-key-input" 
                  class="auth-input auth-pending-input" 
                  placeholder="Ex: SERRA-8492 ou ORVIX-..." 
                  autocomplete="off"
                  spellcheck="false"
                  required
                />
                <span class="auth-input-icon"><i data-lucide="ticket"></i></span>
              </div>

              <button type="submit" class="auth-submit-btn auth-pending-submit-btn" id="auth-pending-submit-btn">
                <i data-lucide="check-circle-2"></i>
                <span class="auth-btn-text">Ativar Acesso Imediato</span>
                <span class="auth-spinner"></span>
              </button>
            </form>
          </div>

          <!-- Ações de Rodapé -->
          <div class="auth-pending-footer-actions">
            <button type="button" class="auth-pending-btn-logout" id="auth-pending-logout-btn">
              <i data-lucide="log-out"></i>
              <span>Entrar com outra conta</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', template);
  }

  cacheElements() {
    this.overlay = document.getElementById('auth-pending-overlay');
    this.keyInput = document.getElementById('auth-pending-key-input');
    this.submitBtn = document.getElementById('auth-pending-submit-btn');
    this.logoutBtn = document.getElementById('auth-pending-logout-btn');
    this.feedbackBox = document.getElementById('auth-pending-feedback');
    this.userNameEl = document.getElementById('auth-pending-user-name');
    this.userEmailEl = document.getElementById('auth-pending-user-email');
    this.statusBadgeEl = document.getElementById('auth-pending-status-text');
    this.statusDescEl = document.getElementById('auth-pending-desc-text');
  }

  bindEvents() {
    const keyForm = document.getElementById('auth-pending-key-form');
    if (keyForm) {
      keyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRedeemKey();
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', async () => {
        await authService.logout();
      });
    }

    // Monitora alterações no usuário
    authService.onAuthStateChanged((user) => {
      this.handleAuthState(user);
    });
  }

  handleAuthState(user) {
    if (!user) {
      this.hide();
      return;
    }

    if (user.status === 'pendente') {
      this.showPending(user);
    } else if (user.status === 'bloqueado') {
      this.showBlocked(user);
    } else {
      // Usuário ativo -> Esconde a tela de bloqueio
      this.hide();
    }
  }

  showPending(user) {
    if (this.userNameEl) this.userNameEl.innerText = user.displayName || user.email.split('@')[0];
    if (this.userEmailEl) this.userEmailEl.innerText = user.email;
    if (this.statusBadgeEl) this.statusBadgeEl.innerText = 'Aguardando Liberação de Acesso';
    if (this.statusDescEl) {
      this.statusDescEl.innerText = 'Sua conta foi registrada com sucesso! Para acessar o PDV, solicite a aprovação do administrador do estabelecimento ou insira o código da loja abaixo.';
    }

    const iconBox = document.getElementById('auth-pending-icon-box');
    if (iconBox) {
      iconBox.className = 'auth-pending-icon-wrapper pending';
      iconBox.innerHTML = '<i data-lucide="clock"></i>';
    }

    const badge = document.getElementById('auth-pending-status-badge');
    if (badge) badge.className = 'auth-pending-badge pending';

    this.show();
    if (window.lucide) lucide.createIcons();
  }

  showBlocked(user) {
    if (this.userNameEl) this.userNameEl.innerText = user.displayName || user.email;
    if (this.userEmailEl) this.userEmailEl.innerText = user.email;
    if (this.statusBadgeEl) this.statusBadgeEl.innerText = 'Acesso Suspenso';
    if (this.statusDescEl) {
      this.statusDescEl.innerText = 'Seu acesso a este estabelecimento foi temporariamente desativado pelo administrador. Contate o suporte ou insira uma nova chave de licença.';
    }

    const iconBox = document.getElementById('auth-pending-icon-box');
    if (iconBox) {
      iconBox.className = 'auth-pending-icon-wrapper blocked';
      iconBox.innerHTML = '<i data-lucide="shield-x"></i>';
    }

    const badge = document.getElementById('auth-pending-status-badge');
    if (badge) badge.className = 'auth-pending-badge blocked';

    this.show();
    if (window.lucide) lucide.createIcons();
  }

  showSuspended(title = 'Licença Suspensa', desc = 'A licença deste estabelecimento foi suspensa ou expirou.') {
    if (this.statusBadgeEl) this.statusBadgeEl.innerText = title;
    if (this.statusDescEl) this.statusDescEl.innerText = `${desc} Para reativar o sistema, insira uma nova chave de licença válida abaixo ou contate o suporte.`;

    const iconBox = document.getElementById('auth-pending-icon-box');
    if (iconBox) {
      iconBox.className = 'auth-pending-icon-wrapper blocked';
      iconBox.innerHTML = '<i data-lucide="shield-alert"></i>';
    }

    const badge = document.getElementById('auth-pending-status-badge');
    if (badge) badge.className = 'auth-pending-badge blocked';

    this.show();
    if (window.lucide) lucide.createIcons();
  }

  show() {
    const appLayout = document.getElementById('app-layout');
    if (appLayout) appLayout.style.display = 'none';
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    const user = authService.getCurrentUser();
    if (user && user.status === 'ativo') {
      const appLayout = document.getElementById('app-layout');
      if (appLayout) appLayout.style.display = 'flex';
    }
  }

  async handleRedeemKey() {
    const key = this.keyInput?.value;
    if (!key) return;

    this.showLoading(true);
    this.clearFeedback();

    try {
      const result = await authService.redeemAccessKey(key);
      this.showFeedback(result.message || 'Acesso liberado com sucesso!', 'success');
      
      setTimeout(() => {
        this.hide();
        if (this.keyInput) this.keyInput.value = '';
      }, 1000);
    } catch (error) {
      this.showFeedback(error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(loading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      if (loading) {
        this.submitBtn.classList.add('loading');
        this.submitBtn.innerHTML = '<span>Consultando chave... Verificando licença com segurança</span>';
      } else {
        this.submitBtn.classList.remove('loading');
        this.submitBtn.innerHTML = '<span>Ativar Acesso</span>';
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
}
