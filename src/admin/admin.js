/**
 * ==========================================================================
 * ORVIX MASTER — PAINEL GESTOR DE LICENÇAS (APPLICATION CONTROLLER)
 * ==========================================================================
 */

import { licenseService } from '../services/license.service.js';
import { authService } from '../services/auth.service.js';
import { confirmModal } from '../components/organisms/ConfirmModal.js';
import { env } from '../config/env.js';

const MASTER_SESSION_KEY = 'orvix_master_auth_active';

class MasterAdminApp {
  constructor() {
    this.licenses = [];
    this.filteredLicenses = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.unsubscribeLicenses = null;

    this.DOM = {};
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.checkInitialAuth();

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  cacheDOM() {
    this.DOM = {
      // Auth Overlay
      authOverlay: document.getElementById('master-auth-overlay'),
      appLayout: document.getElementById('master-app-layout'),
      tabPinBtn: document.getElementById('tab-pin-btn'),
      tabEmailBtn: document.getElementById('tab-email-btn'),
      pinForm: document.getElementById('master-pin-form'),
      pinInput: document.getElementById('master-pin-input'),
      emailSection: document.getElementById('master-email-section'),
      emailForm: document.getElementById('master-email-form'),
      emailInput: document.getElementById('master-email-input'),
      passwordInput: document.getElementById('master-password-input'),
      googleLoginBtn: document.getElementById('btn-google-login'),
      logoutBtn: document.getElementById('btn-master-logout'),

      // Metrics
      metricActiveLicenses: document.getElementById('metric-active-licenses'),
      metricTotalTenants: document.getElementById('metric-total-tenants'),
      metricTotalClients: document.getElementById('metric-total-clients'),
      metricBlockedLicenses: document.getElementById('metric-blocked-licenses'),

      // Search & Filters
      searchInput: document.getElementById('license-search-input'),
      filterPillsContainer: document.getElementById('filter-pills-container'),
      feedContainer: document.getElementById('licenses-feed-container'),

      // Modal Nova Chave
      openNewLicenseModalBtn: document.getElementById('open-new-license-modal'),
      fabNewLicenseBtn: document.getElementById('fab-new-license'),
      newLicenseModal: document.getElementById('new-license-modal'),
      closeNewLicenseModalBtn: document.getElementById('close-new-license-modal'),
      cancelNewLicenseBtn: document.getElementById('btn-cancel-new-license'),
      newLicenseForm: document.getElementById('new-license-form'),
      newTenantName: document.getElementById('new-tenant-name'),
      newOwnerEmail: document.getElementById('new-owner-email'),
      newOwnerName: document.getElementById('new-owner-name'),
      newOwnerPhone: document.getElementById('new-owner-phone'),
      newLicensePlan: document.getElementById('new-license-plan'),
      newLicenseKey: document.getElementById('new-license-key'),
      newLicenseDuration: document.getElementById('new-license-duration'),
      newLicenseDevices: document.getElementById('new-license-devices'),
      newLicenseNotes: document.getElementById('new-license-notes'),
      btnGenerateKeyPreview: document.getElementById('btn-generate-key-preview'),

      // Toast Container
      toastContainer: document.getElementById('master-toast-container')
    };
  }

  bindEvents() {
    // 1. Alternância de abas de login Master
    this.DOM.tabPinBtn?.addEventListener('click', () => {
      this.DOM.tabPinBtn.classList.add('active');
      this.DOM.tabEmailBtn.classList.remove('active');
      this.DOM.pinForm.classList.add('active');
      this.DOM.emailSection.classList.remove('active');
    });

    this.DOM.tabEmailBtn?.addEventListener('click', () => {
      this.DOM.tabEmailBtn.classList.add('active');
      this.DOM.tabPinBtn.classList.remove('active');
      this.DOM.emailSection.classList.add('active');
      this.DOM.pinForm.classList.remove('active');
    });

    // 2. Login via PIN
    this.DOM.pinForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = this.DOM.pinInput.value;
      if (env.isMasterAdmin('', pin)) {
        this.grantMasterAccess('PIN Master');
      } else {
        this.showToast('PIN Master incorreto.', 'error');
        this.DOM.pinInput.value = '';
      }
    });

