/**
 * ==========================================================================
 * ORVIX PDV — MAIN ENTRY POINT & APPLICATION ORCHESTRATOR
 * ==========================================================================
 */

import './styles/main.css';
import { authService } from './services/auth.service.js';
import { licenseService } from './services/license.service.js';
import { posService } from './services/pos.service.js';
import { ordersService, OrdersService } from './services/orders.service.js';
import { cashService } from './services/cash.service.js';
import { productsService } from './services/products.service.js';
import { expensesService } from './services/expenses.service.js';
import { historyService } from './services/history.service.js';
import { PdfService } from './services/pdf.service.js';
import { LoginFormComponent } from './components/organisms/LoginForm.js';
import { PendingApprovalModalComponent } from './components/organisms/PendingApprovalModal.js';
import { StoreSelectModalComponent } from './components/organisms/StoreSelectModal.js';
import { OnboardingModalComponent } from './components/organisms/OnboardingModal.js';
import { confirmModal } from './components/organisms/ConfirmModal.js';
import { env } from './config/env.js';

class OrvixApp {
  constructor() {
    this.loginForm = new LoginFormComponent();
    this.pendingModal = new PendingApprovalModalComponent();
    this.storeSelectModal = new StoreSelectModalComponent();
    this.onboardingModal = new OnboardingModalComponent();
    this.DOM = {};
    this.state = {
      currentTab: 'venda',
      theme: localStorage.getItem('pdv_theme') || 'light',
      today: new Date().toISOString().split('T')[0],
      selectedHistoryDate: new Date().toISOString().split('T')[0],
      selectedExpenseDate: new Date().toISOString().split('T')[0],
      pendingDeleteAction: null,
      orderTimerInterval: null,
      liveClockInterval: null,
      currentOpenOrder: null,
      manualSaleCart: [],
      teamUnsubscribe: null,
      tenantUnsubscribe: null,
      catalogCategory: 'all',
      catalogSearch: ''
    };
  }

