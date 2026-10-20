/**
 * ==========================================================================
 * ORVIX PDV — SESSION GATE (TELA DE CARREGAMENTO & ERROS DE SESSÃO)
 * ==========================================================================
 * Exibida logo após o login (e ao reabrir o sistema) enquanto a sessão e o
 * status da chave de licença são validados no servidor.
 *
 * Estados:
 *  - loading: etapas animadas + aviso de lentidão
 *  - error:   mensagem por tipo de erro, ações (logoff, suporte, recarregar,
 *             testar internet) e contagem regressiva para voltar ao login
 */

import { env } from '../../config/env.js';
import {
  SESSION_ERROR,
  LICENSE_ERROR_CODES,
  CONNECTIVITY_ERROR_CODES,
  sessionService
} from '../../services/session.service.js';

const STEPS = [
  { id: 'auth', label: 'Verificando sua conta', icon: 'user-check' },
  { id: 'tenants', label: 'Buscando estabelecimento', icon: 'store' },
  { id: 'license', label: 'Validando chave de licença', icon: 'key-round' },
  { id: 'ready', label: 'Abrindo o PDV', icon: 'rocket' }
];

const ERROR_COPY = {
  [SESSION_ERROR.LICENSE_INVALID]: {
    tone: 'danger',
    icon: 'key-round',
    badge: 'Chave Inválida',
    title: 'Chave de licença inválida',
    desc: 'A chave vinculada a este estabelecimento não foi encontrada ou foi revogada. Entre com outra conta ou fale com o suporte para regularizar o acesso.'
  },
  [SESSION_ERROR.LICENSE_EXPIRED]: {
    tone: 'warning',
    icon: 'calendar-x',
    badge: 'Licença Expirada',
    title: 'Sua licença expirou',
    desc: 'O período de uso deste estabelecimento chegou ao fim. Renove com o suporte ou entre com outra conta para continuar.'
  },
  [SESSION_ERROR.LICENSE_BLOCKED]: {
    tone: 'danger',
    icon: 'shield-x',
    badge: 'Licença Bloqueada',
    title: 'Acesso suspenso',
    desc: 'A licença deste estabelecimento foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.'
  },
  [SESSION_ERROR.AUTH_EXPIRED]: {
    tone: 'warning',
    icon: 'lock-keyhole',
    badge: 'Sessão Expirada',
    title: 'Sua sessão expirou',
    desc: 'Por segurança, faça login novamente para continuar usando o PDV.'
  },
  [SESSION_ERROR.TIMEOUT]: {
    tone: 'info',
    icon: 'hourglass',
    badge: 'Servidor Lento',
    title: 'O servidor demorou a responder',
    desc: 'Não conseguimos validar sua sessão a tempo. Recarregue e tente novamente, verifique sua internet ou fale com o suporte.'
  },
  [SESSION_ERROR.OFFLINE]: {
    tone: 'info',
    icon: 'wifi-off',
    badge: 'Sem Conexão',
    title: 'Você está sem internet',
    desc: 'Verifique o Wi-Fi ou cabo de rede. Assim que a conexão voltar, tentaremos novamente automaticamente.'
  },
  [SESSION_ERROR.SERVER]: {
    tone: 'info',
    icon: 'server-crash',
    badge: 'Falha no Servidor',
    title: 'Não foi possível validar sua sessão',
    desc: 'Ocorreu uma falha ao comunicar com o servidor. Tente novamente em instantes ou fale com o suporte.'
  }
};

export class SessionGateComponent {
  constructor() {
    this.overlay = null;
    this.state = 'hidden';
    this.slowTimer = null;
    this.countdownTimer = null;
    this.countdownLeft = 0;
    this.currentError = null;
    this.context = {};

    // Callbacks definidos pelo orquestrador (main.js)
    this.onRetry = null;
    this.onLogout = null;      // (auto:boolean, reasonText:string) => void
    this.onNewKey = null;

    this._onlineHandler = () => {
      if (this.state === 'error' && CONNECTIVITY_ERROR_CODES.includes(this.currentError?.code)) {
        this.onRetry?.();
      }
    };
  }