    // 3. Login com Google
    this.DOM.googleLoginBtn?.addEventListener('click', async () => {
      try {
        const user = await authService.signInWithGoogle();
        if (env.isMasterAdmin(user.email)) {
          this.grantMasterAccess(user.email);
        } else {
          await authService.signOut();
          this.showToast(`Acesso negado: o e-mail "${user.email}" não é administrador master.`, 'error');
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 4. Login com E-mail e Senha
    this.DOM.emailForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this.DOM.emailInput.value;
      const pass = this.DOM.passwordInput.value;
      try {
        const user = await authService.signInWithEmail(email, pass);
        if (env.isMasterAdmin(user.email)) {
          this.grantMasterAccess(user.email);
        } else {
          await authService.signOut();
          this.showToast(`Acesso negado: "${user.email}" não possui permissão master.`, 'error');
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 5. Logout Master
    this.DOM.logoutBtn?.addEventListener('click', async () => {
      const confirmed = await confirmModal.show({
        title: 'Bloquear Painel Master',
        message: 'Deseja realmente bloquear a sessão do painel administrativo master?',
        confirmText: 'Sim, Bloquear',
        cancelText: 'Permanecer',
        type: 'warning',
        icon: 'lock'
      });
      if (confirmed) {
        this.revokeMasterAccess();
      }
    });

    // 6. Busca em tempo real
    this.DOM.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').toLowerCase().trim();
      this.applyFilterAndRender();
    });

    // 7. Pílulas de filtro de status
    this.DOM.filterPillsContainer?.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (pill) {
        this.DOM.filterPillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.dataset.filter || 'all';
        this.applyFilterAndRender();
      }
    });

    // 8. Modal Nova Chave: Abertura e Fechamento
    const openModal = () => {
      this.DOM.newTenantName.value = '';
      this.DOM.newOwnerEmail.value = '';
      this.DOM.newOwnerName.value = '';
      this.DOM.newOwnerPhone.value = '';
      this.DOM.newLicensePlan.value = 'Mensal Pro';
      this.DOM.newLicenseDuration.value = '30';
      this.DOM.newLicenseDevices.value = '3';
      this.DOM.newLicenseNotes.value = '';
      this.DOM.newLicenseKey.value = licenseService.generateRandomLicenseKey('LOJA');
      this.DOM.newLicenseModal.style.display = 'flex';
      this.DOM.newTenantName.focus();
    };

    const closeModal = () => {
      this.DOM.newLicenseModal.style.display = 'none';
    };

    this.DOM.openNewLicenseModalBtn?.addEventListener('click', openModal);
    this.DOM.fabNewLicenseBtn?.addEventListener('click', openModal);
    this.DOM.closeNewLicenseModalBtn?.addEventListener('click', closeModal);
    this.DOM.cancelNewLicenseBtn?.addEventListener('click', closeModal);
    this.DOM.newLicenseModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.newLicenseModal) closeModal();
    });

    // Gerador de chave aleatória no formulário
    this.DOM.btnGenerateKeyPreview?.addEventListener('click', () => {
      const name = this.DOM.newTenantName.value;
      this.DOM.newLicenseKey.value = licenseService.generateRandomLicenseKey(name);
    });

    // Ajuste de duração conforme o plano
    this.DOM.newLicensePlan?.addEventListener('change', (e) => {
      const plan = e.target.value;
      const durationInput = this.DOM.newLicenseDuration;
      if (plan.includes('Mensal')) durationInput.value = '30';
      else if (plan.includes('Trimestral')) durationInput.value = '90';
      else if (plan.includes('Semestral')) durationInput.value = '180';
      else if (plan.includes('Anual')) durationInput.value = '365';
      else if (plan.includes('Vitalício')) durationInput.value = '3650';
      else if (plan.includes('Trial') || plan.includes('Teste')) durationInput.value = '7';
    });

    // 9. Submissão do Formulário de Nova Chave
    this.DOM.newLicenseForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tenantName = this.DOM.newTenantName.value;
      const ownerEmail = this.DOM.newOwnerEmail.value;
      const ownerName = this.DOM.newOwnerName.value;
      const ownerPhone = this.DOM.newOwnerPhone.value;
      const plan = this.DOM.newLicensePlan.value;
      const key = this.DOM.newLicenseKey.value;
      const durationDays = parseInt(this.DOM.newLicenseDuration.value, 10) || 30;
      const maxDevices = parseInt(this.DOM.newLicenseDevices.value, 10) || 3;
      const notes = this.DOM.newLicenseNotes.value;

      try {
        const created = await licenseService.createLicenseKey({
          key,
          tenantName,
          ownerEmail,
          ownerName,
          ownerPhone,
          plan,
          durationDays,
          maxDevices,
          notes
        });

        closeModal();
        this.showToast(`Chave "${created.key}" criada com sucesso para "${created.tenantName}"!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 10. Delegação de Ações dos Cards de Licença
    this.DOM.feedContainer?.addEventListener('click', async (e) => {
      // Copiar Chave
      const copyBtn = e.target.closest('.btn-copy-key');
      if (copyBtn) {
        const key = copyBtn.dataset.key;
        navigator.clipboard.writeText(key).then(() => {
          this.showToast(`Chave "${key}" copiada!`, 'success');
        }).catch(() => {
          this.showToast('Erro ao copiar chave.', 'error');
        });
        return;
      }

      // Enviar via WhatsApp
      const waBtn = e.target.closest('.btn-whatsapp');
      if (waBtn) {
        const key = waBtn.dataset.key;
        const phone = (waBtn.dataset.phone || '').replace(/[^0-9]/g, '');
        const store = waBtn.dataset.store || 'seu estabelecimento';
        const msg = encodeURIComponent(
          `Olá! 👋 Segue sua chave de ativação do *Orvix PDV* para a loja *${store}*:\n\n` +
          `🔑 *Chave de Acesso:* \`${key}\`\n\n` +
          `Para ativar, abra o sistema no caixa e informe a chave acima. Qualquer dúvida estamos à disposição!`
        );
        const waUrl = phone ? `https://wa.me/55${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
        window.open(waUrl, '_blank');
        return;
      }

      // Alternar Status: Ativar / Bloquear
      const toggleBtn = e.target.closest('.btn-toggle-status');
      if (toggleBtn) {
        const key = toggleBtn.dataset.key;
        const currentStatus = toggleBtn.dataset.status;
        const newStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
        const actionLabel = newStatus === 'bloqueado' ? 'bloquear o acesso de' : 'reativar a licença de';
        const modalType = newStatus === 'bloqueado' ? 'warning' : 'info';
        const modalIcon = newStatus === 'bloqueado' ? 'shield-alert' : 'shield-check';

        const confirmed = await confirmModal.show({
          title: newStatus === 'bloqueado' ? 'Bloquear Licença' : 'Reativar Licença',
          message: `Deseja realmente ${actionLabel} <strong>"${key}"</strong>?`,
          confirmText: newStatus === 'bloqueado' ? 'Sim, Bloquear' : 'Sim, Reativar',
          cancelText: 'Cancelar',
          type: modalType,
          icon: modalIcon
        });

        if (confirmed) {
          try {
            await licenseService.updateLicenseStatus(key, newStatus);
            this.showToast(`Chave "${key}" agora está ${newStatus.toUpperCase()}!`, 'success');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }

      // Renovar Licença (+30 Dias)
      const renewBtn = e.target.closest('.btn-renew');
      if (renewBtn) {
        const key = renewBtn.dataset.key;
        const originalHtml = renewBtn.innerHTML;
        renewBtn.disabled = true;
        renewBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Renovando...</span>';
        if (window.lucide) lucide.createIcons();

        try {
          const newExpiry = await licenseService.renewLicense(key, 30);
          const dateStr = new Date(newExpiry).toLocaleDateString('pt-BR');
          
          // Atualiza o registro em memória imediatamente
          const lic = this.licenses.find(l => l.key === key);
          if (lic) {
            lic.expiresAt = newExpiry;
            if (lic.status === 'expirado') lic.status = 'ativo';
          }
          this.updateMetrics();
          this.applyFilterAndRender();
          this.showToast(`Licença "${key}" renovada com sucesso até ${dateStr}!`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
          renewBtn.disabled = false;
          renewBtn.innerHTML = originalHtml;
          if (window.lucide) lucide.createIcons();
        }
        return;
      }

      // Adicionar Nova Loja / Filial para o mesmo cliente
      const addBranchBtn = e.target.closest('.btn-add-branch');
      if (addBranchBtn) {
        const email = addBranchBtn.dataset.email;
        const store = addBranchBtn.dataset.store;
        const owner = addBranchBtn.dataset.owner;
        const phone = addBranchBtn.dataset.phone;

        this.openAddBranchModal({ email, store, owner, phone });
        return;
      }

      // Excluir Chave
      const deleteBtn = e.target.closest('.btn-delete-key');
      if (deleteBtn) {
        const key = deleteBtn.dataset.key;
        const store = deleteBtn.dataset.store;
        const confirmed = await confirmModal.show({
          title: 'Excluir Licença Permanentemente',
          message: `Tem certeza de que deseja excluir permanentemente a chave <strong>"${key}" (${store})</strong>? O PDV desta loja perderá o acesso imediatamente.`,
          confirmText: 'Sim, Excluir Chave',
          cancelText: 'Cancelar',
          type: 'danger',
          icon: 'trash-2'
        });

        if (confirmed) {
          try {
            await licenseService.deleteLicenseKey(key);
            this.licenses = this.licenses.filter(l => l.key !== key);
            this.updateMetrics();
            this.applyFilterAndRender();
            this.showToast(`Chave "${key}" excluída com sucesso.`, 'info');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }
    });
  }

  checkInitialAuth() {
    const isAuth = localStorage.getItem(MASTER_SESSION_KEY);
    if (isAuth) {
      this.grantMasterAccess('Sessão Ativa', false);
    } else {
      this.DOM.authOverlay.style.display = 'flex';
      this.DOM.appLayout.style.display = 'none';
    }
  }

  grantMasterAccess(ident = '', showWelcomeToast = true) {
    localStorage.setItem(MASTER_SESSION_KEY, 'true');
    this.DOM.authOverlay.style.display = 'none';
    this.DOM.appLayout.style.display = 'flex';

    if (showWelcomeToast) {
      this.showToast(`Bem-vindo ao Painel Master (${ident})!`, 'success');
    }

    this.startListeningLicenses();
  }

  revokeMasterAccess() {
    localStorage.removeItem(MASTER_SESSION_KEY);
    if (this.unsubscribeLicenses) {
      this.unsubscribeLicenses();
      this.unsubscribeLicenses = null;
    }
    this.DOM.authOverlay.style.display = 'flex';
    this.DOM.appLayout.style.display = 'none';
  }

  startListeningLicenses() {
    if (this.unsubscribeLicenses) {
      this.unsubscribeLicenses();
    }

    this.unsubscribeLicenses = licenseService.subscribeAllLicenses((licenses) => {
      this.licenses = licenses;
      this.updateMetrics();
      this.applyFilterAndRender();
    });
  }

  updateMetrics() {
    const totalTenants = this.licenses.length;
    let activeCount = 0;
    let blockedCount = 0;
    const clientEmails = new Set();

    const now = new Date();

    this.licenses.forEach(lic => {
      if (lic.ownerEmail) clientEmails.add(lic.ownerEmail.toLowerCase());
      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;
      if (lic.status === 'ativo' && !isExp) {
        activeCount++;
      } else {
        blockedCount++;
      }
    });

    if (this.DOM.metricActiveLicenses) this.DOM.metricActiveLicenses.innerText = activeCount;
    if (this.DOM.metricTotalTenants) this.DOM.metricTotalTenants.innerText = totalTenants;
    if (this.DOM.metricTotalClients) this.DOM.metricTotalClients.innerText = clientEmails.size;
    if (this.DOM.metricBlockedLicenses) this.DOM.metricBlockedLicenses.innerText = blockedCount;
  }

  applyFilterAndRender() {
    const now = new Date();

    this.filteredLicenses = this.licenses.filter(lic => {
      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;
      const effectiveStatus = isExp ? 'expirado' : (lic.status || 'ativo');

      // Filtro de status
      if (this.currentFilter !== 'all') {
        if (this.currentFilter === 'expirado' && !isExp) return false;
        if (this.currentFilter === 'ativo' && (lic.status !== 'ativo' || isExp)) return false;
        if (this.currentFilter === 'bloqueado' && lic.status !== 'bloqueado') return false;
      }

      // Filtro de busca
      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchName = (lic.tenantName || '').toLowerCase().includes(q);
        const matchEmail = (lic.ownerEmail || '').toLowerCase().includes(q);
        const matchKey = (lic.key || '').toLowerCase().includes(q);
        const matchOwner = (lic.ownerName || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchKey && !matchOwner) return false;
      }

      return true;
    });

    this.renderFeed();
  }

  renderFeed() {
    if (!this.DOM.feedContainer) return;

    if (this.filteredLicenses.length === 0) {
      this.DOM.feedContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <i data-lucide="key" style="width: 44px; height: 44px; opacity: 0.35; margin-bottom: 0.75rem;"></i>
          <h3 style="font-size: 1.1rem; color: #ffffff; margin-bottom: 0.25rem;">Nenhuma chave encontrada</h3>
          <p style="font-size: 0.85rem;">Tente ajustar sua busca ou clique em "+ Nova Chave" para emitir uma licença.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const now = new Date();

    this.DOM.feedContainer.innerHTML = this.filteredLicenses.map(lic => {
      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;
      let effectiveStatus = lic.status || 'ativo';
      let statusLabel = effectiveStatus.toUpperCase();

      if (effectiveStatus === 'disponivel') {
        statusLabel = 'DISPONÍVEL';
      } else if (isExp) {
        effectiveStatus = 'expirado';
        statusLabel = 'EXPIRADO';
      } else if (effectiveStatus === 'ativada' || effectiveStatus === 'ativo') {
        effectiveStatus = 'ativo';
        statusLabel = 'ATIVO';
      }

      const isBlocked = lic.status === 'bloqueado';
      const keyCode = lic.key || lic.id || lic.chaveLicenca || 'CHAVE-DISPONIVEL';
      const email = lic.ownerEmail || lic.donoEmail || lic.email || 'Sem e-mail';

      // Datas
      const createdDateStr = lic.createdAt ? new Date(lic.createdAt).toLocaleDateString('pt-BR') : 'Recente';
      const expiryDate = lic.expiresAt ? new Date(lic.expiresAt) : null;
      const expiryDateStr = expiryDate ? expiryDate.toLocaleDateString('pt-BR') : 'Vitalício';

      // Cálculo de dias restantes
      let daysRemainingText = '';
      let daysClass = 'ok';
      if (expiryDate) {
        const diffMs = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));
        if (diffDays > 0) {
          daysRemainingText = `(restam ${diffDays} dias)`;
          if (diffDays <= 5) daysClass = 'danger';
        } else {
          daysRemainingText = `(venceu há ${Math.abs(diffDays)} dias)`;
          daysClass = 'danger';
        }
      }

      return `
        <div class="license-card status-${effectiveStatus}">
          <!-- Topo do Card -->
          <div class="card-topbar">
            <div>
              <h4 class="card-store-name">${lic.tenantName || 'Estabelecimento Licenciado'}</h4>
            </div>
            <div class="card-badges-row">
              <span class="plan-badge">${lic.plan || 'Pro'}</span>
              <span class="status-badge ${effectiveStatus}">
                <span class="status-dot"></span>
                <span>${statusLabel}</span>
              </span>
            </div>
          </div>

          <!-- Dono / Cliente -->
          <div class="card-owner-info">
            <i data-lucide="user"></i>
            <div>
              <span class="card-owner-email">${email}</span>
              ${lic.ownerName ? `<span style="opacity: 0.7;"> &bull; ${lic.ownerName}</span>` : ''}
              ${lic.ownerPhone ? `<span style="opacity: 0.7;"> &bull; ${lic.ownerPhone}</span>` : ''}
            </div>
          </div>

          <!-- Caixa da Chave (Seguro contra undefined) -->
          <div class="card-key-box">
            <span class="key-code-text" title="Clique para copiar">${keyCode}</span>
            <button type="button" class="btn-copy-key" data-key="${keyCode}" title="Copiar Chave">
              <i data-lucide="copy"></i>
            </button>
          </div>

          <!-- Metadados de Data & Caixas -->
          <div class="card-meta-list">
            <div class="meta-row">
              <span>Criada em:</span>
              <strong>${createdDateStr}</strong>
            </div>
            <div class="meta-row">
              <span>Validade:</span>
              <span class="expiry-highlight ${daysClass}">${expiryDateStr} ${daysRemainingText}</span>
            </div>
            <div class="meta-row">
              <span>Limite de Caixas:</span>
              <strong>${lic.maxDevices || 3} aparelhos</strong>
            </div>
          </div>

          <!-- Ações Rápidas em 2 Linhas Limpas (Sem Overflow) -->
          <div class="card-actions-container">
            <div class="card-actions-row-primary">
              <!-- Botão WhatsApp -->
              <button type="button" class="btn-card-action btn-whatsapp" data-key="${keyCode}" data-phone="${lic.ownerPhone || ''}" data-store="${lic.tenantName}" title="Enviar dados no WhatsApp">
                <i data-lucide="message-circle"></i>
                <span>WhatsApp</span>
              </button>

              <!-- Adicionar Loja/Filial para o mesmo cliente -->
              <button type="button" class="btn-card-action btn-add-branch" data-email="${email}" data-store="${lic.tenantName || 'Loja'}" data-owner="${lic.ownerName || ''}" data-phone="${lic.ownerPhone || ''}" title="Gerar chave para nova loja/filial deste cliente">
                <i data-lucide="plus-circle"></i>
                <span>+ Loja</span>
              </button>
            </div>

            <div class="card-actions-row-secondary">
              <!-- Renovar +30 dias -->
              <button type="button" class="btn-card-action btn-renew" data-key="${keyCode}" title="Adicionar 30 dias de validade">
                <i data-lucide="calendar-plus"></i>
                <span>+30 Dias</span>
              </button>

              <!-- Toggle Ativar/Bloquear -->
              <button type="button" class="btn-card-action btn-toggle-status ${lic.status || 'ativo'}" data-key="${keyCode}" data-status="${lic.status || 'ativo'}" title="Bloquear ou Desbloquear">
                <i data-lucide="${isBlocked ? 'check-circle' : 'shield-off'}"></i>
                <span>${isBlocked ? 'Reativar' : 'Bloquear'}</span>
              </button>

              <!-- Excluir -->
              <button type="button" class="btn-delete-key" data-key="${keyCode}" data-store="${lic.tenantName}" title="Excluir licença">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  openAddBranchModal({ email, store, owner, phone }) {
    this.DOM.newTenantName.value = `${store} - Loja 2`;
    this.DOM.newOwnerEmail.value = email;
    this.DOM.newOwnerName.value = owner || '';
    this.DOM.newOwnerPhone.value = phone || '';
    this.DOM.newLicensePlan.value = 'Mensal Pro';
    this.DOM.newLicenseDuration.value = '30';
    this.DOM.newLicenseDevices.value = '3';
    this.DOM.newLicenseNotes.value = `Nova loja vinculada a ${email}`;
    this.DOM.newLicenseKey.value = licenseService.generateRandomLicenseKey(store);
    this.DOM.newLicenseModal.style.display = 'flex';
    this.DOM.newTenantName.focus();
    this.showToast(`Configurando nova loja para ${email}`, 'info');
  }

  showToast(message, type = 'info') {
    if (!this.DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `master-toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    this.DOM.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new MasterAdminApp();
  app.init();
  window.MasterAdminApp = app;
});