  init() {
    // 1. Inicializa componentes de autenticação e modais
    this.loginForm.mount();
    this.pendingModal.mount();
    this.storeSelectModal.mount();
    this.onboardingModal.mount();
    confirmModal.mount();
    this.onboardingModal.onTenantNameUpdated = () => {
      this.updateTenantHeader(licenseService.getLocalTenant());
    };

    // 2. Inicializa tema
    this.initTheme();

    // 3. Mapeia elementos DOM
    this.cacheDOM();

    // 4. Conecta eventos
    this.bindEvents();

    // 5. Inicia timers e cronômetros
    this.startLiveClock();
    this.startOrdersTimer();

    // 6. Renderiza toda a interface
    this.renderAll();

    // 7. Renderiza ícones Lucide
    if (window.lucide) {
      lucide.createIcons();
    }

    // 8. Escuta alterações de autenticação para controle multi-loja e onboarding
    this.initAuthAndStoreListener();

    console.info('[Orvix PDV] Aplicação inicializada com sucesso.');
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.state.theme);
    localStorage.setItem('pdv_theme', this.state.theme);
  }

  cacheDOM() {
    this.DOM = {
      // Header & Layout
      appLayout: document.getElementById('app-layout'),
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
      headerMenuBtn: document.getElementById('header-menu-btn'),
      sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
      appSidebar: document.getElementById('app-sidebar'),
      sidebarBackdrop: document.getElementById('sidebar-backdrop'),
      pageTitle: document.getElementById('page-title'),
      pageBreadcrumb: document.getElementById('page-breadcrumb'),
      currentTime: document.getElementById('current-time'),
      currentDate: document.getElementById('current-date'),
      headerCaixaBadge: document.getElementById('header-caixa-badge'),
      headerCaixaDot: document.getElementById('header-caixa-dot'),
      headerCaixaText: document.getElementById('header-caixa-text'),
      sidebarCaixaStatus: document.getElementById('sidebar-caixa-status'),
      discountBalloon: document.getElementById('discount-balloon'),
      discountDetails: document.getElementById('discount-details'),
      openOrdersCountBadge: document.getElementById('open-orders-count'),

      // PDV: Pesagem
      weightInput: document.getElementById('weight-input'),
      weightQtyInput: document.getElementById('weight-qty-input'),
      weightQtyMinus: document.getElementById('weight-qty-minus'),
      weightQtyPlus: document.getElementById('weight-qty-plus'),
      calculatedPrice: document.getElementById('calculated-price'),
      weightedProductPriceDisplay: document.getElementById('weighted-product-price-display'),
      addToCartBtn: document.getElementById('add-to-cart'),
      weightPresetsContainer: document.getElementById('weight-presets-container'),
      openWeightPresetsModalBtn: document.getElementById('open-weight-presets-modal-btn'),

      // PDV: Catálogo & Busca
      productSearch: document.getElementById('product-search'),
      productsCategoriesList: document.getElementById('products-categories-list'),
      productsGrid: document.getElementById('products-grid'),

      // PDV: Carrinho & Checkout
      cartItems: document.getElementById('cart-items'),
      subtotal: document.getElementById('subtotal'),
      total: document.getElementById('total'),
      cancelSaleBtn: document.getElementById('cancel-sale'),
      finishSaleBtn: document.getElementById('finish-sale'),
      confirmPaymentButton: document.getElementById('confirm-payment'),
      holdSaleButton: document.getElementById('hold-sale'),
      deliveryModeSelector: document.getElementById('delivery-mode-selector'),
      deliveryInfoSection: document.getElementById('delivery-info-section'),
      deliveryCustomerName: document.getElementById('delivery-customer-name'),
      deliveryCustomerAddress: document.getElementById('delivery-customer-address'),
      deliveryFee: document.getElementById('delivery-fee'),
      paymentOptions: document.querySelectorAll('#venda-tab .payment-option'),
      cashInputSection: document.getElementById('cash-input'),
      cashReceivedInput: document.getElementById('cash-received'),
      changeDisplay: document.getElementById('change-display'),
      changeAmount: document.getElementById('change-amount'),
      cashPresetsRow: document.getElementById('cash-presets-row'),

      // Comandas
      openOrdersGrid: document.getElementById('open-orders-grid'),

      // Histórico
      historyDate: document.getElementById('history-date'),
      salesHistoryList: document.getElementById('sales-history'),
      historyGrandTotal: document.getElementById('history-grand-total'),
      historyProductsTotal: document.getElementById('history-products-total'),
      historyDeliveryTotal: document.getElementById('history-delivery-total'),
      historyExpensesTotal: document.getElementById('history-expenses-total'),
      historyCashTotal: document.getElementById('history-cash-total'),
      historyCardTotal: document.getElementById('history-card-total'),
      historyPixTotal: document.getElementById('history-pix-total'),
      exportHistoryPdfBtn: document.getElementById('export-history-pdf'),
      addManualSaleBtn: document.getElementById('add-manual-sale-btn'),

      // Despesas
      expenseDate: document.getElementById('expense-date'),
      newExpenseName: document.getElementById('new-expense-name'),
      newExpenseDesc: document.getElementById('new-expense-desc'),
      newExpenseValue: document.getElementById('new-expense-value'),
      addNewExpenseBtn: document.getElementById('add-new-expense-btn'),
      expensesHistoryList: document.getElementById('expenses-history-list'),
      expensesTotalToday: document.getElementById('expenses-total-today'),

      // Caixa
      cashRegisterOpening: document.getElementById('cash-register-opening'),
      cashRegisterDashboard: document.getElementById('cash-register-dashboard'),
      openingBillsInput: document.getElementById('opening-bills'),
      openingCoinsInput: document.getElementById('opening-coins'),
      openingTotalDisplay: document.getElementById('opening-total-display'),
      btnOpenRegister: document.getElementById('btn-open-register'),
      btnCloseRegister: document.getElementById('btn-close-register'),
      btnEditOpenRegister: document.getElementById('btn-edit-open-register'),
      btnEditOpeningMetric: document.getElementById('btn-edit-opening-metric'),
      dashOpeningBalance: document.getElementById('dash-opening-balance'),
      dashCashSales: document.getElementById('dash-cash-sales'),
      dashExpenses: document.getElementById('dash-expenses'),
      dashCurrentBalance: document.getElementById('dash-current-balance'),
      dashCardTotal: document.getElementById('dash-card-total'),
      dashPixTotal: document.getElementById('dash-pix-total'),
      cashSessionsList: document.getElementById('cash-sessions-list'),
      cashSessionsCountLabel: document.getElementById('cash-sessions-count-label'),

      // Alerta de Preço Não Configurado
      priceNotConfiguredModal: document.getElementById('price-not-configured-modal'),
      btnClosePriceAlert: document.getElementById('btn-close-price-alert'),
      btnConfigPriceNow: document.getElementById('btn-config-price-now'),

      // Modais
      weightPresetsModal: document.getElementById('weight-presets-modal'),
      closeWeightPresetsBtn: document.getElementById('close-weight-presets-btn'),
      closeWeightPresetsIcon: document.getElementById('close-weight-presets-icon'),
      modalNewPresetWeight: document.getElementById('modal-new-preset-weight'),
      modalAddPresetBtn: document.getElementById('modal-add-preset-btn'),
      modalPresetChipsContainer: document.getElementById('modal-preset-chips-container'),
      modalResetPresetsBtn: document.getElementById('modal-reset-presets-btn'),

      passwordModal: document.getElementById('password-modal'),
      confirmDeletePasswordInput: document.getElementById('confirm-delete-password'),
      confirmDeleteBtn: document.getElementById('confirm-delete'),
      cancelDeleteBtn: document.getElementById('cancel-delete'),
      cancelDeleteIcon: document.getElementById('cancel-delete-icon'),

      receiptModal: document.getElementById('receipt-modal'),
      receiptContent: document.getElementById('receipt-content'),
      printReceiptBtn: document.getElementById('print-receipt-btn'),
      closeReceiptBtn: document.getElementById('close-receipt-btn'),
      closeReceiptIcon: document.getElementById('close-receipt-icon'),

      holdSaleModal: document.getElementById('hold-sale-modal'),
      customerNameInput: document.getElementById('customer-name'),
      existingOrderSelect: document.getElementById('existing-order-select'),
      saveHoldSaleBtn: document.getElementById('save-hold-sale-btn'),
      closeHoldSaleBtn: document.getElementById('close-hold-sale-btn'),
      closeHoldSaleIcon: document.getElementById('close-hold-sale-icon'),

      openOrderModal: document.getElementById('open-order-modal'),
      openOrderTitle: document.getElementById('open-order-title'),
      openOrderTimer: document.getElementById('open-order-timer'),
      openOrderItemsList: document.getElementById('open-order-items-list'),
      openOrderTotal: document.getElementById('open-order-total'),
      openOrderPaymentOptions: document.querySelectorAll('#open-order-payment-options .payment-option'),
      openOrderCashInput: document.getElementById('open-order-cash-input'),
      openOrderCashReceived: document.getElementById('open-order-cash-received'),
      openOrderChangeDisplay: document.getElementById('open-order-change-display'),
      openOrderChangeAmount: document.getElementById('open-order-change-amount'),
      confirmOpenOrderPaymentBtn: document.getElementById('confirm-open-order-payment'),
      deleteOpenOrderBtn: document.getElementById('delete-open-order-btn'),
      closeOpenOrderBtn: document.getElementById('close-open-order-btn'),
      closeOpenOrderIcon: document.getElementById('close-open-order-icon'),

      // Venda Manual
      manualSaleModal: document.getElementById('manual-sale-modal'),
      closeManualSaleIcon: document.getElementById('close-manual-sale-icon'),
      closeManualSaleBtn: document.getElementById('close-manual-sale-btn'),
      manualProductSelect: document.getElementById('manual-product-select'),
      manualAcaiWeightSection: document.getElementById('manual-acai-weight-section'),
      manualAcaiWeightInput: document.getElementById('manual-acai-weight'),
      manualAddItemBtn: document.getElementById('manual-add-item-btn'),
      manualSaleCartItems: document.getElementById('manual-sale-cart-items'),
      manualSaleSummary: document.getElementById('manual-sale-summary'),
      manualSaleTotal: document.getElementById('manual-sale-total'),
      manualPaymentOptions: document.querySelectorAll('#manual-payment-options .payment-option'),
      saveManualSaleBtn: document.getElementById('save-manual-sale-btn'),

      // Produtos
      productsCatalogFullGrid: document.getElementById('products-catalog-full-grid'),
      productViewSearch: document.getElementById('product-view-search'),
      productViewCategoryFilters: document.getElementById('product-view-category-filters'),
      productViewCount: document.getElementById('product-view-count'),
      productCountNumber: document.getElementById('product-count-number'),
      openAddProductModalBtn: document.getElementById('open-add-product-modal-btn'),
      addProductModal: document.getElementById('add-product-modal'),
      closeAddProductBtn: document.getElementById('close-add-product-btn'),
      closeAddProductIcon: document.getElementById('close-add-product-icon'),
      saveNewProductModalBtn: document.getElementById('save-new-product-modal-btn'),
      modalNewProductName: document.getElementById('modal-new-product-name'),
      modalNewProductPrice: document.getElementById('modal-new-product-price'),
      modalNewProductCategory: document.getElementById('modal-new-product-category'),

      editProductModal: document.getElementById('edit-product-modal'),
      closeEditProductBtn: document.getElementById('close-edit-product-btn'),
      closeEditProductIcon: document.getElementById('close-edit-product-icon'),
      saveEditProductModalBtn: document.getElementById('save-edit-product-modal-btn'),
      modalEditProductId: document.getElementById('modal-edit-product-id'),
      modalEditProductName: document.getElementById('modal-edit-product-name'),
      modalEditProductPrice: document.getElementById('modal-edit-product-price'),
      modalEditProductCategory: document.getElementById('modal-edit-product-category'),

      // Admin
      acaiPriceInput: document.getElementById('acai-price'),
      sorvetePriceInput: document.getElementById('sorvete-price'),
      updateAcaiPriceBtn: document.getElementById('update-acai-price'),
      updateSorvetePriceBtn: document.getElementById('update-sorvete-price'),
      currentDeletePasswordInput: document.getElementById('current-delete-password'),
      newDeletePasswordInput: document.getElementById('new-delete-password'),
      confirmNewDeletePasswordInput: document.getElementById('confirm-new-delete-password'),
      updateDeletePasswordBtn: document.getElementById('update-delete-password'),
      adminNewPresetWeight: document.getElementById('admin-new-preset-weight'),
      adminAddPresetBtn: document.getElementById('admin-add-preset-btn'),
      adminPresetChipsContainer: document.getElementById('admin-preset-chips-container'),
      adminResetPresetsBtn: document.getElementById('admin-reset-presets-btn'),
      discountActiveCheck: document.getElementById('discount-active-check'),
      discountConfigArea: document.getElementById('discount-config-area'),
      promoMasterToggleCard: document.querySelector('.promo-master-toggle-card'),
      discountPercentageInput: document.getElementById('discount-percentage'),
      discountTargetAcai: document.getElementById('discount-target-acai'),
      discountTargetSorvete: document.getElementById('discount-target-sorvete'),
      discountTimeModeAll: document.getElementById('discount-time-mode-all'),
      discountTimeModeCustom: document.getElementById('discount-time-mode-custom'),
      labelTimeAllDay: document.getElementById('label-time-all-day'),
      labelTimeCustom: document.getElementById('label-time-custom'),
      promoCustomTimeBox: document.getElementById('promo-custom-time-box'),
      promoTimeHint: document.getElementById('promo-time-hint'),
      discountStartTime: document.getElementById('discount-start-time'),
      discountEndTime: document.getElementById('discount-end-time'),
      promoStatusBanner: document.getElementById('promo-current-status-banner'),
      saveDiscountConfigBtn: document.getElementById('save-discount-config'),
      btnSelectAllDays: document.getElementById('btn-select-all-days'),
      btnSelectWeekdays: document.getElementById('btn-select-weekdays'),
      btnSelectWeekends: document.getElementById('btn-select-weekends'),
      mobilePromoBanner: document.getElementById('mobile-promo-banner'),
      mobilePromoDetails: document.getElementById('mobile-promo-details'),
      generateMonthlyReportPdfBtn: document.getElementById('generate-monthly-report-pdf'),

      // Equipe & Licenças
      adminTenantName: document.getElementById('admin-tenant-name'),
      adminTenantPlan: document.getElementById('admin-tenant-plan'),
      adminTenantStatusBadge: document.getElementById('admin-tenant-status-badge'),
      btnOpenEditTenantModal: document.getElementById('btn-open-edit-tenant-modal'),
      editTenantModal: document.getElementById('edit-tenant-modal'),
      closeEditTenantBtn: document.getElementById('close-edit-tenant-btn'),
      closeEditTenantIcon: document.getElementById('close-edit-tenant-icon'),
      saveEditTenantBtn: document.getElementById('save-edit-tenant-btn'),
      modalEditTenantName: document.getElementById('modal-edit-tenant-name'),
      tenantNameCharCount: document.getElementById('tenant-name-char-count'),
      adminDisplayInviteCode: document.getElementById('admin-display-invite-code'),
      btnCopyInviteCode: document.getElementById('btn-copy-invite-code'),
      btnCopyInviteText: document.getElementById('btn-copy-invite-text'),
      btnRegenerateInviteCode: document.getElementById('btn-regenerate-invite-code'),
      adminTeamListContainer: document.getElementById('admin-team-list-container'),
      adminTeamCountText: document.getElementById('admin-team-count-text'),
      adminTeamPendingCount: document.getElementById('admin-team-pending-count')
    };
  }

  bindEvents() {
    // 1. Tema & Drawer
    this.DOM.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());

    this.DOM.headerMenuBtn?.addEventListener('click', () => {
      this.DOM.appSidebar?.classList.add('open');
      this.DOM.sidebarBackdrop?.classList.add('show');
    });

    const closeSidebar = () => {
      this.DOM.appSidebar?.classList.remove('open');
      this.DOM.sidebarBackdrop?.classList.remove('show');
    };
    this.DOM.sidebarCloseBtn?.addEventListener('click', closeSidebar);
    this.DOM.sidebarBackdrop?.addEventListener('click', closeSidebar);

    // 2. Navegação por Abas
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
        closeSidebar();
      });
    });

    this.DOM.headerCaixaBadge?.addEventListener('click', () => this.switchTab('caixa'));

    // 3. PDV: Tipo de Produto Pesado (Açaí vs Sorvete)
    document.querySelectorAll('.product-type-selector .quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.product-type-selector .quick-add-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        posService.currentWeightedProduct = e.currentTarget.dataset.type;
        this.updateCalculatedPrice();
      });
    });

    // 4. PDV: Entrada de Peso & Quantidade
    this.DOM.weightInput?.addEventListener('input', () => this.updateCalculatedPrice());
    this.DOM.weightInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddWeightedItem();
    });

    this.DOM.weightQtyMinus?.addEventListener('click', () => {
      let cur = parseInt(this.DOM.weightQtyInput.value, 10) || 1;
      if (cur > 1) {
        this.DOM.weightQtyInput.value = cur - 1;
        this.updateCalculatedPrice();
      }
    });

    this.DOM.weightQtyPlus?.addEventListener('click', () => {
      let cur = parseInt(this.DOM.weightQtyInput.value, 10) || 1;
      this.DOM.weightQtyInput.value = cur + 1;
      this.updateCalculatedPrice();
    });

    this.DOM.weightQtyInput?.addEventListener('input', () => this.updateCalculatedPrice());
    this.DOM.addToCartBtn?.addEventListener('click', () => this.handleAddWeightedItem());

    // 5. PDV: Atalhos de Peso
    this.DOM.openWeightPresetsModalBtn?.addEventListener('click', () => this.openPresetsModal());
    this.DOM.closeWeightPresetsBtn?.addEventListener('click', () => this.closePresetsModal());
    this.DOM.closeWeightPresetsIcon?.addEventListener('click', () => this.closePresetsModal());
    this.DOM.modalAddPresetBtn?.addEventListener('click', () => {
      const val = parseInt(this.DOM.modalNewPresetWeight.value, 10);
      try {
        productsService.addWeightPreset(val);
        this.DOM.modalNewPresetWeight.value = '';
        this.renderWeightPresets();
        this.showToast('Atalho de peso adicionado!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
    this.DOM.modalResetPresetsBtn?.addEventListener('click', () => {
      productsService.resetWeightPresets();
      this.renderWeightPresets();
      this.showToast('Atalhos restaurados para o padrão!', 'info');
    });

    // 6. PDV: Entrega vs Balcão
    document.querySelectorAll('.delivery-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.delivery-mode-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        posService.deliveryMode = e.currentTarget.dataset.mode;
        if (this.DOM.deliveryInfoSection) {
          this.DOM.deliveryInfoSection.style.display = posService.deliveryMode === 'entrega' ? 'block' : 'none';
        }
        this.renderCart();
      });
    });

    this.DOM.deliveryFee?.addEventListener('input', () => this.renderCart());

    // 7. PDV: Formas de Pagamento & Troco
    const paymentMap = {
      cash: 'Dinheiro',
      card: 'Cartão',
      pix: 'PIX'
    };

    this.DOM.paymentOptions?.forEach(opt => {
      opt.addEventListener('click', (e) => {
        this.DOM.paymentOptions.forEach(o => o.classList.remove('active', 'selected'));
        const target = e.currentTarget;
        target.classList.add('active', 'selected');
        const raw = target.dataset.method;
        posService.currentPaymentMethod = paymentMap[raw] || raw || 'Dinheiro';
        if (this.DOM.cashInputSection) {
          this.DOM.cashInputSection.style.display = (raw === 'cash' || posService.currentPaymentMethod === 'Dinheiro') ? 'block' : 'none';
        }
        this.updateChange();
      });
    });

    this.DOM.cashReceivedInput?.addEventListener('input', () => this.updateChange());
    this.DOM.cashReceivedInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleConfirmSale();
      }
    });

    // Atalhos de Dinheiro Rápido
    this.DOM.cashPresetsRow?.querySelectorAll('.cash-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        const total = posService.getCartTotal(this.DOM.deliveryFee?.value || 0);
        if (preset === 'exact') {
          this.DOM.cashReceivedInput.value = total.toFixed(2);
        } else {
          this.DOM.cashReceivedInput.value = parseFloat(preset).toFixed(2);
        }
        this.updateChange();
      });
    });

    // 8. PDV: Checkout e Finalização
    this.DOM.finishSaleBtn?.addEventListener('click', () => this.handleConfirmSale());
    this.DOM.confirmPaymentButton?.addEventListener('click', () => this.handleConfirmSale());
    this.DOM.cancelSaleBtn?.addEventListener('click', async () => {
      const confirmed = await confirmModal.show({
        title: 'Limpar Carrinho',
        message: 'Deseja realmente cancelar a venda e remover todos os itens do carrinho?',
        confirmText: 'Sim, Limpar',
        cancelText: 'Voltar',
        type: 'warning',
        icon: 'shopping-cart'
      });
      if (confirmed) {
        posService.clearCart();
        this.renderCart();
        this.showToast('Venda cancelada.', 'info');
      }
    });

    this.DOM.holdSaleButton?.addEventListener('click', () => this.openHoldSaleModal());
    this.DOM.saveHoldSaleBtn?.addEventListener('click', () => this.handleSaveHoldSale());
    this.DOM.closeHoldSaleBtn?.addEventListener('click', () => this.closeHoldSaleModal());
    this.DOM.closeHoldSaleIcon?.addEventListener('click', () => this.closeHoldSaleModal());

    // 8.1 Modal de Comanda Aberta (Recebimento / Exclusão)
    this.DOM.openOrdersGrid?.addEventListener('click', (e) => {
      const card = e.target.closest('.open-order-card');
      if (card) {
        const orderId = Number(card.dataset.id);
        this.openOpenOrderModal(orderId);
      }
    });

    this.DOM.openOrderPaymentOptions?.forEach(opt => {
      opt.addEventListener('click', (e) => {
        this.DOM.openOrderPaymentOptions.forEach(o => o.classList.remove('active', 'selected'));
        const target = e.currentTarget;
        target.classList.add('active', 'selected');
        const raw = target.dataset.method;
        this.state.openOrderPaymentMethod = paymentMap[raw] || raw || 'Dinheiro';
        if (this.DOM.openOrderCashInput) {
          this.DOM.openOrderCashInput.style.display = (raw === 'cash' || this.state.openOrderPaymentMethod === 'Dinheiro') ? 'block' : 'none';
        }
        this.calculateOpenOrderChange();
      });
    });

    this.DOM.openOrderCashReceived?.addEventListener('input', () => this.calculateOpenOrderChange());
    this.DOM.openOrderCashReceived?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleFinalizeOpenOrder();
      }
    });
    this.DOM.confirmOpenOrderPaymentBtn?.addEventListener('click', () => this.handleFinalizeOpenOrder());
    this.DOM.deleteOpenOrderBtn?.addEventListener('click', () => this.handleDeleteOpenOrder());
    this.DOM.closeOpenOrderBtn?.addEventListener('click', () => this.closeOpenOrderModal());
    this.DOM.closeOpenOrderIcon?.addEventListener('click', () => this.closeOpenOrderModal());

    // 8.2 Modal de Recibo Térmico
    this.DOM.printReceiptBtn?.addEventListener('click', () => {
      if (this.state.lastSale) {
        PdfService.printReceipt(this.state.lastSale);
      }
    });
    this.DOM.closeReceiptBtn?.addEventListener('click', () => {
      if (this.DOM.receiptModal) this.DOM.receiptModal.style.display = 'none';
    });
    this.DOM.closeReceiptIcon?.addEventListener('click', () => {
      if (this.DOM.receiptModal) this.DOM.receiptModal.style.display = 'none';
    });

    // 8.3 Modal de Venda Manual (Histórico)
    this.DOM.addManualSaleBtn?.addEventListener('click', () => this.openManualSaleModal());
    this.DOM.closeManualSaleBtn?.addEventListener('click', () => this.closeManualSaleModal());
    this.DOM.closeManualSaleIcon?.addEventListener('click', () => this.closeManualSaleModal());
    this.DOM.manualProductSelect?.addEventListener('change', (e) => {
      const isWeight = e.target.value === 'acai_weight' || e.target.value === 'sorvete_weight';
      if (this.DOM.manualAcaiWeightSection) {
        this.DOM.manualAcaiWeightSection.style.display = isWeight ? 'block' : 'none';
      }
    });
    this.DOM.manualAddItemBtn?.addEventListener('click', () => this.handleManualAddItem());
    this.DOM.manualPaymentOptions?.forEach(opt => {
      opt.addEventListener('click', (e) => {
        this.DOM.manualPaymentOptions.forEach(o => o.classList.remove('active', 'selected'));
        const target = e.currentTarget;
        target.classList.add('active', 'selected');
        const raw = target.dataset.method;
        this.state.manualSalePaymentMethod = paymentMap[raw] || raw || 'Dinheiro';
      });
    });
    this.DOM.saveManualSaleBtn?.addEventListener('click', () => this.handleSaveManualSale());

    // 9. Delegação Global para Itens do Carrinho e Grid
    document.addEventListener('click', (e) => {
      // Remover do carrinho
      const removeBtn = e.target.closest('.cart-item .btn-remove');
      if (removeBtn) {
        posService.removeItemFromCart(removeBtn.dataset.index);
        this.renderCart();
        return;
      }
      // Alterar quantidade no carrinho
      const minusBtn = e.target.closest('.cart-item .btn-qty-minus');
      if (minusBtn) {
        posService.updateItemQuantity(minusBtn.dataset.index, -1);
        this.renderCart();
        return;
      }
      const plusBtn = e.target.closest('.cart-item .btn-qty-plus');
      if (plusBtn) {
        posService.updateItemQuantity(plusBtn.dataset.index, 1);
        this.renderCart();
        return;
      }

      // Adicionar produto rápido do grid
      const prodCard = e.target.closest('.product-item-card');
      if (prodCard) {
        const pid = Number(prodCard.dataset.id);
        posService.addFixedProductToCart(pid);
        this.renderCart();
        this.showToast('Item adicionado ao carrinho!', 'success');
        return;
      }

      // Atalho de peso chip no PDV
      const chip = e.target.closest('#weight-presets-container button, .presets-buttons button, .preset-btn, .preset-chip');
      if (chip && !e.target.closest('.preset-chip-remove') && !e.target.closest('#modal-preset-chips-container') && !e.target.closest('#admin-preset-chips-container')) {
        const grams = chip.dataset.grams || chip.dataset.weight;
        if (grams && this.DOM.weightInput) {
          this.DOM.weightInput.value = grams;
          this.updateCalculatedPrice();
          this.DOM.weightInput.focus();
        }
        return;
      }
    });

    // 10. Caixa Handlers
    this.DOM.openingBillsInput?.addEventListener('input', () => this.updateOpeningTotalDisplay());
    this.DOM.openingCoinsInput?.addEventListener('input', () => this.updateOpeningTotalDisplay());
    this.DOM.btnOpenRegister?.addEventListener('click', () => this.handleOpenRegister());
    this.DOM.btnCloseRegister?.addEventListener('click', () => this.handleCloseRegister());

    // 11. Despesas
    this.DOM.addNewExpenseBtn?.addEventListener('click', () => this.handleAddExpense());
    this.DOM.expenseDate?.addEventListener('change', (e) => {
      this.state.selectedExpenseDate = e.target.value;
      this.renderExpenses();
    });

    // 12. Histórico
    this.DOM.historyDate?.addEventListener('change', (e) => {
      this.state.selectedHistoryDate = e.target.value;
      this.renderHistory();
    });
    this.DOM.exportHistoryPdfBtn?.addEventListener('click', () => this.handleExportHistoryPdf());

    // 13. Admin
    this.DOM.updateAcaiPriceBtn?.addEventListener('click', () => {
      try {
        const p = productsService.updateAcaiPrice(this.DOM.acaiPriceInput.value);
        this.showToast(`Preço do Açaí atualizado para R$ ${p.toFixed(2)}/kg`, 'success');
        this.updateCalculatedPrice();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    this.DOM.updateSorvetePriceBtn?.addEventListener('click', () => {
      try {
        const p = productsService.updateSorvetePrice(this.DOM.sorvetePriceInput.value);
        this.showToast(`Preço do Sorvete atualizado para R$ ${p.toFixed(2)}/kg`, 'success');
        this.updateCalculatedPrice();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    this.DOM.updateDeletePasswordBtn?.addEventListener('click', () => {
      try {
        productsService.updateDeletePassword(
          this.DOM.currentDeletePasswordInput.value,
          this.DOM.newDeletePasswordInput.value,
          this.DOM.confirmNewDeletePasswordInput.value
        );
        this.DOM.currentDeletePasswordInput.value = '';
        this.DOM.newDeletePasswordInput.value = '';
        this.DOM.confirmNewDeletePasswordInput.value = '';
        this.showToast('Senha de exclusão alterada com sucesso!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    this.DOM.adminAddPresetBtn?.addEventListener('click', () => {
      const val = parseInt(this.DOM.adminNewPresetWeight?.value, 10);
      try {
        productsService.addWeightPreset(val);
        if (this.DOM.adminNewPresetWeight) this.DOM.adminNewPresetWeight.value = '';
        this.renderWeightPresets();
        this.showToast('Atalho de peso adicionado!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    this.DOM.adminResetPresetsBtn?.addEventListener('click', () => {
      productsService.resetWeightPresets();
      this.renderWeightPresets();
      this.showToast('Atalhos restaurados para o padrão!', 'info');
    });

    // 14. Recibo Modal
    this.DOM.printReceiptBtn?.addEventListener('click', () => {
      if (this.state.lastSale) {
        PdfService.printReceipt(this.state.lastSale);
      }
    });
    this.DOM.closeReceiptBtn?.addEventListener('click', () => {
      if (this.DOM.receiptModal) this.DOM.receiptModal.style.display = 'none';
    });
    this.DOM.closeReceiptIcon?.addEventListener('click', () => {
      if (this.DOM.receiptModal) this.DOM.receiptModal.style.display = 'none';
    });

    // 15. Sub-abas Admin
    document.querySelectorAll('.admin-sub-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.admin-sub-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-sub-content').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const sub = e.currentTarget.dataset.subtab;
        const target = document.getElementById(`admin-${sub}-content`);
        if (target) target.classList.add('active');
        if (sub === 'promocoes') {
          this.renderDiscountControls();
        }
      });
    });

    // 15.1 Promoções & Descontos
    this.DOM.discountActiveCheck?.addEventListener('change', (e) => this.handleToggleDiscount(e));

    this.DOM.promoMasterToggleCard?.addEventListener('click', (e) => {
      if (!e.target.closest('.switch') && this.DOM.discountActiveCheck) {
        this.DOM.discountActiveCheck.checked = !this.DOM.discountActiveCheck.checked;
        this.handleToggleDiscount({ target: this.DOM.discountActiveCheck });
      }
    });

    this.DOM.saveDiscountConfigBtn?.addEventListener('click', () => this.handleSaveDiscountConfig());

    document.querySelectorAll('.promo-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const percent = e.currentTarget.dataset.percent;
        if (this.DOM.discountPercentageInput) {
          this.DOM.discountPercentageInput.value = percent;
          document.querySelectorAll('.promo-quick-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
        }
      });
    });

    this.DOM.discountPercentageInput?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.querySelectorAll('.promo-quick-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.percent) === val);
      });
    });

    const handlePromoTimeModeChange = () => {
      const isAllDay = this.DOM.discountTimeModeAll?.checked;
      if (this.DOM.labelTimeAllDay) this.DOM.labelTimeAllDay.classList.toggle('active', Boolean(isAllDay));
      if (this.DOM.labelTimeCustom) this.DOM.labelTimeCustom.classList.toggle('active', !isAllDay);
      if (this.DOM.promoCustomTimeBox) {
        this.DOM.promoCustomTimeBox.classList.toggle('disabled', Boolean(isAllDay));
      }
      this.validatePromoTimeRange();
    };
    this.DOM.discountTimeModeAll?.addEventListener('change', handlePromoTimeModeChange);
    this.DOM.discountTimeModeCustom?.addEventListener('change', handlePromoTimeModeChange);

    this.DOM.discountStartTime?.addEventListener('input', () => this.validatePromoTimeRange());
    this.DOM.discountStartTime?.addEventListener('change', () => this.validatePromoTimeRange());
    this.DOM.discountEndTime?.addEventListener('input', () => this.validatePromoTimeRange());
    this.DOM.discountEndTime?.addEventListener('change', () => this.validatePromoTimeRange());

    document.querySelectorAll('.promo-time-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const start = e.currentTarget.dataset.start;
        const end = e.currentTarget.dataset.end;
        if (this.DOM.discountStartTime) this.DOM.discountStartTime.value = start;
        if (this.DOM.discountEndTime) this.DOM.discountEndTime.value = end;
        if (this.DOM.discountTimeModeCustom) {
          this.DOM.discountTimeModeCustom.checked = true;
          handlePromoTimeModeChange();
        }
        this.validatePromoTimeRange();
      });
    });

    this.DOM.btnSelectAllDays?.addEventListener('click', () => {
      document.querySelectorAll('input[name="discount-day"]').forEach(cb => cb.checked = true);
    });
    this.DOM.btnSelectWeekdays?.addEventListener('click', () => {
      document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
        const d = parseInt(cb.value, 10);
        cb.checked = (d >= 1 && d <= 5);
      });
    });
    this.DOM.btnSelectWeekends?.addEventListener('click', () => {
      document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
        const d = parseInt(cb.value, 10);
        cb.checked = (d === 0 || d === 6);
      });
    });

    // 16. Equipe & Licenças: Copiar e Gerar Código de Convite
    this.DOM.btnCopyInviteCode?.addEventListener('click', () => {
      const code = this.DOM.adminDisplayInviteCode?.innerText || '';
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          if (this.DOM.btnCopyInviteText) this.DOM.btnCopyInviteText.innerText = 'Copiado!';
          this.showToast(`Código "${code}" copiado para a área de transferência!`, 'success');
          setTimeout(() => {
            if (this.DOM.btnCopyInviteText) this.DOM.btnCopyInviteText.innerText = 'Copiar Código';
          }, 2000);
        }).catch(() => {
          this.showToast('Erro ao copiar código.', 'error');
        });
      }
    });

    this.DOM.btnRegenerateInviteCode?.addEventListener('click', async () => {
      const confirmed = await confirmModal.show({
        title: 'Novo Código de Convite',
        message: 'Deseja gerar um novo código de convite para a equipe? O código anterior deixará de funcionar para novos cadastros.',
        confirmText: 'Gerar Novo Código',
        cancelText: 'Cancelar',
        type: 'warning',
        icon: 'refresh-cw'
      });
      if (confirmed) {
        const tenant = licenseService.getLocalTenant();
        const newCode = await licenseService.regenerateInviteCode(tenant?.id);
        if (this.DOM.adminDisplayInviteCode) {
          this.DOM.adminDisplayInviteCode.innerText = newCode;
        }
        this.showToast(`Novo código "${newCode}" gerado com sucesso!`, 'success');
      }
    });

    // 17. Equipe & Licenças: Delegação de Ações de Membros
    this.DOM.adminTeamListContainer?.addEventListener('click', async (e) => {
      // Aprovar Usuário
      const approveBtn = e.target.closest('.btn-approve');
      if (approveBtn) {
        const uid = approveBtn.dataset.uid;
        const name = approveBtn.dataset.name || 'usuário';
        try {
          await licenseService.approveUser(uid, 'Operador PDV');
          this.showToast(`Acesso de "${name}" aprovado com sucesso!`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
        return;
      }

      // Alternar Cargo (Administrador <-> Operador PDV)
      const roleToggleBtn = e.target.closest('.btn-role-toggle');
      if (roleToggleBtn) {
        const uid = roleToggleBtn.dataset.uid;
        const currentRole = roleToggleBtn.dataset.role;
        const newRole = currentRole === 'Administrador' ? 'Operador PDV' : 'Administrador';
        try {
          await licenseService.updateUserRole(uid, newRole);
          this.showToast(`Cargo atualizado para "${newRole}" com sucesso!`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
        return;
      }

      // Bloquear Usuário
      const blockBtn = e.target.closest('.btn-block-user');
      if (blockBtn) {
        const uid = blockBtn.dataset.uid;
        const name = blockBtn.dataset.name || 'usuário';
        const confirmed = await confirmModal.show({
          title: 'Suspender Acesso',
          message: `Deseja suspender temporariamente o acesso do colaborador <strong>"${name}"</strong>?`,
          confirmText: 'Sim, Suspender',
          cancelText: 'Cancelar',
          type: 'warning',
          icon: 'user-x'
        });
        if (confirmed) {
          try {
            await licenseService.updateUserStatus(uid, 'bloqueado');
            this.showToast(`Acesso de "${name}" suspenso.`, 'warning');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }

      // Desbloquear / Reativar Usuário
      const unblockBtn = e.target.closest('.btn-unblock-user');
      if (unblockBtn) {
        const uid = unblockBtn.dataset.uid;
        const name = unblockBtn.dataset.name || 'usuário';
        try {
          await licenseService.updateUserStatus(uid, 'ativo');
          this.showToast(`Acesso de "${name}" reativado!`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
        return;
      }

      // Remover da Loja
      const removeBtn = e.target.closest('.btn-remove-user');
      if (removeBtn) {
        const uid = removeBtn.dataset.uid;
        const name = removeBtn.dataset.name || 'usuário';
        const confirmed = await confirmModal.show({
          title: 'Desvincular Colaborador',
          message: `Deseja desvincular <strong>"${name}"</strong> deste estabelecimento? O usuário não terá mais acesso a esta loja.`,
          confirmText: 'Sim, Desvincular',
          cancelText: 'Cancelar',
          type: 'danger',
          icon: 'user-minus'
        });
        if (confirmed) {
          try {
            await licenseService.removeUser(uid);
            this.showToast(`Membro "${name}" desvinculado com sucesso.`, 'info');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }
    });

    // 17.1 Edição do Nome do Estabelecimento (Restrito a Administradores)
    this.DOM.btnOpenEditTenantModal?.addEventListener('click', () => this.openEditTenantModal());
    this.DOM.closeEditTenantBtn?.addEventListener('click', () => this.closeEditTenantModal());
    this.DOM.closeEditTenantIcon?.addEventListener('click', () => this.closeEditTenantModal());
    this.DOM.editTenantModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.editTenantModal) this.closeEditTenantModal();
    });
    this.DOM.modalEditTenantName?.addEventListener('input', () => this.updateTenantCharCount());
    this.DOM.modalEditTenantName?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSaveTenantName();
      }
    });
    this.DOM.saveEditTenantBtn?.addEventListener('click', () => this.handleSaveTenantName());

    // 18. Produtos: Busca e Filtro de Categorias
    this.DOM.productViewSearch?.addEventListener('input', (e) => {
      this.state.catalogSearch = (e.target.value || '').toLowerCase().trim();
      this.renderProductsGrid();
    });

    this.DOM.productViewCategoryFilters?.addEventListener('click', (e) => {
      const pill = e.target.closest('.prod-cat-pill');
      if (pill) {
        this.state.catalogCategory = pill.dataset.category || 'all';
        this.renderProductsGrid();
      }
    });

    // 19. Produtos: Modal Novo Produto
    const openAddModal = () => {
      if (this.DOM.modalNewProductName) this.DOM.modalNewProductName.value = '';
      if (this.DOM.modalNewProductPrice) this.DOM.modalNewProductPrice.value = '';
      if (this.DOM.modalNewProductCategory) this.DOM.modalNewProductCategory.value = '';
      if (this.DOM.addProductModal) this.DOM.addProductModal.style.display = 'flex';
      this.DOM.modalNewProductName?.focus();
    };

    const closeAddModal = () => {
      if (this.DOM.addProductModal) this.DOM.addProductModal.style.display = 'none';
    };

    this.DOM.openAddProductModalBtn?.addEventListener('click', openAddModal);
    this.DOM.closeAddProductBtn?.addEventListener('click', closeAddModal);
    this.DOM.closeAddProductIcon?.addEventListener('click', closeAddModal);
    this.DOM.addProductModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.addProductModal) closeAddModal();
    });

    this.DOM.saveNewProductModalBtn?.addEventListener('click', () => {
      const name = this.DOM.modalNewProductName?.value;
      const price = this.DOM.modalNewProductPrice?.value;
      const category = this.DOM.modalNewProductCategory?.value;
      try {
        productsService.addProduct(name, price, category);
        closeAddModal();
        this.renderProductsGrid();
        this.showToast(`Produto "${name}" cadastrado com sucesso!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 20. Produtos: Modal Editar Produto
    const closeEditModal = () => {
      if (this.DOM.editProductModal) this.DOM.editProductModal.style.display = 'none';
    };

    this.DOM.closeEditProductBtn?.addEventListener('click', closeEditModal);
    this.DOM.closeEditProductIcon?.addEventListener('click', closeEditModal);
    this.DOM.editProductModal?.addEventListener('click', (e) => {
      if (e.target === this.DOM.editProductModal) closeEditModal();
    });

    this.DOM.saveEditProductModalBtn?.addEventListener('click', () => {
      const id = this.DOM.modalEditProductId?.value;
      const name = this.DOM.modalEditProductName?.value;
      const price = this.DOM.modalEditProductPrice?.value;
      const category = this.DOM.modalEditProductCategory?.value;
      try {
        productsService.updateProduct(id, name, price, category);
        closeEditModal();
        this.renderProductsGrid();
        this.showToast(`Produto "${name}" atualizado com sucesso!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // 21. Produtos: Ações nos Cards (Stepper, Editar, Vender, Excluir)
    this.DOM.productsCatalogFullGrid?.addEventListener('click', async (e) => {
      // Diminuir Quantidade
      const minusBtn = e.target.closest('.btn-catalog-minus');
      if (minusBtn) {
        const id = minusBtn.dataset.id;
        const input = document.getElementById(`catalog-qty-${id}`);
        if (input) {
          let val = parseInt(input.value, 10) || 1;
          if (val > 1) {
            input.value = val - 1;
          }
        }
        return;
      }

      // Aumentar Quantidade
      const plusBtn = e.target.closest('.btn-catalog-plus');
      if (plusBtn) {
        const id = plusBtn.dataset.id;
        const input = document.getElementById(`catalog-qty-${id}`);
        if (input) {
          let val = parseInt(input.value, 10) || 1;
          input.value = val + 1;
        }
        return;
      }

      // Editar Produto
      const editBtn = e.target.closest('.btn-card-edit');
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const product = productsService.getProductById(id);
        if (product) {
          if (this.DOM.modalEditProductId) this.DOM.modalEditProductId.value = product.id;
          if (this.DOM.modalEditProductName) this.DOM.modalEditProductName.value = product.name;
          if (this.DOM.modalEditProductPrice) this.DOM.modalEditProductPrice.value = product.price.toFixed(2);
          if (this.DOM.modalEditProductCategory) this.DOM.modalEditProductCategory.value = product.category || '';
          if (this.DOM.editProductModal) this.DOM.editProductModal.style.display = 'flex';
          this.DOM.modalEditProductName?.focus();
        }
        return;
      }

      // Vender Produto (Adiciona ao carrinho com a quantidade selecionada e atualiza o estado)
      const sellBtn = e.target.closest('.btn-card-sell');
      if (sellBtn) {
        const id = Number(sellBtn.dataset.id);
        const input = document.getElementById(`catalog-qty-${id}`);
        const qty = parseInt(input?.value, 10) || 1;
        const product = productsService.getProductById(id);

        try {
          posService.addFixedProductToCart(id, qty);
          this.renderCart();
          this.renderProductsGrid();
          const totalInCart = posService.getCartItemQuantity(id);
          this.showToast(`${product ? product.name : 'Produto'} adicionado ao carrinho (${totalInCart} no carrinho)`, 'success');
        } catch (err) {
          this.showToast(err.message, 'error');
        }
        return;
      }

      // Excluir Produto
      const delBtn = e.target.closest('.btn-card-delete');
      if (delBtn) {
        const id = Number(delBtn.dataset.id);
        const product = productsService.getProductById(id);
        const name = product ? product.name : 'este produto';
        const confirmed = await confirmModal.show({
          title: 'Excluir Produto',
          message: `Deseja realmente excluir <strong>"${name}"</strong> do catálogo? Esta ação não pode ser desfeita.`,
          confirmText: 'Sim, Excluir',
          cancelText: 'Cancelar',
          type: 'danger',
          icon: 'trash-2'
        });
        if (confirmed) {
          try {
            productsService.deleteProduct(id);
            this.renderProductsGrid();
            this.showToast(`Produto "${name}" excluído com sucesso.`, 'info');
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
        return;
      }
    });
  }

  switchTab(tabName) {
    this.state.currentTab = tabName;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `${tabName}-tab`);
    });

    if (tabName === 'produtos') {
      this.renderProductsGrid();
    }
    if (tabName === 'admin') {
      this.renderDiscountControls();
    }
    if (tabName === 'venda') {
      this.updateCalculatedPrice();
      this.renderDiscountBalloon();
    }
    if (tabName === 'comandas') {
      this.renderOrders();
    }

    const titles = {
      venda: 'Ponto de Venda',
      comandas: 'Comandas em Aberto',
      caixa: 'Fluxo de Caixa',
      produtos: 'Gestão de Produtos',
      historico: 'Histórico de Vendas',
      despesas: 'Controle de Despesas',
      admin: 'Painel Administrativo'
    };

    if (this.DOM.pageTitle) {
      this.DOM.pageTitle.innerText = titles[tabName] || 'Orvix PDV';
    }

    if (window.lucide) lucide.createIcons();
  }

  updateCalculatedPrice() {
    const weight = parseFloat(this.DOM.weightInput?.value) || 0;
    const qty = parseInt(this.DOM.weightQtyInput?.value, 10) || 1;
    const calc = posService.calculateWeightedPrice(weight, qty);

    if (this.DOM.calculatedPrice) {
      this.DOM.calculatedPrice.innerText = `R$ ${calc.totalPrice.toFixed(2)}`;
    }

    const effectiveKg = posService.getEffectiveKgPrice(posService.currentWeightedProduct);
    if (this.DOM.weightedProductPriceDisplay) {
      this.DOM.weightedProductPriceDisplay.innerText = `R$ ${effectiveKg.toFixed(2)}/kg`;
    }
  }

  handleAddWeightedItem() {
    const weight = parseFloat(this.DOM.weightInput?.value);
    const qty = parseInt(this.DOM.weightQtyInput?.value, 10) || 1;

    try {
      posService.addWeightedItemToCart(weight, qty);
      this.DOM.weightInput.value = '';
      this.DOM.weightQtyInput.value = '1';
      this.updateCalculatedPrice();
      this.renderCart();
      this.showToast('Item pesado adicionado ao carrinho!', 'success');
    } catch (err) {
      if (err.code === 'PRICE_NOT_CONFIGURED') {
        this.showPriceNotConfiguredModal(err.productType);
      } else {
        this.showToast(err.message, 'error');
      }
    }
  }

  showPriceNotConfiguredModal(productType = 'acai') {
    if (this.DOM.priceNotConfiguredModal) {
      this.DOM.priceNotConfiguredModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  closePriceNotConfiguredModal() {
    if (this.DOM.priceNotConfiguredModal) {
      this.DOM.priceNotConfiguredModal.style.display = 'none';
    }
  }

  renderCart() {
    const cart = posService.getCart();
    const subtotal = posService.getCartSubtotal();
    const total = posService.getCartTotal(this.DOM.deliveryFee?.value || 0);

    if (this.DOM.subtotal) this.DOM.subtotal.innerText = `R$ ${subtotal.toFixed(2)}`;
    if (this.DOM.total) this.DOM.total.innerText = `R$ ${total.toFixed(2)}`;

    if (!this.DOM.cartItems) return;

    if (cart.length === 0) {
      this.DOM.cartItems.innerHTML = `
        <div class="cart-empty-message">
          <i data-lucide="shopping-bag" style="width: 42px; height: 42px; stroke-width: 1.5; margin-bottom: 0.5rem; opacity: 0.4;"></i>
          <p>O carrinho está vazio.</p>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Pese um item ou escolha um produto do catálogo.</span>
        </div>
      `;
    } else {
      this.DOM.cartItems.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <span class="cart-item-title">${item.name}</span>
            <span class="cart-item-price">R$ ${item.price.toFixed(2)} un.</span>
          </div>
          <div class="cart-item-controls">
            <button type="button" class="touch-btn btn-secondary btn-icon-only btn-qty-minus" data-index="${idx}">-</button>
            <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
            <button type="button" class="touch-btn btn-secondary btn-icon-only btn-qty-plus" data-index="${idx}">+</button>
          </div>
          <span class="cart-item-total">R$ ${item.totalPrice.toFixed(2)}</span>
          <button type="button" class="touch-btn btn-danger btn-icon-only btn-remove" data-index="${idx}" title="Remover">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `).join('');
    }

    if (!posService.currentPaymentMethod) {
      posService.currentPaymentMethod = 'Dinheiro';
    }
    const hasActiveOpt = Array.from(this.DOM.paymentOptions || []).some(o => o.classList.contains('active'));
    if (!hasActiveOpt) {
      const defaultCash = document.querySelector('#venda-tab .payment-option[data-method="cash"]');
      if (defaultCash) defaultCash.classList.add('active', 'selected');
      if (this.DOM.cashInputSection) this.DOM.cashInputSection.style.display = 'block';
    }

    this.updateChange();
    this.renderProductsGrid();
    if (window.lucide) lucide.createIcons();
  }

  updateChange() {
    const total = posService.getCartTotal(this.DOM.deliveryFee?.value || 0);
    const received = parseFloat(this.DOM.cashReceivedInput?.value) || 0;
    const change = posService.calculateChange(received, total);

    if (this.DOM.changeAmount) {
      this.DOM.changeAmount.innerText = change.change.toFixed(2);
    }
    if (this.DOM.changeDisplay) {
      this.DOM.changeDisplay.style.display = (received > 0) ? 'inline-flex' : 'none';
    }
  }

  handleConfirmSale() {
    const cart = posService.getCart();
    if (cart.length === 0) {
      this.showToast('Adicione pelo menos um item ao carrinho.', 'error');
      return;
    }

    if (!cashService.isOpen()) {
      this.showToast('Abra o caixa antes de realizar vendas.', 'warning');
      this.switchTab('caixa');
      return;
    }

    const payment = posService.currentPaymentMethod || 'Dinheiro';
    const subtotal = posService.getCartSubtotal();
    const fee = posService.deliveryMode === 'entrega' ? (parseFloat(this.DOM.deliveryFee?.value) || 0) : 0;
    const total = posService.getCartTotal(fee);

    const isCash = payment.toLowerCase().includes('dinheiro') || payment.toLowerCase() === 'cash';
    let received = total;
    let change = 0;

    if (isCash) {
      const rawReceived = this.DOM.cashReceivedInput?.value?.trim();
      const numReceived = parseFloat(rawReceived);

      if (!rawReceived || isNaN(numReceived) || numReceived <= 0) {
        this.showToast('Informe o valor recebido em dinheiro para finalizar a venda.', 'warning');
        this.DOM.cashReceivedInput?.focus();
        this.DOM.cashReceivedInput?.classList.add('input-error');
        setTimeout(() => this.DOM.cashReceivedInput?.classList.remove('input-error'), 2000);
        return;
      }

      if (numReceived < total) {
        const remaining = (total - numReceived).toFixed(2);
        this.showToast(`Valor recebido insuficiente. Faltam R$ ${remaining}`, 'error');
        this.DOM.cashReceivedInput?.focus();
        this.DOM.cashReceivedInput?.classList.add('input-error');
        setTimeout(() => this.DOM.cashReceivedInput?.classList.remove('input-error'), 2000);
        return;
      }

      received = numReceived;
      change = Math.max(0, received - total);
    }

    const saleRecord = {
      items: cart,
      subtotal,
      deliveryFee: fee,
      deliveryMode: posService.deliveryMode,
      deliveryCustomerName: this.DOM.deliveryCustomerName?.value || '',
      deliveryCustomerAddress: this.DOM.deliveryCustomerAddress?.value || '',
      total,
      paymentMethod: payment,
      cashReceived: received,
      change: change,
      cashSessionId: cashService.getCurrentSessionId(),
      operatorName: authService.currentUser?.displayName || 'Operador',
      operatorUid: authService.currentUser?.uid || null
    };

    const savedSale = historyService.addSale(saleRecord);
    this.state.lastSale = savedSale;

    // Limpa estado
    posService.clearCart();
    if (this.DOM.cashReceivedInput) this.DOM.cashReceivedInput.value = '';
    if (this.DOM.changeDisplay) this.DOM.changeDisplay.style.display = 'none';
    if (this.DOM.deliveryCustomerName) this.DOM.deliveryCustomerName.value = '';
    if (this.DOM.deliveryCustomerAddress) this.DOM.deliveryCustomerAddress.value = '';
    if (this.DOM.deliveryFee) this.DOM.deliveryFee.value = '';

    this.renderCart();
    this.renderCashRegister();
    this.renderHistory();

    this.showToast('Venda finalizada com sucesso!', 'success');

    // Abre Modal de Recibo
    if (this.DOM.receiptModal && this.DOM.receiptContent) {
      this.DOM.receiptContent.innerHTML = PdfService.generateThermalReceiptHtml(savedSale);
      this.DOM.receiptModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  openPresetsModal() {
    if (this.DOM.weightPresetsModal) {
      this.DOM.weightPresetsModal.style.display = 'flex';
      this.renderWeightPresets();
    }
  }

  closePresetsModal() {
    if (this.DOM.weightPresetsModal) {
      this.DOM.weightPresetsModal.style.display = 'none';
    }
  }

  renderWeightPresets() {
    const presets = productsService.getWeightPresets();

    // Renderiza na aba PDV
    if (this.DOM.weightPresetsContainer) {
      this.DOM.weightPresetsContainer.innerHTML = presets.map(g => `
        <button type="button" class="preset-btn preset-chip" data-grams="${g}">${g}g</button>
      `).join('');

      this.DOM.weightPresetsContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const grams = btn.dataset.grams;
          if (this.DOM.weightInput) {
            this.DOM.weightInput.value = grams;
            this.updateCalculatedPrice();
            this.DOM.weightInput.focus();
          }
        });
      });
    }

    // Renderiza no modal de atalhos
    if (this.DOM.modalPresetChipsContainer) {
      this.DOM.modalPresetChipsContainer.innerHTML = presets.map(g => `
        <span class="preset-chip">
          ${g}g
          <button type="button" class="preset-chip-remove" data-grams="${g}">&times;</button>
        </span>
      `).join('');

      this.DOM.modalPresetChipsContainer.querySelectorAll('.preset-chip-remove').forEach(b => {
        b.addEventListener('click', (e) => {
          const g = e.currentTarget.dataset.grams;
          productsService.removeWeightPreset(g);
          this.renderWeightPresets();
        });
      });
    }

    // Renderiza no painel Admin
    if (this.DOM.adminPresetChipsContainer) {
      this.DOM.adminPresetChipsContainer.innerHTML = presets.map(g => `
        <span class="preset-chip">
          ${g}g
          <button type="button" class="preset-chip-remove" data-grams="${g}">&times;</button>
        </span>
      `).join('');

      this.DOM.adminPresetChipsContainer.querySelectorAll('.preset-chip-remove').forEach(b => {
        b.addEventListener('click', (e) => {
          const g = e.currentTarget.dataset.grams;
          productsService.removeWeightPreset(g);
          this.renderWeightPresets();
        });
      });
    }
  }

  renderProductsGrid() {
    const allProducts = productsService.getProducts();

    // 1. Grid de Vitrine Rápida no PDV
    if (this.DOM.productsGrid) {
      this.DOM.productsGrid.innerHTML = allProducts.map(p => `
        <div class="product-item-card" data-id="${p.id}">
          <span class="product-item-name">${p.name}</span>
          <span class="product-item-price">R$ ${p.price.toFixed(2)}</span>
        </div>
      `).join('');
    }

    // 2. Vitrine & Gestão Geral na Aba "Produtos"
    if (this.DOM.productsCatalogFullGrid) {
      const categories = productsService.getCategories();
      const currentCat = this.state.catalogCategory || 'all';
      const search = (this.state.catalogSearch || '').toLowerCase();

      // Renderiza pílulas de categorias
      if (this.DOM.productViewCategoryFilters) {
        this.DOM.productViewCategoryFilters.innerHTML = categories.map(cat => {
          const label = cat === 'all' ? 'Todos' : cat;
          const isActive = cat === currentCat ? 'active' : '';
          return `<button type="button" class="prod-cat-pill ${isActive}" data-category="${cat}">${label}</button>`;
        }).join('');
      }

      // Filtra produtos
      const filtered = allProducts.filter(p => {
        const matchCat = (currentCat === 'all') || (p.category === currentCat);
        const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.category && p.category.toLowerCase().includes(search));
        return matchCat && matchSearch;
      });

      // Atualiza contador de produtos
      if (this.DOM.productCountNumber) {
        this.DOM.productCountNumber.innerText = filtered.length;
      }
      if (this.DOM.productViewCount) {
        this.DOM.productViewCount.innerHTML = `<span id="product-count-number">${filtered.length}</span> ${filtered.length === 1 ? 'produto' : 'produtos'}`;
      }

      if (filtered.length === 0) {
        this.DOM.productsCatalogFullGrid.innerHTML = `
          <div class="catalog-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <i data-lucide="package-search" style="width: 48px; height: 48px; opacity: 0.35; margin-bottom: 0.75rem;"></i>
            <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">Nenhum produto encontrado</h3>
            <p style="font-size: 0.85rem;">Tente buscar com outro nome ou selecione outra categoria.</p>
          </div>
        `;
      } else {
        this.DOM.productsCatalogFullGrid.innerHTML = filtered.map(p => {
          const cartQty = posService.getCartItemQuantity(p.id);
          const inCart = cartQty > 0;
          return `
            <div class="product-catalog-card ${inCart ? 'card-in-cart' : ''}" data-id="${p.id}">
              <div class="catalog-card-header">
                <span class="catalog-category-tag">${p.category || 'Bebidas'}</span>
                ${inCart ? `
                  <span class="catalog-cart-tag" title="${cartQty} unidade(s) no carrinho">
                    <i data-lucide="shopping-cart"></i>
                    <span>${cartQty} no carrinho</span>
                  </span>
                ` : ''}
              </div>

              <div class="catalog-card-media">
                ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `
                  <svg class="product-drink-svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 8h12l-1.2 12H7.2L6 8z"></path>
                    <line x1="5" y1="8" x2="19" y2="8"></line>
                    <line x1="11" y1="2" x2="13" y2="8"></line>
                    <line x1="9" y1="2" x2="11" y2="2"></line>
                  </svg>
                `}
              </div>

              <div class="catalog-card-body">
                <h3 class="catalog-card-title">${p.name}</h3>

                <div class="catalog-card-price-box">
                  <span class="catalog-price-label">Preço</span>
                  <span class="catalog-price-value">R$ ${p.price.toFixed(2)}</span>
                </div>

                <div class="catalog-qty-row">
                  <span class="catalog-qty-label">Qtd:</span>
                  <div class="catalog-qty-stepper">
                    <button type="button" class="catalog-qty-btn btn-catalog-minus" data-id="${p.id}" title="Diminuir quantidade">−</button>
                    <input type="number" class="catalog-qty-input" id="catalog-qty-${p.id}" value="1" min="1" max="99" inputmode="numeric">
                    <button type="button" class="catalog-qty-btn btn-catalog-plus" data-id="${p.id}" title="Aumentar quantidade">+</button>
                  </div>
                </div>

                <div class="catalog-card-actions">
                  <button type="button" class="btn-card-action btn-card-edit" data-id="${p.id}">
                    <i data-lucide="edit-3"></i>
                    <span>Editar</span>
                  </button>
                  <button type="button" class="btn-card-action btn-card-sell ${inCart ? 'in-cart' : ''}" data-id="${p.id}" title="Adicionar ao carrinho">
                    <i data-lucide="shopping-cart"></i>
                    <span>${inCart ? `Vender (${cartQty})` : 'Vender'}</span>
                  </button>
                  <button type="button" class="btn-card-delete" data-id="${p.id}" title="Excluir produto">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      if (window.lucide) lucide.createIcons();
    }
  }

  // Comandas
  renderOrders() {
    const orders = ordersService.getOpenOrders();
    if (this.DOM.openOrdersCountBadge) {
      this.DOM.openOrdersCountBadge.innerText = orders.length;
      this.DOM.openOrdersCountBadge.style.display = orders.length > 0 ? 'inline-block' : 'none';
    }

    if (!this.DOM.openOrdersGrid) return;

    if (orders.length === 0) {
      this.DOM.openOrdersGrid.innerHTML = `
        <div class="surface-card" style="grid-column: 1/-1; text-align:center; padding: 3rem 1rem;">
          <i data-lucide="clipboard-list" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 0.5rem;"></i>
          <h3>Nenhuma comanda em aberto</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem;">As vendas salvas para pagamento posterior aparecerão aqui.</p>
        </div>
      `;
    } else {
      this.DOM.openOrdersGrid.innerHTML = orders.map(ord => {
        const itemCount = (ord.items && ord.items.length) || 0;
        const total = typeof ord.total === 'number' ? ord.total.toFixed(2) : parseFloat(ord.total || 0).toFixed(2);
        const duration = OrdersService.formatDuration(ord.createdAt);
        return `
        <div class="open-order-card" data-id="${ord.id}">
          <div class="open-order-header">
            <span class="open-order-name">${ord.customerName || 'Sem identificação'}</span>
            <span class="open-order-timer-pill">${duration}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}
          </div>
          <div class="open-order-total" style="font-size: 1.25rem; font-weight: 800; color: var(--brand-primary); margin-top: auto;">
            R$ ${total}
          </div>
        </div>
      `;
      }).join('');
    }

    if (window.lucide) lucide.createIcons();
  }

  openHoldSaleModal() {
    const cart = posService.getCart();
    if (cart.length === 0) {
      this.showToast('O carrinho está vazio para salvar em comanda.', 'warning');
      return;
    }

    if (this.DOM.existingOrderSelect) {
      const openOrders = ordersService.getOpenOrders();
      let html = '<option value="new">Salvar como nova comanda</option>';
      openOrders.forEach(o => {
        html += `<option value="${o.id}">Adicionar a: ${o.customerName} (Total atual: R$ ${o.total.toFixed(2)})</option>`;
      });
      this.DOM.existingOrderSelect.innerHTML = html;
    }

    if (this.DOM.holdSaleModal) {
      this.DOM.holdSaleModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  closeHoldSaleModal() {
    if (this.DOM.holdSaleModal) {
      this.DOM.holdSaleModal.style.display = 'none';
      if (this.DOM.customerNameInput) this.DOM.customerNameInput.value = '';
    }
  }

  handleSaveHoldSale() {
    const existingVal = this.DOM.existingOrderSelect?.value;
    const existingId = (existingVal && existingVal !== 'new') ? Number(existingVal) : null;
    const name = this.DOM.customerNameInput?.value;
    const cart = posService.getCart();

    try {
      ordersService.saveHoldSale(name, existingId, cart, {
        deliveryMode: posService.deliveryMode,
        deliveryFee: parseFloat(this.DOM.deliveryFee?.value) || 0
      });
      posService.clearCart();
      this.renderCart();
      this.renderOrders();
      this.closeHoldSaleModal();
      this.showToast('Comanda salva com sucesso!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // --- MODAL DE COMANDAS ABERTAS (FINALIZAR / RECEBER / EXCLUIR) ---
  openOpenOrderModal(orderId) {
    const order = ordersService.getOrderById(orderId);
    if (!order) {
      this.showToast('Comanda não encontrada.', 'error');
      return;
    }

    this.state.currentOpenOrder = order;
    this.state.openOrderPaymentMethod = 'Dinheiro';

    if (this.DOM.openOrderTitle) {
      this.DOM.openOrderTitle.innerText = `Comanda: ${order.customerName}`;
    }

    if (this.DOM.openOrderTimer) {
      this.DOM.openOrderTimer.innerText = `Tempo em aberto: ${OrdersService.formatDuration(order.createdAt)}`;
    }

    if (this.DOM.openOrderTotal) {
      this.DOM.openOrderTotal.innerText = `R$ ${order.total.toFixed(2)}`;
    }

    if (this.DOM.openOrderItemsList) {
      this.DOM.openOrderItemsList.innerHTML = order.items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;">
          <span>${item.quantity}x ${item.name}</span>
          <span style="font-weight: 700; color: var(--brand-primary);">R$ ${(item.totalPrice || item.price || 0).toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Reseta botões de forma de pagamento para Dinheiro
    this.DOM.openOrderPaymentOptions?.forEach(opt => {
      if (opt.dataset.method === 'cash') {
        opt.classList.add('active', 'selected');
      } else {
        opt.classList.remove('active', 'selected');
      }
    });

    if (this.DOM.openOrderCashInput) {
      this.DOM.openOrderCashInput.style.display = 'block';
    }

    if (this.DOM.openOrderCashReceived) {
      this.DOM.openOrderCashReceived.value = '';
    }

    this.calculateOpenOrderChange();

    if (this.DOM.openOrderModal) {
      this.DOM.openOrderModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  closeOpenOrderModal() {
    if (this.DOM.openOrderModal) {
      this.DOM.openOrderModal.style.display = 'none';
    }
    if (this.DOM.openOrderCashReceived) {
      this.DOM.openOrderCashReceived.value = '';
    }
    if (this.DOM.openOrderChangeDisplay) {
      this.DOM.openOrderChangeDisplay.style.display = 'none';
    }
    this.state.currentOpenOrder = null;
  }

  calculateOpenOrderChange() {
    if (!this.state.currentOpenOrder) return;
    const total = this.state.currentOpenOrder.total;
    const received = parseFloat(this.DOM.openOrderCashReceived?.value) || 0;
    const change = Math.max(0, received - total);

    if (this.DOM.openOrderChangeAmount) {
      this.DOM.openOrderChangeAmount.innerText = change.toFixed(2);
    }

    if (this.DOM.openOrderChangeDisplay) {
      this.DOM.openOrderChangeDisplay.style.display = (received > 0) ? 'inline-flex' : 'none';
    }
  }

  handleFinalizeOpenOrder() {
    const order = this.state.currentOpenOrder;
    if (!order) return;

    if (!cashService.isOpen()) {
      this.showToast('Abra o caixa antes de receber pedidos.', 'warning');
      this.closeOpenOrderModal();
      this.switchTab('caixa');
      return;
    }

    const payment = this.state.openOrderPaymentMethod || 'Dinheiro';
    const total = order.total;

    const isCash = payment.toLowerCase().includes('dinheiro') || payment.toLowerCase() === 'cash';
    let received = total;
    let change = 0;

    if (isCash) {
      const rawReceived = this.DOM.openOrderCashReceived?.value?.trim();
      const numReceived = parseFloat(rawReceived);

      if (!rawReceived || isNaN(numReceived) || numReceived <= 0) {
        this.showToast('Informe o valor recebido em dinheiro para finalizar o pedido.', 'warning');
        this.DOM.openOrderCashReceived?.focus();
        this.DOM.openOrderCashReceived?.classList.add('input-error');
        setTimeout(() => this.DOM.openOrderCashReceived?.classList.remove('input-error'), 2000);
        return;
      }

      if (numReceived < total) {
        const remaining = (total - numReceived).toFixed(2);
        this.showToast(`Valor recebido insuficiente. Faltam R$ ${remaining}`, 'error');
        this.DOM.openOrderCashReceived?.focus();
        this.DOM.openOrderCashReceived?.classList.add('input-error');
        setTimeout(() => this.DOM.openOrderCashReceived?.classList.remove('input-error'), 2000);
        return;
      }

      received = numReceived;
      change = Math.max(0, received - total);
    }

    const duration = OrdersService.formatDuration(order.createdAt);

    const saleRecord = {
      items: order.items,
      subtotal: total - (order.deliveryFee || 0),
      deliveryFee: order.deliveryFee || 0,
      deliveryMode: order.deliveryMode || 'balcao',
      deliveryCustomerName: order.deliveryCustomerName || order.customerName,
      deliveryCustomerAddress: order.deliveryCustomerAddress || '',
      total: total,
      paymentMethod: payment,
      cashReceived: received,
      change: change,
      orderDuration: duration,
      fromOrder: true,
      cashSessionId: cashService.getCurrentSessionId(),
      operatorName: authService.currentUser?.displayName || 'Operador',
      operatorUid: authService.currentUser?.uid || null
    };

    const savedSale = historyService.addSale(saleRecord);
    this.state.lastSale = savedSale;

    // Remove comanda
    ordersService.deleteOrder(order.id);

    this.closeOpenOrderModal();
    this.renderOrders();
    this.renderCashRegister();
    this.renderHistory();

    this.showToast('Comanda finalizada e recebida com sucesso!', 'success');

    // Abre modal de recibo
    if (this.DOM.receiptModal && this.DOM.receiptContent) {
      this.DOM.receiptContent.innerHTML = PdfService.generateThermalReceiptHtml(savedSale);
      this.DOM.receiptModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  async handleDeleteOpenOrder() {
    const order = this.state.currentOpenOrder;
    if (!order) return;

    const confirmed = await confirmModal.show({
      title: 'Excluir Comanda',
      message: `Deseja realmente excluir a comanda de <strong>"${order.customerName}"</strong>? Esta ação não poderá ser desfeita.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Voltar',
      type: 'danger',
      icon: 'trash-2'
    });

    if (confirmed) {
      ordersService.deleteOrder(order.id);
      this.closeOpenOrderModal();
      this.renderOrders();
      this.showToast('Comanda excluída.', 'info');
    }
  }

  // --- MODAL DE VENDA MANUAL (HISTÓRICO) ---
  openManualSaleModal() {
    this.state.manualSaleCart = [];
    this.state.manualSalePaymentMethod = 'Dinheiro';

    if (this.DOM.manualProductSelect) {
      const config = productsService.getConfig();
      const products = productsService.getProducts();
      let options = `
        <option value="">-- Selecione um Produto --</option>
        <option value="acai_weight">Açaí (por peso) - R$ ${config.açaíPricePerKg.toFixed(2)}/kg</option>
        <option value="sorvete_weight">Sorvete (por peso) - R$ ${config.sorvetePricePerKg.toFixed(2)}/kg</option>
      `;
      products.forEach(p => {
        options += `<option value="${p.id}">${p.name} - R$ ${p.price.toFixed(2)}</option>`;
      });
      this.DOM.manualProductSelect.innerHTML = options;
    }

    if (this.DOM.manualAcaiWeightSection) {
      this.DOM.manualAcaiWeightSection.style.display = 'none';
    }
    if (this.DOM.manualAcaiWeightInput) {
      this.DOM.manualAcaiWeightInput.value = '';
    }

    this.DOM.manualPaymentOptions?.forEach(opt => {
      if (opt.dataset.method === 'cash') {
        opt.classList.add('active', 'selected');
      } else {
        opt.classList.remove('active', 'selected');
      }
    });

    this.renderManualSaleCart();

    if (this.DOM.manualSaleModal) {
      this.DOM.manualSaleModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  closeManualSaleModal() {
    if (this.DOM.manualSaleModal) {
      this.DOM.manualSaleModal.style.display = 'none';
    }
    this.state.manualSaleCart = [];
  }

  renderManualSaleCart() {
    if (!this.DOM.manualSaleCartItems) return;
    const cart = this.state.manualSaleCart || [];

    if (cart.length === 0) {
      this.DOM.manualSaleCartItems.innerHTML = '<div class="empty-state-micro">Nenhum item adicionado</div>';
      if (this.DOM.manualSaleSummary) this.DOM.manualSaleSummary.style.display = 'none';
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    this.DOM.manualSaleCartItems.innerHTML = cart.map((item, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom:1px solid var(--border-color); font-size: 0.85rem;">
        <span>${item.quantity}x ${item.name}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="color:var(--brand-primary);">R$ ${item.totalPrice.toFixed(2)}</strong>
          <button type="button" class="touch-btn btn-danger btn-icon-only manual-cart-remove" data-index="${idx}" style="padding: 2px 6px; font-size: 11px;">
            &times;
          </button>
        </div>
      </div>
    `).join('');

    this.DOM.manualSaleCartItems.querySelectorAll('.manual-cart-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        this.state.manualSaleCart.splice(idx, 1);
        this.renderManualSaleCart();
      });
    });

    if (this.DOM.manualSaleSummary) {
      this.DOM.manualSaleSummary.style.display = 'flex';
    }
    if (this.DOM.manualSaleTotal) {
      this.DOM.manualSaleTotal.innerText = `R$ ${total.toFixed(2)}`;
    }
  }

  handleManualAddItem() {
    const selectVal = this.DOM.manualProductSelect?.value;
    if (!selectVal) {
      this.showToast('Selecione um produto.', 'warning');
      return;
    }

    if (selectVal === 'acai_weight' || selectVal === 'sorvete_weight') {
      const pType = selectVal === 'acai_weight' ? 'acai' : 'sorvete';
      const weight = parseFloat(this.DOM.manualAcaiWeightInput?.value);
      if (!weight || isNaN(weight) || weight <= 0) {
        this.showToast('Informe um peso válido em gramas.', 'warning');
        return;
      }
      const calc = posService.calculateWeightedPrice(weight, 1, pType);
      const typeName = pType === 'acai' ? 'Açaí' : 'Sorvete';
      this.state.manualSaleCart.push({
        name: `${typeName} (${calc.weightGrams}g)`,
        price: calc.unitPrice,
        quantity: 1,
        totalPrice: calc.totalPrice,
        isWeighted: true,
        productType: pType,
        weightGrams: calc.weightGrams
      });
      if (this.DOM.manualAcaiWeightInput) this.DOM.manualAcaiWeightInput.value = '';
    } else {
      const pid = Number(selectVal);
      const prod = productsService.getProductById(pid);
      if (!prod) {
        this.showToast('Produto não encontrado.', 'error');
        return;
      }
      const existing = this.state.manualSaleCart.find(i => !i.isWeighted && i.productId === prod.id);
      if (existing) {
        existing.quantity += 1;
        existing.totalPrice = parseFloat((existing.price * existing.quantity).toFixed(2));
      } else {
        this.state.manualSaleCart.push({
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: 1,
          totalPrice: prod.price,
          isWeighted: false
        });
      }
    }

    this.renderManualSaleCart();
    this.showToast('Item adicionado à venda manual.', 'success');
  }

  handleSaveManualSale() {
    const cart = this.state.manualSaleCart || [];
    if (cart.length === 0) {
      this.showToast('Adicione pelo menos um item à venda manual.', 'warning');
      return;
    }

    if (!cashService.isOpen()) {
      this.showToast('Abra o caixa antes de registrar vendas.', 'warning');
      this.closeManualSaleModal();
      this.switchTab('caixa');
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const payment = this.state.manualSalePaymentMethod || 'Dinheiro';

    const saleRecord = {
      items: cart,
      subtotal: total,
      deliveryFee: 0,
      deliveryMode: 'balcao',
      total: total,
      paymentMethod: payment,
      cashReceived: total,
      change: 0,
      isManualSale: true,
      cashSessionId: cashService.getCurrentSessionId(),
      operatorName: authService.currentUser?.displayName || 'Operador',
      operatorUid: authService.currentUser?.uid || null
    };

    const savedSale = historyService.addSale(saleRecord);
    this.state.lastSale = savedSale;

    this.closeManualSaleModal();
    this.renderCashRegister();
    this.renderHistory();

    this.showToast('Venda manual salva com sucesso!', 'success');

    if (this.DOM.receiptModal && this.DOM.receiptContent) {
      this.DOM.receiptContent.innerHTML = PdfService.generateThermalReceiptHtml(savedSale);
      this.DOM.receiptModal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }
  }

  // Caixa
  renderCashRegister() {
    const isOpen = cashService.isOpen();
    const sales = historyService.getSalesForDate(this.state.today);
    const expenses = expensesService.getExpensesForDate(this.state.today);
    const metrics = cashService.getTodayMetrics(sales, expenses);

    if (this.DOM.headerCaixaDot) {
      this.DOM.headerCaixaDot.className = `header-caixa-dot ${isOpen ? 'open' : ''}`;
    }
    if (this.DOM.headerCaixaText) {
      this.DOM.headerCaixaText.innerText = isOpen ? 'Caixa Aberto' : 'Caixa Fechado';
    }
    if (this.DOM.sidebarCaixaStatus) {
      this.DOM.sidebarCaixaStatus.className = `sidebar-status-dot ${isOpen ? 'active' : ''}`;
    }

    if (this.DOM.cashRegisterOpening && this.DOM.cashRegisterDashboard) {
      this.DOM.cashRegisterOpening.style.display = isOpen ? 'none' : 'block';
      this.DOM.cashRegisterDashboard.style.display = isOpen ? 'block' : 'none';
    }

    if (this.DOM.dashOpeningBalance) this.DOM.dashOpeningBalance.innerText = `R$ ${metrics.openingTotal.toFixed(2)}`;
    if (this.DOM.dashCashSales) this.DOM.dashCashSales.innerText = `R$ ${metrics.cashSales.toFixed(2)}`;
    if (this.DOM.dashExpenses) this.DOM.dashExpenses.innerText = `R$ ${metrics.totalExpenses.toFixed(2)}`;
    if (this.DOM.dashCurrentBalance) this.DOM.dashCurrentBalance.innerText = `R$ ${metrics.currentBalance.toFixed(2)}`;
    if (this.DOM.dashCardTotal) this.DOM.dashCardTotal.innerText = `R$ ${metrics.cardSales.toFixed(2)}`;
    if (this.DOM.dashPixTotal) this.DOM.dashPixTotal.innerText = `R$ ${metrics.pixSales.toFixed(2)}`;

    // Renderiza Lista de Sessões/Turnos do Dia (Múltiplas Aberturas)
    if (this.DOM.cashSessionsList) {
      const todaySessions = cashService.getSessionsByDate(this.state.today);
      if (this.DOM.cashSessionsCountLabel) {
        this.DOM.cashSessionsCountLabel.innerText = `${todaySessions.length} turno(s) registrado(s)`;
      }

      if (todaySessions.length === 0) {
        this.DOM.cashSessionsList.innerHTML = `
          <div class="cash-sessions-empty">
            <i data-lucide="calendar-off" style="width: 22px; height: 22px; opacity: 0.6;"></i>
            <span>Nenhum turno anterior encerrado hoje.</span>
          </div>
        `;
      } else {
        this.DOM.cashSessionsList.innerHTML = todaySessions.map(sess => {
          const openTime = sess.openedAt ? new Date(sess.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
          const closeTime = sess.closedAt ? new Date(sess.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Em andamento';
          const isSessOpen = sess.status === 'open';

          return `
            <div class="session-history-item ${isSessOpen ? 'is-open' : 'is-closed'}">
              <div class="session-history-header">
                <div class="session-title-group">
                  <div class="session-icon-badge ${isSessOpen ? 'open' : 'closed'}">
                    <i data-lucide="${isSessOpen ? 'circle-dot' : 'check-circle-2'}" style="width: 16px; height: 16px;"></i>
                  </div>
                  <div class="session-badge-row">
                    <strong class="session-code">Turno ${sess.sessionCode || '#001'}</strong>
                    <span class="status-badge-styled ${isSessOpen ? 'open' : 'closed'}">
                      ${isSessOpen ? '<span class="status-dot-mini"></span>TURNO ATIVO' : '<i data-lucide="lock" style="width: 11px; height: 11px;"></i> ENCERRADO'}
                    </span>
                  </div>
                </div>
                <div class="session-time-badge">
                  <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
                  <span>${openTime} &rarr; ${closeTime}</span>
                </div>
              </div>

              <div class="session-metrics-grid">
                <div class="session-metric-cell">
                  <span class="session-metric-label">Aberto por:</span>
                  <strong class="session-metric-value user-val">${sess.openedByName || 'Operador'}</strong>
                </div>
                <div class="session-metric-cell">
                  <span class="session-metric-label">Fechado por:</span>
                  <strong class="session-metric-value user-val">${sess.closedByName || (isSessOpen ? 'Em aberto' : 'Operador')}</strong>
                </div>
                <div class="session-metric-cell">
                  <span class="session-metric-label">Fundo Inicial:</span>
                  <strong class="session-metric-value opening-val">R$ ${(sess.openingTotal || 0).toFixed(2)}</strong>
                </div>
                <div class="session-metric-cell">
                  <span class="session-metric-label">Vendas no Turno:</span>
                  <strong class="session-metric-value sales-val">R$ ${(sess.totalSalesAmount || 0).toFixed(2)} <span class="vds-count">(${sess.totalSalesCount || 0} vds)</span></strong>
                </div>
                <div class="session-metric-cell">
                  <span class="session-metric-label">Saldo em Gaveta:</span>
                  <strong class="session-metric-value balance-val">R$ ${(sess.closingBalance || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      if (window.lucide) lucide.createIcons();
    }
  }

  updateOpeningTotalDisplay() {
    const b = parseFloat(this.DOM.openingBillsInput?.value) || 0;
    const c = parseFloat(this.DOM.openingCoinsInput?.value) || 0;
    const total = b + c;
    if (this.DOM.openingTotalDisplay) {
      this.DOM.openingTotalDisplay.innerText = `R$ ${total.toFixed(2)}`;
    }
  }

  async handleOpenRegister() {
    const b = parseFloat(this.DOM.openingBillsInput?.value) || 0;
    const c = parseFloat(this.DOM.openingCoinsInput?.value) || 0;
    try {
      await cashService.openRegister(b, c, authService.currentUser);
      this.renderCashRegister();
      this.showToast('Turno de caixa aberto com sucesso!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleCloseRegister() {
    const confirmed = await confirmModal.show({
      title: 'Fechar Caixa',
      message: 'Deseja realmente encerrar a sessão deste turno de caixa? Os valores do dia serão consolidados.',
      confirmText: 'Sim, Encerrar Turno',
      cancelText: 'Continuar Aberto',
      type: 'warning',
      icon: 'circle-dollar-sign'
    });

    if (confirmed) {
      try {
        const sales = historyService.getSalesForDate(this.state.today);
        const expenses = expensesService.getExpensesForDate(this.state.today);
        const metrics = cashService.getTodayMetrics(sales, expenses);
        await cashService.closeRegister(metrics.currentBalance, 'Fechamento de turno', authService.currentUser, sales, expenses);
        this.renderCashRegister();
        this.showToast('Turno de caixa encerrado com sucesso!', 'info');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  // Despesas
  renderExpenses() {
    const list = expensesService.getExpensesForDate(this.state.selectedExpenseDate);
    const total = expensesService.getTotalForDate(this.state.selectedExpenseDate);

    if (this.DOM.expensesTotalToday) {
      this.DOM.expensesTotalToday.innerText = `R$ ${total.toFixed(2)}`;
    }

    if (this.DOM.expensesHistoryList) {
      if (list.length === 0) {
        this.DOM.expensesHistoryList.innerHTML = `
          <div style="text-align:center; padding: 2rem; color: var(--text-muted);">
            Nenhuma despesa registrada para esta data.
          </div>
        `;
      } else {
        this.DOM.expensesHistoryList.innerHTML = list.map(exp => `
          <div class="surface-card" style="display:flex; justify-content:space-between; align-items:center; padding: 0.85rem 1rem;">
            <div>
              <div style="font-weight:700;">${exp.name}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">${exp.description || 'Sem descrição'} &bull; ${exp.time}</div>
            </div>
            <div style="display:flex; align-items:center; gap: 1rem;">
              <span style="font-weight:800; color:var(--danger);">R$ ${exp.value.toFixed(2)}</span>
              <button type="button" class="touch-btn btn-danger btn-sm" onclick="window.__orvixDeleteExpense(${exp.id})">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    window.__orvixDeleteExpense = async (id) => {
      const confirmed = await confirmModal.show({
        title: 'Excluir Despesa',
        message: 'Deseja realmente excluir este registro de despesa?',
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar',
        type: 'danger',
        icon: 'trash-2'
      });

      if (confirmed) {
        expensesService.deleteExpense(id, this.state.selectedExpenseDate);
        this.renderExpenses();
        this.renderCashRegister();
        this.showToast('Despesa removida.', 'info');
      }
    };

    if (window.lucide) lucide.createIcons();
  }

  handleAddExpense() {
    const name = this.DOM.newExpenseName?.value;
    const val = this.DOM.newExpenseValue?.value;
    const desc = this.DOM.newExpenseDesc?.value;

    try {
      expensesService.addExpense(name, val, desc, this.state.selectedExpenseDate);
      this.DOM.newExpenseName.value = '';
      this.DOM.newExpenseValue.value = '';
      this.DOM.newExpenseDesc.value = '';
      this.renderExpenses();
      this.renderCashRegister();
      this.showToast('Despesa registrada!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Histórico
  renderHistory() {
    const sales = historyService.getSalesForDate(this.state.selectedHistoryDate);
    const expTotal = expensesService.getTotalForDate(this.state.selectedHistoryDate);
    const summary = historyService.getSummaryForDate(this.state.selectedHistoryDate, expTotal);

    if (this.DOM.historyGrandTotal) this.DOM.historyGrandTotal.innerText = `R$ ${summary.grandTotal.toFixed(2)}`;
    if (this.DOM.historyProductsTotal) this.DOM.historyProductsTotal.innerText = `R$ ${summary.productsTotal.toFixed(2)}`;
    if (this.DOM.historyDeliveryTotal) this.DOM.historyDeliveryTotal.innerText = `R$ ${summary.deliveryTotal.toFixed(2)}`;
    if (this.DOM.historyExpensesTotal) this.DOM.historyExpensesTotal.innerText = `R$ ${summary.expensesTotal.toFixed(2)}`;
    if (this.DOM.historyCashTotal) this.DOM.historyCashTotal.innerText = `R$ ${summary.cashTotal.toFixed(2)}`;
    if (this.DOM.historyCardTotal) this.DOM.historyCardTotal.innerText = `R$ ${summary.cardTotal.toFixed(2)}`;
    if (this.DOM.historyPixTotal) this.DOM.historyPixTotal.innerText = `R$ ${summary.pixTotal.toFixed(2)}`;

    if (this.DOM.salesHistoryList) {
      if (sales.length === 0) {
        this.DOM.salesHistoryList.innerHTML = `
          <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
            Nenhuma venda registrada para esta data.
          </div>
        `;
      } else {
        this.DOM.salesHistoryList.innerHTML = sales.map(s => `
          <div class="surface-card" style="display:flex; justify-content:space-between; align-items:center; padding: 1rem 1.25rem;">
            <div>
              <div style="font-weight:800; font-size:1rem;">Venda #${String(s.id).slice(-5)} &bull; ${s.time}</div>
              <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
                ${s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
              <div style="font-size:0.8rem; color:var(--brand-primary); font-weight:600; margin-top:4px;">
                Pagamento: ${s.paymentMethod} &bull; ${s.deliveryMode === 'entrega' ? 'Entrega' : 'Balcão'}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap: 1rem;">
              <span style="font-weight:800; font-size:1.2rem;">R$ ${s.total.toFixed(2)}</span>
              <button type="button" class="touch-btn btn-secondary btn-sm" onclick="window.__orvixReprintSale(${s.id})">
                <i data-lucide="printer" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    window.__orvixReprintSale = (id) => {
      const sale = sales.find(s => s.id === id);
      if (sale && this.DOM.receiptModal && this.DOM.receiptContent) {
        this.state.lastSale = sale;
        this.DOM.receiptContent.innerHTML = PdfService.generateThermalReceiptHtml(sale);
        this.DOM.receiptModal.style.display = 'flex';
      }
    };

    if (window.lucide) lucide.createIcons();
  }

  handleExportHistoryPdf() {
    const sales = historyService.getSalesForDate(this.state.selectedHistoryDate);
    const expenses = expensesService.getExpensesForDate(this.state.selectedHistoryDate);
    const summary = historyService.getSummaryForDate(this.state.selectedHistoryDate, expensesService.getTotalForDate(this.state.selectedHistoryDate));
    PdfService.exportDailyHistoryPdf(this.state.selectedHistoryDate, sales, summary, expenses);
    this.showToast('Relatório PDF gerado!', 'success');
  }

  startLiveClock() {
    let tickCount = 0;
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
      if (this.DOM.currentTime) this.DOM.currentTime.innerText = timeStr;
      if (this.DOM.currentDate) this.DOM.currentDate.innerText = dateStr;

      // Reavalia agendamento de promoção a cada 10 segundos
      tickCount++;
      if (tickCount % 10 === 0) {
        this.renderDiscountBalloon();
        if (this.state.currentTab === 'admin') {
          this.renderPromoStatusBanner();
        }
      }
    };
    update();
    this.state.liveClockInterval = setInterval(update, 1000);
  }

  startOrdersTimer() {
    setInterval(() => {
      const cards = document.querySelectorAll('.open-order-card');
      const orders = ordersService.getOpenOrders();
      cards.forEach(c => {
        const id = Number(c.dataset.id);
        const ord = orders.find(o => o.id === id);
        if (ord) {
          const pill = c.querySelector('.open-order-timer-pill');
          if (pill) pill.innerText = OrdersService.formatDuration(ord.createdAt);
        }
      });
    }, 1000);
  }

  handleToggleDiscount(e) {
    const isEnabled = Boolean(e?.target?.checked);
    
    // Habilita ou desabilita a área visualmente
    if (this.DOM.discountConfigArea) {
      this.DOM.discountConfigArea.classList.toggle('disabled', !isEnabled);
    }

    const currentDiscount = posService.getDiscount() || {};
    
    // Obter dias selecionados na UI ou fallback para padrão completo (todos os dias)
    let days = currentDiscount.days;
    const checkedDays = Array.from(document.querySelectorAll('input[name="discount-day"]:checked')).map(cb => parseInt(cb.value, 10));
    if (checkedDays.length > 0) {
      days = checkedDays;
    } else if (!Array.isArray(days) || days.length === 0) {
      days = [0, 1, 2, 3, 4, 5, 6];
      document.querySelectorAll('input[name="discount-day"]').forEach(cb => cb.checked = true);
    }

    // Porcentagem
    const percentage = parseFloat(this.DOM.discountPercentageInput?.value) || currentDiscount.percentage || 10;
    
    // Produtos elegíveis
    let acaiTarget = this.DOM.discountTargetAcai ? this.DOM.discountTargetAcai.checked : currentDiscount.targets?.acai;
    let sorveteTarget = this.DOM.discountTargetSorvete ? this.DOM.discountTargetSorvete.checked : currentDiscount.targets?.sorvete;
    if (!acaiTarget && !sorveteTarget) {
      acaiTarget = true;
      sorveteTarget = true;
      if (this.DOM.discountTargetAcai) this.DOM.discountTargetAcai.checked = true;
      if (this.DOM.discountTargetSorvete) this.DOM.discountTargetSorvete.checked = true;
    }

    // Salvar no PosService e Storage
    const updated = posService.saveDiscountConfig({
      enabled: isEnabled,
      percentage: percentage,
      days: days,
      targets: {
        acai: Boolean(acaiTarget),
        sorvete: Boolean(sorveteTarget)
      }
    });

    this.renderDiscountControls();
    this.renderDiscountBalloon();
    this.updateCalculatedPrice();

    if (isEnabled) {
      if (updated.active) {
        this.showToast(`Promoção ativada com sucesso! ${percentage}% OFF em vigor agora.`, 'success');
      } else {
        this.showToast(`Promoção ativada! Entrará em vigor conforme os dias e horários configurados.`, 'info');
      }
    } else {
      this.showToast('Promoção desativada.', 'info');
    }
  }

  handleSaveDiscountConfig() {
    const isEnabled = this.DOM.discountActiveCheck ? this.DOM.discountActiveCheck.checked : false;
    const percentage = parseFloat(this.DOM.discountPercentageInput?.value) || 0;
    const acaiTarget = this.DOM.discountTargetAcai?.checked;
    const sorveteTarget = this.DOM.discountTargetSorvete?.checked;

    const selectedDays = Array.from(document.querySelectorAll('input[name="discount-day"]:checked')).map(el => parseInt(el.value, 10));
    const allDay = this.DOM.discountTimeModeAll?.checked !== false && !this.DOM.discountTimeModeCustom?.checked;
    const startTime = this.DOM.discountStartTime?.value || '10:00';
    const endTime = this.DOM.discountEndTime?.value || '21:00';

    if (isEnabled) {
      if (!percentage || percentage <= 0 || percentage > 100) {
        this.showToast('Defina uma porcentagem de desconto válida entre 1% e 100%.', 'error');
        this.DOM.discountPercentageInput?.focus();
        return;
      }
      if (selectedDays.length === 0) {
        this.showToast('Selecione pelo menos um dia da semana para a promoção.', 'warning');
        return;
      }
      if (!acaiTarget && !sorveteTarget) {
        this.showToast('Selecione pelo menos um produto elegível (Açaí ou Sorvete).', 'warning');
        return;
      }
      if (!allDay) {
        if (!startTime || !endTime) {
          this.showToast('Defina os horários de início e fim da promoção.', 'warning');
          return;
        }
        const timeCheck = this.validatePromoTimeRange();
        if (!timeCheck.valid) {
          if (timeCheck.pmSuggested) {
            this.showToast(`O horário final (${endTime}) é anterior ao início (${startTime}). Use ${timeCheck.pmSuggested} para horário noturno.`, 'error');
          } else {
            this.showToast(`O horário de término (${endTime}) deve ser posterior ao horário de início (${startTime}).`, 'error');
          }
          return;
        }
      }
    }

    const saved = posService.saveDiscountConfig({
      enabled: isEnabled,
      percentage: percentage || 10,
      targets: {
        acai: Boolean(acaiTarget),
        sorvete: Boolean(sorveteTarget)
      },
      days: selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
      allDay: allDay,
      startTime: startTime,
      endTime: endTime
    });

    this.renderDiscountControls();
    this.renderDiscountBalloon();
    this.updateCalculatedPrice();

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const daysLabel = saved.days.map(d => dayNames[d]).join(', ');
    const timeDesc = allDay ? 'o dia todo' : `das ${startTime} às ${endTime}`;

    if (isEnabled) {
      if (saved.active) {
        this.showToast(`Promoção salva e ativa agora com ${percentage}% OFF!`, 'success');
      } else {
        this.showToast(`Configuração salva! Promoção programada para: ${daysLabel} (${timeDesc}).`, 'success');
      }
    } else {
      this.showToast('Promoção desativada e configurações salvas.', 'info');
    }
  }

  renderDiscountControls() {
    const discount = posService.getDiscount();
    if (!discount) return;

    if (this.DOM.discountActiveCheck) {
      this.DOM.discountActiveCheck.checked = Boolean(discount.enabled);
    }

    if (this.DOM.discountConfigArea) {
      this.DOM.discountConfigArea.classList.toggle('disabled', !discount.enabled);
    }

    if (this.DOM.discountPercentageInput) {
      this.DOM.discountPercentageInput.value = discount.percentage || 10;
      document.querySelectorAll('.promo-quick-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.percent) === (discount.percentage || 10));
      });
    }

    const isAllDay = discount.allDay !== false;
    if (this.DOM.discountTimeModeAll) this.DOM.discountTimeModeAll.checked = isAllDay;
    if (this.DOM.discountTimeModeCustom) this.DOM.discountTimeModeCustom.checked = !isAllDay;
    if (this.DOM.labelTimeAllDay) this.DOM.labelTimeAllDay.classList.toggle('active', isAllDay);
    if (this.DOM.labelTimeCustom) this.DOM.labelTimeCustom.classList.toggle('active', !isAllDay);

    if (this.DOM.promoCustomTimeBox) {
      this.DOM.promoCustomTimeBox.classList.toggle('disabled', isAllDay);
    }

    if (this.DOM.discountStartTime) this.DOM.discountStartTime.value = discount.startTime || '10:00';
    if (this.DOM.discountEndTime) this.DOM.discountEndTime.value = discount.endTime || '21:00';
    this.validatePromoTimeRange();

    if (this.DOM.discountTargetAcai) this.DOM.discountTargetAcai.checked = Boolean(discount.targets?.acai);
    if (this.DOM.discountTargetSorvete) this.DOM.discountTargetSorvete.checked = Boolean(discount.targets?.sorvete);

    const activeDays = (Array.isArray(discount.days) && discount.days.length > 0)
      ? discount.days.map(Number)
      : [0, 1, 2, 3, 4, 5, 6];

    document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
      cb.checked = activeDays.includes(parseInt(cb.value, 10));
    });

    this.renderPromoStatusBanner();
    if (window.lucide) lucide.createIcons();
  }

  renderPromoStatusBanner() {
    const banner = this.DOM.promoStatusBanner;
    if (!banner) return;

    const discount = posService.getDiscount();
    const today = new Date();
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const currentDay = today.getDay();
    const currentDayName = dayNames[currentDay];
    const activeDays = (Array.isArray(discount.days) && discount.days.length > 0)
      ? discount.days.map(Number)
      : [0, 1, 2, 3, 4, 5, 6];
    const isPromoDay = activeDays.includes(currentDay);
    const isAllDay = discount.allDay !== false;
    const timeStr = isAllDay ? 'o dia todo' : `das ${discount.startTime || '10:00'} às ${discount.endTime || '21:00'}`;

    if (!discount.enabled) {
      banner.className = 'promo-status-banner inactive';
      banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="circle-off" class="mini-icon"></i> <strong>Promoção Desativada</strong> nas configurações.</span>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let items = [];
    if (discount.targets?.acai) items.push('Açaí');
    if (discount.targets?.sorvete) items.push('Sorvete');
    const targetStr = items.length > 0 ? items.join(' e ') : 'nenhum produto selecionado';

    if (discount.active) {
      banner.className = 'promo-status-banner active';
      banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px; color:var(--success);"><i data-lucide="sparkles" class="mini-icon"></i> <strong>Promoção Ativa Agora (${currentDayName}, ${timeStr}):</strong> ${discount.percentage}% OFF em ${targetStr}!</span>`;
    } else if (isPromoDay && !isAllDay) {
      banner.className = 'promo-status-banner inactive';
      banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="clock" class="mini-icon"></i> <strong>Programada para Hoje (${currentDayName}):</strong> Vigência ${timeStr} (Fora do horário no momento).</span>`;
    } else {
      const daysFormatted = activeDays.map(d => dayNames[d].split('-')[0]).join(', ');
      banner.className = 'promo-status-banner inactive';
      banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="calendar" class="mini-icon"></i> <strong>Hoje (${currentDayName}) não é dia de promoção.</strong> Programada para: ${daysFormatted || 'Nenhum dia'} (${timeStr}).</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  validatePromoTimeRange() {
    const startInput = this.DOM.discountStartTime;
    const endInput = this.DOM.discountEndTime;
    const hintContainer = this.DOM.promoTimeHint;
    if (!startInput || !endInput) return { valid: true };

    const startVal = startInput.value || '10:00';
    const endVal = endInput.value || '21:00';

    const [sH, sM] = startVal.split(':').map(Number);
    const [eH, eM] = endVal.split(':').map(Number);
    const startMin = sH * 60 + (sM || 0);
    const endMin = eH * 60 + (eM || 0);

    if (isNaN(startMin) || isNaN(endMin)) {
      if (hintContainer) hintContainer.innerHTML = '';
      return { valid: false };
    }

    if (startMin >= endMin) {
      endInput.classList.add('invalid-time');
      let pmSuggested = null;
      if (eH < 12) {
        const candidateH = eH + 12;
        if (candidateH * 60 + (eM || 0) > startMin) {
          pmSuggested = `${String(candidateH).padStart(2, '0')}:${String(eM || 0).padStart(2, '0')}`;
        }
      }

      if (hintContainer) {
        if (pmSuggested) {
          hintContainer.innerHTML = `
            <div class="promo-time-alert error">
              <i data-lucide="alert-triangle"></i>
              <span>
                Horário final (<strong>${endVal}</strong>) é antes do início (<strong>${startVal}</strong>).
                Para <strong>${eH}h da noite</strong>, use <strong>${pmSuggested}</strong>.
                <button type="button" class="btn-fix-time" id="btn-fix-pm-time">
                  <i data-lucide="check"></i> Corrigir para ${pmSuggested}
                </button>
              </span>
            </div>
          `;
          const fixBtn = document.getElementById('btn-fix-pm-time');
          if (fixBtn) {
            fixBtn.addEventListener('click', (e) => {
              e.preventDefault();
              endInput.value = pmSuggested;
              this.validatePromoTimeRange();
            });
          }
        } else {
          hintContainer.innerHTML = `
            <div class="promo-time-alert error">
              <i data-lucide="alert-triangle"></i>
              <span>O horário de término (<strong>${endVal}</strong>) deve ser posterior ao início (<strong>${startVal}</strong>).</span>
            </div>
          `;
        }
        if (window.lucide) lucide.createIcons();
      }
      return { valid: false, pmSuggested };
    } else {
      endInput.classList.remove('invalid-time');
      if (hintContainer) hintContainer.innerHTML = '';
      return { valid: true };
    }
  }

  renderDiscountBalloon() {
    posService.checkScheduledDiscount();
    const discount = posService.getDiscount();

    let items = [];
    if (discount.targets?.acai) items.push('Açaí');
    if (discount.targets?.sorvete) items.push('Sorvete');
    const targetText = items.length > 0 ? items.join(' e ') : 'Açaí e Sorvete';
    const promoText = `${discount.percentage}% OFF em ${targetText}`;

    if (this.DOM.discountBalloon) {
      if (discount.active && items.length > 0) {
        this.DOM.discountBalloon.style.display = 'inline-flex';
        this.DOM.discountBalloon.classList.add('active');
        if (this.DOM.discountDetails) this.DOM.discountDetails.innerText = promoText;
      } else {
        this.DOM.discountBalloon.style.display = 'none';
        this.DOM.discountBalloon.classList.remove('active');
      }
    }

    if (this.DOM.mobilePromoBanner) {
      if (discount.active && items.length > 0) {
        this.DOM.mobilePromoBanner.classList.add('active');
        if (this.DOM.mobilePromoDetails) this.DOM.mobilePromoDetails.innerText = promoText;
      } else {
        this.DOM.mobilePromoBanner.classList.remove('active');
      }
    }
  }

  renderAll() {
    this.renderWeightPresets();
    this.renderProductsGrid();
    this.renderCart();
    this.renderOrders();
    this.renderCashRegister();
    this.renderExpenses();
    this.renderHistory();
    this.renderDiscountBalloon();
    this.renderDiscountControls();
    this.initTeamManagement();
    this.initLicenseWatcher();

    const config = productsService.getConfig();
    if (this.DOM.acaiPriceInput) this.DOM.acaiPriceInput.value = config.açaíPricePerKg.toFixed(2);
    if (this.DOM.sorvetePriceInput) this.DOM.sorvetePriceInput.value = config.sorvetePricePerKg.toFixed(2);
    if (this.DOM.historyDate) this.DOM.historyDate.value = this.state.selectedHistoryDate;
    if (this.DOM.expenseDate) this.DOM.expenseDate.value = this.state.selectedExpenseDate;
  }

  showApp() {
    if (this.DOM.appLayout) {
      this.DOM.appLayout.style.display = 'flex';
    }
  }

  hideApp() {
    if (this.DOM.appLayout) {
      this.DOM.appLayout.style.display = 'none';
    }
  }

  initLicenseWatcher() {
    const tenant = licenseService.getLocalTenant();
    if (tenant && tenant.chaveLicenca) {
      licenseService.subscribeLicenseStatus(tenant.chaveLicenca, (licData) => {
        if (!licData) return;
        const now = new Date();
        const isExp = licData.expiresAt && new Date(licData.expiresAt) < now;
        if (licData.status === 'bloqueado') {
          this.hideApp();
          if (this.pendingModal) {
            this.pendingModal.showSuspended('Licença Bloqueada pelo Administrador Master', 'O acesso deste estabelecimento foi temporariamente suspenso.');
          }
        } else if (isExp) {
          this.hideApp();
          if (this.pendingModal) {
            this.pendingModal.showSuspended('Licença Expirada', 'A assinatura deste estabelecimento chegou ao fim.');
          }
        }
      });
    }
  }

  isUserAdmin() {
    const user = authService.currentUser;
    if (!user) return false;
    return (
      authService.isAdmin() ||
      user.role === 'Administrador' ||
      (user.email && env.isMasterAdmin(user.email)) ||
      user.isMaster === true
    );
  }

  openEditTenantModal() {
    if (!this.isUserAdmin()) {
      this.showToast('Apenas administradores podem alterar o nome do estabelecimento.', 'error');
      return;
    }

    const currentTenant = licenseService.getLocalTenant();
    const currentName = currentTenant?.nome || currentTenant?.tenantName || 'Açaí da Serra';

    if (this.DOM.modalEditTenantName) {
      this.DOM.modalEditTenantName.value = currentName.substring(0, 20);
      this.updateTenantCharCount();
    }

    if (this.DOM.editTenantModal) {
      this.DOM.editTenantModal.style.display = 'flex';
      setTimeout(() => {
        this.DOM.modalEditTenantName?.focus();
        this.DOM.modalEditTenantName?.select();
      }, 50);
    }
  }

  closeEditTenantModal() {
    if (this.DOM.editTenantModal) {
      this.DOM.editTenantModal.style.display = 'none';
    }
  }

  updateTenantCharCount() {
    if (!this.DOM.modalEditTenantName || !this.DOM.tenantNameCharCount) return;
    let val = this.DOM.modalEditTenantName.value || '';
    if (val.length > 20) {
      val = val.substring(0, 20);
      this.DOM.modalEditTenantName.value = val;
    }
    const len = val.length;
    this.DOM.tenantNameCharCount.innerText = `${len}/20`;
    if (len >= 20) {
      this.DOM.tenantNameCharCount.style.color = '#ef4444';
    } else {
      this.DOM.tenantNameCharCount.style.color = 'var(--brand-primary, #a855f7)';
    }
  }

  async handleSaveTenantName() {
    if (!this.isUserAdmin()) {
      this.showToast('Apenas administradores podem alterar o nome do estabelecimento.', 'error');
      return;
    }

    const newName = (this.DOM.modalEditTenantName?.value || '').trim();

    if (!newName) {
      this.showToast('Por favor, informe o nome do estabelecimento.', 'warning');
      this.DOM.modalEditTenantName?.focus();
      return;
    }

    if (newName.length < 2) {
      this.showToast('O nome deve conter pelo menos 2 caracteres.', 'warning');
      this.DOM.modalEditTenantName?.focus();
      return;
    }

    if (newName.length > 20) {
      this.showToast('O nome deve ter no máximo 20 caracteres.', 'warning');
      this.DOM.modalEditTenantName?.focus();
      return;
    }

    const currentTenant = licenseService.getLocalTenant() || {};
    const tenantId = currentTenant.id || 'acai-da-serra-matriz';
    const currentUser = authService.currentUser;

    const originalBtnHtml = this.DOM.saveEditTenantBtn ? this.DOM.saveEditTenantBtn.innerHTML : '';
    if (this.DOM.saveEditTenantBtn) {
      this.DOM.saveEditTenantBtn.disabled = true;
      this.DOM.saveEditTenantBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> <span>Salvando...</span>';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const res = await licenseService.updateTenantName(tenantId, newName, currentUser);
      
      this.updateTenantHeader(res.tenant);
      this.closeEditTenantModal();
      this.showToast(`Nome atualizado para "${res.name}" com sucesso!`, 'success');
    } catch (err) {
      console.error('[Orvix PDV] Erro ao salvar nome do estabelecimento:', err);
      this.showToast(err.message || 'Erro ao atualizar nome do estabelecimento.', 'error');
    } finally {
      if (this.DOM.saveEditTenantBtn) {
        this.DOM.saveEditTenantBtn.disabled = false;
        this.DOM.saveEditTenantBtn.innerHTML = originalBtnHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  initTeamManagement() {
    const tenant = licenseService.getLocalTenant();
    if (tenant) {
      if (this.DOM.adminTenantName) this.DOM.adminTenantName.innerText = tenant.nome || 'Açaí da Serra';
      if (this.DOM.adminTenantPlan) this.DOM.adminTenantPlan.innerText = `Plano ${tenant.plan || 'Pro Multi-Usuários'}`;
      if (this.DOM.adminDisplayInviteCode) this.DOM.adminDisplayInviteCode.innerText = tenant.codigoConvite || 'SERRA-8492';
    }

    // Controle de visibilidade do botão de editar nome: visível apenas para Administrador
    const canEdit = this.isUserAdmin();
    if (this.DOM.btnOpenEditTenantModal) {
      this.DOM.btnOpenEditTenantModal.style.display = canEdit ? 'inline-flex' : 'none';
    }

    // Sincronização em tempo real do documento do Tenant (multi-terminais)
    if (this.state.tenantUnsubscribe) {
      this.state.tenantUnsubscribe();
    }
    if (tenant?.id) {
      this.state.tenantUnsubscribe = licenseService.subscribeTenant(tenant.id, (updatedTenant) => {
        if (updatedTenant) {
          this.updateTenantHeader(updatedTenant);
        }
      });
    }

    if (this.state.teamUnsubscribe) {
      this.state.teamUnsubscribe();
    }

    this.state.teamUnsubscribe = licenseService.subscribeTeamMembers(tenant?.id, (members) => {
      this.renderTeamMembers(members);
      // Reavalia visibilidade do botão caso o cargo do usuário tenha mudado
      if (this.DOM.btnOpenEditTenantModal) {
        this.DOM.btnOpenEditTenantModal.style.display = this.isUserAdmin() ? 'inline-flex' : 'none';
      }
    });
  }

  renderTeamMembers(members = []) {
    if (!this.DOM.adminTeamListContainer) return;

    const pendingCount = members.filter(m => m.status === 'pendente').length;
    if (this.DOM.adminTeamPendingCount) {
      this.DOM.adminTeamPendingCount.innerText = pendingCount;
      this.DOM.adminTeamPendingCount.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
    if (this.DOM.adminTeamCountText) {
      this.DOM.adminTeamCountText.innerText = `${members.length} membro${members.length !== 1 ? 's' : ''}${pendingCount > 0 ? ` (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}`;
    }

    if (members.length === 0) {
      this.DOM.adminTeamListContainer.innerHTML = `
        <div class="admin-team-empty-state">
          <i data-lucide="user-check"></i>
          <p>Nenhum membro vinculado ainda. Compartilhe o código de convite acima!</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Ordena: pendentes primeiro, depois administradores, depois operadores
    const sorted = [...members].sort((a, b) => {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
      if (a.role === 'Administrador' && b.role !== 'Administrador') return -1;
      return 0;
    });

    this.DOM.adminTeamListContainer.innerHTML = sorted.map(m => {
      const name = m.displayName || m.email?.split('@')[0] || 'Usuário';
      const initials = name.slice(0, 2).toUpperCase();
      const isPending = m.status === 'pendente';
      const isBlocked = m.status === 'bloqueado';
      const isAdminRole = m.role === 'Administrador';

      let actionsHtml = '';
      if (isPending) {
        actionsHtml = `
          <button type="button" class="team-action-btn btn-approve" data-uid="${m.uid}" data-name="${name}">
            <i data-lucide="check"></i>
            <span>Aprovar Acesso</span>
          </button>
          <button type="button" class="team-action-btn btn-remove-user" data-uid="${m.uid}" data-name="${name}">
            <i data-lucide="x"></i>
            <span>Recusar</span>
          </button>
        `;
      } else if (isBlocked) {
        actionsHtml = `
          <button type="button" class="team-action-btn btn-unblock-user" data-uid="${m.uid}" data-name="${name}">
            <i data-lucide="shield-check"></i>
            <span>Reativar</span>
          </button>
          <button type="button" class="team-action-btn btn-remove-user" data-uid="${m.uid}" data-name="${name}">
            <i data-lucide="trash-2"></i>
            <span>Remover</span>
          </button>
        `;
      } else {
        actionsHtml = `
          <button type="button" class="team-action-btn btn-role-toggle" data-uid="${m.uid}" data-role="${m.role}" title="Alterar Cargo">
            <i data-lucide="user-cog"></i>
            <span>${isAdminRole ? 'Tornar Operador' : 'Tornar Admin'}</span>
          </button>
          <button type="button" class="team-action-btn btn-block-user" data-uid="${m.uid}" data-name="${name}" title="Suspender Acesso">
            <i data-lucide="shield-off"></i>
            <span>Bloquear</span>
          </button>
        `;
      }

      return `
        <div class="admin-team-item ${isPending ? 'pending-item' : ''}">
          <div class="team-member-profile">
            <div class="team-member-avatar" style="${isAdminRole ? 'background: linear-gradient(135deg, #7c3aed, #ec4899);' : ''}">
              ${initials}
            </div>
            <div class="team-member-info">
              <span class="team-member-name">${name}</span>
              <span class="team-member-email">${m.email || 'Sem e-mail'}</span>
            </div>
          </div>

          <div class="team-member-badges">
            <span class="team-role-badge ${isAdminRole ? 'admin' : 'operador'}">
              ${m.role || 'Operador PDV'}
            </span>
            <span class="team-status-badge ${m.status || 'ativo'}">
              <i data-lucide="${isPending ? 'clock' : isBlocked ? 'x-circle' : 'check-circle-2'}" style="width: 12px; height: 12px;"></i>
              ${isPending ? 'Pendente' : isBlocked ? 'Bloqueado' : 'Ativo'}
            </span>
          </div>

          <div class="team-member-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  initAuthAndStoreListener() {
    // Eventos do modal de alerta de preço não configurado
    this.DOM.btnClosePriceAlert?.addEventListener('click', () => {
      this.closePriceNotConfiguredModal();
    });

    this.DOM.btnConfigPriceNow?.addEventListener('click', () => {
      this.closePriceNotConfiguredModal();
      this.switchTab('admin');
      document.querySelectorAll('.admin-sub-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-sub-content').forEach(c => c.classList.remove('active'));
      const prodSubTab = document.querySelector('.admin-sub-tab[data-subtab="produtos"]');
      if (prodSubTab) prodSubTab.classList.add('active');
      const prodSubContent = document.getElementById('admin-produtos-content');
      if (prodSubContent) prodSubContent.classList.add('active');
      this.DOM.acaiPriceInput?.focus();
    });

    authService.onAuthStateChanged(async (user) => {
      if (!user) {
        this.hideApp();
        return;
      }

      // Verificação Imediata de Status do Usuário
      if (user.status === 'pendente') {
        this.hideApp();
        this.pendingModal.showPending(user);
        return;
      }

      if (user.status === 'bloqueado') {
        this.hideApp();
        this.pendingModal.showBlocked(user);
        return;
      }

      try {
        const tenants = await licenseService.getUserTenants(user);

        if (!tenants || tenants.length === 0) {
          // Usuário sem nenhum estabelecimento ativo
          this.hideApp();
          this.pendingModal.showPending(user);
          return;
        }

        if (tenants.length === 1) {
          const tenant = tenants[0];
          licenseService.saveLocalTenant(tenant);
          cashService.setTenantId(tenant.id);
          this.updateTenantHeader(tenant);

          // Verifica se a licença está bloqueada ou expirada
          if (tenant.statusLicenca === 'bloqueado' || tenant.status === 'bloqueado') {
            this.hideApp();
            this.pendingModal.showSuspended('Licença Bloqueada pelo Administrador Master', 'O acesso deste estabelecimento foi temporariamente suspenso.');
            return;
          }

          if (tenant.dataExpiracao && new Date(tenant.dataExpiracao) < new Date()) {
            this.hideApp();
            this.pendingModal.showSuspended('Licença Expirada', 'A assinatura deste estabelecimento chegou ao fim.');
            return;
          }

          // Acesso 100% autorizado: libera a aplicação
          this.showApp();

          if (tenant.onboardingCompleted === false) {
            this.onboardingModal.show(tenant, () => {
              this.updateTenantHeader(licenseService.getLocalTenant() || tenant);
              this.renderAll();
            });
          }
        } else {
          // Usuário com múltiplas lojas sob o mesmo e-mail
          this.storeSelectModal.show(
            user,
            tenants,
            (chosenTenant) => {
              licenseService.saveLocalTenant(chosenTenant);
              cashService.setTenantId(chosenTenant.id);
              this.updateTenantHeader(chosenTenant);

              if (chosenTenant.statusLicenca === 'bloqueado' || chosenTenant.status === 'bloqueado') {
                this.hideApp();
                this.pendingModal.showSuspended('Licença Bloqueada pelo Administrador Master', 'O acesso deste estabelecimento foi temporariamente suspenso.');
                return;
              }

              this.showApp();

              if (chosenTenant.onboardingCompleted === false) {
                this.onboardingModal.show(chosenTenant, () => {
                  this.updateTenantHeader(licenseService.getLocalTenant() || chosenTenant);
                  this.renderAll();
                });
              } else {
                this.renderAll();
              }
            },
            () => {
              // Adicionar nova loja
              this.hideApp();
              this.pendingModal.show();
            }
          );
        }
      } catch (err) {
        console.warn('[Orvix PDV] Erro na verificação de lojas do usuário:', err);
        const localTenant = licenseService.getLocalTenant();
        if (localTenant && user.status === 'ativo') {
          this.showApp();
        } else {
          this.hideApp();
          this.pendingModal.showPending(user);
        }
      }
    });
  }

  updateTenantHeader(tenant) {
    if (this.DOM.pageBreadcrumb && tenant) {
      this.DOM.pageBreadcrumb.innerHTML = `${tenant.nome || 'Açaí da Serra'} &bull; <span style="color: #10b981;">Licença Ativa</span>`;
    }
    if (this.DOM.adminTenantName && tenant) {
      this.DOM.adminTenantName.innerText = tenant.nome || 'Açaí da Serra';
    }
  }
}

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const app = new OrvixApp();
  app.init();
  window.OrvixApp = app;
});