  mount() {
    this.render();
    this.cacheElements();
    this.bindEvents();
  }

  render() {
    if (document.getElementById('session-gate')) return;

    const stepsHtml = STEPS.map(s => `
      <li class="sg-step" data-step="${s.id}">
        <span class="sg-step-icon">
          <i data-lucide="${s.icon}" class="sg-step-glyph"></i>
          <span class="sg-step-spinner"></span>
          <i data-lucide="check" class="sg-step-check"></i>
        </span>
        <span class="sg-step-label">${s.label}</span>
      </li>
    `).join('');

    const template = `
      <div class="auth-overlay session-gate hidden" id="session-gate" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="sg-heading">
        <div class="auth-backdrop-mesh"></div>

        <div class="auth-card session-gate-card">
          <!-- ===== CARREGAMENTO ===== -->
          <section class="sg-view sg-loading-view" id="sg-loading-view">
            <div class="sg-orbit">
              <svg class="sg-orbit-ring" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <linearGradient id="sg-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#7c3aed"/>
                    <stop offset="100%" stop-color="#ec4899"/>
                  </linearGradient>
                </defs>
                <circle class="sg-orbit-track" cx="60" cy="60" r="54"/>
                <circle class="sg-orbit-arc" cx="60" cy="60" r="54"/>
              </svg>
              <div class="sg-orbit-logo">
                <img src="image/acai.png" alt="Orvix PDV" onerror="this.onerror=null;this.src='/image/acai.png';">
              </div>
            </div>

            <h2 class="auth-title sg-heading" id="sg-heading">Orvix <span>PDV</span></h2>
            <p class="sg-subtitle" id="sg-loading-subtitle">Preparando seu ambiente de vendas…</p>

            <ul class="sg-steps" id="sg-steps">${stepsHtml}</ul>

            <div class="sg-progress" aria-hidden="true">
              <div class="sg-progress-bar" id="sg-progress-bar"></div>
            </div>

            <div class="sg-slow-hint" id="sg-slow-hint">
              <i data-lucide="signal-low"></i>
              <span>O servidor está demorando mais que o normal…</span>
            </div>
          </section>

          <!-- ===== ERRO ===== -->
          <section class="sg-view sg-error-view hidden" id="sg-error-view">
            <div class="sg-error-icon" id="sg-error-icon"><i data-lucide="alert-triangle"></i></div>

            <div class="sg-badge" id="sg-error-badge">
              <span class="sg-badge-dot"></span>
              <span id="sg-error-badge-text">Erro</span>
            </div>

            <h2 class="sg-error-title" id="sg-error-title">Algo deu errado</h2>
            <p class="sg-error-desc" id="sg-error-desc"></p>

            <div class="sg-user-chip" id="sg-user-chip">
              <div class="sg-user-avatar" id="sg-user-avatar">OP</div>
              <div class="sg-user-info">
                <strong id="sg-user-name">Usuário</strong>
                <span id="sg-user-email"></span>
              </div>
            </div>

            <dl class="sg-meta" id="sg-meta"></dl>

            <div class="sg-net-result" id="sg-net-result" hidden></div>

            <div class="sg-actions" id="sg-actions"></div>

            <div class="sg-countdown" id="sg-countdown">
              <svg viewBox="0 0 36 36" class="sg-countdown-ring" aria-hidden="true">
                <circle class="sg-countdown-track" cx="18" cy="18" r="15.5"/>
                <circle class="sg-countdown-arc" id="sg-countdown-arc" cx="18" cy="18" r="15.5"/>
              </svg>
              <span>Retornando ao login em <strong id="sg-countdown-value">60s</strong></span>
            </div>
          </section>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', template);
  }

  cacheElements() {
    const $ = (id) => document.getElementById(id);
    this.overlay = $('session-gate');
    this.loadingView = $('sg-loading-view');
    this.errorView = $('sg-error-view');
    this.subtitle = $('sg-loading-subtitle');
    this.progressBar = $('sg-progress-bar');
    this.slowHint = $('sg-slow-hint');
    this.errorIcon = $('sg-error-icon');
    this.errorBadge = $('sg-error-badge');
    this.errorBadgeText = $('sg-error-badge-text');
    this.errorTitle = $('sg-error-title');
    this.errorDesc = $('sg-error-desc');
    this.userAvatar = $('sg-user-avatar');
    this.userName = $('sg-user-name');
    this.userEmail = $('sg-user-email');
    this.meta = $('sg-meta');
    this.netResult = $('sg-net-result');
    this.actions = $('sg-actions');
    this.countdownEl = $('sg-countdown');
    this.countdownValue = $('sg-countdown-value');
    this.countdownArc = $('sg-countdown-arc');
  }

  bindEvents() {
    this.actions?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      this.handleAction(btn.dataset.action, btn);
    });
    window.addEventListener('online', this._onlineHandler);
  }

  // =========================================================================
  // CARREGAMENTO
  // =========================================================================

  /**
   * Exibe a tela de carregamento.
   * @param {Object} opts
   * @param {string[]} opts.completed etapas já concluídas (ex: retomada após escolher loja)
   * @param {string} opts.subtitle texto auxiliar
   */
  showLoading({ completed = [], subtitle } = {}) {
    this.stopCountdown();
    this.clearSlowTimer();
    this.currentError = null;
    this.state = 'loading';

    this.loadingView?.classList.remove('hidden');
    this.errorView?.classList.add('hidden');
    this.slowHint?.classList.remove('show');
    if (this.subtitle) this.subtitle.textContent = subtitle || 'Preparando seu ambiente de vendas…';

    STEPS.forEach(s => this.setStep(s.id, completed.includes(s.id) ? 'done' : 'pending'));
    this.updateProgress();

    this.slowTimer = setTimeout(() => {
      if (this.state === 'loading') this.slowHint?.classList.add('show');
    }, env.session.slowHintMs);

    this.show();
  }

  setStep(stepId, status) {
    const el = this.overlay?.querySelector(`.sg-step[data-step="${stepId}"]`);
    if (!el) return;
    el.classList.remove('pending', 'active', 'done', 'error');
    el.classList.add(status);
    this.updateProgress();
  }

  updateProgress() {
    if (!this.progressBar || !this.overlay) return;
    const steps = [...this.overlay.querySelectorAll('.sg-step')];
    const done = steps.filter(s => s.classList.contains('done')).length;
    const active = steps.some(s => s.classList.contains('active')) ? 0.5 : 0;
    const pct = Math.min(100, ((done + active) / steps.length) * 100);
    this.progressBar.style.width = `${Math.max(6, pct)}%`;
  }

  /**
   * Finaliza o carregamento com sucesso (transição rápida para o PDV)
   */
  async complete() {
    STEPS.forEach(s => this.setStep(s.id, 'done'));
    this.clearSlowTimer();
    this.overlay?.classList.add('sg-success');
    await new Promise(r => setTimeout(r, 280));
    this.hide();
  }

  // =========================================================================
  // ERRO
  // =========================================================================

  /**
   * @param {SessionError} error
   * @param {Object} ctx { user, tenant }
   */
  showError(error, ctx = {}) {
    this.clearSlowTimer();
    this.state = 'error';
    this.currentError = error;
    this.context = ctx;

    const code = ERROR_COPY[error?.code] ? error.code : SESSION_ERROR.SERVER;
    const copy = ERROR_COPY[code];
    const isLicense = LICENSE_ERROR_CODES.includes(code);

    // Marca a etapa ativa como falha (para quem voltar ao carregamento)
    this.overlay?.querySelectorAll('.sg-step.active').forEach(el => {
      el.classList.remove('active');
      el.classList.add('error');
    });

    this.loadingView?.classList.add('hidden');
    this.errorView?.classList.remove('hidden');
    this.errorView?.setAttribute('data-tone', copy.tone);

    if (this.errorIcon) this.errorIcon.innerHTML = `<i data-lucide="${copy.icon}"></i>`;
    if (this.errorBadgeText) this.errorBadgeText.textContent = copy.badge;
    if (this.errorTitle) this.errorTitle.textContent = copy.title;
    if (this.errorDesc) this.errorDesc.textContent = copy.desc;

    this.renderUser(ctx.user);
    this.renderMeta(code, error, ctx);
    if (this.netResult) {
      this.netResult.hidden = true;
      this.netResult.innerHTML = '';
    }
    this.renderActions(isLicense, code);

    this.show();
    if (window.lucide) lucide.createIcons();
    this.startCountdown(env.session.errorAutoLogoutSeconds, copy.title);

    // Foco no botão principal para operação rápida via teclado
    setTimeout(() => this.actions?.querySelector('.sg-btn-primary')?.focus(), 50);
  }

  renderUser(user) {
    if (!user) {
      this.overlay?.querySelector('#sg-user-chip')?.setAttribute('hidden', '');
      return;
    }
    this.overlay?.querySelector('#sg-user-chip')?.removeAttribute('hidden');
    const name = user.displayName || (user.email || '').split('@')[0] || 'Usuário';
    const parts = name.split(/[\s@._-]+/).filter(Boolean);
    const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
    if (this.userAvatar) this.userAvatar.textContent = initials;
    if (this.userName) this.userName.textContent = name;
    if (this.userEmail) this.userEmail.textContent = user.email || '';
  }

  renderMeta(code, error, ctx) {
    if (!this.meta) return;
    const rows = [];
    const tenant = ctx.tenant || error?.details?.tenant;
    const key = error?.details?.key || tenant?.chaveLicenca;
    const expiresAt = error?.details?.expiresAt;

    if (tenant?.nome) rows.push(['Estabelecimento', tenant.nome]);
    if (key && LICENSE_ERROR_CODES.includes(code)) rows.push(['Chave', this.maskKey(key)]);
    if (expiresAt) rows.push(['Expirou em', new Date(expiresAt).toLocaleDateString('pt-BR')]);
    rows.push(['Código', `SG-${code.toUpperCase()}`]);

    this.meta.innerHTML = rows.map(([k, v]) => `
      <div class="sg-meta-row"><dt>${k}</dt><dd>${this.escape(v)}</dd></div>
    `).join('');
  }

  renderActions(isLicense, code) {
    if (!this.actions) return;
    const btn = (action, icon, label, variant = 'ghost') => `
      <button type="button" class="sg-btn sg-btn-${variant}" data-action="${action}" id="sg-action-${action}">
        <i data-lucide="${icon}"></i><span>${label}</span>
      </button>`;

    let html = '';
    if (isLicense) {
      html += btn('logout', 'log-out', 'Entrar com outra conta', 'primary');
      html += `<div class="sg-actions-row">
        ${btn('support', 'headset', 'Falar com o suporte')}
        ${code !== SESSION_ERROR.AUTH_EXPIRED ? btn('new-key', 'key-round', 'Tenho uma nova chave') : ''}
      </div>`;
    } else {
      html += btn('retry', 'refresh-cw', 'Tentar novamente', 'primary');
      html += `<div class="sg-actions-row">
        ${btn('reload', 'rotate-ccw', 'Recarregar página')}
        ${btn('test-net', 'wifi', 'Testar internet')}
      </div>`;
      html += `<div class="sg-actions-row">
        ${btn('support', 'headset', 'Falar com o suporte')}
        ${btn('logout', 'log-out', 'Sair da conta')}
      </div>`;
    }
    this.actions.innerHTML = html;
  }

  async handleAction(action, btn) {
    switch (action) {
      case 'retry':
        this.onRetry?.();
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'logout':
        this.stopCountdown();
        this.onLogout?.(false);
        break;
      case 'support':
        this.openSupport();
        break;
      case 'new-key':
        this.stopCountdown();
        this.onNewKey?.();
        break;
      case 'test-net':
        await this.runConnectionTest(btn);
        break;
    }
  }

  async runConnectionTest(btn) {
    if (!this.netResult) return;
    btn.disabled = true;
    btn.classList.add('loading');
    this.netResult.hidden = false;
    this.netResult.innerHTML = `<div class="sg-net-row"><span class="sg-step-spinner sg-inline-spinner"></span><span>Testando conexão…</span></div>`;

    const { internet, server } = await sessionService.testConnection();
    const row = (label, r) => `
      <div class="sg-net-row ${r.ok ? 'ok' : 'fail'}">
        <i data-lucide="${r.ok ? 'check-circle-2' : 'x-circle'}"></i>
        <span>${label}</span>
        <strong>${r.ok ? `${r.ms} ms` : 'Falhou'}</strong>
      </div>`;

    let hint = '';
    if (!internet.ok) hint = 'Sem acesso à internet. Verifique o Wi-Fi, cabo ou roteador.';
    else if (!server.ok) hint = 'Internet OK, mas o servidor não respondeu. Fale com o suporte se persistir.';
    else hint = 'Conexão OK! Toque em "Tentar novamente".';

    this.netResult.innerHTML = `
      ${row('Internet', internet)}
      ${row('Servidor Orvix', server)}
      <p class="sg-net-hint">${hint}</p>
    `;
    if (window.lucide) lucide.createIcons();
    btn.disabled = false;
    btn.classList.remove('loading');
  }

  openSupport() {
    const { user, tenant } = this.context || {};
    const code = this.currentError?.code || 'desconhecido';
    const lines = [
      'Olá, preciso de ajuda com o acesso ao Orvix PDV.',
      `Erro: SG-${code.toUpperCase()}`,
      user?.email ? `Conta: ${user.email}` : '',
      tenant?.nome ? `Estabelecimento: ${tenant.nome}` : '',
      `Data: ${new Date().toLocaleString('pt-BR')}`
    ].filter(Boolean).join('\n');

    const url = env.support.whatsapp
      ? `https://wa.me/${env.support.whatsapp}?text=${encodeURIComponent(lines)}`
      : `mailto:${env.support.email}?subject=${encodeURIComponent(`[Orvix PDV] Suporte - SG-${code.toUpperCase()}`)}&body=${encodeURIComponent(lines)}`;

    window.open(url, '_blank', 'noopener');
  }

