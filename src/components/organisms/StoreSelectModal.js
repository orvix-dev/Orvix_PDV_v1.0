/**
 * ==========================================================================
 * ORVIX PDV — STORE SELECTION MODAL (MULTI-TENANT / MULTI-LOJAS)
 * ==========================================================================
 * Exibido no login caso o usuário possua mais de 1 estabelecimento ativo.
 */

import { authService } from '../../services/auth.service.js';
import { licenseService } from '../../services/license.service.js';

export class StoreSelectModalComponent {
  constructor() {
    this.overlay = null;
    this.listContainer = null;
    this.addStoreBtn = null;
    this.logoutBtn = null;
    this.userNameEl = null;
    this.userEmailEl = null;
    this.onStoreSelectCallback = null;
    this.onAddStoreCallback = null;
  }

  mount() {
    this.render();
    this.cacheElements();
    this.bindEvents();
  }

  render() {
    if (document.getElementById('auth-store-select-overlay')) return;

    const template = `
      <div class="auth-overlay auth-store-select-overlay hidden" id="auth-store-select-overlay">
        <div class="auth-backdrop-mesh"></div>

        <div class="auth-card auth-store-select-card" style="max-width: 500px;">
          <!-- Header -->
          <div class="auth-header" style="margin-bottom: 1.25rem;">
            <div class="auth-logo-wrapper" style="background: rgba(124, 58, 237, 0.15); color: #7c3aed;">
              <i data-lucide="store" style="width: 28px; height: 28px;"></i>
            </div>
            <h2 class="auth-title" style="font-size: 1.45rem;">Seus <span>Estabelecimentos</span></h2>
            <p class="auth-subtitle" style="font-size: 0.85rem;">
              Olá, <strong id="store-select-user-name" style="color: #ffffff;">Usuário</strong>! Escolha qual loja deseja gerenciar agora:
            </p>
          </div>

          <!-- Lista de Estabelecimentos -->
          <div class="store-select-list" id="store-select-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; margin-bottom: 1.25rem; padding-right: 4px;">
            <!-- Renderizado dinamicamente -->
          </div>

          <!-- Ações de Rodapé -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="touch-btn btn-secondary" id="btn-add-new-store" style="width: 100%; height: 42px; font-weight: 700; gap: 6px;">
              <i data-lucide="plus-circle"></i>
              <span>+ Adicionar Novo Estabelecimento (Nova Chave)</span>
            </button>

            <button type="button" class="auth-pending-btn-logout" id="btn-store-select-logout" style="margin-top: 4px; border: none; background: transparent; color: #94a3b8; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
              <span>Entrar com outra conta</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', template);
  }

  cacheElements() {
    this.overlay = document.getElementById('auth-store-select-overlay');
    this.listContainer = document.getElementById('store-select-list');
    this.addStoreBtn = document.getElementById('btn-add-new-store');
    this.logoutBtn = document.getElementById('btn-store-select-logout');
    this.userNameEl = document.getElementById('store-select-user-name');
  }

  bindEvents() {
    this.addStoreBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onAddStoreCallback) {
        this.onAddStoreCallback();
      }
    });

    this.logoutBtn?.addEventListener('click', async () => {
      await authService.logout();
      this.hide();
    });

    this.listContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-select-tenant');
      if (btn) {
        const tenantId = btn.dataset.tenantId;
        const tenantName = btn.dataset.tenantName;
        this.hide();
        if (this.onStoreSelectCallback) {
          this.onStoreSelectCallback({ id: tenantId, nome: tenantName });
        }
      }
    });
  }

  show(user, tenants = [], onSelect, onAdd) {
    this.onStoreSelectCallback = onSelect;
    this.onAddStoreCallback = onAdd;

    if (this.userNameEl) {
      this.userNameEl.innerText = user.displayName || user.email.split('@')[0];
    }

    if (this.listContainer) {
      this.listContainer.innerHTML = tenants.map(t => {
        const isSuspended = t.statusLicenca === 'bloqueado';
        return `
          <div class="store-select-item" style="background: rgba(19, 28, 49, 0.7); border: 1px solid rgba(31, 45, 77, 0.8); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: all 0.2s ease;">
            <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
              <strong style="font-size: 0.95rem; color: #ffffff;">${t.nome || 'Estabelecimento'}</strong>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.72rem; color: #a78bfa; font-weight: 600;">${t.plan || 'Plano Pro'}</span>
                <span style="font-size: 0.7rem; color: ${isSuspended ? '#ef4444' : '#10b981'};">&bull; ${isSuspended ? 'Bloqueado' : 'Ativo'}</span>
              </div>
            </div>

            <button type="button" class="touch-btn btn-primary btn-select-tenant" data-tenant-id="${t.id}" data-tenant-name="${t.nome}" style="height: 36px; padding: 0 14px; font-size: 0.8rem; font-weight: 700; white-space: nowrap;">
              <span>Acessar</span>
              <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    }

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }
}
