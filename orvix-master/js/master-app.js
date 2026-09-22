/**
 * ==========================================================================
 * ORVIX MASTER — APLICAÇÃO CONTROLLER (GESTÃO DE LICENÇAS E FILA DE ESPERA)
 * ==========================================================================
 */

import { masterAuthService } from './services/master-auth.service.js';
import { masterLicenseService } from './services/master-license.service.js';
import { confirmModal } from './components/ConfirmModal.js';
import { env } from './config/env.js';

class OrvixMasterApp {
  constructor() {
    this.licenses = [];
    this.pendingCustomers = [];
    this.filteredLicenses = [];
    this.currentFilter = 'all'; // 'all' | 'pending' | 'ativo' | 'bloqueado' | 'expirado'
    this.searchQuery = '';

    this.unsubscribeLicenses = null;
    this.unsubscribePending = null;

    this.DOM = {};
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.initAuthListener();

    if (window.lucide) {
      lucide.createIcons();
    }

    console.info(`[Orvix Master] Painel carregado. Conta autorizada: ${env.masterAdminEmail}`);
  }

  cacheDOM() {
    this.DOM = {
      // Auth Overlay
      authOverlay: document.getElementById('master-auth-overlay'),
      appLayout: document.getElementById('master-app-layout'),
      loginForm: document.getElementById('master-login-form'),
      emailInput: document.getElementById('master-email-input'),
      passwordInput: document.getElementById('master-password-input'),
      submitLoginBtn: document.getElementById('btn-submit-master-login'),
      googleLoginBtn: document.getElementById('btn-google-master-login'),
      logoutBtn: document.getElementById('btn-master-logout'),
      headerUserEmail: document.getElementById('header-user-email'),

      // Metrics
      metricPendingClients: document.getElementById('metric-pending-clients'),
      metricActiveLicenses: document.getElementById('metric-active-licenses'),
      metricTotalTenants: document.getElementById('metric-total-tenants'),
      metricTotalClients: document.getElementById('metric-total-clients'),
      metricBlockedLicenses: document.getElementById('metric-blocked-licenses'),
      cardMetricPending: document.getElementById('card-metric-pending'),
      cardMetricActive: document.getElementById('card-metric-active'),
      cardMetricTenants: document.getElementById('card-metric-tenants'),
      cardMetricClients: document.getElementById('card-metric-clients'),
      cardMetricBlocked: document.getElementById('card-metric-blocked'),

      // Alerta de Fila de Espera
      pendingAlertBanner: document.getElementById('pending-alert-banner'),
      pendingAlertTitle: document.getElementById('pending-alert-title'),
      btnViewPendingQueue: document.getElementById('btn-view-pending-queue'),

      // Filtros & Busca
      searchInput: document.getElementById('license-search-input'),
      filterPillsContainer: document.getElementById('filter-pills-container'),
      pillPendingCount: document.getElementById('pill-pending-count'),

      // Seções e Feeds
      pendingSectionWrapper: document.getElementById('pending-section-wrapper'),
      licensesSectionWrapper: document.getElementById('licenses-section-wrapper'),
      pendingFeedContainer: document.getElementById('pending-feed-container'),
      licensesFeedContainer: document.getElementById('licenses-feed-container'),

      // Modal: Finalizar Cadastro & Ativar Cliente
      finalizeModal: document.getElementById('finalize-customer-modal'),
      closeFinalizeModalBtn: document.getElementById('close-finalize-modal'),
      cancelFinalizeBtn: document.getElementById('btn-cancel-finalize'),
      finalizeForm: document.getElementById('finalize-customer-form'),
      finalizeUid: document.getElementById('finalize-user-uid'),
      finalizeEmail: document.getElementById('finalize-owner-email'),
      finalizeName: document.getElementById('finalize-owner-name'),
      finalizeTenantName: document.getElementById('finalize-tenant-name'),
      finalizePhone: document.getElementById('finalize-owner-phone'),
      finalizePlan: document.getElementById('finalize-license-plan'),
      finalizeKey: document.getElementById('finalize-license-key'),
      finalizeDuration: document.getElementById('finalize-license-duration'),
      finalizeDevices: document.getElementById('finalize-license-devices'),
      finalizeNotes: document.getElementById('finalize-license-notes'),
      btnGenerateFinalizeKey: document.getElementById('btn-generate-finalize-key'),
      btnConfirmFinalize: document.getElementById('btn-confirm-finalize'),

      // Modal: Nova Chave Avulsa
      openNewLicenseModalBtn: document.getElementById('open-new-license-modal'),
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

      // Toast
      toastContainer: document.getElementById('master-toast-container')
    };
  }