  // =========================================================================
  // CONTAGEM REGRESSIVA (RETORNO AUTOMÁTICO AO LOGIN)
  // =========================================================================

  startCountdown(seconds, reason) {
    this.stopCountdown();
    if (!seconds || seconds <= 0) {
      this.countdownEl?.classList.add('hidden');
      return;
    }
    this.countdownEl?.classList.remove('hidden');
    this.countdownLeft = seconds;
    const circumference = 2 * Math.PI * 15.5;
    if (this.countdownArc) this.countdownArc.style.strokeDasharray = `${circumference}`;

    const tick = () => {
      if (this.countdownValue) this.countdownValue.textContent = `${this.countdownLeft}s`;
      if (this.countdownArc) {
        this.countdownArc.style.strokeDashoffset = `${circumference * (1 - this.countdownLeft / seconds)}`;
      }
      this.countdownEl?.classList.toggle('urgent', this.countdownLeft <= 10);

      if (this.countdownLeft <= 0) {
        this.stopCountdown();
        this.onLogout?.(true, reason);
        return;
      }
      this.countdownLeft -= 1;
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  clearSlowTimer() {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
  }

  // =========================================================================
  // VISIBILIDADE
  // =========================================================================

  show() {
    this.overlay?.classList.remove('hidden', 'sg-success');
    if (window.lucide) lucide.createIcons();
  }

  hide() {
    this.state = 'hidden';
    this.stopCountdown();
    this.clearSlowTimer();
    this.overlay?.classList.add('hidden');
  }

  isVisible() {
    return this.state !== 'hidden';
  }

  maskKey(key) {
    const k = String(key || '').trim();
    if (!k) return '';
    // Mostra apenas os primeiros 5 caracteres ("ORVIX") e mascara todo o código de ativação restante
    const prefix = k.slice(0, 5);
    const remaining = k.slice(5);
    const maskedRemaining = remaining.replace(/[A-Za-z0-9]/g, '•');
    return prefix + maskedRemaining;
  }

  escape(v) {
    return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
