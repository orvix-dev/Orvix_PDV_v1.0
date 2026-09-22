/**
 * ==========================================================================
 * ORVIX PDV — MODERN CONFIRMATION & APPROVAL MODAL COMPONENT
 * ==========================================================================
 * Substitui os confirm() nativos do navegador por janelas de aprovação
 * modernas, animadas, responsivas e perfeitamente integradas ao design do Orvix.
 */

export class ConfirmModalComponent {
  constructor() {
    this.overlay = null;
    this.card = null;
    this.titleEl = null;
    this.messageEl = null;
    this.iconBadgeEl = null;
    this.confirmBtn = null;
    this.cancelBtn = null;
    this.closeBtn = null;
    this.confirmTextEl = null;
    this.actionIconWrapper = null;
    this.currentResolve = null;
    this.boundKeyDown = null;
  }

  mount() {
    if (document.getElementById('app-confirm-modal-backdrop')) {
      this.cacheElements();
      return;
    }
    this.render();
    this.cacheElements();
    this.bindEvents();
  }

  render() {
    const template = `
      <div class="confirm-modal-backdrop" id="app-confirm-modal-backdrop" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="confirm-modal-card confirm-type-danger" id="app-confirm-modal-card">
          <!-- Botão Fechar no Canto -->
          <button type="button" class="confirm-modal-close-btn" id="confirm-modal-close-btn" aria-label="Fechar">
            <i data-lucide="x"></i>
          </button>

          <!-- Ícone Central com Glow -->
          <div class="confirm-modal-icon-wrapper">
            <div class="confirm-modal-icon-glow"></div>
            <div class="confirm-modal-icon-badge" id="confirm-modal-icon-badge">
              <i data-lucide="alert-triangle" id="confirm-modal-icon"></i>
            </div>
          </div>

          <!-- Conteúdo -->
          <h3 class="confirm-modal-title" id="confirm-modal-title">Confirmar Ação</h3>
          <p class="confirm-modal-message" id="confirm-modal-message">Deseja realmente prosseguir?</p>

          <!-- Ações -->
          <div class="confirm-modal-actions">
            <button type="button" class="confirm-btn-cancel" id="confirm-modal-btn-cancel">
              <span>Cancelar</span>
            </button>
            <button type="button" class="confirm-btn-confirm confirm-btn-danger" id="confirm-modal-btn-confirm">
              <span id="confirm-modal-btn-icon-box"><i data-lucide="check"></i></span>
              <span id="confirm-modal-confirm-text">Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = template.trim();
    document.body.appendChild(wrapper.firstChild);
  }

  cacheElements() {
    this.overlay = document.getElementById('app-confirm-modal-backdrop');
    this.card = document.getElementById('app-confirm-modal-card');
    this.titleEl = document.getElementById('confirm-modal-title');
    this.messageEl = document.getElementById('confirm-modal-message');
    this.iconBadgeEl = document.getElementById('confirm-modal-icon-badge');
    this.confirmBtn = document.getElementById('confirm-modal-btn-confirm');
    this.cancelBtn = document.getElementById('confirm-modal-btn-cancel');
    this.closeBtn = document.getElementById('confirm-modal-close-btn');
    this.confirmTextEl = document.getElementById('confirm-modal-confirm-text');
    this.actionIconWrapper = document.getElementById('confirm-modal-btn-icon-box');
  }

  bindEvents() {
    if (!this.overlay) return;

    this.confirmBtn?.addEventListener('click', () => this.handleResolve(true));
    this.cancelBtn?.addEventListener('click', () => this.handleResolve(false));
    this.closeBtn?.addEventListener('click', () => this.handleResolve(false));

    // Fechar ao clicar fora do card (no backdrop)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleResolve(false);
      }
    });

    // Teclado: Escape fecha, Enter confirma
    this.boundKeyDown = (e) => {
      if (!this.overlay || !this.overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.handleResolve(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.handleResolve(true);
      }
    };
    document.addEventListener('keydown', this.boundKeyDown);
  }

  handleResolve(result) {
    if (this.currentResolve) {
      const resolve = this.currentResolve;
      this.currentResolve = null;
      this.hide();
      resolve(result);
    } else {
      this.hide();
    }
  }

  show({
    title = 'Confirmar Ação',
    message = 'Deseja realmente prosseguir com esta ação?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger', // 'danger' | 'warning' | 'info' | 'primary' | 'success'
    icon = null,
    confirmIcon = 'check'
  } = {}) {
    this.mount();

    // Escolhe ícone padrão conforme semântica
    if (!icon) {
      if (type === 'danger') icon = 'trash-2';
      else if (type === 'warning') icon = 'alert-triangle';
      else if (type === 'success') icon = 'check-circle-2';
      else icon = 'help-circle';
    }

    // Configura estilos semânticos no Card
    this.card.className = `confirm-modal-card confirm-type-${type}`;

    // Textos
    this.titleEl.innerText = title;
    this.messageEl.innerHTML = message;
    this.confirmTextEl.innerText = confirmText;
    
    const cancelSpan = this.cancelBtn?.querySelector('span');
    if (cancelSpan) cancelSpan.innerText = cancelText;

    // Botão de confirmação
    this.confirmBtn.className = `confirm-btn-confirm confirm-btn-${type}`;

    // Ícones dinâmicos
    this.iconBadgeEl.innerHTML = `<i data-lucide="${icon}"></i>`;
    if (this.actionIconWrapper) {
      this.actionIconWrapper.innerHTML = `<i data-lucide="${confirmIcon}"></i>`;
    }

    if (window.lucide) {
      lucide.createIcons();
    }

    // Exibe modal com transição suave
    this.overlay.classList.add('active');
    this.overlay.setAttribute('aria-hidden', 'false');

    // Foco de acessibilidade
    setTimeout(() => {
      if (type === 'danger') {
        this.cancelBtn?.focus();
      } else {
        this.confirmBtn?.focus();
      }
    }, 60);

    return new Promise((resolve) => {
      this.currentResolve = resolve;
    });
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
  }
}

export const confirmModal = new ConfirmModalComponent();

// Helper global para facilidade de uso em qualquer lugar da aplicação
if (typeof window !== 'undefined') {
  window.confirmModal = (options) => {
    if (typeof options === 'string') {
      return confirmModal.show({
        title: 'Confirmar Ação',
        message: options,
        confirmText: 'Sim, Confirmar',
        cancelText: 'Cancelar',
        type: 'warning',
        icon: 'help-circle'
      });
    }
    return confirmModal.show(options);
  };
}
