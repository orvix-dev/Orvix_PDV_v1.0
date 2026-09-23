/**
 * PinModal.js — Modal tátil moderno para autenticação e confirmação por PIN
 */

export class PinModalComponent {
  constructor() {
    this.modalEl = null;
    this.currentPin = '';
    this.resolvePromise = null;
    this.options = {};
  }

  mount() {
    if (document.getElementById('pin-auth-modal')) {
      this.modalEl = document.getElementById('pin-auth-modal');
      return;
    }

    const html = `
      <div class="modal-backdrop pin-modal-backdrop" id="pin-auth-modal" style="display: none; z-index: 10050;">
        <div class="modal-card pin-modal-card">
          <div class="pin-modal-header">
            <div class="pin-header-icon-box">
              <i data-lucide="shield-check" id="pin-modal-icon"></i>
            </div>
            <div>
              <h3 class="pin-modal-title" id="pin-modal-title">Identificação por PIN</h3>
              <p class="pin-modal-subtitle" id="pin-modal-desc">Digite seu PIN de 4 dígitos para continuar</p>
            </div>
            <button type="button" class="pin-modal-close" id="btn-close-pin-modal" aria-label="Fechar">
              <i data-lucide="x"></i>
            </button>
          </div>

          <div class="pin-modal-body">
            <!-- Operador Alvo (opcional) -->
            <div class="pin-target-operator" id="pin-target-operator" style="display: none;">
              <div class="pin-target-avatar" id="pin-target-avatar">OP</div>
              <div class="pin-target-details">
                <span class="pin-target-name" id="pin-target-name">Operador</span>
                <span class="pin-target-role" id="pin-target-role">Caixa</span>
              </div>
            </div>

            <!-- Dots Visuais do PIN -->
            <div class="pin-dots-display" id="pin-dots-container">
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
              <span class="pin-dot"></span>
            </div>

            <!-- Mensagem de Erro -->
            <div class="pin-error-alert" id="pin-error-msg" style="display: none;">
              <i data-lucide="alert-circle"></i>
              <span id="pin-error-text">PIN incorreto</span>
            </div>

            <!-- Teclado Numérico Virtual Tátil -->
            <div class="pin-keypad-grid">
              <button type="button" class="pin-key-btn" data-key="1">1</button>
              <button type="button" class="pin-key-btn" data-key="2">2</button>
              <button type="button" class="pin-key-btn" data-key="3">3</button>
              <button type="button" class="pin-key-btn" data-key="4">4</button>
              <button type="button" class="pin-key-btn" data-key="5">5</button>
              <button type="button" class="pin-key-btn" data-key="6">6</button>
              <button type="button" class="pin-key-btn" data-key="7">7</button>
              <button type="button" class="pin-key-btn" data-key="8">8</button>
              <button type="button" class="pin-key-btn" data-key="9">9</button>
              <button type="button" class="pin-key-btn pin-key-action pin-key-clear" id="btn-pin-clear" title="Limpar">
                <i data-lucide="rotate-ccw"></i>
              </button>
              <button type="button" class="pin-key-btn" data-key="0">0</button>
              <button type="button" class="pin-key-btn pin-key-action pin-key-backspace" id="btn-pin-backspace" title="Apagar">
                <i data-lucide="delete"></i>
              </button>
            </div>
          </div>

          <div class="pin-modal-footer">
            <button type="button" class="touch-btn btn-secondary" id="btn-pin-cancel">
              Cancelar
            </button>
            <button type="button" class="touch-btn btn-primary" id="btn-pin-confirm">
              <i data-lucide="check"></i>
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.modalEl = document.getElementById('pin-auth-modal');
    this.bindEvents();

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  bindEvents() {
    if (!this.modalEl) return;

    // Teclas numéricas virtuais
    this.modalEl.querySelectorAll('.pin-key-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const num = btn.getAttribute('data-key');
        this.appendDigit(num);
      });
    });

    // Tecla Limpar
    this.modalEl.querySelector('#btn-pin-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearPin();
    });

    // Tecla Backspace
    this.modalEl.querySelector('#btn-pin-backspace')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.removeDigit();
    });

    // Botão Confirmar
    this.modalEl.querySelector('#btn-pin-confirm')?.addEventListener('click', () => {
      this.handleConfirm();
    });

    // Botões Cancelar / Fechar
    this.modalEl.querySelector('#btn-pin-cancel')?.addEventListener('click', () => {
      this.handleCancel();
    });
    this.modalEl.querySelector('#btn-close-pin-modal')?.addEventListener('click', () => {
      this.handleCancel();
    });

    // Fechar ao clicar no backdrop
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl && this.options.allowCancel !== false) {
        this.handleCancel();
      }
    });

    // Teclado físico
    window.addEventListener('keydown', (e) => {
      if (this.modalEl && this.modalEl.style.display !== 'none') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          this.appendDigit(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          this.removeDigit();
        } else if (e.key === 'Escape') {
          if (this.options.allowCancel !== false) {
            e.preventDefault();
            this.handleCancel();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.handleConfirm();
        }
      }
    });
  }

  /**
   * Abre o modal de PIN
   * @param {Object} options 
   * @returns {Promise<{ confirmed: boolean, pin: string }>}
   */
  prompt(options = {}) {
    this.options = {
      title: 'Identificação por PIN',
      desc: 'Digite seu PIN de 4 dígitos para continuar',
      icon: 'shield-check',
      employee: null,
      allowCancel: true,
      maxDigits: 4,
      ...options
    };

    this.currentPin = '';
    this.hideError();
    this.updateDots();

    // Atualiza Textos
    const titleEl = this.modalEl.querySelector('#pin-modal-title');
    const descEl = this.modalEl.querySelector('#pin-modal-desc');
    const operatorBox = this.modalEl.querySelector('#pin-target-operator');

    if (titleEl) titleEl.innerText = this.options.title;
    if (descEl) descEl.innerText = this.options.desc;

    // Se tiver operador selecionado, exibe banner
    if (this.options.employee) {
      const emp = this.options.employee;
      operatorBox.style.display = 'flex';
      const avatarEl = this.modalEl.querySelector('#pin-target-avatar');
      const nameEl = this.modalEl.querySelector('#pin-target-name');
      const roleEl = this.modalEl.querySelector('#pin-target-role');

      if (avatarEl) {
        avatarEl.innerText = emp.name.slice(0, 2).toUpperCase();
        avatarEl.style.background = emp.avatarColor || 'linear-gradient(135deg, #7c3aed, #ec4899)';
      }
      if (nameEl) nameEl.innerText = emp.name;
      if (roleEl) roleEl.innerText = emp.role;
    } else {
      operatorBox.style.display = 'none';
    }

    const cancelBtn = this.modalEl.querySelector('#btn-pin-cancel');
    const closeBtn = this.modalEl.querySelector('#btn-close-pin-modal');
    if (cancelBtn) cancelBtn.style.display = this.options.allowCancel === false ? 'none' : 'inline-flex';
    if (closeBtn) closeBtn.style.display = this.options.allowCancel === false ? 'none' : 'inline-flex';

    this.modalEl.style.display = 'flex';
    if (window.lucide) lucide.createIcons();

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  appendDigit(digit) {
    const max = this.options.maxDigits || 4;
    if (this.currentPin.length < max) {
      this.currentPin += String(digit);
      this.hideError();
      this.updateDots();

      // Se preencheu todos os dígitos, tenta auto-confirmar suavemente
      if (this.currentPin.length === max) {
        setTimeout(() => {
          this.handleConfirm();
        }, 150);
      }
    }
  }

  removeDigit() {
    if (this.currentPin.length > 0) {
      this.currentPin = this.currentPin.slice(0, -1);
      this.hideError();
      this.updateDots();
    }
  }

  clearPin() {
    this.currentPin = '';
    this.hideError();
    this.updateDots();
  }

  updateDots() {
    const dotsContainer = this.modalEl.querySelector('#pin-dots-container');
    if (!dotsContainer) return;

    const max = this.options.maxDigits || 4;
    let dotsHtml = '';
    for (let i = 0; i < max; i++) {
      const isFilled = i < this.currentPin.length;
      dotsHtml += `<span class="pin-dot ${isFilled ? 'filled' : ''}"></span>`;
    }
    dotsContainer.innerHTML = dotsHtml;
  }

  showError(message = 'PIN incorreto') {
    const errBox = this.modalEl.querySelector('#pin-error-msg');
    const errText = this.modalEl.querySelector('#pin-error-text');
    if (errBox && errText) {
      errText.innerText = message;
      errBox.style.display = 'flex';
    }

    const dotsContainer = this.modalEl.querySelector('#pin-dots-container');
    if (dotsContainer) {
      dotsContainer.classList.add('pin-shake');
      setTimeout(() => {
        dotsContainer.classList.remove('pin-shake');
        this.clearPin();
      }, 500);
    }
  }

  hideError() {
    const errBox = this.modalEl.querySelector('#pin-error-msg');
    if (errBox) errBox.style.display = 'none';
  }

  handleConfirm() {
    if (this.currentPin.length < 4) {
      this.showError('Digite o PIN de 4 dígitos');
      return;
    }

    // Se houver um callback de validação customizado nas opções
    if (typeof this.options.validate === 'function') {
      const isValid = this.options.validate(this.currentPin);
      if (!isValid) {
        this.showError('PIN incorreto. Tente novamente.');
        return;
      }
    }

    this.close();
    if (this.resolvePromise) {
      this.resolvePromise({
        confirmed: true,
        pin: this.currentPin,
        employee: this.options.employee || null
      });
    }
  }

  handleCancel() {
    this.close();
    if (this.resolvePromise) {
      this.resolvePromise({
        confirmed: false,
        pin: null,
        employee: null
      });
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
    this.currentPin = '';
  }
}

export const pinModal = new PinModalComponent();