  bindEvents() {
    // 1. Login com E-mail e Senha
    this.DOM.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this.DOM.emailInput.value;
      const pass = this.DOM.passwordInput.value;

      const originalBtnText = this.DOM.submitLoginBtn.innerHTML;
      this.DOM.submitLoginBtn.disabled = true;
      this.DOM.submitLoginBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Entrando...';
      if (window.lucide) lucide.createIcons();

      try {
        await masterAuthService.loginWithEmail(email, pass);
        this.showToast('Login realizado com sucesso!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
        this.DOM.submitLoginBtn.disabled = false;
        this.DOM.submitLoginBtn.innerHTML = originalBtnText;
        if (window.lucide) lucide.createIcons();
      }
    });

    // 2. Login com Google
    this.DOM.googleLoginBtn?.addEventListener('click', async () => {
      try {
        await masterAuthService.loginWithGoogle();
        this.showToast('Login Google autorizado!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 3. Logout
    this.DOM.logoutBtn?.addEventListener('click', async () => {
      const confirmed = await confirmModal.show({
        title: 'Sair do Painel Master',
        message: 'Deseja realmente encerrar sua sessão no painel administrativo master?',
        confirmText: 'Sim, Sair',
        cancelText: 'Permanecer',
        type: 'warning',
        icon: 'log-out'
      });
      if (confirmed) {
        await masterAuthService.logout();
        this.showToast('Sessão encerrada.', 'info');
      }
    });

    // 4. Busca em tempo real
    this.DOM.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').toLowerCase().trim();
      this.applyFilterAndRender();
    });

    // 5. Filtros de visualização
    this.DOM.filterPillsContainer?.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (pill) {
        this.DOM.filterPillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.dataset.filter || 'all';
        this.applyFilterAndRender();
      }
    });

