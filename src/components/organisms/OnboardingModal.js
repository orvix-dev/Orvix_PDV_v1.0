/**
 * ==========================================================================
 * ORVIX PDV — ONBOARDING & SETUP GUIADO
 * ==========================================================================
 * Fluxo em 3 etapas de primeiro acesso: Boas-vindas -> Preços KG -> Produtos
 */

import { productsService } from '../../services/products.service.js';
import { licenseService } from '../../services/license.service.js';
import { firebaseDb, doc, updateDoc, serverTimestamp } from '../../config/firebase.js';

export class OnboardingModalComponent {
  constructor() {
    this.overlay = null;
    this.currentStep = 1; // 1 | 2 | 3
    this.tenantId = null;
    this.onCompleteCallback = null;

    // Elements
    this.step1El = null;
    this.step2El = null;
    this.step3El = null;

    // Step 2 inputs
    this.acaiPriceInput = null;
    this.sorvetePriceInput = null;

    // Step 3 inputs
    this.prodNameInput = null;
    this.prodPriceInput = null;
    this.prodCatSelect = null;
    this.prodListContainer = null;
    this.addedProducts = [];
  }

  mount() {
    this.render();
    this.cacheElements();
    this.bindEvents();
  }

  render() {
    if (document.getElementById('onboarding-overlay')) return;

    const template = `
      <div class="auth-overlay onboarding-overlay hidden" id="onboarding-overlay" style="z-index: 10000;">
        <div class="auth-backdrop-mesh"></div>

        <div class="auth-card onboarding-card" style="max-width: 540px; text-align: left;">
          
          <!-- Indicador de Passos (Pills) -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="onboarding-step-pill active" id="pill-step-1" style="width: 26px; height: 26px; border-radius: 50%; background: #7c3aed; color: #fff; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">1</span>
              <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 600;">Boas-vindas</span>
            </div>
            <span style="color: rgba(255,255,255,0.2);">&rarr;</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="onboarding-step-pill" id="pill-step-2" style="width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">2</span>
              <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 600;">Preço por KG</span>
            </div>
            <span style="color: rgba(255,255,255,0.2);">&rarr;</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="onboarding-step-pill" id="pill-step-3" style="width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">3</span>
              <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 600;">Produtos</span>
            </div>
          </div>

          <!-- ETAPA 1: BOAS-VINDAS -->
          <div id="onboarding-step-1" class="onboarding-step active">
            <div style="text-align: center; margin-bottom: 1.25rem;">
              <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(124, 58, 237, 0.2); border: 1px solid #7c3aed; color: #a78bfa; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.65rem auto;">
                <i data-lucide="sparkles" style="width: 26px; height: 26px;"></i>
              </div>
              <h2 style="font-size: 1.45rem; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; color: #ffffff;">Bem-vindo ao <span>Orvix PDV</span>!</h2>
              <p style="font-size: 0.86rem; color: #94a3b8; margin-top: 4px;">
                Seu ponto de venda está pronto. Configure os dados do seu estabelecimento para começar:
              </p>
            </div>

            <!-- OPÇÃO: NOME DO ESTABELECIMENTO -->
            <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.28); border-radius: 12px; padding: 14px; margin-bottom: 1.25rem;">
              <label for="onboard-tenant-name" style="display: flex; align-items: center; gap: 7px; font-size: 0.85rem; font-weight: 700; color: #f8fafc; margin-bottom: 6px;">
                <i data-lucide="store" style="width: 15px; height: 15px; color: #a78bfa;"></i>
                <span>Nome do Estabelecimento / Loja *</span>
              </label>
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="onboard-tenant-name" 
                  class="admin-input-styled" 
                  placeholder="Ex: Açaí &amp; Sorvete Tropical..." 
                  maxlength="20"
                  style="font-size: 1rem; font-weight: 700; color: #ffffff; padding: 10px 14px; width: 100%; border-radius: 8px;"
                  autocomplete="organization"
                  required
                />
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; margin-top: 8px; color: #94a3b8; font-size: 0.77rem; line-height: 1.35;">
                <i data-lucide="printer" style="width: 14px; height: 14px; color: #10b981; flex-shrink: 0; margin-top: 1px;"></i>
                <span>Este nome será impresso no topo da <strong>impressora térmica</strong> e exibido no cabeçalho de todos os <strong>relatórios</strong>.</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1.25rem;">
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 9px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="scale" style="width: 16px; height: 16px; color: #10b981;"></i>
                <span style="font-size: 0.78rem; font-weight: 600; color: #f8fafc;">Preços KG & Balança</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 9px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="package" style="width: 16px; height: 16px; color: #a78bfa;"></i>
                <span style="font-size: 0.78rem; font-weight: 600; color: #f8fafc;">Bebidas & Potes</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 9px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="wallet" style="width: 16px; height: 16px; color: #f59e0b;"></i>
                <span style="font-size: 0.78rem; font-weight: 600; color: #f8fafc;">Caixa & Turnos</span>
              </div>
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 9px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="users" style="width: 16px; height: 16px; color: #06b6d4;"></i>
                <span style="font-size: 0.78rem; font-weight: 600; color: #f8fafc;">Equipe & Operadores</span>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="touch-btn btn-secondary" id="btn-onboarding-skip-all" style="flex: 1; height: 44px; font-weight: 600;">
                Pular Configuração
              </button>
              <button type="button" class="touch-btn btn-primary" id="btn-onboarding-go-step-2" style="flex: 1.5; height: 44px; font-weight: 700; gap: 6px;">
                <span>Salvar e Avançar</span>
                <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>

          <!-- ETAPA 2: PREÇO POR KG -->
          <div id="onboarding-step-2" class="onboarding-step" style="display: none;">
            <div style="margin-bottom: 1.25rem;">
              <h3 style="font-size: 1.25rem; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; color: #ffffff;">Preço por KG (Balança)</h3>
              <p style="font-size: 0.84rem; color: #94a3b8; margin-top: 3px;">
                Informe o valor cobrado por quilo para açaí e sorvete. <strong style="color: #f59e0b;">Obrigatório para realizar vendas por peso.</strong>
              </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.5rem;">
              <div class="form-group-styled">
                <label for="onboard-acai-price" style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #c084fc;">
                  <i data-lucide="scale" style="width: 14px; height: 14px;"></i>
                  <span>Açaí (Preço R$ por KG) *</span>
                </label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-weight: 700;">R$</span>
                  <input type="number" id="onboard-acai-price" class="admin-input-styled" placeholder="Ex: 49.90" step="0.01" style="padding-left: 38px; font-size: 1.1rem; font-weight: 700;" inputmode="decimal">
                </div>
              </div>

              <div class="form-group-styled">
                <label for="onboard-sorvete-price" style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #60a5fa;">
                  <i data-lucide="scale" style="width: 14px; height: 14px;"></i>
                  <span>Sorvete (Preço R$ por KG) *</span>
                </label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-weight: 700;">R$</span>
                  <input type="number" id="onboard-sorvete-price" class="admin-input-styled" placeholder="Ex: 45.90" step="0.01" style="padding-left: 38px; font-size: 1.1rem; font-weight: 700;" inputmode="decimal">
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="touch-btn btn-secondary" id="btn-onboarding-skip-step-2" style="flex: 1; height: 44px;">
                Pular por Enquanto
              </button>
              <button type="button" class="touch-btn btn-primary" id="btn-onboarding-save-step-2" style="flex: 1.5; height: 44px; font-weight: 700;">
                Salvar e Avançar
              </button>
            </div>
          </div>

          <!-- ETAPA 3: PRODUTOS ADICIONAIS -->
          <div id="onboarding-step-3" class="onboarding-step" style="display: none;">
            <div style="margin-bottom: 1rem;">
              <h3 style="font-size: 1.25rem; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; color: #ffffff;">Cadastrar Produtos (Opcional)</h3>
              <p style="font-size: 0.84rem; color: #94a3b8; margin-top: 3px;">
                Adicione bebidas, embalagens ou adicionais para compor o catálogo:
              </p>
            </div>

            <!-- Form Rápido de Adição -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; margin-bottom: 1rem;">
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="onboard-prod-name" class="admin-input-styled" placeholder="Nome (Ex: Coca-Cola Lata)">
                <input type="number" id="onboard-prod-price" class="admin-input-styled" placeholder="Preço (R$)" step="0.01">
              </div>
              <div style="display: flex; gap: 8px;">
                <select id="onboard-prod-cat" class="admin-input-styled" style="flex: 1;">
                  <option value="Bebidas">Bebidas</option>
                  <option value="Adicionais">Adicionais</option>
                  <option value="Potes">Potes & Embalagens</option>
                  <option value="Diversos">Diversos</option>
                </select>
                <button type="button" class="touch-btn btn-primary" id="btn-onboard-add-prod" style="height: 40px; padding: 0 16px; font-weight: 700;">
                  <i data-lucide="plus"></i>
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            <!-- Lista de Produtos Adicionados no Onboarding -->
            <div id="onboard-prods-list" style="max-height: 140px; overflow-y: auto; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 6px;">
              <div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 10px;">
                Nenhum produto cadastrado nesta etapa ainda.
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="touch-btn btn-secondary" id="btn-onboarding-finish-skip" style="flex: 1; height: 44px;">
                Configurar Depois
              </button>
              <button type="button" class="touch-btn btn-primary" id="btn-onboarding-finish" style="flex: 1.5; height: 44px; font-weight: 700; gap: 6px;">
                <i data-lucide="check-circle"></i>
                <span>Concluir e Ir ao PDV</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', template);
  }

  cacheElements() {
    this.overlay = document.getElementById('onboarding-overlay');
    this.step1El = document.getElementById('onboarding-step-1');
    this.step2El = document.getElementById('onboarding-step-2');
    this.step3El = document.getElementById('onboarding-step-3');

    this.tenantNameInput = document.getElementById('onboard-tenant-name');
    this.acaiPriceInput = document.getElementById('onboard-acai-price');
    this.sorvetePriceInput = document.getElementById('onboard-sorvete-price');

    this.prodNameInput = document.getElementById('onboard-prod-name');
    this.prodPriceInput = document.getElementById('onboard-prod-price');
    this.prodCatSelect = document.getElementById('onboard-prod-cat');
    this.prodListContainer = document.getElementById('onboard-prods-list');
  }

  async saveTenantName() {
    let rawName = this.tenantNameInput?.value?.trim();
    if (!rawName) return;
    if (rawName.length > 20) {
      rawName = rawName.substring(0, 20);
    }

    // Atualiza tenant local
    const localTenant = licenseService.getLocalTenant() || {};
    localTenant.nome = rawName;
    localTenant.tenantName = rawName;
    licenseService.saveLocalTenant(localTenant);

    if (this.tenant) {
      this.tenant.nome = rawName;
      this.tenant.tenantName = rawName;
    }

    // Salva no Firestore se houver conexão e tenantId
    const tId = this.tenantId || localTenant.id;
    if (firebaseDb && tId) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', tId);
        await updateDoc(tenantRef, {
          nome: rawName,
          tenantName: rawName,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('[Onboarding] Erro ao atualizar nome do estabelecimento no Firestore:', err);
      }
    }

    if (typeof this.onTenantNameUpdated === 'function') {
      this.onTenantNameUpdated(rawName);
    }
  }

  bindEvents() {
    // Passo 1 -> Passo 2 (Salva nome do estabelecimento)
    document.getElementById('btn-onboarding-go-step-2')?.addEventListener('click', async () => {
      await this.saveTenantName();
      this.goToStep(2);
    });

    // Pular direto no Passo 1
    document.getElementById('btn-onboarding-skip-all')?.addEventListener('click', async () => {
      await this.saveTenantName();
      await this.finishOnboarding(false, false);
    });

    // Salvar Passo 2 (Preços KG)
    document.getElementById('btn-onboarding-save-step-2')?.addEventListener('click', () => {
      const acai = parseFloat(this.acaiPriceInput?.value) || 0;
      const sorvete = parseFloat(this.sorvetePriceInput?.value) || 0;

      if (acai > 0 || sorvete > 0) {
        productsService.updateConfig({
          açaíPricePerKg: acai > 0 ? acai : 45.90,
          sorvetePricePerKg: sorvete > 0 ? sorvete : 45.90
        });
      }
      this.goToStep(3);
    });

    // Pular Passo 2
    document.getElementById('btn-onboarding-skip-step-2')?.addEventListener('click', () => {
      this.goToStep(3);
    });

    // Adicionar Produto no Passo 3
    document.getElementById('btn-onboard-add-prod')?.addEventListener('click', () => {
      const name = this.prodNameInput?.value?.trim();
      const price = parseFloat(this.prodPriceInput?.value) || 0;
      const cat = this.prodCatSelect?.value || 'Diversos';

      if (!name || price <= 0) {
        alert('Informe um nome e um preço válido maior que zero.');
        return;
      }

      try {
        const prod = productsService.addProduct(name, price, cat);
        this.addedProducts.push(prod);
        this.renderAddedProducts();
        if (this.prodNameInput) this.prodNameInput.value = '';
        if (this.prodPriceInput) this.prodPriceInput.value = '';
        if (this.prodNameInput) this.prodNameInput.focus();
      } catch (err) {
        alert(err.message);
      }
    });

    // Finalizar no Passo 3
    document.getElementById('btn-onboarding-finish')?.addEventListener('click', async () => {
      await this.finishOnboarding(true, this.addedProducts.length > 0);
    });

    document.getElementById('btn-onboarding-finish-skip')?.addEventListener('click', async () => {
      await this.finishOnboarding(true, false);
    });
  }

  renderAddedProducts() {
    if (!this.prodListContainer) return;
    if (this.addedProducts.length === 0) {
      this.prodListContainer.innerHTML = `
        <div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 10px;">
          Nenhum produto cadastrado nesta etapa ainda.
        </div>
      `;
      return;
    }

    this.prodListContainer.innerHTML = this.addedProducts.map(p => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 6px 10px; font-size: 0.82rem;">
        <div>
          <strong style="color: #ffffff;">${p.name}</strong>
          <span style="color: #94a3b8; font-size: 0.72rem; margin-left: 6px;">(${p.category})</span>
        </div>
        <span style="color: #10b981; font-weight: 700;">R$ ${p.price.toFixed(2)}</span>
      </div>
    `).join('');
  }

  goToStep(step) {
    this.currentStep = step;
    if (this.step1El) this.step1El.style.display = step === 1 ? 'block' : 'none';
    if (this.step2El) this.step2El.style.display = step === 2 ? 'block' : 'none';
    if (this.step3El) this.step3El.style.display = step === 3 ? 'block' : 'none';

    // Atualiza pills no topo
    for (let i = 1; i <= 3; i++) {
      const pill = document.getElementById(`pill-step-${i}`);
      if (pill) {
        if (i === step) {
          pill.style.background = '#7c3aed';
          pill.style.color = '#ffffff';
        } else if (i < step) {
          pill.style.background = '#10b981';
          pill.style.color = '#ffffff';
        } else {
          pill.style.background = 'rgba(255,255,255,0.1)';
          pill.style.color = '#94a3b8';
        }
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  show(tenant, onComplete) {
    this.tenant = tenant;
    this.tenantId = tenant ? tenant.id : null;
    this.onCompleteCallback = onComplete;
    this.addedProducts = [];

    // Preenche o nome atual do estabelecimento
    const existingName = tenant?.nome || tenant?.tenantName || licenseService.getLocalTenant()?.nome || licenseService.getLocalTenant()?.tenantName || '';
    if (this.tenantNameInput) {
      this.tenantNameInput.value = existingName;
    }

    // Preenche valores atuais de configuração de preços se houver
    const config = productsService.getConfig();
    if (this.acaiPriceInput && config.açaíPricePerKg > 0) {
      this.acaiPriceInput.value = config.açaíPricePerKg.toFixed(2);
    }
    if (this.sorvetePriceInput && config.sorvetePricePerKg > 0) {
      this.sorvetePriceInput.value = config.sorvetePricePerKg.toFixed(2);
    }

    this.goToStep(1);
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }

  async finishOnboarding(kgPricesDone = false, productsDone = false) {
    // Garante que o nome do estabelecimento seja salvo mesmo ao pular ou concluir
    await this.saveTenantName();

    const config = productsService.getConfig();
    const hasKg = (config.açaíPricePerKg > 0 && config.sorvetePricePerKg > 0);

    // Salva no Firestore
    if (firebaseDb && this.tenantId) {
      try {
        const tenantRef = doc(firebaseDb, 'tenants', this.tenantId);
        await updateDoc(tenantRef, {
          onboardingCompleted: true,
          kgPricesConfigured: hasKg,
          productsConfigured: productsDone,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Erro ao salvar status de onboarding no Firestore:', err);
      }
    }

    // Atualiza tenant local
    const localTenant = licenseService.getLocalTenant();
    if (localTenant) {
      localTenant.onboardingCompleted = true;
      localTenant.kgPricesConfigured = hasKg;
      localTenant.productsConfigured = productsDone;
      licenseService.saveLocalTenant(localTenant);
    }

    this.hide();

    if (this.onCompleteCallback) {
      this.onCompleteCallback({
        onboardingCompleted: true,
        kgPricesConfigured: hasKg,
        productsConfigured: productsDone,
        tenant: localTenant || this.tenant
      });
    }
  }
}