    // 6. Atalhos das métricas para os dados correspondentes
    const bindMetricCard = (card, filterName, target) => {
      if (!card) return;

      const openMetricData = () => {
        this.setFilter(filterName);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      card.addEventListener('click', openMetricData);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openMetricData();
        }
      });
    };

    bindMetricCard(this.DOM.cardMetricPending, 'pending', this.DOM.pendingSectionWrapper);
    bindMetricCard(this.DOM.cardMetricActive, 'ativo', this.DOM.licensesSectionWrapper);
    bindMetricCard(this.DOM.cardMetricTenants, 'all', this.DOM.licensesSectionWrapper);
    bindMetricCard(this.DOM.cardMetricClients, 'all', this.DOM.licensesSectionWrapper);
    bindMetricCard(this.DOM.cardMetricBlocked, 'bloqueado-expirado', this.DOM.licensesSectionWrapper);

    this.DOM.btnViewPendingQueue?.addEventListener('click', () => {
      this.setFilter('pending');
    });

    // 7. Modal Nova Chave Avulsa
    const openNewModal = () => {
      this.DOM.newTenantName.value = '';
      this.DOM.newOwnerEmail.value = '';
      this.DOM.newOwnerName.value = '';
      this.DOM.newOwnerPhone.value = '';
      this.DOM.newLicensePlan.value = 'Mensal Pro';
      this.DOM.newLicenseDuration.value = '30';
      this.DOM.newLicenseDevices.value = '3';
      this.DOM.newLicenseNotes.value = '';
      this.DOM.newLicenseKey.value = masterLicenseService.generateRandomLicenseKey('LOJA');
      this.DOM.newLicenseModal.style.display = 'flex';
      this.DOM.newTenantName.focus();
    };

    const closeNewModal = () => {
      this.DOM.newLicenseModal.style.display = 'none';
    };

    this.DOM.openNewLicenseModalBtn?.addEventListener('click', openNewModal);
    this.DOM.closeNewLicenseModalBtn?.addEventListener('click', closeNewModal);
    this.DOM.cancelNewLicenseBtn?.addEventListener('click', closeNewModal);
    this.DOM.newLicenseModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.newLicenseModal) closeNewModal();
    });

    this.DOM.btnGenerateKeyPreview?.addEventListener('click', () => {
      const name = this.DOM.newTenantName.value;
      this.DOM.newLicenseKey.value = masterLicenseService.generateRandomLicenseKey(name);
    });

    this.DOM.newLicensePlan?.addEventListener('change', (e) => {
      this.updateDurationByPlan(e.target.value, this.DOM.newLicenseDuration);
    });

    // 8. Submissão do Formulário de Nova Chave Avulsa
    this.DOM.newLicenseForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const created = await masterLicenseService.createLicenseKey({
          key: this.DOM.newLicenseKey.value,
          tenantName: this.DOM.newTenantName.value,
          ownerEmail: this.DOM.newOwnerEmail.value,
          ownerName: this.DOM.newOwnerName.value,
          ownerPhone: this.DOM.newOwnerPhone.value,
          plan: this.DOM.newLicensePlan.value,
          durationDays: parseInt(this.DOM.newLicenseDuration.value, 10) || 30,
          maxDevices: parseInt(this.DOM.newLicenseDevices.value, 10) || 3,
          notes: this.DOM.newLicenseNotes.value
        });

        closeNewModal();
        this.showToast(`Chave "${created.key}" emitida para "${created.tenantName}"!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 9. Modal Finalizar Cadastro & Ativar Cliente em Espera
    const closeFinalizeModal = () => {
      this.DOM.finalizeModal.style.display = 'none';
    };

    this.DOM.closeFinalizeModalBtn?.addEventListener('click', closeFinalizeModal);
    this.DOM.cancelFinalizeBtn?.addEventListener('click', closeFinalizeModal);
    this.DOM.finalizeModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.finalizeModal) closeFinalizeModal();
    });

    this.DOM.btnGenerateFinalizeKey?.addEventListener('click', () => {
      const name = this.DOM.finalizeTenantName.value;
      this.DOM.finalizeKey.value = masterLicenseService.generateRandomLicenseKey(name);
    });

    this.DOM.finalizePlan?.addEventListener('change', (e) => {
      this.updateDurationByPlan(e.target.value, this.DOM.finalizeDuration);
    });

    // 10. Submissão de Finalização de Cadastro
    this.DOM.finalizeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const originalBtnText = this.DOM.btnConfirmFinalize.innerHTML;
      this.DOM.btnConfirmFinalize.disabled = true;
      this.DOM.btnConfirmFinalize.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Ativando...';
      if (window.lucide) lucide.createIcons();

      try {
        const result = await masterLicenseService.finalizeAndActivateCustomer({
          uid: this.DOM.finalizeUid.value,
          email: this.DOM.finalizeEmail.value,
          displayName: this.DOM.finalizeName.value,
          tenantName: this.DOM.finalizeTenantName.value,
          ownerPhone: this.DOM.finalizePhone.value,
          plan: this.DOM.finalizePlan.value,
          durationDays: parseInt(this.DOM.finalizeDuration.value, 10) || 30,
          maxDevices: parseInt(this.DOM.finalizeDevices.value, 10) || 3,
          customKey: this.DOM.finalizeKey.value,
          notes: this.DOM.finalizeNotes.value
        });

        closeFinalizeModal();
        this.showToast(`🎉 Cliente ativado com sucesso! Chave: ${result.key}. O PDV do cliente já está liberado!`, 'success');

        // Se houver telefone, sugere envio no WhatsApp
        const phone = (this.DOM.finalizePhone.value || '').replace(/[^0-9]/g, '');
        if (phone) {
          setTimeout(() => {
            this.sendWhatsAppKey({
              key: result.key,
              phone: phone,
              store: result.tenantName
            });
          }, 600);
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.DOM.btnConfirmFinalize.disabled = false;
        this.DOM.btnConfirmFinalize.innerHTML = originalBtnText;
        if (window.lucide) lucide.createIcons();
      }
    });

    // 11. Delegação de Eventos na Fila de Clientes em Espera
    this.DOM.pendingFeedContainer?.addEventListener('click', async (e) => {
      const btnActivate = e.target.closest('.btn-activate-pending');
      if (btnActivate) {
        const uid = btnActivate.dataset.uid;
        const email = btnActivate.dataset.email;
        const name = btnActivate.dataset.name;

        this.openFinalizeModal({ uid, email, name });
        return;
      }

      const btnDelete = e.target.closest('.btn-delete-pending');
      if (btnDelete) {
        const uid = btnDelete.dataset.uid;
        const email = btnDelete.dataset.email;

        const confirmed = await confirmModal.show({
          title: 'Excluir da Fila de Espera',
          message: `Deseja realmente remover a solicitação de <strong>"${email}"</strong> da fila de ativação?`,
          confirmText: 'Sim, Excluir',
          cancelText: 'Cancelar',
          type: 'danger',
          icon: 'user-x'
        });

        if (confirmed) {
          masterLicenseService.deletePendingCustomer(uid)
            .then(() => this.showToast(`Solicitação de "${email}" excluída da fila.`, 'info'))
            .catch((err) => this.showToast(err.message, 'error'));
        }
      }
    });

    // 12. Delegação de Eventos no Feed de Licenças
    this.DOM.licensesFeedContainer?.addEventListener('click', async (e) => {
      // A) Copiar Chave
      const copyBtn = e.target.closest('.btn-copy-key');
      if (copyBtn) {
        const key = copyBtn.dataset.key;
        navigator.clipboard.writeText(key).then(() => {
          this.showToast(`Chave "${key}" copiada para a área de transferência!`, 'success');
        }).catch(() => {
          this.showToast('Não foi possível copiar.', 'error');
        });
        return;
      }

      // B) Enviar via WhatsApp
      const waBtn = e.target.closest('.btn-whatsapp');
      if (waBtn) {
        const key = waBtn.dataset.key;
        const phone = (waBtn.dataset.phone || '').replace(/[^0-9]/g, '');
        const store = waBtn.dataset.store || 'seu estabelecimento';
        this.sendWhatsAppKey({ key, phone, store });
        return;
      }

      // C) Adicionar Nova Loja / Filial
      const addBranchBtn = e.target.closest('.btn-add-branch');
      if (addBranchBtn) {
        const email = addBranchBtn.dataset.email;
        const store = addBranchBtn.dataset.store;
        const owner = addBranchBtn.dataset.owner;
        const phone = addBranchBtn.dataset.phone;

        this.DOM.newTenantName.value = `${store} - Filial 2`;
        this.DOM.newOwnerEmail.value = email;
        this.DOM.newOwnerName.value = owner || '';
        this.DOM.newOwnerPhone.value = phone || '';
        this.DOM.newLicensePlan.value = 'Mensal Pro';
        this.DOM.newLicenseDuration.value = '30';
        this.DOM.newLicenseDevices.value = '3';
        this.DOM.newLicenseNotes.value = `Filial adicional vinculada a ${email}`;
        this.DOM.newLicenseKey.value = masterLicenseService.generateRandomLicenseKey(store);
        this.DOM.newLicenseModal.style.display = 'flex';
        this.DOM.newTenantName.focus();
        this.showToast(`Criando filial para o cliente ${email}`, 'info');
        return;
      }

      // D) Alternar Status (Ativo / Bloqueado)
      const toggleBtn = e.target.closest('.btn-toggle-status');
      if (toggleBtn) {
        const key = toggleBtn.dataset.key;
        const currentStatus = toggleBtn.dataset.status;
        const newStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
        const actionText = newStatus === 'bloqueado' ? 'bloquear o acesso de' : 'reativar';
        const modalType = newStatus === 'bloqueado' ? 'warning' : 'info';
        const modalIcon = newStatus === 'bloqueado' ? 'shield-alert' : 'shield-check';

        const confirmed = await confirmModal.show({
          title: newStatus === 'bloqueado' ? 'Bloquear Licença' : 'Reativar Licença',
          message: `Deseja realmente ${actionText} a licença <strong>"${key}"</strong>?`,
          confirmText: newStatus === 'bloqueado' ? 'Sim, Bloquear' : 'Sim, Reativar',
          cancelText: 'Cancelar',
          type: modalType,
          icon: modalIcon
        });

        if (confirmed) {
          try {
            await masterLicenseService.updateLicenseStatus(key, newStatus);
            this.showToast(`Licença "${key}" agora está ${newStatus.toUpperCase()}!`, 'success');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }

      // E) Renovar Validade (+30 Dias)
      const renewBtn = e.target.closest('.btn-renew');
      if (renewBtn) {
        const key = renewBtn.dataset.key;
        const originalHtml = renewBtn.innerHTML;
        renewBtn.disabled = true;
        renewBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        if (window.lucide) lucide.createIcons();

        try {
          const newDate = await masterLicenseService.renewLicense(key, 30);
          const dateFormatted = new Date(newDate).toLocaleDateString('pt-BR');
          this.showToast(`Licença "${key}" renovada com sucesso até ${dateFormatted}! (+30 dias)`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        } finally {
          renewBtn.disabled = false;
          renewBtn.innerHTML = originalHtml;
          if (window.lucide) lucide.createIcons();
        }
        return;
      }

      // F) Excluir Chave
      const deleteBtn = e.target.closest('.btn-delete-key');
      if (deleteBtn) {
        const key = deleteBtn.dataset.key;
        const store = deleteBtn.dataset.store;

        const confirmed = await confirmModal.show({
          title: 'Excluir Licença Permanentemente',
          message: `Tem certeza de que deseja excluir permanentemente a chave <strong>"${key}" (${store})</strong>? O PDV desta loja perderá o acesso.`,
          confirmText: 'Sim, Excluir Chave',
          cancelText: 'Cancelar',
          type: 'danger',
          icon: 'trash-2'
        });

        if (confirmed) {
          try {
            await masterLicenseService.deleteLicenseKey(key);
            this.showToast(`Chave "${key}" excluída com sucesso.`, 'info');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }
    });
  }

  initAuthListener() {
    masterAuthService.onAuthStateChanged((user) => {
      if (user) {
        this.DOM.authOverlay.style.display = 'none';
        this.DOM.appLayout.style.display = 'flex';
        if (this.DOM.headerUserEmail) {
          this.DOM.headerUserEmail.innerText = user.email;
        }
        this.startRealtimeListeners();
      } else {
        this.DOM.authOverlay.style.display = 'flex';
        this.DOM.appLayout.style.display = 'none';
        this.stopRealtimeListeners();
      }
    });
  }

  startRealtimeListeners() {
    this.stopRealtimeListeners();

    // Escuta todas as licenças
    this.unsubscribeLicenses = masterLicenseService.subscribeAllLicenses((licenses) => {
      this.licenses = licenses;
      this.updateMetrics();
      this.applyFilterAndRender();
    });

    // Escuta clientes em espera de ativação
    this.unsubscribePending = masterLicenseService.subscribePendingCustomers((pending) => {
      this.pendingCustomers = pending;
      this.updatePendingAlertAndMetrics();
      this.applyFilterAndRender();
    });
  }

  stopRealtimeListeners() {
    if (this.unsubscribeLicenses) {
      this.unsubscribeLicenses();
      this.unsubscribeLicenses = null;
    }
    if (this.unsubscribePending) {
      this.unsubscribePending();
      this.unsubscribePending = null;
    }
  }

  updateMetrics() {
    let activeCount = 0;
    let blockedCount = 0;
    const clientEmails = new Set();
    const now = new Date();

    this.licenses.forEach(lic => {
      const email = lic.ownerEmail || lic.donoEmail || lic.email;
      if (email && email.includes('@')) clientEmails.add(email.toLowerCase());

      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;
      if (lic.status === 'ativo' && !isExp) {
        activeCount++;
      } else {
        blockedCount++;
      }
    });

    if (this.DOM.metricActiveLicenses) this.DOM.metricActiveLicenses.innerText = activeCount;
    if (this.DOM.metricTotalTenants) this.DOM.metricTotalTenants.innerText = this.licenses.length;
    if (this.DOM.metricTotalClients) this.DOM.metricTotalClients.innerText = clientEmails.size;
    if (this.DOM.metricBlockedLicenses) this.DOM.metricBlockedLicenses.innerText = blockedCount;
  }

  updatePendingAlertAndMetrics() {
    const count = this.pendingCustomers.length;

    if (this.DOM.metricPendingClients) this.DOM.metricPendingClients.innerText = count;
    if (this.DOM.pillPendingCount) this.DOM.pillPendingCount.innerText = count;

    if (count > 0) {
      if (this.DOM.pendingAlertBanner) this.DOM.pendingAlertBanner.style.display = 'flex';
      if (this.DOM.pendingAlertTitle) {
        this.DOM.pendingAlertTitle.innerText = `🔔 ${count} novo${count > 1 ? 's' : ''} cliente${count > 1 ? 's' : ''} aguardando ativação!`;
      }
    } else {
      if (this.DOM.pendingAlertBanner) this.DOM.pendingAlertBanner.style.display = 'none';
    }
  }

  setFilter(filterName) {
    this.currentFilter = filterName;
    if (this.DOM.filterPillsContainer) {
      this.DOM.filterPillsContainer.querySelectorAll('.filter-pill').forEach(p => {
        if (p.dataset.filter === filterName) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }
    this.applyFilterAndRender();
  }

  applyFilterAndRender() {
    const now = new Date();

    // 1. Visão de Clientes em Espera
    if (this.currentFilter === 'pending') {
      this.DOM.pendingSectionWrapper.style.display = 'block';
      this.DOM.licensesSectionWrapper.style.display = 'none';
      this.renderPendingFeed();
      return;
    }

    // 2. Visão de Licenças Emitidas
    this.DOM.pendingSectionWrapper.style.display = 'none';
    this.DOM.licensesSectionWrapper.style.display = 'block';

    this.filteredLicenses = this.licenses.filter(lic => {
      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;

      if (this.currentFilter === 'ativo' && (lic.status !== 'ativo' || isExp)) return false;
      if (this.currentFilter === 'bloqueado' && lic.status !== 'bloqueado') return false;
      if (this.currentFilter === 'expirado' && !isExp) return false;
      if (this.currentFilter === 'bloqueado-expirado' && lic.status !== 'bloqueado' && !isExp) return false;

      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchName = (lic.tenantName || '').toLowerCase().includes(q);
        const matchEmail = (lic.ownerEmail || lic.donoEmail || lic.email || '').toLowerCase().includes(q);
        const matchKey = (lic.key || lic.id || lic.chaveLicenca || '').toLowerCase().includes(q);
        const matchOwner = (lic.ownerName || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchKey && !matchOwner) return false;
      }

      return true;
    });

    this.renderLicensesFeed();
  }

  renderPendingFeed() {
    if (!this.DOM.pendingFeedContainer) return;

    if (this.pendingCustomers.length === 0) {
      this.DOM.pendingFeedContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <i data-lucide="check-circle-2" style="width: 44px; height: 44px; color: var(--success); opacity: 0.6; margin-bottom: 0.75rem;"></i>
          <h3 style="font-size: 1.1rem; color: #ffffff; margin-bottom: 0.25rem;">Nenhum cliente aguardando ativação!</h3>
          <p style="font-size: 0.85rem;">Todos os clientes cadastrados já possuem chaves vinculadas e acesso liberado.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    this.DOM.pendingFeedContainer.innerHTML = this.pendingCustomers.map(customer => {
      const regDate = customer.registeredAt ? new Date(customer.registeredAt) : null;
      const regFormatted = regDate ? regDate.toLocaleString('pt-BR') : 'Data recente';

      return `
        <div class="pending-customer-card">
          <div class="pending-card-top">
            <div>
              <h4 class="pending-client-name">${customer.displayName}</h4>
              <div class="pending-client-email">
                <i data-lucide="mail" style="width: 13px; height: 13px;"></i>
                <span>${customer.email}</span>
              </div>
            </div>
            <span class="pending-status-badge">
              <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
              <span>AGUARDANDO CHAVE</span>
            </span>
          </div>

          <div class="pending-card-meta">
            <div>Cadastrou-se em: <strong>${regFormatted}</strong></div>
            <div>Status no PDV: <strong>Aguardando liberação</strong></div>
          </div>

          <button 
            type="button" 
            class="btn-activate-pending" 
            data-uid="${customer.uid}"
            data-email="${customer.email}"
            data-name="${customer.displayName}"
          >
            <i data-lucide="check-circle-2"></i>
            <span>Finalizar Cadastro & Ativar Chave</span>
          </button>
          <button
            type="button"
            class="btn-delete-pending"
            data-uid="${customer.uid}"
            data-email="${customer.email}"
          >
            <i data-lucide="trash-2"></i>
            <span>Excluir solicitação</span>
          </button>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  renderLicensesFeed() {
    if (!this.DOM.licensesFeedContainer) return;

    if (this.filteredLicenses.length === 0) {
      this.DOM.licensesFeedContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
          <i data-lucide="key" style="width: 44px; height: 44px; opacity: 0.35; margin-bottom: 0.75rem;"></i>
          <h3 style="font-size: 1.1rem; color: #ffffff; margin-bottom: 0.25rem;">Nenhuma licença encontrada</h3>
          <p style="font-size: 0.85rem;">Tente ajustar sua busca ou emita uma nova chave para liberar acessos.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const now = new Date();

    this.DOM.licensesFeedContainer.innerHTML = this.filteredLicenses.map(lic => {
      const isExp = lic.expiresAt && new Date(lic.expiresAt) < now;
      let effectiveStatus = lic.status || 'ativo';
      let statusLabel = effectiveStatus.toUpperCase();

      if (isExp) {
        effectiveStatus = 'expirado';
        statusLabel = 'EXPIRADO';
      }

      const isBlocked = lic.status === 'bloqueado';
      
      // Resolução Segura de Chave (NUNCA UNDEFINED)
      const keyCode = lic.key || lic.id || lic.chaveLicenca || 'CHAVE-DISPONIVEL';
      const email = lic.ownerEmail || lic.donoEmail || lic.email || 'Sem e-mail cadastrado';

      // Datas
      const createdDateStr = lic.createdAt ? new Date(lic.createdAt).toLocaleDateString('pt-BR') : 'Recente';
      const expiryDate = lic.expiresAt ? new Date(lic.expiresAt) : null;
      const expiryDateStr = expiryDate ? expiryDate.toLocaleDateString('pt-BR') : 'Vitalício';

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
              <div class="card-owner-email">${email}</div>
              ${lic.ownerName ? `<div style="font-size: 0.75rem; opacity: 0.75;">${lic.ownerName}${lic.ownerPhone ? ` &bull; ${lic.ownerPhone}` : ''}</div>` : ''}
            </div>
          </div>

          <!-- Caixa da Chave com Cópia (NUNCA UNDEFINED) -->
          <div class="card-key-box">
            <span class="key-code-text" title="Clique para copiar">${keyCode}</span>
            <button type="button" class="btn-copy-key" data-key="${keyCode}" title="Copiar Chave">
              <i data-lucide="copy"></i>
            </button>
          </div>

          <!-- Metadados de Data & Limite -->
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

          <!-- Ações do Card em 2 Linhas Limpas (ZERO OVERFLOW) -->
          <div class="card-actions-container">
            <!-- Linha 1: WhatsApp + Nova Loja -->
            <div class="card-actions-row-primary">
              <button 
                type="button" 
                class="btn-card-action btn-whatsapp" 
                data-key="${keyCode}" 
                data-phone="${lic.ownerPhone || ''}" 
                data-store="${lic.tenantName || ''}" 
                title="Enviar dados da chave via WhatsApp"
              >
                <i data-lucide="message-circle"></i>
                <span>WhatsApp</span>
              </button>

              <button 
                type="button" 
                class="btn-card-action btn-add-branch" 
                data-email="${email}" 
                data-store="${lic.tenantName || 'Loja'}" 
                data-owner="${lic.ownerName || ''}" 
                data-phone="${lic.ownerPhone || ''}" 
                title="Criar nova filial para este mesmo cliente"
              >
                <i data-lucide="plus-circle"></i>
                <span>+ Loja</span>
              </button>
            </div>

            <!-- Linha 2: Renovar (+30d) + Bloquear/Reativar + Excluir -->
            <div class="card-actions-row-secondary">
              <button 
                type="button" 
                class="btn-card-action btn-renew" 
                data-key="${keyCode}" 
                title="Adicionar 30 dias de validade a esta licença"
              >
                <i data-lucide="calendar-plus"></i>
                <span>+30 Dias</span>
              </button>

              <button 
                type="button" 
                class="btn-card-action btn-toggle-status ${lic.status || 'ativo'}" 
                data-key="${keyCode}" 
                data-status="${lic.status || 'ativo'}" 
                title="Bloquear ou Desbloquear acesso"
              >
                <i data-lucide="${isBlocked ? 'check-circle' : 'shield-off'}"></i>
                <span>${isBlocked ? 'Reativar' : 'Bloquear'}</span>
              </button>

              <button 
                type="button" 
                class="btn-delete-key" 
                data-key="${keyCode}" 
                data-store="${lic.tenantName || ''}" 
                title="Excluir licença permanentemente"
              >
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

  openFinalizeModal({ uid, email, name }) {
    this.DOM.finalizeUid.value = uid || '';
    this.DOM.finalizeEmail.value = email || '';
    this.DOM.finalizeName.value = name || (email ? email.split('@')[0] : '');
    this.DOM.finalizeTenantName.value = '';
    this.DOM.finalizePhone.value = '';
    this.DOM.finalizePlan.value = 'Mensal Pro';
    this.DOM.finalizeDuration.value = '30';
    this.DOM.finalizeDevices.value = '3';
    this.DOM.finalizeNotes.value = '';
    this.DOM.finalizeKey.value = masterLicenseService.generateRandomLicenseKey('LOJA');

    this.DOM.finalizeModal.style.display = 'flex';
    this.DOM.finalizeTenantName.focus();
  }

  sendWhatsAppKey({ key, phone, store }) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const cleanStore = store || 'seu estabelecimento';
    const msg = encodeURIComponent(
      `Olá! 👋 Segue sua chave de ativação do *Orvix PDV* para a loja *${cleanStore}*:\n\n` +
      `🔑 *Chave de Licença:* \`${key}\`\n\n` +
      `Seu acesso já foi liberado no sistema! Basta abrir o PDV para iniciar as vendas. Qualquer dúvida estamos à disposição!`
    );
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }

  updateDurationByPlan(plan, durationInput) {
    if (!durationInput) return;
    if (plan.includes('Mensal')) durationInput.value = '30';
    else if (plan.includes('Trimestral')) durationInput.value = '90';
    else if (plan.includes('Semestral')) durationInput.value = '180';
    else if (plan.includes('Anual')) durationInput.value = '365';
    else if (plan.includes('Vitalício')) durationInput.value = '3650';
    else if (plan.includes('Trial') || plan.includes('Teste')) durationInput.value = '7';
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
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new OrvixMasterApp();
  app.init();
  window.OrvixMasterApp = app;
});
