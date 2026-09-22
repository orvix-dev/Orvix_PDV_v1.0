document.addEventListener('DOMContentLoaded', () => {
    const App = {
        state: {
            cart: [],
            manualSaleCart: [],
            salesHistory: {},
            expenses: {},
            cashRegister: {},
            openOrders: [],
            products: [
                { id: 1, name: "Água Mineral 500ml", price: 3.00, category: "Bebidas", image: "" },
                { id: 2, name: "Água com Gás 500ml", price: 3.50, category: "Bebidas", image: "" },
                { id: 3, name: "Refrigerante Lata", price: 5.00, category: "Bebidas", image: "" },
                { id: 4, name: "Suco Natural", price: 7.00, category: "Bebidas", image: "" }
            ],
            config: {
                açaíPricePerKg: 45.90,
                sorvetePricePerKg: 45.90,
                deletePassword: '1015',
                weightPresets: [150, 250, 300, 400, 500, 700, 1000]
            },
            discount: {
                enabled: false,
                percentage: 10,
                targets: {
                    acai: true,
                    sorvete: true
                },
                days: [0, 1, 2, 3, 4, 5, 6], // Todos os dias ativos por padrão
                allDay: true,
                startTime: '10:00',
                endTime: '21:00',
                active: false
            },
            ui: {
                currentWeightedProduct: 'acai',
                currentPaymentMethod: null,
                manualSalePaymentMethod: null,
                openOrderPaymentMethod: null,
                currentOpenOrder: null,
                openOrderTimerInterval: null,
                deliveryMode: 'balcao',
                isAdminLoggedIn: true,
                pendingSecurityAction: null,
                saleToDelete: null,
                expenseToDelete: null,
                lastSaleForReceipt: null,
                today: new Date().toISOString().split('T')[0],
                theme: 'light',
                selectedProductCategory: 'all'
            }
        },

        DOM: {},

        init() {
            this.cacheDOM();
            this.storage.load();
            this.initTheme();
            this.checkScheduledDiscount();
            this.bindEvents();
            this.utils.startLiveClock();
            this.render.all();
            this.render.discountControls();
            this.render.activeDiscountIndicator();
            this.render.cashRegister();
            if (this.monthPicker) this.monthPicker.init();
            if (this.datePickers) this.datePickers.init();
            if (window.lucide) lucide.createIcons();
        },

        initTheme() {
            const savedTheme = localStorage.getItem('pdv_theme') || 'light';
            this.state.ui.theme = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
        },

        toggleTheme() {
            const newTheme = this.state.ui.theme === 'dark' ? 'light' : 'dark';
            this.state.ui.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('pdv_theme', newTheme);
        },

        checkScheduledDiscount() {
            const today = new Date();
            const currentDay = today.getDay(); // 0: Domingo, 1: Segunda, ..., 6: Sábado
            const discount = this.state.discount;

            const activeDays = Array.isArray(discount.days) ? discount.days.map(Number) : [4];
            const isPromoDay = activeDays.includes(currentDay);

            let isPromoTime = true;
            if (discount.allDay === false) {
                const currentH = String(today.getHours()).padStart(2, '0');
                const currentM = String(today.getMinutes()).padStart(2, '0');
                const currentTimeStr = `${currentH}:${currentM}`;

                const start = discount.startTime || '00:00';
                const end = discount.endTime || '23:59';

                if (start < end) {
                    isPromoTime = (currentTimeStr >= start && currentTimeStr <= end);
                } else {
                    isPromoTime = false;
                }
            }

            this.state.discount.active = Boolean(discount.enabled && isPromoDay && isPromoTime);
        },

        cacheDOM() {
            this.DOM = {
                // Layout & Header
                appSidebar: document.getElementById('app-sidebar'),
                sidebarBackdrop: document.getElementById('sidebar-backdrop'),
                headerMenuBtn: document.getElementById('header-menu-btn'),
                sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
                themeToggleBtn: document.getElementById('theme-toggle-btn'),
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
                mobilePromoBanner: document.getElementById('mobile-promo-banner'),
                mobilePromoDetails: document.getElementById('mobile-promo-details'),

                // PDV / Venda por KG
                weightInput: document.getElementById('weight-input'),
                weightQtyInput: document.getElementById('weight-qty-input'),
                weightQtyMinus: document.getElementById('weight-qty-minus'),
                weightQtyPlus: document.getElementById('weight-qty-plus'),
                calculatedPrice: document.getElementById('calculated-price'),
                weightedProductPriceDisplay: document.getElementById('weighted-product-price-display'),
                productTypeSelector: document.querySelector('.product-type-selector'),
                addToCartBtn: document.getElementById('add-to-cart'),
                weightPresetsContainer: document.getElementById('weight-presets-container'),
                openWeightPresetsModalBtn: document.getElementById('open-weight-presets-modal-btn'),

                // Atalhos de Peso (Modal & Admin)
                weightPresetsModal: document.getElementById('weight-presets-modal'),
                closeWeightPresetsIcon: document.getElementById('close-weight-presets-icon'),
                closeWeightPresetsBtn: document.getElementById('close-weight-presets-btn'),
                modalNewPresetWeight: document.getElementById('modal-new-preset-weight'),
                modalAddPresetBtn: document.getElementById('modal-add-preset-btn'),
                modalPresetChipsContainer: document.getElementById('modal-preset-chips-container'),
                modalResetPresetsBtn: document.getElementById('modal-reset-presets-btn'),
                adminNewPresetWeight: document.getElementById('admin-new-preset-weight'),
                adminAddPresetBtn: document.getElementById('admin-add-preset-btn'),
                adminPresetChipsContainer: document.getElementById('admin-preset-chips-container'),
                adminResetPresetsBtn: document.getElementById('admin-reset-presets-btn'),

                // PDV / Catálogo
                productSearch: document.getElementById('product-search'),
                productsCategoriesList: document.getElementById('products-categories-list'),
                productsGrid: document.getElementById('products-grid'),
                quickAddButtonsContainer: document.querySelector('.quick-add-buttons'),

                // PDV / Carrinho & Checkout
                cartItems: document.getElementById('cart-items'),
                subtotal: document.getElementById('subtotal'),
                total: document.getElementById('total'),
                cancelSaleBtn: document.getElementById('cancel-sale'),
                finishSaleBtn: document.getElementById('finish-sale'),
                confirmPaymentButton: document.getElementById('confirm-payment'),
                holdSaleButton: document.getElementById('hold-sale'),

                // Entrega / Balcão
                deliveryModeSelector: document.getElementById('delivery-mode-selector'),
                deliveryInfoSection: document.getElementById('delivery-info-section'),
                deliveryCustomerName: document.getElementById('delivery-customer-name'),
                deliveryCustomerAddress: document.getElementById('delivery-customer-address'),
                deliveryFee: document.getElementById('delivery-fee'),

                // Pagamento
                paymentOptions: document.querySelectorAll('#venda-tab .payment-option'),
                cashInputSection: document.getElementById('cash-input'),
                cashReceivedInput: document.getElementById('cash-received'),
                changeDisplay: document.getElementById('change-display'),
                changeAmount: document.getElementById('change-amount'),
                cashPresetsRow: document.getElementById('cash-presets-row'),

                // Comandas
                openOrdersCount: document.getElementById('open-orders-count'),
                openOrdersGrid: document.getElementById('open-orders-grid'),

                // Histórico
                historyDate: document.getElementById('history-date'),
                salesHistory: document.getElementById('sales-history'),
                historySummary: document.getElementById('history-summary'),
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
                newExpenseName: document.getElementById('new-expense-name'),
                newExpenseDesc: document.getElementById('new-expense-desc'),
                newExpenseValue: document.getElementById('new-expense-value'),
                addNewExpenseBtn: document.getElementById('add-new-expense-btn'),
                expenseDate: document.getElementById('expense-date'),
                expensesHistoryList: document.getElementById('expenses-history-list'),
                expensesSummary: document.getElementById('expenses-summary'),
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
                editRegisterModal: document.getElementById('edit-register-modal'),
                editOpeningBillsInput: document.getElementById('edit-opening-bills'),
                editOpeningCoinsInput: document.getElementById('edit-opening-coins'),
                editOpeningTotalDisplay: document.getElementById('edit-opening-total-display'),
                btnCancelEditRegister: document.getElementById('btn-cancel-edit-register'),
                btnCancelEditRegisterIcon: document.getElementById('btn-cancel-edit-register-icon'),
                btnConfirmEditRegister: document.getElementById('btn-confirm-edit-register'),
                dashOpeningBalance: document.getElementById('dash-opening-balance'),
                dashCashSales: document.getElementById('dash-cash-sales'),
                dashExpenses: document.getElementById('dash-expenses'),
                dashCurrentBalance: document.getElementById('dash-current-balance'),
                dashCardTotal: document.getElementById('dash-card-total'),
                dashPixTotal: document.getElementById('dash-pix-total'),

                // Admin
                adminControlsPanel: document.getElementById('admin-controls-panel'),
                acaiPriceInput: document.getElementById('acai-price'),
                sorvetePriceInput: document.getElementById('sorvete-price'),
                updateAcaiPriceBtn: document.getElementById('update-acai-price'),
                updateSorvetePriceBtn: document.getElementById('update-sorvete-price'),
                currentDeletePasswordInput: document.getElementById('current-delete-password'),
                newDeletePasswordInput: document.getElementById('new-delete-password'),
                confirmNewDeletePasswordInput: document.getElementById('confirm-new-delete-password'),
                updateDeletePasswordBtn: document.getElementById('update-delete-password'),
                reportMonthSelect: document.getElementById('report-month-select'),
                generateMonthlyReportPdfBtn: document.getElementById('generate-monthly-report-pdf'),
                discountActiveCheck: document.getElementById('discount-active-check'),
                discountConfigArea: document.getElementById('discount-config-area'),
                discountPercentageInput: document.getElementById('discount-percentage'),
                discountTimeModeAll: document.getElementById('discount-time-mode-all'),
                discountTimeModeCustom: document.getElementById('discount-time-mode-custom'),
                discountStartTime: document.getElementById('discount-start-time'),
                discountEndTime: document.getElementById('discount-end-time'),
                promoCustomTimeBox: document.getElementById('promo-custom-time-box'),
                promoTimeHint: document.getElementById('promo-time-hint'),
                labelTimeAllDay: document.getElementById('label-time-all-day'),
                labelTimeCustom: document.getElementById('label-time-custom'),
                discountTargetAcai: document.getElementById('discount-target-acai'),
                discountTargetSorvete: document.getElementById('discount-target-sorvete'),
                saveDiscountConfigBtn: document.getElementById('save-discount-config'),
                promoStatusBanner: document.getElementById('promo-current-status-banner'),

                // Produtos Tab & Gestão
                productViewSearch: document.getElementById('product-view-search'),
                productsCatalogFullGrid: document.getElementById('products-catalog-full-grid'),
                openAddProductModalBtn: document.getElementById('open-add-product-modal-btn'),
                productViewCategoryFilters: document.getElementById('product-view-category-filters'),
                productCountNumber: document.getElementById('product-count-number'),

                // Modais de Produtos
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

                // Modais de Segurança & Histórico
                passwordModal: document.getElementById('password-modal'),
                passwordModalTitle: document.getElementById('password-modal-title'),
                passwordModalDesc: document.getElementById('password-modal-desc'),
                confirmDeletePasswordInput: document.getElementById('confirm-delete-password'),
                confirmDeleteBtn: document.getElementById('confirm-delete'),
                cancelDeleteBtn: document.getElementById('cancel-delete'),
                cancelDeleteIcon: document.getElementById('cancel-delete-icon'),

                receiptModal: document.getElementById('receipt-modal'),
                receiptContent: document.getElementById('receipt-content'),
                printReceiptBtn: document.getElementById('print-receipt-btn'),
                closeReceiptBtn: document.getElementById('close-receipt-btn'),
                closeReceiptIcon: document.getElementById('close-receipt-icon'),

                manualSaleModal: document.getElementById('manual-sale-modal'),
                manualProductSelect: document.getElementById('manual-product-select'),
                manualAcaiWeightSection: document.getElementById('manual-acai-weight-section'),
                manualAcaiWeightInput: document.getElementById('manual-acai-weight'),
                manualAddItemBtn: document.getElementById('manual-add-item-btn'),
                manualSaleCartItems: document.getElementById('manual-sale-cart-items'),
                manualSaleSummary: document.getElementById('manual-sale-summary'),
                manualSaleTotal: document.getElementById('manual-sale-total'),
                manualPaymentOptions: document.querySelectorAll('#manual-payment-options .payment-option'),
                saveManualSaleBtn: document.getElementById('save-manual-sale-btn'),
                closeManualSaleBtn: document.getElementById('close-manual-sale-btn'),
                closeManualSaleIcon: document.getElementById('close-manual-sale-icon'),

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

                closeRegisterModal: document.getElementById('close-register-modal'),
                closingBalanceInput: document.getElementById('closing-balance-input'),
                closingObservationInput: document.getElementById('closing-observation-input'),
                btnConfirmCloseRegister: document.getElementById('btn-confirm-close-register'),
                btnCancelCloseRegister: document.getElementById('btn-cancel-close-register'),
                btnCancelCloseRegisterIcon: document.getElementById('btn-cancel-close-register-icon'),

                genericConfirmModal: document.getElementById('generic-confirm-modal'),
                genericConfirmTitle: document.getElementById('generic-confirm-title'),
                genericConfirmMessage: document.getElementById('generic-confirm-message'),
                genericConfirmOk: document.getElementById('generic-confirm-ok'),
                genericConfirmCancel: document.getElementById('generic-confirm-cancel'),
                genericConfirmClose: document.getElementById('generic-confirm-close'),

                toastContainer: document.getElementById('toast-container'),
                notification: document.getElementById('notification'),
            };
        },

        bindEvents() {
            // Theme Toggle
            if (this.DOM.themeToggleBtn) {
                this.DOM.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
            }

            // Mobile Drawer Toggle
            if (this.DOM.headerMenuBtn) {
                this.DOM.headerMenuBtn.addEventListener('click', () => {
                    this.DOM.appSidebar.classList.add('open');
                    this.DOM.sidebarBackdrop.classList.add('show');
                });
            }
            if (this.DOM.sidebarCloseBtn) {
                this.DOM.sidebarCloseBtn.addEventListener('click', () => {
                    this.DOM.appSidebar.classList.remove('open');
                    this.DOM.sidebarBackdrop.classList.remove('show');
                });
            }
            if (this.DOM.sidebarBackdrop) {
                this.DOM.sidebarBackdrop.addEventListener('click', () => {
                    this.DOM.appSidebar.classList.remove('open');
                    this.DOM.sidebarBackdrop.classList.remove('show');
                });
            }

            // Tabs de navegação
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.currentTarget.dataset.tab;
                    this.handlers.switchTab(tabName);
                    if (this.DOM.appSidebar) this.DOM.appSidebar.classList.remove('open');
                    if (this.DOM.sidebarBackdrop) this.DOM.sidebarBackdrop.classList.remove('show');
                });
            });

            // Header Caixa Badge Atalho
            if (this.DOM.headerCaixaBadge) {
                this.DOM.headerCaixaBadge.addEventListener('click', () => this.handlers.switchTab('caixa'));
            }

            // PDV: Pesagem
            if (this.DOM.weightInput) {
                this.DOM.weightInput.addEventListener('input', (e) => this.handlers.calculateWeightedPrice(e));
                this.DOM.weightInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.addWeightedProductToCart();
                });
            }
            if (this.DOM.weightQtyMinus) {
                this.DOM.weightQtyMinus.addEventListener('click', () => {
                    if (this.DOM.weightQtyInput) {
                        let cur = parseInt(this.DOM.weightQtyInput.value, 10) || 1;
                        if (cur > 1) {
                            this.DOM.weightQtyInput.value = cur - 1;
                            this.handlers.calculateWeightedPrice({ target: this.DOM.weightInput });
                        }
                    }
                });
            }
            if (this.DOM.weightQtyPlus) {
                this.DOM.weightQtyPlus.addEventListener('click', () => {
                    if (this.DOM.weightQtyInput) {
                        let cur = parseInt(this.DOM.weightQtyInput.value, 10) || 1;
                        this.DOM.weightQtyInput.value = cur + 1;
                        this.handlers.calculateWeightedPrice({ target: this.DOM.weightInput });
                    }
                });
            }
            if (this.DOM.weightQtyInput) {
                this.DOM.weightQtyInput.addEventListener('input', () => {
                    this.handlers.calculateWeightedPrice({ target: this.DOM.weightInput });
                });
            }
            if (this.DOM.addToCartBtn) {
                this.DOM.addToCartBtn.addEventListener('click', () => this.handlers.addWeightedProductToCart());
            }
            if (this.DOM.productTypeSelector) {
                this.DOM.productTypeSelector.querySelectorAll('.quick-add-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handlers.selectWeightedProduct(e.currentTarget.dataset.type));
                });
            }

            // Atalhos de Peso (Modal & Admin)
            if (this.DOM.openWeightPresetsModalBtn) {
                this.DOM.openWeightPresetsModalBtn.addEventListener('click', () => this.handlers.openWeightPresetsModal());
            }
            if (this.DOM.closeWeightPresetsIcon) {
                this.DOM.closeWeightPresetsIcon.addEventListener('click', () => this.handlers.closeWeightPresetsModal());
            }
            if (this.DOM.closeWeightPresetsBtn) {
                this.DOM.closeWeightPresetsBtn.addEventListener('click', () => this.handlers.closeWeightPresetsModal());
            }
            if (this.DOM.weightPresetsModal) {
                this.DOM.weightPresetsModal.addEventListener('click', (e) => {
                    if (e.target === this.DOM.weightPresetsModal) this.handlers.closeWeightPresetsModal();
                });
            }
            if (this.DOM.modalAddPresetBtn) {
                this.DOM.modalAddPresetBtn.addEventListener('click', () => {
                    const val = parseInt(this.DOM.modalNewPresetWeight.value, 10);
                    this.handlers.addWeightPreset(val, 'modal');
                });
            }
            if (this.DOM.modalNewPresetWeight) {
                this.DOM.modalNewPresetWeight.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const val = parseInt(this.DOM.modalNewPresetWeight.value, 10);
                        this.handlers.addWeightPreset(val, 'modal');
                    }
                });
            }
            if (this.DOM.modalResetPresetsBtn) {
                this.DOM.modalResetPresetsBtn.addEventListener('click', () => this.handlers.resetWeightPresets());
            }

            if (this.DOM.adminAddPresetBtn) {
                this.DOM.adminAddPresetBtn.addEventListener('click', () => {
                    const val = parseInt(this.DOM.adminNewPresetWeight.value, 10);
                    this.handlers.addWeightPreset(val, 'admin');
                });
            }
            if (this.DOM.adminNewPresetWeight) {
                this.DOM.adminNewPresetWeight.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const val = parseInt(this.DOM.adminNewPresetWeight.value, 10);
                        this.handlers.addWeightPreset(val, 'admin');
                    }
                });
            }
            if (this.DOM.adminResetPresetsBtn) {
                this.DOM.adminResetPresetsBtn.addEventListener('click', () => this.handlers.resetWeightPresets());
            }

            // PDV: Busca e Produtos
            if (this.DOM.productSearch) {
                this.DOM.productSearch.addEventListener('input', () => this.render.products());
            }
            if (this.DOM.productViewSearch) {
                this.DOM.productViewSearch.addEventListener('input', () => this.render.productsCatalogFull());
            }

            // PDV: Entrega vs Balcão
            if (this.DOM.deliveryModeSelector) {
                this.DOM.deliveryModeSelector.querySelectorAll('.delivery-mode-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handlers.selectDeliveryMode(e.currentTarget.dataset.mode));
                });
            }
            if (this.DOM.deliveryFee) {
                this.DOM.deliveryFee.addEventListener('input', () => this.render.cart());
            }

            // PDV: Formas de Pagamento
            if (this.DOM.paymentOptions) {
                this.DOM.paymentOptions.forEach(el => el.addEventListener('click', () => this.handlers.selectPaymentMethod(el)));
            }
            if (this.DOM.cashReceivedInput) {
                this.DOM.cashReceivedInput.addEventListener('input', () => this.handlers.calculateChange());
            }

            // Atalhos de Dinheiro Recebido
            if (this.DOM.cashPresetsRow) {
                this.DOM.cashPresetsRow.querySelectorAll('.cash-preset-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const preset = e.currentTarget.dataset.preset;
                        const subtotal = App.state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
                        const fee = App.state.ui.deliveryMode === 'entrega' ? (parseFloat(App.DOM.deliveryFee.value) || 0) : 0;
                        const total = subtotal + fee;

                        if (preset === 'exact') {
                            App.DOM.cashReceivedInput.value = total.toFixed(2);
                        } else {
                            App.DOM.cashReceivedInput.value = parseFloat(preset).toFixed(2);
                        }
                        this.handlers.calculateChange();
                    });
                });
            }

            // Ações do Carrinho
            if (this.DOM.finishSaleBtn) {
                this.DOM.finishSaleBtn.addEventListener('click', () => this.handlers.preparePayment());
            }
            if (this.DOM.confirmPaymentButton) {
                this.DOM.confirmPaymentButton.addEventListener('click', () => this.handlers.confirmPayment());
            }
            if (this.DOM.cancelSaleBtn) {
                this.DOM.cancelSaleBtn.addEventListener('click', () => this.handlers.cancelSale());
            }
            if (this.DOM.holdSaleButton) {
                this.DOM.holdSaleButton.addEventListener('click', () => this.handlers.requestHoldSale());
            }

            // Delegação de cliques para botões de quantidade, remoção de item e histórico
            document.addEventListener('click', (e) => {
                if (e.target.closest('.cart-item .btn-qty-minus')) {
                    const btn = e.target.closest('.cart-item .btn-qty-minus');
                    this.handlers.updateCartItemQuantity(btn.dataset.index, -1);
                }
                if (e.target.closest('.cart-item .btn-qty-plus')) {
                    const btn = e.target.closest('.cart-item .btn-qty-plus');
                    this.handlers.updateCartItemQuantity(btn.dataset.index, 1);
                }
                if (e.target.closest('.cart-item .btn-remove')) {
                    const btn = e.target.closest('.cart-item .btn-remove');
                    this.handlers.removeFromCart(btn.dataset.index);
                }
                if (e.target.closest('#manual-sale-cart-items .btn-remove')) {
                    const btn = e.target.closest('#manual-sale-cart-items .btn-remove');
                    this.handlers.removeManualItem(btn.dataset.index);
                }
                if (e.target.closest('.sales-history .delete-sale') || e.target.closest('.delete-sale')) {
                    const btn = e.target.closest('.delete-sale');
                    this.handlers.requestDeleteSale(btn);
                }
                if (e.target.closest('.delete-expense')) {
                    const btn = e.target.closest('.delete-expense');
                    this.handlers.requestDeleteExpense(btn);
                }
                if (e.target.closest('.sales-history .reprint-sale') || e.target.closest('.reprint-sale')) {
                    const btn = e.target.closest('.reprint-sale');
                    this.handlers.reprintSale(btn);
                }
                if (e.target.closest('.delete-product-btn')) {
                    const btn = e.target.closest('.delete-product-btn');
                    this.handlers.deleteProduct(btn.dataset.id);
                }
            });

            // Comandas Grid & Modais
            if (this.DOM.openOrdersGrid) {
                this.DOM.openOrdersGrid.addEventListener('click', (e) => {
                    const deleteBtn = e.target.closest('.open-order-delete-btn');
                    if (deleteBtn) {
                        e.stopPropagation();
                        const orderId = parseInt(deleteBtn.dataset.id);
                        this.handlers.deleteOpenOrder(orderId);
                        return;
                    }
                    const card = e.target.closest('.open-order-card');
                    if (card) this.handlers.openOrderDetails(parseInt(card.dataset.id));
                });
            }
            if (this.DOM.saveHoldSaleBtn) this.DOM.saveHoldSaleBtn.addEventListener('click', () => this.handlers.saveHoldSale());
            if (this.DOM.closeHoldSaleBtn) this.DOM.closeHoldSaleBtn.addEventListener('click', () => this.DOM.holdSaleModal.style.display = 'none');
            if (this.DOM.closeHoldSaleIcon) this.DOM.closeHoldSaleIcon.addEventListener('click', () => this.DOM.holdSaleModal.style.display = 'none');

            if (this.DOM.closeOpenOrderBtn) this.DOM.closeOpenOrderBtn.addEventListener('click', () => this.handlers.closeOpenOrderModal());
            if (this.DOM.closeOpenOrderIcon) this.DOM.closeOpenOrderIcon.addEventListener('click', () => this.handlers.closeOpenOrderModal());
            if (this.DOM.deleteOpenOrderBtn) {
                this.DOM.deleteOpenOrderBtn.addEventListener('click', () => {
                    if (App.state.ui.currentOpenOrder) {
                        this.handlers.deleteOpenOrder(App.state.ui.currentOpenOrder.id);
                    }
                });
            }
            if (this.DOM.openOrderPaymentOptions) {
                this.DOM.openOrderPaymentOptions.forEach(el => {
                    el.addEventListener('click', () => this.handlers.selectOpenOrderPaymentMethod(el));
                });
            }
            if (this.DOM.openOrderCashReceived) {
                this.DOM.openOrderCashReceived.addEventListener('input', () => this.handlers.calculateOpenOrderChange());
            }
            if (this.DOM.confirmOpenOrderPaymentBtn) {
                this.DOM.confirmOpenOrderPaymentBtn.addEventListener('click', () => this.handlers.finalizeOpenOrderPayment());
            }

            // Caixa
            if (this.DOM.openingBillsInput) this.DOM.openingBillsInput.addEventListener('input', () => this.handlers.calculateOpeningTotal());
            if (this.DOM.openingCoinsInput) this.DOM.openingCoinsInput.addEventListener('input', () => this.handlers.calculateOpeningTotal());
            if (this.DOM.btnOpenRegister) this.DOM.btnOpenRegister.addEventListener('click', () => this.handlers.openRegister());
            if (this.DOM.btnCloseRegister) this.DOM.btnCloseRegister.addEventListener('click', () => this.handlers.openCloseRegisterModal());
            if (this.DOM.btnConfirmCloseRegister) this.DOM.btnConfirmCloseRegister.addEventListener('click', () => this.handlers.confirmCloseRegister());
            if (this.DOM.btnCancelCloseRegister) this.DOM.btnCancelCloseRegister.addEventListener('click', () => this.DOM.closeRegisterModal.style.display = 'none');
            if (this.DOM.btnCancelCloseRegisterIcon) this.DOM.btnCancelCloseRegisterIcon.addEventListener('click', () => this.DOM.closeRegisterModal.style.display = 'none');

            // Edição de Caixa Aberto
            if (this.DOM.btnEditOpenRegister) this.DOM.btnEditOpenRegister.addEventListener('click', () => this.handlers.openEditRegisterModal());
            if (this.DOM.btnEditOpeningMetric) this.DOM.btnEditOpeningMetric.addEventListener('click', () => this.handlers.openEditRegisterModal());
            if (this.DOM.editOpeningBillsInput) {
                this.DOM.editOpeningBillsInput.addEventListener('input', () => this.handlers.calculateEditOpeningTotal());
                this.DOM.editOpeningBillsInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.confirmEditRegister();
                });
            }
            if (this.DOM.editOpeningCoinsInput) {
                this.DOM.editOpeningCoinsInput.addEventListener('input', () => this.handlers.calculateEditOpeningTotal());
                this.DOM.editOpeningCoinsInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.confirmEditRegister();
                });
            }
            if (this.DOM.btnCancelEditRegister) this.DOM.btnCancelEditRegister.addEventListener('click', () => this.DOM.editRegisterModal.style.display = 'none');
            if (this.DOM.btnCancelEditRegisterIcon) this.DOM.btnCancelEditRegisterIcon.addEventListener('click', () => this.DOM.editRegisterModal.style.display = 'none');
            if (this.DOM.btnConfirmEditRegister) this.DOM.btnConfirmEditRegister.addEventListener('click', () => this.handlers.confirmEditRegister());
            if (this.DOM.editRegisterModal) {
                this.DOM.editRegisterModal.addEventListener('click', (e) => {
                    if (e.target === this.DOM.editRegisterModal) this.DOM.editRegisterModal.style.display = 'none';
                });
            }

            // Histórico
            if (this.DOM.historyDate) this.DOM.historyDate.addEventListener('change', (e) => this.render.history(e.target.value));
            if (this.DOM.exportHistoryPdfBtn) this.DOM.exportHistoryPdfBtn.addEventListener('click', () => this.handlers.exportHistoryToPDF());
            if (this.DOM.addManualSaleBtn) this.DOM.addManualSaleBtn.addEventListener('click', () => this.handlers.openManualSaleModal());

            // Venda Manual Modal
            if (this.DOM.manualProductSelect) this.DOM.manualProductSelect.addEventListener('change', (e) => this.handlers.toggleManualWeightInput(e));
            if (this.DOM.manualAddItemBtn) this.DOM.manualAddItemBtn.addEventListener('click', () => this.handlers.addManualItem());
            if (this.DOM.saveManualSaleBtn) this.DOM.saveManualSaleBtn.addEventListener('click', () => this.handlers.saveManualSale());
            if (this.DOM.closeManualSaleBtn) this.DOM.closeManualSaleBtn.addEventListener('click', () => this.DOM.manualSaleModal.style.display = 'none');
            if (this.DOM.closeManualSaleIcon) this.DOM.closeManualSaleIcon.addEventListener('click', () => this.DOM.manualSaleModal.style.display = 'none');
            if (this.DOM.manualPaymentOptions) {
                this.DOM.manualPaymentOptions.forEach(el => el.addEventListener('click', () => this.handlers.selectManualPaymentMethod(el)));
            }

            // Despesas
            if (this.DOM.addNewExpenseBtn) this.DOM.addNewExpenseBtn.addEventListener('click', () => this.handlers.addNewExpense());
            if (this.DOM.expenseDate) this.DOM.expenseDate.addEventListener('change', (e) => this.render.expenses(e.target.value));

            // Admin
            if (this.DOM.updateAcaiPriceBtn) this.DOM.updateAcaiPriceBtn.addEventListener('click', () => this.handlers.updateAcaiPrice());
            if (this.DOM.updateSorvetePriceBtn) this.DOM.updateSorvetePriceBtn.addEventListener('click', () => this.handlers.updateSorvetePrice());
            if (this.DOM.updateDeletePasswordBtn) this.DOM.updateDeletePasswordBtn.addEventListener('click', () => this.handlers.updateDeletePassword());
            if (this.DOM.generateMonthlyReportPdfBtn) this.DOM.generateMonthlyReportPdfBtn.addEventListener('click', () => this.handlers.requestExportMonthlyReport());
            if (this.DOM.discountActiveCheck) this.DOM.discountActiveCheck.addEventListener('change', (e) => this.handlers.toggleDiscountConfig(e));
            if (this.DOM.saveDiscountConfigBtn) this.DOM.saveDiscountConfigBtn.addEventListener('click', () => this.handlers.saveDiscountConfig());

            // Atalhos de Porcentagem Rápida
            document.querySelectorAll('.promo-quick-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const percent = e.currentTarget.dataset.percent;
                    if (App.DOM.discountPercentageInput) {
                        App.DOM.discountPercentageInput.value = percent;
                        document.querySelectorAll('.promo-quick-btn').forEach(b => b.classList.remove('active'));
                        e.currentTarget.classList.add('active');
                    }
                });
            });
            if (this.DOM.discountPercentageInput) {
                this.DOM.discountPercentageInput.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    document.querySelectorAll('.promo-quick-btn').forEach(b => {
                        b.classList.toggle('active', parseFloat(b.dataset.percent) === val);
                    });
                });
            }

            // Modo de Horário (Dia todo / Definir horário)
            const handleTimeModeChange = () => {
                const isAllDay = document.getElementById('discount-time-mode-all')?.checked;
                if (App.DOM.labelTimeAllDay) App.DOM.labelTimeAllDay.classList.toggle('active', Boolean(isAllDay));
                if (App.DOM.labelTimeCustom) App.DOM.labelTimeCustom.classList.toggle('active', !isAllDay);
                if (App.DOM.promoCustomTimeBox) {
                    if (isAllDay) {
                        App.DOM.promoCustomTimeBox.classList.add('disabled');
                    } else {
                        App.DOM.promoCustomTimeBox.classList.remove('disabled');
                    }
                }
                this.utils.validatePromoTimeRange();
            };
            if (this.DOM.discountTimeModeAll) this.DOM.discountTimeModeAll.addEventListener('change', handleTimeModeChange);
            if (this.DOM.discountTimeModeCustom) this.DOM.discountTimeModeCustom.addEventListener('change', handleTimeModeChange);

            // Validação em Tempo Real nos Inputs de Horário
            if (this.DOM.discountStartTime) {
                this.DOM.discountStartTime.addEventListener('input', () => this.utils.validatePromoTimeRange());
                this.DOM.discountStartTime.addEventListener('change', () => this.utils.validatePromoTimeRange());
            }
            if (this.DOM.discountEndTime) {
                this.DOM.discountEndTime.addEventListener('input', () => this.utils.validatePromoTimeRange());
                this.DOM.discountEndTime.addEventListener('change', () => this.utils.validatePromoTimeRange());
            }

            // Presets Rápidos de Horário (Almoço, Tarde, Noite, etc.)
            document.querySelectorAll('.promo-time-preset-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const start = e.currentTarget.dataset.start;
                    const end = e.currentTarget.dataset.end;
                    if (App.DOM.discountStartTime) App.DOM.discountStartTime.value = start;
                    if (App.DOM.discountEndTime) App.DOM.discountEndTime.value = end;
                    if (App.DOM.discountTimeModeCustom) {
                        App.DOM.discountTimeModeCustom.checked = true;
                        handleTimeModeChange();
                    }
                    this.utils.validatePromoTimeRange();
                });
            });

            // Atalhos de Seleção Rápida de Dias
            const btnAllDays = document.getElementById('btn-select-all-days');
            if (btnAllDays) {
                btnAllDays.addEventListener('click', () => {
                    document.querySelectorAll('input[name="discount-day"]').forEach(cb => cb.checked = true);
                });
            }
            const btnWeekdays = document.getElementById('btn-select-weekdays');
            if (btnWeekdays) {
                btnWeekdays.addEventListener('click', () => {
                    document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
                        const val = parseInt(cb.value, 10);
                        cb.checked = (val >= 1 && val <= 5);
                    });
                });
            }
            const btnWeekends = document.getElementById('btn-select-weekends');
            if (btnWeekends) {
                btnWeekends.addEventListener('click', () => {
                    document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
                        const val = parseInt(cb.value, 10);
                        cb.checked = (val === 0 || val === 6);
                    });
                });
            }

            // Sub-Abas do Admin
            document.querySelectorAll('.admin-sub-tab').forEach(t => {
                t.addEventListener('click', (e) => this.handlers.switchAdminSubTab(e.currentTarget.dataset.subtab));
            });

            // Modais de Segurança & Recibo
            const closeSecurityModal = () => {
                if (this.DOM.passwordModal) this.DOM.passwordModal.style.display = 'none';
                if (this.DOM.confirmDeletePasswordInput) this.DOM.confirmDeletePasswordInput.value = '';
                App.state.ui.pendingSecurityAction = null;
                App.state.ui.saleToDelete = null;
            };

            if (this.DOM.confirmDeleteBtn) this.DOM.confirmDeleteBtn.addEventListener('click', () => this.handlers.confirmSecurityAction());
            if (this.DOM.confirmDeletePasswordInput) {
                this.DOM.confirmDeletePasswordInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.confirmSecurityAction();
                });
            }
            if (this.DOM.cancelDeleteBtn) this.DOM.cancelDeleteBtn.addEventListener('click', closeSecurityModal);
            if (this.DOM.cancelDeleteIcon) this.DOM.cancelDeleteIcon.addEventListener('click', closeSecurityModal);

            if (this.DOM.printReceiptBtn) this.DOM.printReceiptBtn.addEventListener('click', () => this.handlers.printLastReceiptModal());
            if (this.DOM.closeReceiptBtn) this.DOM.closeReceiptBtn.addEventListener('click', () => this.DOM.receiptModal.style.display = 'none');
            if (this.DOM.closeReceiptIcon) this.DOM.closeReceiptIcon.addEventListener('click', () => this.DOM.receiptModal.style.display = 'none');

            // Modais de Cadastro & Edição de Produtos (Aba Produtos)
            if (this.DOM.openAddProductModalBtn) {
                this.DOM.openAddProductModalBtn.addEventListener('click', () => this.handlers.openAddProductModal());
            }
            if (this.DOM.closeAddProductBtn) {
                this.DOM.closeAddProductBtn.addEventListener('click', () => this.handlers.closeAddProductModal());
            }
            if (this.DOM.closeAddProductIcon) {
                this.DOM.closeAddProductIcon.addEventListener('click', () => this.handlers.closeAddProductModal());
            }
            if (this.DOM.saveNewProductModalBtn) {
                this.DOM.saveNewProductModalBtn.addEventListener('click', () => this.handlers.saveNewProductFromModal());
            }
            if (this.DOM.modalNewProductPrice) {
                this.DOM.modalNewProductPrice.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.saveNewProductFromModal();
                });
            }

            if (this.DOM.closeEditProductBtn) {
                this.DOM.closeEditProductBtn.addEventListener('click', () => this.handlers.closeEditProductModal());
            }
            if (this.DOM.closeEditProductIcon) {
                this.DOM.closeEditProductIcon.addEventListener('click', () => this.handlers.closeEditProductModal());
            }
            if (this.DOM.saveEditProductModalBtn) {
                this.DOM.saveEditProductModalBtn.addEventListener('click', () => this.handlers.saveEditProductFromModal());
            }
            if (this.DOM.modalEditProductPrice) {
                this.DOM.modalEditProductPrice.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handlers.saveEditProductFromModal();
                });
            }
        },

        handlers: {
            switchTab(tabName) {
                // Remove active de todas as abas
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                const activeTabs = document.querySelectorAll(`.tab[data-tab="${tabName}"]`);
                activeTabs.forEach(t => t.classList.add('active'));

                // Atualiza conteúdo
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const targetContent = document.getElementById(`${tabName}-tab`);
                if (targetContent) targetContent.classList.add('active');

                // Atualiza Header Breadcrumb e Título
                const titles = {
                    venda: { title: 'Ponto de Venda', breadcrumb: 'Início • Venda Rápida' },
                    comandas: { title: 'Comandas em Aberto', breadcrumb: 'Operação • Pedidos & Mesas' },
                    caixa: { title: 'Controle de Caixa', breadcrumb: 'Financeiro • Movimentações do Dia' },
                    produtos: { title: 'Catálogo de Produtos', breadcrumb: 'Gestão • Vitrine & Preços' },
                    historico: { title: 'Histórico de Vendas', breadcrumb: 'Relatórios • Vendas Realizadas' },
                    despesas: { title: 'Registro de Despesas', breadcrumb: 'Financeiro • Saídas e Retiradas' },
                    admin: { title: 'Administração', breadcrumb: 'Configurações • Sistema & Segurança' }
                };

                if (titles[tabName]) {
                    App.DOM.pageTitle.textContent = titles[tabName].title;
                    App.DOM.pageBreadcrumb.textContent = titles[tabName].breadcrumb;
                }

                if (tabName === 'despesas') {
                    const todayDate = App.state.ui.today;
                    if (App.datePickers && App.datePickers.instances.expense) {
                        const parts = todayDate.split('-').map(Number);
                        App.datePickers.updateValue('expense', parts[0], parts[1], parts[2], false);
                    }
                    App.render.expenses(todayDate);
                }
                if (tabName === 'caixa') {
                    App.render.cashRegister();
                }
                if (tabName === 'produtos') {
                    App.render.productsCatalogFull();
                }
                if (tabName === 'historico') {
                    const activeDate = App.DOM.historyDate.value || App.state.ui.today;
                    if (App.datePickers && App.datePickers.instances.history) {
                        const parts = activeDate.split('-').map(Number);
                        App.datePickers.updateValue('history', parts[0], parts[1], parts[2], false);
                    }
                    App.render.history(activeDate);
                }
                if (window.lucide) lucide.createIcons();
            },

            switchAdminSubTab(subTabName) {
                document.querySelectorAll('.admin-sub-tab').forEach(t => t.classList.remove('active'));
                const targetTab = document.querySelector(`.admin-sub-tab[data-subtab="${subTabName}"]`);
                if (targetTab) targetTab.classList.add('active');

                document.querySelectorAll('.admin-sub-content').forEach(c => c.classList.remove('active'));
                const targetContent = document.getElementById(`admin-${subTabName}-content`);
                if (targetContent) targetContent.classList.add('active');

                if (subTabName === 'relatorios') {
                    if (App.monthPicker) {
                        App.monthPicker.updateValue(App.monthPicker.state.selectedYear, App.monthPicker.state.selectedMonth);
                    }
                }
                if (window.lucide) lucide.createIcons();
            },

            toggleDiscountConfig(e) {
                const isEnabled = e.target.checked;
                if (isEnabled) {
                    App.DOM.discountConfigArea.classList.remove('disabled');
                } else {
                    App.DOM.discountConfigArea.classList.add('disabled');
                }
                App.state.discount.enabled = isEnabled;
                App.checkScheduledDiscount();
                App.render.activeDiscountIndicator();
                App.render.promoStatusBanner();
            },

            saveDiscountConfig() {
                const isEnabled = App.DOM.discountActiveCheck.checked;
                const percentage = parseFloat(App.DOM.discountPercentageInput.value);
                const acaiTarget = App.DOM.discountTargetAcai.checked;
                const sorveteTarget = App.DOM.discountTargetSorvete.checked;

                const selectedDayInputs = document.querySelectorAll('input[name="discount-day"]:checked');
                const selectedDays = Array.from(selectedDayInputs).map(el => parseInt(el.value, 10));

                const allDay = document.querySelector('input[name="discount-time-mode"]:checked')?.value !== 'custom';
                const startTime = App.DOM.discountStartTime?.value || '10:00';
                const endTime = App.DOM.discountEndTime?.value || '21:00';

                if (isEnabled) {
                    if (!percentage || percentage <= 0 || percentage > 100) {
                        return App.utils.showNotification('Defina uma porcentagem de desconto válida entre 1% e 100%.', 'error');
                    }
                    if (selectedDays.length === 0) {
                        return App.utils.showNotification('Selecione pelo menos um dia da semana para a promoção.', 'warning');
                    }
                    if (!acaiTarget && !sorveteTarget) {
                        return App.utils.showNotification('Selecione pelo menos um produto (Açaí ou Sorvete).', 'warning');
                    }
                    if (!allDay) {
                        if (!startTime || !endTime) {
                            return App.utils.showNotification('Defina os horários de início e fim da promoção.', 'warning');
                        }
                        const timeCheck = App.utils.validatePromoTimeRange();
                        if (!timeCheck.valid) {
                            if (timeCheck.pmSuggested) {
                                return App.utils.showNotification(`O horário final (${endTime}) é anterior ao início (${startTime}). Use ${timeCheck.pmSuggested} para ${parseInt(endTime.split(':')[0], 10)}h da noite.`, 'error', 4000);
                            }
                            return App.utils.showNotification(`O horário final (${endTime}) deve ser posterior ao horário de início (${startTime}).`, 'error', 4000);
                        }
                    }
                }

                App.state.discount = {
                    enabled: isEnabled,
                    percentage: percentage || 10,
                    targets: {
                        acai: acaiTarget,
                        sorvete: sorveteTarget
                    },
                    days: selectedDays.length > 0 ? selectedDays : [4],
                    allDay: allDay,
                    startTime: startTime,
                    endTime: endTime,
                    active: false
                };

                App.storage.saveDiscount();
                App.checkScheduledDiscount();
                App.render.discountControls();
                App.render.activeDiscountIndicator();
                App.render.promoStatusBanner();

                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const daysLabel = App.state.discount.days.map(d => dayNames[d]).join(', ');
                const timeDesc = allDay ? 'o dia todo' : `das ${startTime} às ${endTime}`;

                if (isEnabled) {
                    if (App.state.discount.active) {
                        App.utils.showNotification(`Promoção salva! Ativa agora (${dayNames[new Date().getDay()]}, ${timeDesc}) com ${percentage}% OFF!`, 'success');
                    } else {
                        App.utils.showNotification(`Configuração salva! Promoção programada para: ${daysLabel} (${timeDesc}).`, 'success');
                    }
                } else {
                    App.utils.showNotification('Promoção desativada e configurações salvas.', 'info');
                }
            },

            // --- Lógica de Caixa ---
            calculateOpeningTotal() {
                const bills = parseFloat(App.DOM.openingBillsInput.value) || 0;
                const coins = parseFloat(App.DOM.openingCoinsInput.value) || 0;
                App.DOM.openingTotalDisplay.textContent = `R$ ${(bills + coins).toFixed(2)}`;
            },

            openRegister() {
                const bills = parseFloat(App.DOM.openingBillsInput.value) || 0;
                const coins = parseFloat(App.DOM.openingCoinsInput.value) || 0;
                const total = bills + coins;

                if (total <= 0) {
                    App.utils.confirm('O valor de abertura está zerado (R$ 0,00). Deseja abrir o caixa assim mesmo?', 'Abertura de Caixa', () => {
                        App.handlers.executeOpenRegister(bills, coins, total);
                    });
                    return;
                }

                this.executeOpenRegister(bills, coins, total);
            },

            executeOpenRegister(bills, coins, total) {
                const today = App.state.ui.today;
                App.state.cashRegister[today] = {
                    status: 'open',
                    openingTime: new Date().toLocaleString('pt-BR'),
                    bills: bills,
                    coins: coins,
                    totalOpening: total
                };

                App.storage.saveCashRegister();
                App.render.cashRegister();
                App.utils.showNotification('Caixa aberto com sucesso!', 'success');

                App.DOM.openingBillsInput.value = '';
                App.DOM.openingCoinsInput.value = '';
                App.DOM.openingTotalDisplay.textContent = 'R$ 0,00';
            },

            openEditRegisterModal() {
                const today = App.state.ui.today;
                const register = App.state.cashRegister[today];
                if (!register || register.status !== 'open') {
                    return App.utils.showNotification('Nenhum caixa aberto para edição.', 'warning');
                }

                if (App.DOM.editOpeningBillsInput) App.DOM.editOpeningBillsInput.value = register.bills !== undefined ? register.bills : '';
                if (App.DOM.editOpeningCoinsInput) App.DOM.editOpeningCoinsInput.value = register.coins !== undefined ? register.coins : '';
                
                const bills = parseFloat(register.bills) || 0;
                const coins = parseFloat(register.coins) || 0;
                const total = bills + coins;
                if (App.DOM.editOpeningTotalDisplay) App.DOM.editOpeningTotalDisplay.textContent = `R$ ${total.toFixed(2)}`;

                if (App.DOM.editRegisterModal) {
                    App.DOM.editRegisterModal.style.display = 'flex';
                    setTimeout(() => {
                        if (App.DOM.editOpeningBillsInput) App.DOM.editOpeningBillsInput.focus();
                    }, 100);
                }
            },

            calculateEditOpeningTotal() {
                const bills = parseFloat(App.DOM.editOpeningBillsInput?.value) || 0;
                const coins = parseFloat(App.DOM.editOpeningCoinsInput?.value) || 0;
                const total = bills + coins;
                if (App.DOM.editOpeningTotalDisplay) {
                    App.DOM.editOpeningTotalDisplay.textContent = `R$ ${total.toFixed(2)}`;
                }
            },

            confirmEditRegister() {
                const today = App.state.ui.today;
                const register = App.state.cashRegister[today];
                if (!register || register.status !== 'open') {
                    return App.utils.showNotification('Nenhum caixa aberto para edição.', 'error');
                }

                const bills = parseFloat(App.DOM.editOpeningBillsInput?.value) || 0;
                const coins = parseFloat(App.DOM.editOpeningCoinsInput?.value) || 0;
                const total = bills + coins;

                register.bills = bills;
                register.coins = coins;
                register.totalOpening = total;

                App.storage.saveCashRegister();
                App.render.cashRegister();
                if (App.DOM.editRegisterModal) App.DOM.editRegisterModal.style.display = 'none';
                App.utils.showNotification(`Fundo inicial do caixa atualizado para R$ ${total.toFixed(2)} com sucesso!`, 'success');
            },

            openCloseRegisterModal() {
                App.DOM.closeRegisterModal.style.display = 'flex';
                App.DOM.closingBalanceInput.focus();
            },

            confirmCloseRegister() {
                const today = App.state.ui.today;
                const closingBalance = App.DOM.closingBalanceInput.value ? parseFloat(App.DOM.closingBalanceInput.value) : null;
                const observation = App.DOM.closingObservationInput.value;

                if (App.state.cashRegister[today]) {
                    App.state.cashRegister[today].status = 'closed';
                    App.state.cashRegister[today].closingTime = new Date().toLocaleString('pt-BR');
                    App.state.cashRegister[today].closingBalance = closingBalance;
                    App.state.cashRegister[today].observation = observation;

                    App.storage.saveCashRegister();
                    this.exportHistoryToPDF();
                    App.render.cashRegister();
                    App.utils.showNotification('Caixa fechado com sucesso. Relatório gerado!', 'success');
                }

                App.DOM.closeRegisterModal.style.display = 'none';
                App.DOM.closingBalanceInput.value = '';
                App.DOM.closingObservationInput.value = '';
            },

            selectWeightedProduct(type) {
                App.state.ui.currentWeightedProduct = type;
                App.render.weightedProductSelector();
                App.render.weightedProductPrice();
                const event = new Event('input', { bubbles: true, cancelable: true });
                App.DOM.weightInput.dispatchEvent(event);
            },

            calculateWeightedPrice(e) {
                const weight = parseFloat(App.DOM.weightInput ? App.DOM.weightInput.value : 0) || 0;
                const qty = App.DOM.weightQtyInput ? (parseInt(App.DOM.weightQtyInput.value, 10) || 1) : 1;
                const pricePerKg = App.state.ui.currentWeightedProduct === 'acai'
                    ? App.state.config.açaíPricePerKg
                    : App.state.config.sorvetePricePerKg;
                const unitPrice = (weight / 1000 * pricePerKg);
                App.DOM.calculatedPrice.textContent = (unitPrice * qty).toFixed(2);
            },

            calculateChange() {
                let subtotal = App.state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
                let deliveryFee = 0;
                if (App.state.ui.deliveryMode === 'entrega') {
                    deliveryFee = parseFloat(App.DOM.deliveryFee.value) || 0;
                }
                const total = subtotal + deliveryFee;

                const received = parseFloat(App.DOM.cashReceivedInput.value) || 0;
                if (received >= total && total > 0) {
                    App.DOM.changeAmount.textContent = (received - total).toFixed(2);
                    App.DOM.changeDisplay.style.display = 'flex';
                } else {
                    App.DOM.changeDisplay.style.display = 'none';
                }
            },

            addWeightedProductToCart() {
                const weight = parseFloat(App.DOM.weightInput.value);
                if (!weight || weight <= 0) return App.utils.showNotification('Digite um peso válido em gramas.', 'error');

                const qty = App.DOM.weightQtyInput ? Math.max(1, parseInt(App.DOM.weightQtyInput.value, 10) || 1) : 1;
                const type = App.state.ui.currentWeightedProduct;
                const pricePerKg = type === 'acai'
                    ? App.state.config.açaíPricePerKg
                    : App.state.config.sorvetePricePerKg;
                const name = type === 'acai' ? 'Açaí por KG' : 'Sorvete por KG';

                let unitFinalPrice = (weight / 1000) * pricePerKg;
                let unitOriginalPrice = null;
                let discountInfo = null;

                const { discount } = App.state;
                if (discount.active) {
                    const isAcaiTarget = type === 'acai' && discount.targets.acai;
                    const isSorveteTarget = type === 'sorvete' && discount.targets.sorvete;

                    if (isAcaiTarget || isSorveteTarget) {
                        unitOriginalPrice = unitFinalPrice;
                        const discountAmount = (unitFinalPrice * discount.percentage) / 100;
                        unitFinalPrice = unitFinalPrice - discountAmount;
                        discountInfo = {
                            percentage: discount.percentage,
                            amount: discountAmount * qty
                        };
                    }
                }

                const totalPrice = unitFinalPrice * qty;
                const totalOriginalPrice = unitOriginalPrice ? (unitOriginalPrice * qty) : null;

                App.state.cart.push({
                    id: Date.now(),
                    name,
                    pricePerKg,
                    weightGrams: weight,
                    unitPrice: unitFinalPrice,
                    unitOriginalPrice: unitOriginalPrice,
                    quantity: qty,
                    totalPrice: totalPrice,
                    originalPrice: totalOriginalPrice,
                    discountInfo: discountInfo,
                    type: "weight"
                });

                App.render.cart();
                const qtyText = qty > 1 ? `${qty}x ` : '';
                const msg = discountInfo ? `${qtyText}${name} (${weight}g) adicionado com ${discount.percentage}% OFF!` : `${qtyText}${name} (${weight}g) adicionado.`;
                App.utils.showNotification(msg, 'success');
                App.DOM.weightInput.value = '';
                if (App.DOM.weightQtyInput) App.DOM.weightQtyInput.value = '1';
                App.DOM.calculatedPrice.textContent = '0.00';
            },

            addQuickProduct(e) {
                const productId = parseInt(e.currentTarget.dataset.productId);
                const product = App.state.products.find(p => p.id === productId);
                if (product) this.addProductToCart(product);
            },

            addProductToCart(product, quantity = 1) {
                const qty = Math.max(1, parseInt(quantity, 10) || 1);
                const existing = App.state.cart.find(item => item.type === 'product' && (item.productId === product.id || (item.name === product.name && item.unitPrice === product.price)));

                if (existing) {
                    existing.quantity = (existing.quantity || 1) + qty;
                    existing.unitPrice = product.price;
                    existing.totalPrice = existing.unitPrice * existing.quantity;
                } else {
                    App.state.cart.push({
                        id: Date.now(),
                        productId: product.id,
                        name: product.name,
                        unitPrice: product.price,
                        quantity: qty,
                        totalPrice: product.price * qty,
                        type: "product"
                    });
                }

                App.render.cart();
                const qtyText = qty > 1 ? `${qty}x ` : '';
                App.utils.showNotification(`${qtyText}${product.name} adicionado ao carrinho.`, 'success');
            },

            updateCartItemQuantity(index, deltaOrValue, isAbsolute = false) {
                const i = parseInt(index, 10);
                const item = App.state.cart[i];
                if (!item) return;

                if (!item.quantity) item.quantity = 1;
                if (item.unitPrice === undefined || item.unitPrice === null) {
                    item.unitPrice = item.totalPrice / item.quantity;
                }
                if (item.originalPrice && (item.unitOriginalPrice === undefined || item.unitOriginalPrice === null)) {
                    item.unitOriginalPrice = item.originalPrice / item.quantity;
                }

                let newQty = isAbsolute ? parseInt(deltaOrValue, 10) : (item.quantity + parseInt(deltaOrValue, 10));
                if (isNaN(newQty) || newQty <= 0) {
                    this.removeFromCart(i);
                    return;
                }

                item.quantity = newQty;
                item.totalPrice = item.unitPrice * newQty;
                if (item.unitOriginalPrice) {
                    item.originalPrice = item.unitOriginalPrice * newQty;
                }

                App.render.cart();
                this.calculateChange();
            },

            removeFromCart(index) {
                const i = parseInt(index, 10);
                const removed = App.state.cart.splice(i, 1)[0];
                App.render.cart();
                this.calculateChange();
                if (removed) App.utils.showNotification(`${removed.name} removido.`, 'warning');
            },

            preparePayment() {
                if (App.state.cart.length === 0) {
                    return App.utils.showNotification('O carrinho está vazio.', 'error');
                }

                if (!App.state.ui.currentPaymentMethod) {
                    App.utils.showNotification('Selecione a forma de pagamento (Dinheiro, Cartão ou PIX).', 'warning');
                    return;
                }

                this.confirmPayment();
            },

            selectPaymentMethod(el) {
                App.state.ui.currentPaymentMethod = el.dataset.method;
                document.querySelectorAll('#venda-tab .payment-option').forEach(o => o.classList.remove('selected', 'active'));
                el.classList.add('selected', 'active');
                App.DOM.cashInputSection.style.display = (el.dataset.method === 'cash') ? 'block' : 'none';
                this.calculateChange();
            },

            selectDeliveryMode(mode) {
                App.state.ui.deliveryMode = mode;
                App.render.deliveryMode();
                App.render.cart();
            },

            confirmPayment() {
                const { ui, cart, salesHistory } = App.state;
                if (!ui.currentPaymentMethod) return App.utils.showNotification('Selecione uma forma de pagamento.', 'error');
                if (cart.length === 0) return App.utils.showNotification('O carrinho está vazio.', 'error');

                const deliveryMode = App.state.ui.deliveryMode;
                const customerName = App.DOM.deliveryCustomerName.value.trim();
                const customerAddress = App.DOM.deliveryCustomerAddress.value.trim();
                const deliveryFee = parseFloat(App.DOM.deliveryFee.value) || 0;

                const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
                const total = subtotal + (deliveryMode === 'entrega' ? deliveryFee : 0);

                if (ui.currentPaymentMethod === 'cash') {
                    const rawVal = App.DOM.cashReceivedInput?.value?.trim();
                    const received = parseFloat(rawVal);
                    if (!rawVal || isNaN(received) || received <= 0) {
                        return App.utils.showNotification('Informe o valor recebido em dinheiro para finalizar a venda.', 'warning');
                    }
                    if (received < total) {
                        return App.utils.showNotification(`Valor recebido insuficiente (Faltam R$ ${(total - received).toFixed(2)}).`, 'error');
                    }
                }

                if (deliveryMode === 'entrega' && deliveryFee <= 0) {
                    App.utils.confirm('O Valor da Entrega está R$ 0,00. Deseja continuar mesmo assim?', 'Confirmar Entrega', () => {
                        App.handlers.executeConfirmPayment(deliveryMode, customerName, customerAddress, deliveryFee, subtotal, total);
                    });
                    return;
                }

                this.executeConfirmPayment(deliveryMode, customerName, customerAddress, deliveryFee, subtotal, total);
            },

            executeConfirmPayment(deliveryMode, customerName, customerAddress, deliveryFee, subtotal, total) {
                const { ui, cart, salesHistory } = App.state;

                const deliveryInfo = {
                    mode: deliveryMode,
                    name: customerName,
                    address: customerAddress,
                    fee: deliveryFee
                };

                const sale = {
                    id: Date.now(),
                    date: new Date().toLocaleString('pt-BR'),
                    dateKey: ui.today,
                    items: [...cart],
                    total: total,
                    paymentMethod: ui.currentPaymentMethod,
                    cashReceived: ui.currentPaymentMethod === 'cash' ? (parseFloat(App.DOM.cashReceivedInput.value) || 0) : null,
                    change: ui.currentPaymentMethod === 'cash' ? ((parseFloat(App.DOM.cashReceivedInput.value) || 0) - total) : null,
                    openTimeMinutes: 0,
                    deliveryInfo: deliveryInfo
                };

                if (!salesHistory[ui.today]) salesHistory[ui.today] = [];
                salesHistory[ui.today].unshift(sale);
                App.storage.saveSalesHistory();
                App.utils.showNotification(`Venda finalizada com sucesso!`, 'success');
                App.render.history(ui.today);
                ui.lastSaleForReceipt = sale;
                App.utils.showReceiptModal(sale);
                this.resetSaleState();
            },

            resetSaleState() {
                App.state.cart = [];
                App.state.ui.currentPaymentMethod = null;
                App.DOM.cashInputSection.style.display = 'none';
                App.DOM.cashReceivedInput.value = '';
                App.DOM.changeDisplay.style.display = 'none';
                App.DOM.changeAmount.textContent = '0,00';
                document.querySelectorAll('#venda-tab .payment-option').forEach(el => el.classList.remove('selected', 'active'));

                App.handlers.selectDeliveryMode('balcao');
                App.DOM.deliveryCustomerName.value = '';
                App.DOM.deliveryCustomerAddress.value = '';
                App.DOM.deliveryFee.value = '';

                App.render.cart();
            },

            cancelSale() {
                if (App.state.cart.length > 0) {
                    App.utils.confirm('Tem certeza que deseja cancelar e limpar o carrinho de vendas?', 'Cancelar Venda', () => {
                        App.handlers.resetSaleState();
                        App.utils.showNotification('Venda cancelada.', 'warning');
                    });
                }
            },

            requestHoldSale() {
                if (App.state.cart.length === 0) {
                    return App.utils.showNotification('Adicione itens ao carrinho antes de salvar em comanda.', 'error');
                }

                const { existingOrderSelect } = App.DOM;
                existingOrderSelect.innerHTML = '<option value="new">Salvar como nova comanda</option>';
                App.state.openOrders.forEach(order => {
                    const option = document.createElement('option');
                    option.value = order.id;
                    option.textContent = `${order.customerName} (R$ ${order.total.toFixed(2)})`;
                    existingOrderSelect.appendChild(option);
                });

                App.DOM.customerNameInput.value = App.DOM.deliveryCustomerName.value;
                App.DOM.holdSaleModal.style.display = 'flex';
                App.DOM.customerNameInput.focus();
            },

            saveHoldSale() {
                const { customerNameInput, existingOrderSelect } = App.DOM;
                const customerName = customerNameInput.value.trim();
                const selectedOrderId = existingOrderSelect.value;

                if (selectedOrderId === 'new' && !customerName) {
                    return App.utils.showNotification('Digite um nome ou mesa para identificar a comanda.', 'error');
                }

                const deliveryInfo = {
                    mode: App.state.ui.deliveryMode,
                    name: App.DOM.deliveryCustomerName.value,
                    address: App.DOM.deliveryCustomerAddress.value,
                    fee: parseFloat(App.DOM.deliveryFee.value) || 0
                };

                if (selectedOrderId === 'new') {
                    const subtotal = App.state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
                    const total = subtotal + (deliveryInfo.mode === 'entrega' ? deliveryInfo.fee : 0);

                    const newOrder = {
                        id: Date.now(),
                        customerName: customerName,
                        items: [...App.state.cart],
                        total: total,
                        createdAt: new Date().toISOString(),
                        deliveryInfo: deliveryInfo
                    };
                    App.state.openOrders.push(newOrder);
                    App.utils.showNotification(`Nova comanda salva para "${customerName}".`, 'success');
                } else {
                    const orderId = parseInt(selectedOrderId);
                    const order = App.state.openOrders.find(o => o.id === orderId);
                    if (order) {
                        order.items.push(...App.state.cart);
                        const itemsTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
                        const fee = (order.deliveryInfo && order.deliveryInfo.mode === 'entrega') ? order.deliveryInfo.fee : 0;
                        order.total = itemsTotal + fee;
                        App.utils.showNotification(`Itens adicionados à comanda de "${order.customerName}".`, 'success');
                    }
                }

                App.storage.saveOpenOrders();
                App.render.openOrdersGrid();
                App.handlers.resetSaleState();
                App.DOM.holdSaleModal.style.display = 'none';
            },

            openOrderDetails(orderId) {
                const order = App.state.openOrders.find(o => o.id === orderId);
                if (!order) return;

                App.state.ui.currentOpenOrder = order;
                App.state.ui.openOrderPaymentMethod = null;

                App.DOM.openOrderTitle.textContent = `Comanda: ${order.customerName}`;
                App.DOM.openOrderTotal.textContent = `R$ ${order.total.toFixed(2)}`;
                App.DOM.openOrderCashReceived.value = '';
                App.DOM.openOrderChangeDisplay.style.display = 'none';
                App.DOM.openOrderCashInput.style.display = 'none';
                App.DOM.openOrderPaymentOptions.forEach(o => o.classList.remove('selected', 'active'));

                App.render.openOrderItems(order.items, order.deliveryInfo);

                if (App.state.ui.openOrderTimerInterval) {
                    clearInterval(App.state.ui.openOrderTimerInterval);
                }
                const startTime = new Date(order.createdAt).getTime();
                App.state.ui.openOrderTimerInterval = setInterval(() => {
                    App.render.openOrderTimer(startTime);
                }, 1000);
                App.render.openOrderTimer(startTime);

                App.DOM.openOrderModal.style.display = 'flex';
            },

            closeOpenOrderModal() {
                if (App.state.ui.openOrderTimerInterval) {
                    clearInterval(App.state.ui.openOrderTimerInterval);
                }
                App.state.ui.currentOpenOrder = null;
                App.state.ui.openOrderTimerInterval = null;
                App.DOM.openOrderModal.style.display = 'none';
            },

            deleteOpenOrder(orderId) {
                const order = App.state.openOrders.find(o => o.id === orderId);
                if (!order) return;

                App.utils.confirm(
                    `Tem certeza que deseja excluir a comanda "${order.customerName}" (Total: R$ ${order.total.toFixed(2)})? Esta ação cancelará o pedido e não poderá ser desfeita.`,
                    'Excluir Comanda',
                    () => {
                        App.state.openOrders = App.state.openOrders.filter(o => o.id !== orderId);
                        App.storage.saveOpenOrders();
                        App.render.openOrdersGrid();
                        this.closeOpenOrderModal();
                        App.utils.showNotification(`Comanda "${order.customerName}" excluída com sucesso.`, 'success');
                    }
                );
            },

            selectOpenOrderPaymentMethod(el) {
                App.state.ui.openOrderPaymentMethod = el.dataset.method;
                App.DOM.openOrderPaymentOptions.forEach(o => o.classList.remove('selected', 'active'));
                el.classList.add('selected', 'active');
                App.DOM.openOrderCashInput.style.display = (el.dataset.method === 'cash') ? 'block' : 'none';
                this.calculateOpenOrderChange();
            },

            calculateOpenOrderChange() {
                const order = App.state.ui.currentOpenOrder;
                if (!order) return;

                const received = parseFloat(App.DOM.openOrderCashReceived.value) || 0;
                if (received >= order.total) {
                    App.DOM.openOrderChangeAmount.textContent = (received - order.total).toFixed(2);
                    App.DOM.openOrderChangeDisplay.style.display = 'flex';
                } else {
                    App.DOM.openOrderChangeDisplay.style.display = 'none';
                }
            },

            finalizeOpenOrderPayment() {
                const { ui, salesHistory } = App.state;
                const order = ui.currentOpenOrder;
                const paymentMethod = ui.openOrderPaymentMethod;

                if (!order) return App.utils.showNotification('Erro: Nenhuma comanda selecionada.', 'error');
                if (!paymentMethod) return App.utils.showNotification('Selecione uma forma de pagamento.', 'error');

                const deliveryInfo = order.deliveryInfo || { mode: 'balcao', name: '', address: '', fee: 0 };

                let cashReceived = null;
                let change = null;

                if (paymentMethod === 'cash') {
                    const rawVal = App.DOM.openOrderCashReceived?.value?.trim();
                    const received = parseFloat(rawVal);
                    if (!rawVal || isNaN(received) || received <= 0) {
                        return App.utils.showNotification('Informe o valor recebido em dinheiro.', 'warning');
                    }
                    if (received < order.total) {
                        return App.utils.showNotification(`Valor insuficiente. Faltam R$ ${(order.total - received).toFixed(2)}`, 'error');
                    }
                    cashReceived = received;
                    change = cashReceived - order.total;
                }

                const startTime = new Date(order.createdAt).getTime();
                const endTime = new Date().getTime();
                const openTimeMinutes = (endTime - startTime) / (1000 * 60);

                const sale = {
                    id: order.id,
                    date: new Date().toLocaleString('pt-BR'),
                    dateKey: ui.today,
                    items: [...order.items],
                    total: order.total,
                    paymentMethod: paymentMethod,
                    cashReceived: cashReceived,
                    change: change,
                    openTimeMinutes: openTimeMinutes,
                    deliveryInfo: deliveryInfo
                };

                if (!salesHistory[ui.today]) salesHistory[ui.today] = [];
                salesHistory[ui.today].unshift(sale);
                App.storage.saveSalesHistory();

                App.state.openOrders = App.state.openOrders.filter(o => o.id !== order.id);
                App.storage.saveOpenOrders();

                App.utils.showNotification(`Comanda de "${order.customerName}" finalizada!`, 'success');
                App.render.history(ui.today);
                App.render.openOrdersGrid();

                ui.lastSaleForReceipt = sale;
                App.utils.showReceiptModal(sale);
                this.closeOpenOrderModal();
            },

            updateAcaiPrice() {
                const newPrice = parseFloat(App.DOM.acaiPriceInput.value);
                if (!newPrice || newPrice <= 0) return App.utils.showNotification('Digite um preço válido.', 'error');

                App.state.config.açaíPricePerKg = newPrice;
                App.storage.saveConfig();
                App.render.weightedProductPrice();
                App.utils.showNotification('Preço do Açaí atualizado com sucesso.', 'success');
            },

            updateSorvetePrice() {
                const newPrice = parseFloat(App.DOM.sorvetePriceInput.value);
                if (!newPrice || newPrice <= 0) return App.utils.showNotification('Digite um preço válido.', 'error');

                App.state.config.sorvetePricePerKg = newPrice;
                App.storage.saveConfig();
                App.render.weightedProductPrice();
                App.utils.showNotification('Preço do Sorvete atualizado com sucesso.', 'success');
            },

            updateDeletePassword() {
                const currentPass = (App.DOM.currentDeletePasswordInput ? App.DOM.currentDeletePasswordInput.value : '').trim();
                const newPass = (App.DOM.newDeletePasswordInput ? App.DOM.newDeletePasswordInput.value : '').trim();
                const confirmPass = (App.DOM.confirmNewDeletePasswordInput ? App.DOM.confirmNewDeletePasswordInput.value : '').trim();

                if (!currentPass) {
                    return App.utils.showNotification('Por favor, informe a senha atual.', 'warning');
                }

                if (currentPass !== App.state.config.deletePassword) {
                    return App.utils.showNotification('A senha atual informada está incorreta.', 'error');
                }

                if (!/^\d{4}$/.test(newPass)) {
                    return App.utils.showNotification('A nova senha deve ter exatamente 4 dígitos numéricos.', 'error');
                }

                if (newPass !== confirmPass) {
                    return App.utils.showNotification('A confirmação da nova senha não confere.', 'error');
                }

                App.state.config.deletePassword = newPass;
                App.storage.saveConfig();

                if (App.DOM.currentDeletePasswordInput) App.DOM.currentDeletePasswordInput.value = '';
                if (App.DOM.newDeletePasswordInput) App.DOM.newDeletePasswordInput.value = '';
                if (App.DOM.confirmNewDeletePasswordInput) App.DOM.confirmNewDeletePasswordInput.value = '';

                App.utils.showNotification('Senha de segurança atualizada com sucesso!', 'success');
            },

            openWeightPresetsModal() {
                if (App.DOM.modalNewPresetWeight) App.DOM.modalNewPresetWeight.value = '';
                if (App.DOM.weightPresetsModal) {
                    App.DOM.weightPresetsModal.style.display = 'flex';
                    setTimeout(() => App.DOM.modalNewPresetWeight && App.DOM.modalNewPresetWeight.focus(), 100);
                }
                App.render.weightPresets();
            },

            closeWeightPresetsModal() {
                if (App.DOM.weightPresetsModal) {
                    App.DOM.weightPresetsModal.style.display = 'none';
                }
            },

            addWeightPreset(weight, source = 'admin') {
                if (isNaN(weight) || weight <= 0) {
                    return App.utils.showNotification('Digite um peso válido em gramas maior que zero.', 'error');
                }
                if (weight > 50000) {
                    return App.utils.showNotification('O peso máximo permitido para atalho é 50.000g (50kg).', 'error');
                }

                if (!Array.isArray(App.state.config.weightPresets)) {
                    App.state.config.weightPresets = [150, 250, 300, 400, 500, 700, 1000];
                }

                if (App.state.config.weightPresets.includes(weight)) {
                    return App.utils.showNotification(`O atalho de ${App.utils.formatWeightLabel(weight)} já está cadastrado.`, 'warning');
                }

                App.state.config.weightPresets.push(weight);
                App.state.config.weightPresets.sort((a, b) => a - b);
                App.storage.saveWeightPresets();
                App.render.weightPresets();

                if (source === 'modal' && App.DOM.modalNewPresetWeight) {
                    App.DOM.modalNewPresetWeight.value = '';
                    App.DOM.modalNewPresetWeight.focus();
                } else if (App.DOM.adminNewPresetWeight) {
                    App.DOM.adminNewPresetWeight.value = '';
                    App.DOM.adminNewPresetWeight.focus();
                }

                const label = App.utils.formatWeightLabel(weight);
                App.utils.showNotification(`Atalho de ${label} adicionado com sucesso!`, 'success');
            },

            removeWeightPreset(weight) {
                if (!Array.isArray(App.state.config.weightPresets) || App.state.config.weightPresets.length <= 1) {
                    return App.utils.showNotification('É necessário manter pelo menos 1 atalho de peso ativo.', 'error');
                }

                const label = App.utils.formatWeightLabel(weight);
                App.state.config.weightPresets = App.state.config.weightPresets.filter(w => w !== weight);
                App.storage.saveWeightPresets();
                App.render.weightPresets();
                App.utils.showNotification(`Atalho de ${label} removido.`, 'info');
            },

            resetWeightPresets() {
                App.state.config.weightPresets = [150, 250, 300, 400, 500, 700, 1000];
                App.storage.saveWeightPresets();
                App.render.weightPresets();
                App.utils.showNotification('Atalhos de peso restaurados para os valores padrão!', 'success');
            },

            openAddProductModal() {
                App.DOM.modalNewProductName.value = '';
                App.DOM.modalNewProductPrice.value = '';
                App.DOM.modalNewProductCategory.value = '';
                App.DOM.addProductModal.style.display = 'flex';
                setTimeout(() => App.DOM.modalNewProductName.focus(), 100);
            },

            closeAddProductModal() {
                App.DOM.addProductModal.style.display = 'none';
            },

            saveNewProductFromModal() {
                const name = App.DOM.modalNewProductName.value.trim();
                const price = parseFloat(App.DOM.modalNewProductPrice.value);
                const category = App.DOM.modalNewProductCategory.value.trim() || 'Geral';

                if (!name || isNaN(price) || price <= 0) {
                    return App.utils.showNotification('Preencha o nome e um preço válido maior que zero.', 'error');
                }

                const newProduct = {
                    id: Date.now(),
                    name: name,
                    price: price,
                    category: category,
                    image: ""
                };

                App.state.products.push(newProduct);
                App.storage.saveProducts();
                App.utils.showNotification(`Produto "${name}" cadastrado com sucesso!`, 'success');

                this.closeAddProductModal();
                App.render.products();
                App.render.adminProducts();
                App.render.productCategories();
                App.render.productsCatalogFull();
            },

            openEditProductModal(productId) {
                const id = parseInt(productId);
                const product = App.state.products.find(p => p.id === id);
                if (!product) return App.utils.showNotification('Produto não encontrado.', 'error');

                App.DOM.modalEditProductId.value = product.id;
                App.DOM.modalEditProductName.value = product.name;
                App.DOM.modalEditProductPrice.value = product.price.toFixed(2);
                App.DOM.modalEditProductCategory.value = product.category || 'Geral';
                App.DOM.editProductModal.style.display = 'flex';
                setTimeout(() => App.DOM.modalEditProductName.focus(), 100);
            },

            closeEditProductModal() {
                App.DOM.editProductModal.style.display = 'none';
            },

            saveEditProductFromModal() {
                const id = parseInt(App.DOM.modalEditProductId.value);
                const name = App.DOM.modalEditProductName.value.trim();
                const price = parseFloat(App.DOM.modalEditProductPrice.value);
                const category = App.DOM.modalEditProductCategory.value.trim() || 'Geral';

                if (!name || isNaN(price) || price <= 0) {
                    return App.utils.showNotification('Preencha o nome e um preço válido maior que zero.', 'error');
                }

                const index = App.state.products.findIndex(p => p.id === id);
                if (index === -1) {
                    return App.utils.showNotification('Erro ao salvar: produto não encontrado.', 'error');
                }

                App.state.products[index].name = name;
                App.state.products[index].price = price;
                App.state.products[index].category = category;

                App.storage.saveProducts();
                App.utils.showNotification(`Produto "${name}" atualizado com sucesso!`, 'success');

                this.closeEditProductModal();
                App.render.products();
                App.render.adminProducts();
                App.render.productCategories();
                App.render.productsCatalogFull();
            },

            quickSellFromCatalog(productId, qty = 1) {
                const id = parseInt(productId, 10);
                const quantity = Math.max(1, parseInt(qty, 10) || 1);
                const product = App.state.products.find(p => p.id === id);
                if (product) {
                    App.handlers.switchTab('venda');
                    App.handlers.addProductToCart(product, quantity);
                }
            },

            addNewProduct() {
                if (!App.state.ui.isAdminLoggedIn) return App.utils.showNotification('Acesso restrito ao administrador.', 'error');
                const name = App.DOM.newProductName.value.trim();
                const price = parseFloat(App.DOM.newProductPrice.value);
                const category = App.DOM.newProductCategory.value.trim() || 'Geral';

                if (!name || isNaN(price) || price <= 0) {
                    return App.utils.showNotification('Por favor, preencha nome e preço válidos.', 'error');
                }

                const newProduct = { id: Date.now(), name, price, category, image: "" };
                App.state.products.push(newProduct);
                App.storage.saveProducts();
                App.utils.showNotification(`Produto "${name}" adicionado com sucesso!`, 'success');

                App.DOM.newProductName.value = '';
                App.DOM.newProductPrice.value = '';
                App.DOM.newProductCategory.value = '';

                App.render.products();
                App.render.adminProducts();
                App.render.productCategories();
                App.render.productsCatalogFull();
            },

            deleteProduct(productId) {
                const idToDelete = parseInt(productId);
                const productIndex = App.state.products.findIndex(p => p.id === idToDelete);

                if (productIndex > -1) {
                    const prodName = App.state.products[productIndex].name;
                    App.utils.confirm(`Tem certeza que deseja excluir o produto "${prodName}" do catálogo?`, 'Excluir Produto', () => {
                        const removed = App.state.products.splice(productIndex, 1)[0];
                        App.storage.saveProducts();
                        App.utils.showNotification(`Produto "${removed.name}" excluído.`, 'warning');
                        App.render.products();
                        App.render.adminProducts();
                        App.render.productCategories();
                        App.render.productsCatalogFull();
                    });
                }
            },

            addNewExpense() {
                const name = App.DOM.newExpenseName.value.trim();
                const description = App.DOM.newExpenseDesc.value.trim();
                const value = parseFloat(App.DOM.newExpenseValue.value);
                const dateKey = App.state.ui.today;

                if (!name || !value || value <= 0) {
                    return App.utils.showNotification('Preencha o nome e o valor da despesa.', 'error');
                }

                const newExpense = {
                    id: Date.now(),
                    date: new Date().toLocaleString('pt-BR'),
                    dateKey: dateKey,
                    name: name,
                    description: description,
                    value: value
                };

                if (!App.state.expenses[dateKey]) {
                    App.state.expenses[dateKey] = [];
                }
                App.state.expenses[dateKey].unshift(newExpense);
                App.storage.saveExpenses();

                App.utils.showNotification(`Despesa "${name}" de R$ ${value.toFixed(2)} registrada!`, 'success');

                App.DOM.newExpenseName.value = '';
                App.DOM.newExpenseDesc.value = '';
                App.DOM.newExpenseValue.value = '';

                App.DOM.expenseDate.value = dateKey;
                App.render.expenses(dateKey);
                App.render.history(App.DOM.historyDate.value);
            },

            requestDeleteSale(target) {
                App.state.ui.saleToDelete = { id: parseInt(target.dataset.id), date: target.dataset.date };
                App.state.ui.expenseToDelete = null;
                App.state.ui.pendingSecurityAction = 'delete_sale';

                if (App.DOM.passwordModalTitle) App.DOM.passwordModalTitle.textContent = 'Excluir Item do Histórico';
                if (App.DOM.passwordModalDesc) App.DOM.passwordModalDesc.textContent = 'Esta ação é irreversível. Digite a senha de 4 dígitos para confirmar:';
                if (App.DOM.confirmDeleteBtn) {
                    App.DOM.confirmDeleteBtn.textContent = 'Confirmar Exclusão';
                    App.DOM.confirmDeleteBtn.className = 'touch-btn btn-danger';
                }

                if (App.DOM.passwordModal) App.DOM.passwordModal.style.display = 'flex';
                if (App.DOM.confirmDeletePasswordInput) {
                    App.DOM.confirmDeletePasswordInput.value = '';
                    setTimeout(() => App.DOM.confirmDeletePasswordInput.focus(), 100);
                }
            },

            requestDeleteExpense(target) {
                const id = parseInt(target.dataset.id);
                const date = target.dataset.date;

                const expenseList = App.state.expenses[date];
                if (!expenseList) return;
                const expense = expenseList.find(e => e.id === id);

                if (expense) {
                    App.utils.confirm(`Deseja excluir a despesa "${expense.name}" (R$ ${expense.value.toFixed(2)})?`, 'Excluir Despesa', () => {
                        const index = expenseList.indexOf(expense);
                        if (index > -1) {
                            expenseList.splice(index, 1);
                            App.storage.saveExpenses();
                            App.render.expenses(date);
                            App.render.history(App.DOM.historyDate.value);
                            App.utils.showNotification('Despesa excluída com sucesso.', 'success');
                        }
                    });
                }
            },

            requestExportMonthlyReport() {
                const monthYear = App.DOM.reportMonthSelect.value;
                if (!monthYear) {
                    return App.utils.showNotification('Selecione um mês e ano válidos.', 'error');
                }

                App.state.ui.pendingSecurityAction = 'export_monthly';

                if (App.DOM.passwordModalTitle) App.DOM.passwordModalTitle.textContent = 'Exportar Relatório Mensal';
                if (App.DOM.passwordModalDesc) App.DOM.passwordModalDesc.textContent = 'Digite a senha de segurança de 4 dígitos para autorizar a exportação:';
                if (App.DOM.confirmDeleteBtn) {
                    App.DOM.confirmDeleteBtn.textContent = 'Autorizar e Gerar PDF';
                    App.DOM.confirmDeleteBtn.className = 'touch-btn btn-primary';
                }

                if (App.DOM.passwordModal) App.DOM.passwordModal.style.display = 'flex';
                if (App.DOM.confirmDeletePasswordInput) {
                    App.DOM.confirmDeletePasswordInput.value = '';
                    setTimeout(() => App.DOM.confirmDeletePasswordInput.focus(), 100);
                }
            },

            confirmSecurityAction() {
                const inputPass = (App.DOM.confirmDeletePasswordInput ? App.DOM.confirmDeletePasswordInput.value : '').trim();
                if (inputPass !== App.state.config.deletePassword) {
                    App.utils.showNotification('Senha de segurança incorreta.', 'error');
                    if (App.DOM.confirmDeletePasswordInput) {
                        App.DOM.confirmDeletePasswordInput.value = '';
                        App.DOM.confirmDeletePasswordInput.focus();
                    }
                    return;
                }

                const action = App.state.ui.pendingSecurityAction;
                if (App.DOM.passwordModal) App.DOM.passwordModal.style.display = 'none';
                if (App.DOM.confirmDeletePasswordInput) App.DOM.confirmDeletePasswordInput.value = '';

                if (action === 'delete_sale' && App.state.ui.saleToDelete) {
                    const { id, date } = App.state.ui.saleToDelete;
                    if (App.state.salesHistory[date]) {
                        const saleIndex = App.state.salesHistory[date].findIndex(s => s.id === id);
                        if (saleIndex > -1) {
                            App.state.salesHistory[date].splice(saleIndex, 1);
                            App.storage.saveSalesHistory();
                            App.render.history(date);
                            App.utils.showNotification('Venda excluída do histórico com sucesso.', 'success');
                        }
                    }
                    App.state.ui.saleToDelete = null;
                } else if (action === 'export_monthly') {
                    this.exportMonthlyReportToPDF();
                }

                App.state.ui.pendingSecurityAction = null;
            },

            reprintSale(target) {
                const id = parseInt(target.dataset.id);
                const date = target.dataset.date;

                if (!id || !date || !App.state.salesHistory[date]) {
                    return App.utils.showNotification("Erro ao localizar venda para reimpressão.", "error");
                }

                const saleToReprint = App.state.salesHistory[date].find(s => s.id === id);

                if (saleToReprint) {
                    App.handlers.printReceipt(saleToReprint);
                } else {
                    App.utils.showNotification("Venda não encontrada.", "error");
                }
            },

            openManualSaleModal() {
                App.state.manualSaleCart = [];
                App.state.ui.manualSalePaymentMethod = null;
                App.render.manualSaleCart();
                App.DOM.manualProductSelect.innerHTML = '<option value="">Selecione um produto...</option><option value="acai_kg">Açaí por KG</option><option value="sorvete_kg">Sorvete por KG</option>';
                App.state.products.forEach(p => {
                    App.DOM.manualProductSelect.innerHTML += `<option value="${p.id}">${p.name} - R$ ${p.price.toFixed(2)}</option>`;
                });
                App.DOM.manualAcaiWeightSection.style.display = 'none';
                App.DOM.manualPaymentOptions.forEach(el => el.classList.remove('selected', 'active'));
                App.DOM.manualSaleModal.style.display = 'flex';
            },

            toggleManualWeightInput(e) {
                App.DOM.manualAcaiWeightSection.style.display = (e.target.value === 'acai_kg' || e.target.value === 'sorvete_kg') ? 'flex' : 'none';
            },

            addManualItem() {
                const selectedId = App.DOM.manualProductSelect.value;
                if (!selectedId) return App.utils.showNotification('Selecione um produto.', 'warning');

                if (selectedId === 'acai_kg' || selectedId === 'sorvete_kg') {
                    const weight = parseFloat(App.DOM.manualAcaiWeightInput.value);
                    if (!weight || weight <= 0) return App.utils.showNotification('Digite um peso válido em gramas.', 'error');
                    const isAcai = selectedId === 'acai_kg';
                    const pricePerKg = isAcai ? App.state.config.açaíPricePerKg : App.state.config.sorvetePricePerKg;
                    const name = isAcai ? "Açaí por KG" : "Sorvete por KG";
                    const price = (weight / 1000) * pricePerKg;
                    App.state.manualSaleCart.push({ id: Date.now(), name, weightGrams: weight, totalPrice: price, type: 'weight' });
                } else {
                    const product = App.state.products.find(p => p.id === parseInt(selectedId));
                    if (product) App.state.manualSaleCart.push({ id: Date.now(), name: product.name, totalPrice: product.price, type: 'product' });
                }
                App.render.manualSaleCart();
            },

            removeManualItem(index) {
                App.state.manualSaleCart.splice(index, 1);
                App.render.manualSaleCart();
            },

            selectManualPaymentMethod(el) {
                App.state.ui.manualSalePaymentMethod = el.dataset.method;
                App.DOM.manualPaymentOptions.forEach(o => o.classList.remove('selected', 'active'));
                el.classList.add('selected', 'active');
            },

            saveManualSale() {
                const saleDate = App.DOM.historyDate.value || App.state.ui.today;
                if (App.state.manualSaleCart.length === 0) return App.utils.showNotification('Adicione itens à venda.', 'error');
                if (!App.state.ui.manualSalePaymentMethod) return App.utils.showNotification('Selecione a forma de pagamento.', 'error');
                const total = App.state.manualSaleCart.reduce((sum, item) => sum + item.totalPrice, 0);

                const sale = {
                    id: Date.now(),
                    date: new Date(saleDate + 'T12:00:00').toLocaleString('pt-BR'),
                    dateKey: saleDate,
                    items: [...App.state.manualSaleCart],
                    total,
                    paymentMethod: App.state.ui.manualSalePaymentMethod,
                    openTimeMinutes: 0,
                    deliveryInfo: { mode: 'balcao', name: '', address: '', fee: 0 }
                };

                if (!App.state.salesHistory[saleDate]) App.state.salesHistory[saleDate] = [];
                App.state.salesHistory[saleDate].unshift(sale);
                App.storage.saveSalesHistory();
                App.utils.showNotification('Venda manual registrada com sucesso!', 'success');
                App.render.history(saleDate);
                App.DOM.manualSaleModal.style.display = 'none';
            },

            exportHistoryToPDF() {
                const date = App.DOM.historyDate.value || App.state.ui.today;
                const salesForDate = App.state.salesHistory[date] || [];
                const expensesForDate = App.state.expenses[date] || [];
                const cashRegister = App.state.cashRegister[date];

                if (salesForDate.length === 0 && expensesForDate.length === 0 && !cashRegister) {
                    return App.utils.showNotification('Nenhum dado registrado nesta data para exportação.', 'warning');
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
                let finalY = 22;

                doc.setFontSize(18);
                doc.text(`Relatório Diário - Orvix PDV (${formattedDate})`, 14, finalY);
                finalY += 10;

                // --- SEÇÃO DE ABERTURA DE CAIXA ---
                if (cashRegister) {
                    doc.setFillColor(240, 240, 240);
                    doc.rect(14, finalY, 180, 25, 'F');
                    doc.setFontSize(14);
                    doc.text('Abertura de Caixa', 18, finalY + 8);

                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Hora de Abertura: ${cashRegister.openingTime}`, 18, finalY + 16);
                    doc.text(`Status: ${cashRegister.status === 'open' ? 'Aberto' : 'Fechado (' + (cashRegister.closingTime || '-') + ')'}`, 100, finalY + 16);

                    doc.setFont(undefined, 'bold');
                    doc.text(`Fundo Inicial: R$ ${cashRegister.totalOpening.toFixed(2)}`, 18, finalY + 22);
                    doc.setFont(undefined, 'normal');

                    finalY += 35;
                }

                let totalGeral = 0;
                let totalProdutos = 0;
                let totalEntregas = 0;
                let totalDespesas = 0;
                let pagamentos = { cash: 0, card: 0, pix: 0 };
                let trocoTotal = 0;

                if (salesForDate.length > 0) {
                    doc.setFontSize(14);
                    doc.text('Vendas do Dia', 14, finalY);
                    finalY += 8;

                    const tableColumn = ["Hora", "Itens", "Pagamento", "Total (R$)"];
                    const tableRows = [];

                    salesForDate.forEach(sale => {
                        let itemsString = sale.items.map(i => {
                            const qty = i.quantity || 1;
                            const qtyPrefix = qty > 1 ? `${qty}x ` : '';
                            const detail = i.weightGrams ? `(${i.weightGrams}g)` : '';
                            return `- ${qtyPrefix}${i.name} ${detail} [R$ ${i.totalPrice.toFixed(2)}]`;
                        }).join('\n');

                        if (sale.openTimeMinutes && sale.openTimeMinutes > 0) {
                            itemsString += `\n(Aberta por: ${sale.openTimeMinutes.toFixed(0)} min)`;
                        }

                        const taxaEntrega = (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega' && sale.deliveryInfo.fee > 0) ? sale.deliveryInfo.fee : 0;
                        const valorProdutos = sale.total - taxaEntrega;

                        if (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega') {
                            const fee = sale.deliveryInfo.fee ? ` (Taxa: R$ ${sale.deliveryInfo.fee.toFixed(2)})` : '';
                            itemsString += `\n(Entrega: ${sale.deliveryInfo.name || 'N/A'}${fee})`;
                        }

                        let paymentString = App.utils.getPaymentMethodName(sale.paymentMethod);
                        if (sale.paymentMethod === 'cash' && sale.change > 0) {
                            paymentString += `\n(Troco: R$ ${sale.change.toFixed(2)})`;
                            trocoTotal += sale.change;
                        }

                        const saleData = [
                            sale.date.split(' ')[1] || sale.date,
                            itemsString,
                            paymentString,
                            sale.total.toFixed(2)
                        ];
                        tableRows.push(saleData);

                        totalGeral += sale.total;
                        totalProdutos += valorProdutos;
                        totalEntregas += taxaEntrega;

                        if (pagamentos.hasOwnProperty(sale.paymentMethod)) {
                            pagamentos[sale.paymentMethod] += sale.total;
                        }
                    });

                    doc.autoTable({
                        head: [tableColumn],
                        body: tableRows,
                        startY: finalY,
                        styles: { cellPadding: 2, fontSize: 8, halign: 'left', valign: 'top' },
                        headStyles: { fillColor: [124, 58, 237], halign: 'center' },
                        alternateRowStyles: { fillColor: [245, 245, 245] },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 20 },
                            1: { cellWidth: 80 },
                            2: { halign: 'center', cellWidth: 30 },
                            3: { halign: 'right', cellWidth: 25 }
                        }
                    });
                    finalY = doc.lastAutoTable.finalY;
                }

                if (expensesForDate.length > 0) {
                    finalY += 10;
                    doc.setFontSize(14);
                    doc.text('Despesas do Dia', 14, finalY);
                    finalY += 8;

                    const expenseTableColumn = ["Hora", "Nome", "Descrição", "Valor (R$)"];
                    const expenseTableRows = [];

                    expensesForDate.forEach(expense => {
                        expenseTableRows.push([
                            expense.date.split(' ')[1] || expense.date,
                            expense.name,
                            expense.description || '-',
                            `R$ ${expense.value.toFixed(2)}`
                        ]);
                        totalDespesas += expense.value;
                    });

                    doc.autoTable({
                        head: [expenseTableColumn],
                        body: expenseTableRows,
                        startY: finalY,
                        styles: { cellPadding: 2, fontSize: 8, halign: 'left', valign: 'top' },
                        headStyles: { fillColor: [239, 68, 68], halign: 'center' },
                        alternateRowStyles: { fillColor: [245, 245, 245] },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 20 },
                            1: { cellWidth: 60 },
                            2: { cellWidth: 60 },
                            3: { halign: 'right', cellWidth: 25 }
                        }
                    });
                    finalY = doc.lastAutoTable.finalY;
                }

                // --- RESUMO FINANCEIRO ---
                finalY += 10;
                doc.setFontSize(14);
                doc.text("Resumo Financeiro Consolidado", 14, finalY);
                finalY += 8;

                if (cashRegister) {
                    const saldoEmGaveta = cashRegister.totalOpening + pagamentos.cash - totalDespesas;

                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Fundo Inicial (Abertura):`, 14, finalY);
                    doc.text(`R$ ${cashRegister.totalOpening.toFixed(2)}`, 100, finalY, { align: 'right' });
                    finalY += 5;

                    doc.text(`(+) Vendas em Dinheiro:`, 14, finalY);
                    doc.text(`R$ ${pagamentos.cash.toFixed(2)}`, 100, finalY, { align: 'right' });
                    finalY += 5;

                    doc.text(`(-) Despesas (Saídas):`, 14, finalY);
                    doc.text(`R$ ${totalDespesas.toFixed(2)}`, 100, finalY, { align: 'right' });
                    finalY += 6;

                    doc.setFont(undefined, 'bold');
                    doc.line(14, finalY, 100, finalY);
                    finalY += 5;
                    doc.text(`= SALDO ESPERADO EM GAVETA:`, 14, finalY);
                    doc.text(`R$ ${saldoEmGaveta.toFixed(2)}`, 100, finalY, { align: 'right' });

                    if (cashRegister.closingBalance !== undefined && cashRegister.closingBalance !== null) {
                        finalY += 10;
                        doc.setFontSize(11);
                        doc.text(`CONFERÊNCIA DE FECHAMENTO`, 14, finalY);
                        finalY += 6;

                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');
                        doc.text(`Saldo Físico Informado:`, 14, finalY);
                        doc.text(`R$ ${parseFloat(cashRegister.closingBalance).toFixed(2)}`, 100, finalY, { align: 'right' });

                        const diff = parseFloat(cashRegister.closingBalance) - saldoEmGaveta;
                        let diffText = "Sem Diferença";
                        let diffColor = [0, 0, 0];

                        if (diff > 0.01) {
                            diffText = "SOBRA: R$ " + diff.toFixed(2);
                            diffColor = [0, 128, 0];
                        } else if (diff < -0.01) {
                            diffText = "FALTA: R$ " + Math.abs(diff).toFixed(2);
                            diffColor = [220, 53, 69];
                        }

                        finalY += 6;
                        doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
                        doc.setFont(undefined, 'bold');
                        doc.text(diffText, 14, finalY);
                        doc.setTextColor(0, 0, 0);
                    }

                    if (cashRegister.observation) {
                        finalY += 10;
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'bold');
                        doc.text("Observações:", 14, finalY);
                        finalY += 5;
                        doc.setFont(undefined, 'normal');
                        const splitObs = doc.splitTextToSize(cashRegister.observation, 180);
                        doc.text(splitObs, 14, finalY);
                        finalY += (splitObs.length * 5);
                    }
                } else {
                    doc.setFontSize(10);
                    doc.text("Caixa não foi aberto formalmente neste dia.", 14, finalY);
                }

                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                } else {
                    if (finalY < 180) finalY = Math.max(finalY, 180);
                    else finalY += 10;
                }

                finalY += 10;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text("Faturamento Geral do Dia", 14, finalY);
                finalY += 8;
                doc.setFontSize(10);

                doc.setFont(undefined, 'normal');
                doc.text(`Total Cartão:`, 14, finalY);
                doc.text(`R$ ${pagamentos.card.toFixed(2)}`, 80, finalY, { align: 'right' });
                finalY += 5;

                doc.text(`Total PIX:`, 14, finalY);
                doc.text(`R$ ${pagamentos.pix.toFixed(2)}`, 80, finalY, { align: 'right' });
                finalY += 5;

                doc.text(`Total Entregas:`, 14, finalY);
                doc.text(`R$ ${totalEntregas.toFixed(2)}`, 80, finalY, { align: 'right' });
                finalY += 6;

                doc.setFont(undefined, 'bold');
                doc.line(14, finalY, 80, finalY);
                finalY += 5;
                doc.text(`FATURAMENTO BRUTO:`, 14, finalY);
                doc.text(`R$ ${totalGeral.toFixed(2)}`, 80, finalY, { align: 'right' });

                App.utils.savePDF(doc, `relatorio_diario_${date}.pdf`);
                App.utils.showNotification('PDF diário gerado com sucesso!', 'success');
            },

            exportMonthlyReportToPDF() {
                const monthYear = App.DOM.reportMonthSelect.value;
                if (!monthYear) {
                    return App.utils.showNotification('Selecione um mês válido.', 'error');
                }

                const [year, month] = monthYear.split('-');
                const allSales = [];
                const allExpenses = [];

                Object.keys(App.state.salesHistory).forEach(dateKey => {
                    if (dateKey.startsWith(monthYear)) {
                        allSales.push(...App.state.salesHistory[dateKey]);
                    }
                });

                Object.keys(App.state.expenses).forEach(dateKey => {
                    if (dateKey.startsWith(monthYear)) {
                        allExpenses.push(...App.state.expenses[dateKey]);
                    }
                });

                if (allSales.length === 0 && allExpenses.length === 0) {
                    return App.utils.showNotification('Nenhum dado encontrado para o mês selecionado.', 'warning');
                }

                let totalVendas = 0;
                let totalEntregas = 0;
                let totalProdutos = 0;
                let totalDespesas = 0;
                let pagamentos = { cash: 0, card: 0, pix: 0 };

                allSales.forEach(sale => {
                    const taxaEntrega = (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega' && sale.deliveryInfo.fee > 0) ? sale.deliveryInfo.fee : 0;
                    totalVendas += sale.total;
                    totalEntregas += taxaEntrega;
                    totalProdutos += (sale.total - taxaEntrega);

                    if (pagamentos.hasOwnProperty(sale.paymentMethod)) {
                        pagamentos[sale.paymentMethod] += sale.total;
                    }
                });

                allExpenses.forEach(expense => {
                    totalDespesas += expense.value;
                });

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const formattedMonth = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                let finalY = 22;

                doc.setFontSize(18);
                doc.text(`Relatório Mensal - Orvix PDV (${formattedMonth})`, 14, finalY);
                finalY += 10;

                doc.setFontSize(14);
                doc.text('Resumo Geral do Mês', 14, finalY);
                finalY += 8;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');

                doc.text(`Total de Vendas (Produtos + Entregas):`, 14, finalY);
                doc.text(`R$ ${totalVendas.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 6;

                doc.text(`Total em Despesas:`, 14, finalY);
                doc.setTextColor(220, 53, 69);
                doc.text(`R$ ${totalDespesas.toFixed(2)}`, 150, finalY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                finalY += 6;

                doc.setFont(undefined, 'bold');
                doc.text(`Total Líquido (Vendas - Despesas):`, 14, finalY);
                doc.text(`R$ ${(totalVendas - totalDespesas).toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 10;

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Detalhes de Vendas', 14, finalY);
                finalY += 7;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');

                doc.text(`Total em Produtos:`, 20, finalY);
                doc.text(`R$ ${totalProdutos.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 6;

                doc.text(`Total em Entregas:`, 20, finalY);
                doc.text(`R$ ${totalEntregas.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 8;

                doc.text(`Total por Pagamento:`, 14, finalY);
                finalY += 6;
                doc.text(`Dinheiro:`, 20, finalY);
                doc.text(`R$ ${pagamentos.cash.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 6;
                doc.text(`Cartão:`, 20, finalY);
                doc.text(`R$ ${pagamentos.card.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 6;
                doc.text(`PIX:`, 20, finalY);
                doc.text(`R$ ${pagamentos.pix.toFixed(2)}`, 150, finalY, { align: 'right' });
                finalY += 10;

                if (allExpenses.length > 0) {
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text('Lista de Despesas do Mês', 14, finalY);
                    finalY += 7;

                    const expenseTableColumn = ["Data", "Nome", "Descrição", "Valor (R$)"];
                    const expenseTableRows = [];

                    allExpenses.sort((a, b) => new Date(a.dateKey + 'T' + (a.date.split(' ')[1] || '00:00')) - new Date(b.dateKey + 'T' + (b.date.split(' ')[1] || '00:00')));

                    allExpenses.forEach(expense => {
                        expenseTableRows.push([
                            new Date(expense.dateKey + 'T12:00:00').toLocaleDateString('pt-BR'),
                            expense.name,
                            expense.description || '-',
                            `R$ ${expense.value.toFixed(2)}`
                        ]);
                    });

                    doc.autoTable({
                        head: [expenseTableColumn],
                        body: expenseTableRows,
                        startY: finalY,
                        styles: { cellPadding: 2, fontSize: 8, halign: 'left', valign: 'top' },
                        headStyles: { fillColor: [220, 53, 69], halign: 'center' },
                        alternateRowStyles: { fillColor: [245, 245, 245] },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 25 },
                            1: { cellWidth: 60 },
                            2: { cellWidth: 60 },
                            3: { halign: 'right', cellWidth: 25 }
                        }
                    });
                    finalY = doc.lastAutoTable.finalY;
                }

                App.utils.savePDF(doc, `relatorio_mensal_${monthYear}.pdf`);
                App.utils.showNotification('PDF mensal gerado com sucesso!', 'success');
            },

            printLastReceiptModal() {
                const sale = App.state.ui.lastSaleForReceipt;
                if (sale) {
                    App.handlers.printReceipt(sale);
                } else {
                    App.utils.showNotification("Nenhuma venda recente para imprimir.", "error");
                }
            },

            printReceipt(sale) {
                if (!sale) return App.utils.showNotification("Não foi possível encontrar a venda para imprimir.", "error");

                let deliveryHtml = '';
                const fee = (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega' && sale.deliveryInfo.fee > 0) ? sale.deliveryInfo.fee : 0;
                const feeHtml = fee > 0 ? `<div class="item"><span class="item-name">Taxa Entrega</span><span class="item-price">R$ ${fee.toFixed(2)}</span></div>` : '';

                if (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega') {
                    deliveryHtml = `
                        <div class="divider"></div>
                        <div class="item" style="text-align: center; display: block; margin-bottom: 5px;"><strong>*** ENTREGA ***</strong></div>
                        ${sale.deliveryInfo.name ? `<div class="item"><span>Cliente:</span><span style="text-align:right;">${sale.deliveryInfo.name}</span></div>` : ''}
                        ${sale.deliveryInfo.address ? `<div class="item"><span>Endereço:</span><span style="text-align:right;">${sale.deliveryInfo.address}</span></div>` : ''}
                    `;
                }

                const printContent = `<!DOCTYPE html><html><head><title>Recibo</title><style>
                    @page{ size: 78mm auto; margin: 0; padding: 0; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        color: #000;
                        font-weight: bold;
                        width: 78mm; 
                        margin: 0;
                        padding: 5px 5px 20px 5px;
                        box-sizing: border-box;
                        background: #fff;
                    }
                    .header{text-align:center;margin-bottom:8px;padding-bottom:5px;border-bottom:1px dashed #000}
                    .header h2{font-size:16px;font-weight:700;margin:5px 0;text-transform:uppercase}
                    .header p{margin:3px 0;font-size:10px}
                    .item{display:flex;justify-content:space-between;margin-bottom:4px;line-height:1.3}
                    .item-name{flex-grow:1;text-align:left;word-break:break-word}
                    .item-price{width:80px;text-align:right;flex-shrink:0; display:flex; flex-direction:column;}
                    .discount-tag{font-size:9px; font-style:italic;}
                    .old-price-print{text-decoration: line-through; font-size: 10px;}
                    .divider{border-top:1px dashed #000;margin:8px 0}
                    .total{font-weight:700;margin-top:8px;font-size:14px}
                    .payment-info{margin:8px 0;font-size:10px}
                    .footer{text-align:center;margin-top:10px;font-size:9px;border-top:1px dashed #000;padding-top:5px}
                    @media print{
                        body {
                            margin: 0;
                            padding: 5px 5px 20px 5px;
                            width: 78mm; 
                            color: #000 !important;
                            font-weight: bold !important;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                    </style></head><body>
                    <div class="header"><h2>Orvix PDV</h2><p>${new Date().toLocaleString('pt-BR')}</p></div>
                    ${deliveryHtml} 
                    <div class="divider"></div>
                    ${sale.items.map(item => {
                        const qty = item.quantity || 1;
                        const qtyPrefix = qty > 1 ? `${qty}x ` : '';
                        let priceHtml = `<span>R$ ${item.totalPrice.toFixed(2)}</span>`;
                        let nameExtra = "";

                        if (item.originalPrice && item.discountInfo) {
                            priceHtml = `<span class="old-price-print">R$ ${item.originalPrice.toFixed(2)}</span><span>R$ ${item.totalPrice.toFixed(2)}</span>`;
                            nameExtra = `<br><span class="discount-tag">(-${item.discountInfo.percentage}%)</span>`;
                        }
                        if (qty > 1 && item.unitPrice) {
                            nameExtra += `<br><span style="font-size: 0.8em; font-weight: normal; color: #555;">(${qty}x R$ ${item.unitPrice.toFixed(2)})</span>`;
                        }

                        return `<div class="item">
                            <span class="item-name">${qtyPrefix}${item.name} ${item.weightGrams ? `(${item.weightGrams}g)` : ''}${nameExtra}</span>
                            <span class="item-price">${priceHtml}</span>
                        </div>`;
                    }).join('')}
                    ${feeHtml}
                    <div class="divider"></div>
                    <div class="item total"><span>TOTAL:</span><span>R$ ${sale.total.toFixed(2)}</span></div>
                    <div class="payment-info">
                        <div class="item"><span>Pagamento:</span><span>${App.utils.getPaymentMethodName(sale.paymentMethod)}</span></div>
                        ${sale.paymentMethod === 'cash' ? `<div class="item"><span>Recebido:</span><span>R$ ${sale.cashReceived.toFixed(2)}</span></div><div class="item"><span>Troco:</span><span>R$ ${sale.change.toFixed(2)}</span></div>` : ''}
                    </div>
                    <div class="footer"><p>Obrigado pela preferência!</p><p>Volte Sempre!</p></div>
                    <script>window.onload=()=>{setTimeout(()=>{window.print();setTimeout(()=>window.close(),100)},100)}<\/script>
                </body></html>`;

                const printWindow = window.open('', '_blank');
                printWindow.document.write(printContent);
                printWindow.document.close();
            }
        },

        render: {
            all() {
                App.DOM.currentDate.textContent = new Date().toLocaleDateString('pt-BR');
                App.DOM.historyDate.value = App.state.ui.today;
                App.DOM.expenseDate.value = App.state.ui.today;
                App.DOM.acaiPriceInput.value = App.state.config.açaíPricePerKg.toFixed(2);
                App.DOM.sorvetePriceInput.value = App.state.config.sorvetePricePerKg.toFixed(2);
                this.weightedProductPrice();
                this.weightPresets();
                this.cart();
                this.productCategories();
                this.products();
                this.history(App.state.ui.today);
                this.expenses(App.state.ui.today);
                this.openOrdersGrid();
                this.deliveryMode();
                this.productsCatalogFull();
                if (window.lucide) lucide.createIcons();
            },

            cashRegister() {
                const today = App.state.ui.today;
                const register = App.state.cashRegister[today];
                const isOpened = Boolean(register && register.status === 'open');

                // Atualizar Badges do Header e Sidebar
                if (App.DOM.headerCaixaDot) {
                    if (isOpened) {
                        App.DOM.headerCaixaDot.classList.add('open');
                    } else {
                        App.DOM.headerCaixaDot.classList.remove('open');
                    }
                    App.DOM.headerCaixaText.textContent = isOpened ? 'Caixa: Aberto' : 'Caixa: Fechado';
                }
                if (App.DOM.sidebarCaixaStatus) {
                    if (isOpened) {
                        App.DOM.sidebarCaixaStatus.classList.add('open');
                    } else {
                        App.DOM.sidebarCaixaStatus.classList.remove('open');
                    }
                }

                if (!isOpened) {
                    App.DOM.cashRegisterOpening.style.display = 'block';
                    App.DOM.cashRegisterDashboard.style.display = 'none';
                } else {
                    App.DOM.cashRegisterOpening.style.display = 'none';
                    App.DOM.cashRegisterDashboard.style.display = 'block';

                    const salesForDate = App.state.salesHistory[today] || [];
                    const expensesForDate = App.state.expenses[today] || [];

                    let cashSales = 0;
                    let cardTotal = 0;
                    let pixTotal = 0;
                    let totalExpenses = 0;

                    salesForDate.forEach(sale => {
                        if (sale.paymentMethod === 'cash') cashSales += sale.total;
                        if (sale.paymentMethod === 'card') cardTotal += sale.total;
                        if (sale.paymentMethod === 'pix') pixTotal += sale.total;
                    });

                    expensesForDate.forEach(exp => totalExpenses += exp.value);

                    const openingBalance = register.totalOpening;
                    const currentDrawerBalance = openingBalance + cashSales - totalExpenses;

                    App.DOM.dashOpeningBalance.textContent = `R$ ${openingBalance.toFixed(2)}`;
                    App.DOM.dashCashSales.textContent = `R$ ${cashSales.toFixed(2)}`;
                    App.DOM.dashExpenses.textContent = `R$ ${totalExpenses.toFixed(2)}`;
                    App.DOM.dashCurrentBalance.textContent = `R$ ${currentDrawerBalance.toFixed(2)}`;

                    App.DOM.dashCardTotal.textContent = `R$ ${cardTotal.toFixed(2)}`;
                    App.DOM.dashPixTotal.textContent = `R$ ${pixTotal.toFixed(2)}`;
                }
                if (window.lucide) lucide.createIcons();
            },

            discountControls() {
                const { enabled, percentage, targets, days, allDay, startTime, endTime } = App.state.discount;
                if (App.DOM.discountActiveCheck) App.DOM.discountActiveCheck.checked = Boolean(enabled);
                if (App.DOM.discountPercentageInput) {
                    App.DOM.discountPercentageInput.value = percentage || 10;
                    document.querySelectorAll('.promo-quick-btn').forEach(btn => {
                        btn.classList.toggle('active', parseFloat(btn.dataset.percent) === (percentage || 10));
                    });
                }

                // Modo de Horário
                const isAllDay = allDay !== false;
                if (App.DOM.discountTimeModeAll) App.DOM.discountTimeModeAll.checked = isAllDay;
                if (App.DOM.discountTimeModeCustom) App.DOM.discountTimeModeCustom.checked = !isAllDay;
                if (App.DOM.labelTimeAllDay) App.DOM.labelTimeAllDay.classList.toggle('active', isAllDay);
                if (App.DOM.labelTimeCustom) App.DOM.labelTimeCustom.classList.toggle('active', !isAllDay);
                if (App.DOM.promoCustomTimeBox) {
                    if (isAllDay) {
                        App.DOM.promoCustomTimeBox.classList.add('disabled');
                    } else {
                        App.DOM.promoCustomTimeBox.classList.remove('disabled');
                    }
                }
                if (App.DOM.discountStartTime) App.DOM.discountStartTime.value = startTime || '10:00';
                if (App.DOM.discountEndTime) App.DOM.discountEndTime.value = endTime || '21:00';
                App.utils.validatePromoTimeRange();

                if (App.DOM.discountTargetAcai) App.DOM.discountTargetAcai.checked = Boolean(targets?.acai);
                if (App.DOM.discountTargetSorvete) App.DOM.discountTargetSorvete.checked = Boolean(targets?.sorvete);

                const activeDays = Array.isArray(days) ? days.map(Number) : [4];
                document.querySelectorAll('input[name="discount-day"]').forEach(cb => {
                    cb.checked = activeDays.includes(parseInt(cb.value, 10));
                });

                if (App.DOM.discountConfigArea) {
                    if (enabled) {
                        App.DOM.discountConfigArea.classList.remove('disabled');
                    } else {
                        App.DOM.discountConfigArea.classList.add('disabled');
                    }
                }

                this.promoStatusBanner();
                if (window.lucide) lucide.createIcons();
            },

            promoStatusBanner() {
                const banner = App.DOM.promoStatusBanner;
                if (!banner) return;

                const { enabled, active, percentage, targets, days, allDay, startTime, endTime } = App.state.discount;
                const today = new Date();
                const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                const currentDay = today.getDay();
                const currentDayName = dayNames[currentDay];
                const activeDays = Array.isArray(days) ? days.map(Number) : [4];
                const isPromoDay = activeDays.includes(currentDay);
                const isAllDay = allDay !== false;
                const timeStr = isAllDay ? 'o dia todo' : `das ${startTime || '10:00'} às ${endTime || '21:00'}`;

                if (!enabled) {
                    banner.className = 'promo-status-banner inactive';
                    banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="circle-off" class="mini-icon"></i> <strong>Promoção Desativada</strong> nas configurações.</span>`;
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                let items = [];
                if (targets?.acai) items.push('Açaí');
                if (targets?.sorvete) items.push('Sorvete');
                const targetStr = items.length > 0 ? items.join(' e ') : 'nenhum produto';

                if (active) {
                    banner.className = 'promo-status-banner active';
                    banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px; color:var(--success);"><i data-lucide="sparkles" class="mini-icon"></i> <strong>Promoção Ativa Agora (${currentDayName}, ${timeStr}):</strong> ${percentage}% OFF em ${targetStr}!</span>`;
                } else if (isPromoDay && !isAllDay) {
                    banner.className = 'promo-status-banner inactive';
                    banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="clock" class="mini-icon"></i> <strong>Programada para Hoje (${currentDayName}):</strong> Vigência ${timeStr} (Fora do horário no momento).</span>`;
                } else {
                    const daysFormatted = activeDays.map(d => dayNames[d].split('-')[0]).join(', ');
                    banner.className = 'promo-status-banner inactive';
                    banner.innerHTML = `<span style="display:flex; align-items:center; gap:8px;"><i data-lucide="calendar" class="mini-icon"></i> <strong>Hoje (${currentDayName}) não é dia de promoção.</strong> Programada para: ${daysFormatted || 'Nenhum dia'} (${timeStr}).</span>`;
                }
                if (window.lucide) lucide.createIcons();
            },

            activeDiscountIndicator() {
                const { active, percentage, targets } = App.state.discount;
                if (active) {
                    let items = [];
                    if (targets?.acai) items.push("Açaí");
                    if (targets?.sorvete) items.push("Sorvete");

                    if (items.length > 0) {
                        const promoText = `${percentage}% OFF em ${items.join(' e ')}`;
                        if (App.DOM.discountBalloon) {
                            App.DOM.discountBalloon.style.display = 'inline-flex';
                            App.DOM.discountBalloon.classList.add('active');
                            App.DOM.discountDetails.textContent = promoText;
                        }
                        if (App.DOM.mobilePromoBanner) {
                            App.DOM.mobilePromoBanner.classList.add('active');
                            App.DOM.mobilePromoDetails.textContent = promoText;
                        }
                    } else {
                        if (App.DOM.discountBalloon) {
                            App.DOM.discountBalloon.style.display = 'none';
                            App.DOM.discountBalloon.classList.remove('active');
                        }
                        if (App.DOM.mobilePromoBanner) {
                            App.DOM.mobilePromoBanner.classList.remove('active');
                        }
                    }
                } else {
                    if (App.DOM.discountBalloon) {
                        App.DOM.discountBalloon.style.display = 'none';
                        App.DOM.discountBalloon.classList.remove('active');
                    }
                    if (App.DOM.mobilePromoBanner) {
                        App.DOM.mobilePromoBanner.classList.remove('active');
                    }
                }
            },

            cart() {
                const { cartItems, subtotal, total } = App.DOM;
                cartItems.innerHTML = '';

                let currentSubtotal = 0;
                if (App.state.cart.length > 0) {
                    App.state.cart.forEach((item, index) => {
                        const qty = item.quantity || 1;
                        if (!item.quantity) item.quantity = qty;
                        if (item.unitPrice === undefined || item.unitPrice === null) {
                            item.unitPrice = item.totalPrice / qty;
                        }
                        item.totalPrice = item.unitPrice * qty;
                        if (item.unitOriginalPrice) {
                            item.originalPrice = item.unitOriginalPrice * qty;
                        }

                        currentSubtotal += item.totalPrice;
                        const itemElement = document.createElement('div');
                        itemElement.className = 'cart-item';
                        
                        let detailsHtml = '';
                        if (item.type === "weight") {
                            detailsHtml += `<span class="item-weight">${item.weightGrams}g</span>`;
                        }
                        if (qty > 1) {
                            detailsHtml += `<span class="item-unit-price">(R$ ${item.unitPrice.toFixed(2)} un)</span>`;
                        }

                        let priceDisplay = `<div class="item-price">R$ ${item.totalPrice.toFixed(2)}</div>`;
                        if (item.originalPrice) {
                            priceDisplay = `
                                <div class="item-price-container" style="display:flex; flex-direction:column; align-items:flex-end;">
                                    <span class="old-price" style="font-size:0.75rem; text-decoration:line-through; color:var(--text-muted);">R$ ${item.originalPrice.toFixed(2)}</span>
                                    <span class="item-price" style="color:var(--brand-primary); font-weight:800;">R$ ${item.totalPrice.toFixed(2)}</span>
                                </div>
                            `;
                        }

                        itemElement.innerHTML = `
                            <div class="cart-item-qty-stepper">
                                <button type="button" class="btn-cart-qty btn-qty-minus" data-index="${index}" title="Diminuir quantidade">−</button>
                                <span class="cart-qty-val">${qty}</span>
                                <button type="button" class="btn-cart-qty btn-qty-plus" data-index="${index}" title="Aumentar quantidade">+</button>
                            </div>
                            <div class="item-details">
                                <div class="item-name" title="${item.name}">${item.name}</div>
                                <div class="item-sub-details">${detailsHtml}</div>
                            </div>
                            ${priceDisplay}
                            <button class="btn-remove" data-index="${index}" title="Remover Item">
                                <i data-lucide="trash-2"></i>
                            </button>
                        `;
                        cartItems.appendChild(itemElement);
                    });
                } else {
                    cartItems.innerHTML = `
                        <div class="empty-state-modern">
                            <div class="empty-icon"><i data-lucide="shopping-cart"></i></div>
                            <div class="empty-text">Nenhum item adicionado</div>
                            <div class="empty-sub">Selecione o peso ou clique em um produto</div>
                        </div>
                    `;
                }

                let deliveryFee = 0;
                if (App.state.ui.deliveryMode === 'entrega') {
                    deliveryFee = parseFloat(App.DOM.deliveryFee.value) || 0;
                }
                const currentTotal = currentSubtotal + deliveryFee;

                subtotal.textContent = `R$ ${currentSubtotal.toFixed(2)}`;
                total.textContent = `R$ ${currentTotal.toFixed(2)}`;
                if (window.lucide) lucide.createIcons();
            },

            products() {
                const searchTerm = App.utils.normalizeText(App.DOM.productSearch ? App.DOM.productSearch.value : '');
                const activeCategoryEl = App.DOM.productsCategoriesList ? App.DOM.productsCategoriesList.querySelector('.category-btn.active') : null;
                const activeCategory = activeCategoryEl ? activeCategoryEl.dataset.category : 'all';
                let filtered = [...App.state.products];
                if (activeCategory !== 'all') filtered = filtered.filter(p => p.category === activeCategory);
                if (searchTerm) filtered = filtered.filter(p => App.utils.normalizeText(p.name).includes(searchTerm));

                App.DOM.productsGrid.innerHTML = '';
                const nonDrinkProducts = filtered.filter(p => p.category !== 'Bebidas');

                if (nonDrinkProducts.length === 0) {
                    App.DOM.productsGrid.innerHTML = `
                        <div class="empty-state-modern" style="grid-column: 1 / -1;">
                            <div class="empty-icon"><i data-lucide="search-x"></i></div>
                            <div class="empty-text">Nenhum produto encontrado</div>
                        </div>
                    `;
                } else {
                    nonDrinkProducts.forEach(product => {
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        const imageHtml = product.image ? `<img src="${product.image}" alt="${product.name}">` : '<i data-lucide="package" style="color:var(--brand-primary);"></i>';
                        card.innerHTML = `
                            <div class="product-image">${imageHtml}</div>
                            <div class="product-name">${product.name}</div>
                            <div class="product-price-card">R$ ${product.price.toFixed(2)}</div>
                        `;
                        card.addEventListener('click', () => App.handlers.addProductToCart(product));
                        App.DOM.productsGrid.appendChild(card);
                    });
                }

                // Bebidas rápidas
                const quickAddButtons = App.DOM.quickAddButtonsContainer;
                quickAddButtons.innerHTML = '';
                const drinkProducts = filtered.filter(p => p.category === 'Bebidas');

                if (drinkProducts.length > 0) {
                    drinkProducts.forEach(product => {
                        const button = document.createElement('button');
                        button.className = 'quick-add-btn';
                        button.dataset.productId = product.id;
                        button.innerHTML = `
                            <span>${product.name}</span>
                            <span class="price">R$ ${product.price.toFixed(2)}</span>
                        `;
                        button.addEventListener('click', (e) => App.handlers.addQuickProduct(e));
                        quickAddButtons.appendChild(button);
                    });
                    document.getElementById('quick-drinks-section').style.display = 'block';
                } else {
                    document.getElementById('quick-drinks-section').style.display = 'none';
                }
                if (window.lucide) lucide.createIcons();
            },

            productCategories() {
                const categories = ['all', ...new Set(App.state.products.map(p => p.category))];
                App.DOM.productsCategoriesList.innerHTML = categories.map(c => `
                    <button class="category-btn ${c === 'all' ? 'active' : ''}" data-category="${c}">
                        ${c === 'all' ? 'Todos' : c}
                    </button>
                `).join('');

                App.DOM.productsCategoriesList.querySelectorAll('.category-btn').forEach(b => b.addEventListener('click', () => {
                    const currentActive = App.DOM.productsCategoriesList.querySelector('.category-btn.active');
                    if (currentActive) currentActive.classList.remove('active');
                    b.classList.add('active');
                    this.products();
                }));
            },

            productsCatalogFull() {
                if (!App.DOM.productsCatalogFullGrid) return;

                const search = App.DOM.productViewSearch ? App.utils.normalizeText(App.DOM.productViewSearch.value) : '';
                const activeCategory = App.state.ui.selectedProductCategory || 'all';

                // Categorias dinâmicas
                const categories = ['all', ...new Set(App.state.products.map(p => p.category || 'Geral'))];

                // Renderiza pílulas de filtro de categoria na aba de produtos
                if (App.DOM.productViewCategoryFilters) {
                    App.DOM.productViewCategoryFilters.innerHTML = categories.map(cat => {
                        const label = (cat === 'all') ? 'Todos' : cat;
                        const isActive = (cat === activeCategory) ? 'active' : '';
                        return `<button type="button" class="prod-cat-pill ${isActive}" data-category="${cat}">${label}</button>`;
                    }).join('');

                    App.DOM.productViewCategoryFilters.querySelectorAll('.prod-cat-pill').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            App.state.ui.selectedProductCategory = e.currentTarget.dataset.category;
                            this.productsCatalogFull();
                        });
                    });
                }

                // Filtragem de produtos por busca e categoria
                let filtered = [...App.state.products];
                if (activeCategory !== 'all') {
                    filtered = filtered.filter(p => (p.category || 'Geral') === activeCategory);
                }
                if (search) {
                    filtered = filtered.filter(p =>
                        (p.name && App.utils.normalizeText(p.name).includes(search)) ||
                        (p.category && App.utils.normalizeText(p.category).includes(search))
                    );
                }

                // Atualiza o contador de produtos
                if (App.DOM.productCountNumber) {
                    App.DOM.productCountNumber.textContent = filtered.length;
                }

                App.DOM.productsCatalogFullGrid.innerHTML = '';
                if (filtered.length === 0) {
                    App.DOM.productsCatalogFullGrid.innerHTML = `
                        <div class="empty-state-modern" style="grid-column: 1 / -1;">
                            <div class="empty-icon"><i data-lucide="package-open"></i></div>
                            <div class="empty-text">Nenhum produto encontrado</div>
                            <div class="empty-sub">Tente mudar o filtro ou clique em "Novo Produto" para cadastrar itens.</div>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                const getCategoryIconHtml = (category, name) => {
                    const c = (category || '').toLowerCase();
                    const n = (name || '').toLowerCase();
                    if (c.includes('bebida') || n.includes('água') || n.includes('suco') || n.includes('refri') || n.includes('coca') || n.includes('guaraná')) return '<i data-lucide="cup-soda" style="color:var(--info);"></i>';
                    if (c.includes('doce') || n.includes('chocolate') || n.includes('bala') || n.includes('barra') || n.includes('bombom')) return '<i data-lucide="candy" style="color:var(--brand-accent);"></i>';
                    if (c.includes('sobremesa') || n.includes('torta') || n.includes('bolo') || n.includes('pudim')) return '<i data-lucide="cake-slice" style="color:var(--warning);"></i>';
                    if (c.includes('picol') || n.includes('picolé')) return '<i data-lucide="ice-cream-2" style="color:var(--brand-primary);"></i>';
                    if (c.includes('açaí') || c.includes('acai') || c.includes('sorvete') || n.includes('açaí') || n.includes('sorvete')) return '<i data-lucide="ice-cream-cone" style="color:var(--brand-primary);"></i>';
                    return '<i data-lucide="package" style="color:var(--text-muted);"></i>';
                };

                filtered.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'product-catalog-card';
                    const iconHtml = getCategoryIconHtml(p.category, p.name);
                    const mediaContent = p.image ? `<img src="${p.image}" alt="${p.name}">` : iconHtml;

                    card.innerHTML = `
                        <div class="catalog-card-header">
                            <span class="catalog-category-tag">${p.category || 'Geral'}</span>
                        </div>
                        <div class="catalog-card-media">
                            ${mediaContent}
                        </div>
                        <div class="catalog-card-body">
                            <div class="catalog-card-title" title="${p.name}">${p.name}</div>
                            <div class="catalog-card-price-box">
                                <span class="catalog-price-label">Preço</span>
                                <span class="catalog-price-value">R$ ${p.price.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="catalog-qty-row">
                            <span class="catalog-qty-label">Qtd:</span>
                            <div class="catalog-qty-stepper">
                                <button type="button" class="catalog-qty-btn btn-catalog-minus" data-id="${p.id}" title="Diminuir">−</button>
                                <input type="number" class="catalog-qty-input" id="cat-qty-${p.id}" value="1" min="1" max="999" inputmode="numeric">
                                <button type="button" class="catalog-qty-btn btn-catalog-plus" data-id="${p.id}" title="Aumentar">+</button>
                            </div>
                        </div>
                        <div class="catalog-card-actions">
                            <button class="touch-btn btn-secondary btn-card-action btn-catalog-edit" data-id="${p.id}" type="button" title="Editar este produto">
                                <i data-lucide="edit-3"></i>
                                <span>Editar</span>
                            </button>
                            <button class="touch-btn btn-primary btn-card-action btn-catalog-sell" data-id="${p.id}" type="button" title="Adicionar ao Carrinho do PDV">
                                <i data-lucide="shopping-cart"></i>
                                <span>Vender</span>
                            </button>
                            <button class="btn-card-delete" data-id="${p.id}" type="button" title="Excluir produto">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    `;

                    const qtyInput = card.querySelector(`#cat-qty-${p.id}`);
                    card.querySelector('.btn-catalog-minus').addEventListener('click', (e) => {
                        e.stopPropagation();
                        let current = parseInt(qtyInput.value, 10) || 1;
                        if (current > 1) qtyInput.value = current - 1;
                    });
                    card.querySelector('.btn-catalog-plus').addEventListener('click', (e) => {
                        e.stopPropagation();
                        let current = parseInt(qtyInput.value, 10) || 1;
                        qtyInput.value = current + 1;
                    });

                    card.querySelector('.btn-catalog-edit').addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.handlers.openEditProductModal(p.id);
                    });

                    card.querySelector('.btn-catalog-sell').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const qty = parseInt(qtyInput.value, 10) || 1;
                        App.handlers.quickSellFromCatalog(p.id, qty);
                    });

                    card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.handlers.deleteProduct(p.id);
                    });

                    App.DOM.productsCatalogFullGrid.appendChild(card);
                });
                if (window.lucide) lucide.createIcons();
            },

            history(date) {
                const {
                    salesHistory, historySummary,
                    historyProductsTotal, historyDeliveryTotal,
                    historyExpensesTotal, historyGrandTotal,
                    historyCashTotal, historyCardTotal, historyPixTotal
                } = App.DOM;

                salesHistory.innerHTML = '';

                const salesForDate = App.state.salesHistory[date] || [];
                const expensesForDate = App.state.expenses[date] || [];

                let totalGeral = 0;
                let totalProdutos = 0;
                let totalEntregas = 0;
                let totalDespesas = 0;
                let pagamentos = { cash: 0, card: 0, pix: 0 };

                if (salesForDate.length === 0 && expensesForDate.length === 0) {
                    salesHistory.innerHTML = `
                        <div class="empty-state-modern">
                            <div class="empty-icon"><i data-lucide="history"></i></div>
                            <div class="empty-text">Nenhuma venda para esta data</div>
                        </div>
                    `;
                    historySummary.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                salesForDate.forEach(sale => {
                    const item = document.createElement('div');
                    item.className = 'sale-item';

                    const taxaEntrega = (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega' && sale.deliveryInfo.fee > 0) ? sale.deliveryInfo.fee : 0;
                    const valorProdutos = sale.total - taxaEntrega;

                    totalGeral += sale.total;
                    totalProdutos += valorProdutos;
                    totalEntregas += taxaEntrega;

                    if (pagamentos.hasOwnProperty(sale.paymentMethod)) {
                        pagamentos[sale.paymentMethod] += sale.total;
                    }

                    const itemsHtml = sale.items.map(i => {
                        const detail = i.weightGrams ? `(${i.weightGrams}g)` : '';
                        let extraInfo = '';
                        if (i.discountInfo) {
                            extraInfo = ` [${i.discountInfo.percentage}% OFF]`;
                        }
                        return `<div class="sale-item-detail">• ${i.name} ${detail}${extraInfo}</div>`;
                    }).join('');

                    const openTimeHtml = (sale.openTimeMinutes && sale.openTimeMinutes > 0)
                        ? `<div class="order-timer-pill" style="margin-top: 4px;"><i data-lucide="clock" class="mini-icon"></i> Aberta por: ${sale.openTimeMinutes.toFixed(0)} min</div>`
                        : '';

                    let deliveryHtml = '';
                    if (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega') {
                        const name = sale.deliveryInfo.name ? ` (${sale.deliveryInfo.name})` : '';
                        const fee = sale.deliveryInfo.fee ? ` (Taxa: R$ ${sale.deliveryInfo.fee.toFixed(2)})` : '';
                        deliveryHtml = `<div style="display:flex; align-items:center; gap:4px; color: var(--info); font-weight: 700; font-size: 0.8rem; margin-top: 2px;"><i data-lucide="truck" class="mini-icon"></i> Entrega${name}${fee}</div>`;
                    }

                    const paymentDetails = sale.paymentMethod === 'cash' && sale.change > 0
                        ? ` (Troco: R$ ${sale.change.toFixed(2)})`
                        : '';

                    item.innerHTML = `
                        <div class="sale-info">
                            <div class="sale-date">${sale.date}</div>
                            <div class="sale-items">${itemsHtml}${openTimeHtml}${deliveryHtml}</div>
                            <div class="sale-payment">
                                <span>${App.utils.getPaymentIcon(sale.paymentMethod)}</span> 
                                <span>${App.utils.getPaymentMethodName(sale.paymentMethod)}${paymentDetails}</span>
                            </div>
                        </div>
                        <div class="sale-total">R$ ${sale.total.toFixed(2)}</div>
                        <button class="reprint-sale" data-id="${sale.id}" data-date="${date}" title="Reimprimir Recibo">
                            <i data-lucide="printer"></i>
                        </button>
                        <button class="delete-sale" data-id="${sale.id}" data-date="${date}" title="Excluir Venda">
                            <i data-lucide="trash-2"></i>
                        </button>
                    `;

                    salesHistory.appendChild(item);
                });

                expensesForDate.forEach(expense => {
                    totalDespesas += expense.value;
                });

                historyProductsTotal.textContent = `R$ ${totalProdutos.toFixed(2)}`;
                historyDeliveryTotal.textContent = `R$ ${totalEntregas.toFixed(2)}`;
                historyCashTotal.textContent = `R$ ${pagamentos.cash.toFixed(2)}`;
                historyCardTotal.textContent = `R$ ${pagamentos.card.toFixed(2)}`;
                historyPixTotal.textContent = `R$ ${pagamentos.pix.toFixed(2)}`;
                historyExpensesTotal.textContent = `R$ ${totalDespesas.toFixed(2)}`;
                historyGrandTotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
                historySummary.style.display = 'grid';

                if (date === App.state.ui.today) {
                    this.cashRegister();
                }
                if (window.lucide) lucide.createIcons();
            },

            expenses(date) {
                const { expensesHistoryList, expensesSummary, expensesTotalToday } = App.DOM;
                expensesHistoryList.innerHTML = '';

                const expensesForDate = App.state.expenses[date] || [];
                let totalDespesas = 0;

                if (expensesForDate.length === 0) {
                    expensesHistoryList.innerHTML = `
                        <div class="empty-state-modern">
                            <div class="empty-icon"><i data-lucide="arrow-down-right"></i></div>
                            <div class="empty-text">Nenhuma despesa para esta data</div>
                        </div>
                    `;
                    expensesSummary.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                expensesForDate.forEach(expense => {
                    totalDespesas += expense.value;
                    const item = document.createElement('div');
                    item.className = 'expense-item';

                    item.innerHTML = `
                        <div class="expense-info">
                            <div class="sale-date">${expense.date}</div>
                            <div class="expense-name">${expense.name}</div>
                            ${expense.description ? `<div class="expense-desc">${expense.description}</div>` : ''}
                        </div>
                        <div class="expense-value">R$ ${expense.value.toFixed(2)}</div>
                        <button class="delete-expense" data-id="${expense.id}" data-date="${date}" title="Excluir Despesa">
                            <i data-lucide="trash-2"></i>
                        </button>
                    `;
                    expensesHistoryList.appendChild(item);
                });

                expensesTotalToday.textContent = `R$ ${totalDespesas.toFixed(2)}`;
                expensesSummary.style.display = 'flex';
                if (window.lucide) lucide.createIcons();
            },

            deliveryMode() {
                const mode = App.state.ui.deliveryMode;
                App.DOM.deliveryModeSelector.querySelectorAll('.delivery-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === mode);
                });
                App.DOM.deliveryInfoSection.style.display = (mode === 'entrega') ? 'flex' : 'none';
            },

            openOrdersGrid() {
                const { openOrdersGrid, openOrdersCount } = App.DOM;
                openOrdersGrid.innerHTML = '';
                const orders = App.state.openOrders;

                if (orders.length === 0) {
                    openOrdersGrid.innerHTML = `
                        <div class="empty-state-modern" style="grid-column: 1 / -1;">
                            <div class="empty-icon"><i data-lucide="clipboard-list"></i></div>
                            <div class="empty-text">Nenhuma comanda em aberto</div>
                            <div class="empty-sub">Para salvar uma comanda, adicione itens no PDV e clique em "Comanda / Posterior"</div>
                        </div>
                    `;
                    openOrdersCount.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                    return;
                }

                orders.forEach(order => {
                    const card = document.createElement('div');
                    card.className = 'open-order-card';
                    card.dataset.id = order.id;

                    const isDelivery = order.deliveryInfo && order.deliveryInfo.mode === 'entrega';
                    const badgeDelivery = isDelivery ? `<span class="order-timer-pill" style="background: var(--info-light); color: var(--info);"><i data-lucide="truck" class="mini-icon"></i> Entrega</span>` : '';

                    card.innerHTML = `
                        <div class="open-order-header">
                            <span class="open-order-name">${order.customerName}</span>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                ${badgeDelivery}
                                <button class="open-order-delete-btn" data-id="${order.id}" title="Excluir Comanda" type="button">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </div>
                        <div class="open-order-total">R$ ${order.total.toFixed(2)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${order.items.length} item(ns)</div>
                    `;
                    openOrdersGrid.appendChild(card);
                });

                openOrdersCount.textContent = orders.length;
                openOrdersCount.style.display = 'inline-flex';
                if (window.lucide) lucide.createIcons();
            },

            openOrderItems(items, deliveryInfo) {
                const { openOrderItemsList } = App.DOM;
                openOrderItemsList.innerHTML = '';
                if (items.length === 0) {
                    openOrderItemsList.innerHTML = '<div class="empty-state-modern"><div class="empty-text">Nenhum item</div></div>';
                    return;
                }
                items.forEach((item, index) => {
                    const qty = item.quantity || 1;
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    let details = (item.type === "weight") ? `<span class="item-weight">${item.weightGrams}g</span>` : '';
                    if (qty > 1 && item.unitPrice) {
                        details += ` <span class="item-unit-price">(${qty}x R$ ${item.unitPrice.toFixed(2)})</span>`;
                    }
                    itemElement.innerHTML = `
                        <div class="item-info">
                            <div class="item-quantity">${qty}</div>
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                ${details ? `<div class="item-sub-details">${details}</div>` : ''}
                            </div>
                        </div>
                        <div class="item-price">R$ ${item.totalPrice.toFixed(2)}</div>
                    `;
                    openOrderItemsList.appendChild(itemElement);
                });

                if (deliveryInfo && deliveryInfo.mode === 'entrega' && deliveryInfo.fee > 0) {
                    const feeElement = document.createElement('div');
                    feeElement.className = 'cart-item';
                    feeElement.innerHTML = `
                        <div class="item-info">
                            <div class="item-details">
                                <div class="item-name" style="font-weight: 800; display:flex; align-items:center; gap:4px;"><i data-lucide="truck" class="mini-icon"></i> Taxa de Entrega</div>
                            </div>
                        </div>
                        <div class="item-price" style="font-weight: 800;">R$ ${deliveryInfo.fee.toFixed(2)}</div>
                    `;
                    openOrderItemsList.appendChild(feeElement);
                }
                if (window.lucide) lucide.createIcons();
            },

            openOrderTimer(startTime) {
                const now = new Date().getTime();
                const diff = now - startTime;
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                App.DOM.openOrderTimer.textContent = `Aberta por: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            },

            adminProducts() {
                // Gestão de produtos movida integralmente para a aba Produtos
            },

            manualSaleCart() {
                const { manualSaleCartItems, manualSaleSummary, manualSaleTotal } = App.DOM;
                manualSaleCartItems.innerHTML = '';
                if (App.state.manualSaleCart.length === 0) {
                    manualSaleCartItems.innerHTML = '<div class="empty-state-micro">Nenhum item adicionado</div>';
                    manualSaleSummary.style.display = 'none';
                    return;
                }
                let total = 0;
                App.state.manualSaleCart.forEach((item, index) => {
                    const qty = item.quantity || 1;
                    total += item.totalPrice;
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    let details = item.weightGrams ? `<span class="item-weight">${item.weightGrams}g</span>` : '';
                    if (qty > 1 && item.unitPrice) {
                        details += ` <span class="item-unit-price">(${qty}x R$ ${item.unitPrice.toFixed(2)})</span>`;
                    }
                    itemElement.innerHTML = `
                        <div class="item-info">
                            <div class="item-quantity">${qty}</div>
                            <div class="item-details"><div class="item-name">${item.name}</div>${details ? `<div class="item-sub-details">${details}</div>` : ''}</div>
                        </div>
                        <div class="item-price">R$ ${item.totalPrice.toFixed(2)}</div>
                        <button class="btn-remove" data-index="${index}" title="Remover"><i data-lucide="trash-2"></i></button>
                    `;
                    manualSaleCartItems.appendChild(itemElement);
                });
                manualSaleTotal.textContent = `R$ ${total.toFixed(2)}`;
                manualSaleSummary.style.display = 'flex';
                if (window.lucide) lucide.createIcons();
            },

            weightedProductPrice() {
                const price = App.state.ui.currentWeightedProduct === 'acai'
                    ? App.state.config.açaíPricePerKg
                    : App.state.config.sorvetePricePerKg;
                App.DOM.weightedProductPriceDisplay.textContent = price.toFixed(2);
            },

            weightPresets() {
                const presets = Array.isArray(App.state.config.weightPresets) && App.state.config.weightPresets.length > 0
                    ? App.state.config.weightPresets
                    : [150, 250, 300, 400, 500, 700, 1000];

                // 1. Renderizar botões na barra rápida do PDV
                if (App.DOM.weightPresetsContainer) {
                    App.DOM.weightPresetsContainer.innerHTML = '';
                    presets.forEach(weight => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'preset-btn';
                        btn.dataset.weight = weight;
                        btn.textContent = App.utils.formatWeightLabel(weight);
                        btn.addEventListener('click', () => {
                            if (App.DOM.weightInput) {
                                App.DOM.weightInput.value = weight;
                                App.handlers.calculateWeightedPrice({ target: App.DOM.weightInput });
                                App.DOM.weightInput.focus();
                            }
                        });
                        App.DOM.weightPresetsContainer.appendChild(btn);
                    });
                }

                // 2. Renderizar chips no modal de atalhos
                if (App.DOM.modalPresetChipsContainer) {
                    App.DOM.modalPresetChipsContainer.innerHTML = '';
                    presets.forEach(weight => {
                        const chip = document.createElement('span');
                        chip.className = 'preset-chip';
                        chip.innerHTML = `
                            <span>${App.utils.formatWeightLabel(weight)}</span>
                            <button type="button" class="preset-chip-remove" title="Remover este atalho">&times;</button>
                        `;
                        chip.querySelector('.preset-chip-remove').addEventListener('click', (e) => {
                            e.stopPropagation();
                            App.handlers.removeWeightPreset(weight);
                        });
                        App.DOM.modalPresetChipsContainer.appendChild(chip);
                    });
                }

                // 3. Renderizar chips no painel de administração
                if (App.DOM.adminPresetChipsContainer) {
                    App.DOM.adminPresetChipsContainer.innerHTML = '';
                    presets.forEach(weight => {
                        const chip = document.createElement('span');
                        chip.className = 'preset-chip';
                        chip.innerHTML = `
                            <span>${App.utils.formatWeightLabel(weight)}</span>
                            <button type="button" class="preset-chip-remove" title="Remover este atalho">&times;</button>
                        `;
                        chip.querySelector('.preset-chip-remove').addEventListener('click', (e) => {
                            e.stopPropagation();
                            App.handlers.removeWeightPreset(weight);
                        });
                        App.DOM.adminPresetChipsContainer.appendChild(chip);
                    });
                }
            },

            weightedProductSelector() {
                if (!App.DOM.productTypeSelector) return;
                App.DOM.productTypeSelector.querySelectorAll('.quick-add-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.type === App.state.ui.currentWeightedProduct);
                });
            },
        },

        utils: {
            normalizeText(str) {
                if (!str) return '';
                return str
                    .toString()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .trim();
            },
            formatWeightLabel(weightGrams) {
                const num = Number(weightGrams);
                if (isNaN(num)) return `${weightGrams}g`;
                if (num >= 1000) {
                    const inKg = num / 1000;
                    return Number.isInteger(inKg) ? `${inKg}kg` : `${inKg.toFixed(2).replace(/\.?0+$/, '')}kg`;
                }
                return `${num}g`;
            },
            getPaymentMethodName: (m) => ({ cash: 'Dinheiro', card: 'Cartão', pix: 'PIX' }[m] || 'N/A'),
            getPaymentIcon: (m) => {
                if (m === 'cash') return '<i data-lucide="banknote" class="mini-icon"></i>';
                if (m === 'card') return '<i data-lucide="credit-card" class="mini-icon"></i>';
                if (m === 'pix') return '<i data-lucide="qr-code" class="mini-icon"></i>';
                return '<i data-lucide="circle-dollar-sign" class="mini-icon"></i>';
            },

            savePDF(doc, filename) {
                try {
                    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
                    const blob = doc.output('blob');
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.href = blobUrl;
                    link.download = cleanFilename;
                    link.setAttribute('download', cleanFilename);
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        if (link.parentNode) link.parentNode.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                    }, 1500);
                } catch (err) {
                    console.error('Erro no download via Blob URL, usando fallback doc.save:', err);
                    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
                }
            },

            startLiveClock() {
                let lastMinute = -1;
                const updateClock = () => {
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    if (App.DOM.currentTime) App.DOM.currentTime.textContent = `${hours}:${minutes}`;
                    if (App.DOM.currentDate) App.DOM.currentDate.textContent = now.toLocaleDateString('pt-BR');

                    // Sincroniza status da promoção caso o minuto mude
                    if (now.getMinutes() !== lastMinute) {
                        lastMinute = now.getMinutes();
                        App.checkScheduledDiscount();
                        App.render.activeDiscountIndicator();
                        const promoTab = document.getElementById('admin-promocoes-content');
                        if (promoTab && promoTab.classList.contains('active')) {
                            App.render.promoStatusBanner();
                        }
                    }
                };
                updateClock();
                setInterval(updateClock, 1000);
            },

            validatePromoTimeRange() {
                const startInput = App.DOM.discountStartTime;
                const endInput = App.DOM.discountEndTime;
                const hintContainer = App.DOM.promoTimeHint;
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
                                    App.utils.validatePromoTimeRange();
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

                    return { valid: false, pmSuggested, startVal, endVal };
                } else {
                    endInput.classList.remove('invalid-time');
                    const diffMin = endMin - startMin;
                    const diffH = Math.floor(diffMin / 60);
                    const diffM = diffMin % 60;
                    const durStr = diffM > 0 ? `${diffH}h ${diffM}min` : `${diffH}h`;

                    if (hintContainer) {
                        hintContainer.innerHTML = `
                            <div class="promo-time-alert success">
                                <i data-lucide="check-circle-2"></i>
                                <span>Duração da promoção: <strong>${durStr}</strong> (${startVal} até ${endVal}).</span>
                            </div>
                        `;
                        if (window.lucide) lucide.createIcons();
                    }

                    return { valid: true, startVal, endVal };
                }
            },

            showNotification: (message, type = 'info', duration = 2400) => {
                const container = App.DOM.toastContainer;
                if (!container) return;

                const iconMap = {
                    success: 'check-circle-2',
                    error: 'alert-circle',
                    danger: 'alert-circle',
                    warning: 'alert-triangle',
                    info: 'info'
                };

                const iconName = iconMap[type] || 'info';
                const toast = document.createElement('div');
                toast.className = `toast toast-${type === 'error' ? 'danger' : type}`;
                toast.innerHTML = `
                    <i data-lucide="${iconName}" style="flex-shrink:0;"></i>
                    <span style="flex:1;">${message}</span>
                `;

                const dismiss = () => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateY(10px) scale(0.95)';
                    setTimeout(() => toast.remove(), 200);
                };

                toast.addEventListener('click', dismiss);
                container.appendChild(toast);
                if (window.lucide) lucide.createIcons();

                setTimeout(dismiss, duration);
            },

            confirm(message, title = 'Confirmar Ação', onConfirm) {
                const { genericConfirmModal, genericConfirmTitle, genericConfirmMessage, genericConfirmOk, genericConfirmCancel, genericConfirmClose } = App.DOM;

                if (!genericConfirmModal) {
                    if (window.confirm(message)) onConfirm();
                    return;
                }

                genericConfirmTitle.textContent = title;
                genericConfirmMessage.textContent = message;
                genericConfirmModal.style.display = 'flex';

                const close = () => {
                    genericConfirmModal.style.display = 'none';
                    genericConfirmOk.onclick = null;
                    genericConfirmCancel.onclick = null;
                    genericConfirmClose.onclick = null;
                };

                genericConfirmOk.onclick = () => {
                    close();
                    if (typeof onConfirm === 'function') onConfirm();
                };

                genericConfirmCancel.onclick = close;
                genericConfirmClose.onclick = close;
            },

            showReceiptModal: (sale) => {
                const { receiptContent, receiptModal } = App.DOM;
                let text = `        ** Orvix PDV **\n--------------------------------\nData: ${sale.date}\n\n`;

                const fee = (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega') ? sale.deliveryInfo.fee : 0;

                if (sale.deliveryInfo && sale.deliveryInfo.mode === 'entrega') {
                    text += `         *** ENTREGA ***\n`;
                    if (sale.deliveryInfo.name) text += `Cliente: ${sale.deliveryInfo.name}\n`;
                    if (sale.deliveryInfo.address) text += `Endereço: ${sale.deliveryInfo.address}\n`;
                    text += `--------------------------------\n`;
                }

                text += `Itens:\n`;
                sale.items.forEach(item => {
                    const qty = item.quantity || 1;
                    const qtyPrefix = qty > 1 ? `${qty}x ` : '';
                    const itemName = `${qtyPrefix}${item.name}`;
                    let priceLine = `R$ ${item.totalPrice.toFixed(2).padStart(7)}`;
                    if (item.originalPrice) {
                        text += `${itemName.padEnd(20)} (De R$ ${item.originalPrice.toFixed(2)})\n`;
                        text += `  ${`Com desconto:`.padEnd(18)}${priceLine}\n`;
                    } else {
                        text += `${itemName.padEnd(20)}${priceLine}\n`;
                    }

                    if (item.type === 'weight') text += `  (${item.weightGrams}g)\n`;
                    if (qty > 1 && item.unitPrice) text += `  (Qtd: ${qty} x R$ ${item.unitPrice.toFixed(2)})\n`;
                });

                if (fee > 0) {
                    text += `Taxa Entrega:`.padEnd(20) + `R$ ${fee.toFixed(2).padStart(7)}\n`;
                }

                text += `--------------------------------\nTOTAL:`.padEnd(22) + `R$ ${sale.total.toFixed(2).padStart(7)}\n`;
                text += `Pagamento: ${App.utils.getPaymentMethodName(sale.paymentMethod)}\n`;
                if (sale.paymentMethod === 'cash') text += `Recebido: R$ ${sale.cashReceived.toFixed(2)}\nTroco: R$ ${sale.change.toFixed(2)}\n`;
                text += `\n     Obrigado pela preferência!`;
                text += `\n            Volte Sempre!`;

                receiptContent.textContent = text;
                receiptModal.style.display = 'flex';
            },
        },

        monthPicker: {
            state: {
                selectedYear: new Date().getFullYear(),
                selectedMonth: new Date().getMonth() + 1,
                displayedYear: new Date().getFullYear(),
                isOpen: false
            },
            monthNames: [
                { abbr: 'Jan', full: 'Janeiro', sub: 'Mês 01' },
                { abbr: 'Fev', full: 'Fevereiro', sub: 'Mês 02' },
                { abbr: 'Mar', full: 'Março', sub: 'Mês 03' },
                { abbr: 'Abr', full: 'Abril', sub: 'Mês 04' },
                { abbr: 'Mai', full: 'Maio', sub: 'Mês 05' },
                { abbr: 'Jun', full: 'Junho', sub: 'Mês 06' },
                { abbr: 'Jul', full: 'Julho', sub: 'Mês 07' },
                { abbr: 'Ago', full: 'Agosto', sub: 'Mês 08' },
                { abbr: 'Set', full: 'Setembro', sub: 'Mês 09' },
                { abbr: 'Out', full: 'Outubro', sub: 'Mês 10' },
                { abbr: 'Nov', full: 'Novembro', sub: 'Mês 11' },
                { abbr: 'Dez', full: 'Dezembro', sub: 'Mês 12' }
            ],
            init() {
                const now = new Date();
                this.state.selectedYear = now.getFullYear();
                this.state.selectedMonth = now.getMonth() + 1;
                this.state.displayedYear = now.getFullYear();
                
                this.cacheDOM();
                this.bindEvents();
                this.updateValue(this.state.selectedYear, this.state.selectedMonth);
            },
            cacheDOM() {
                this.wrapper = document.getElementById('custom-month-picker-wrapper');
                this.trigger = document.getElementById('custom-month-trigger');
                this.text = document.getElementById('month-trigger-text');
                this.hiddenInput = document.getElementById('report-month-select');
                this.popover = document.getElementById('custom-month-popover');
                this.prevYearBtn = document.getElementById('picker-prev-year');
                this.nextYearBtn = document.getElementById('picker-next-year');
                this.yearDisplay = document.getElementById('picker-current-year');
                this.grid = document.getElementById('month-picker-grid');
                this.btnPrevMonth = document.getElementById('picker-btn-prev-month');
                this.btnCurrentMonth = document.getElementById('picker-btn-current-month');
            },
            bindEvents() {
                if (!this.trigger) return;
                
                this.trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggle();
                });

                if (this.prevYearBtn) {
                    this.prevYearBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.changeYear(-1);
                    });
                }

                if (this.nextYearBtn) {
                    this.nextYearBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.changeYear(1);
                    });
                }

                if (this.btnPrevMonth) {
                    this.btnPrevMonth.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const now = new Date();
                        let prevM = now.getMonth(); // 0-indexed: 0 means Dec of previous year
                        let prevY = now.getFullYear();
                        if (prevM === 0) {
                            prevM = 12;
                            prevY -= 1;
                        }
                        this.selectMonth(prevY, prevM);
                    });
                }

                if (this.btnCurrentMonth) {
                    this.btnCurrentMonth.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const now = new Date();
                        this.selectMonth(now.getFullYear(), now.getMonth() + 1);
                    });
                }

                document.addEventListener('click', (e) => {
                    if (this.state.isOpen && this.wrapper && !this.wrapper.contains(e.target)) {
                        this.close();
                    }
                });
            },
            toggle() {
                if (this.state.isOpen) this.close();
                else this.open();
            },
            open() {
                this.state.isOpen = true;
                this.state.displayedYear = this.state.selectedYear;
                if (this.trigger) {
                    this.trigger.classList.add('open');
                    this.trigger.setAttribute('aria-expanded', 'true');
                }
                if (this.popover) {
                    this.popover.classList.add('open');
                }
                this.renderGrid();
                if (window.lucide) lucide.createIcons();
            },
            close() {
                this.state.isOpen = false;
                if (this.trigger) {
                    this.trigger.classList.remove('open');
                    this.trigger.setAttribute('aria-expanded', 'false');
                }
                if (this.popover) {
                    this.popover.classList.remove('open');
                }
            },
            changeYear(delta) {
                this.state.displayedYear += delta;
                this.renderGrid();
            },
            selectMonth(year, month) {
                this.state.selectedYear = year;
                this.state.selectedMonth = month;
                this.state.displayedYear = year;
                this.updateValue(year, month);
                this.close();
            },
            updateValue(year, month) {
                const monthStr = String(month).padStart(2, '0');
                const formattedMonthYear = `${year}-${monthStr}`;
                if (this.hiddenInput) {
                    this.hiddenInput.value = formattedMonthYear;
                }
                if (this.text && this.monthNames[month - 1]) {
                    const monthName = this.monthNames[month - 1].full;
                    this.text.textContent = `${monthName} de ${year}`;
                }
            },
            renderGrid() {
                if (!this.grid || !this.yearDisplay) return;
                this.yearDisplay.textContent = this.state.displayedYear;
                this.grid.innerHTML = '';

                const now = new Date();
                const curY = now.getFullYear();
                const curM = now.getMonth() + 1;

                this.monthNames.forEach((item, index) => {
                    const m = index + 1;
                    const isSelected = (this.state.selectedYear === this.state.displayedYear && this.state.selectedMonth === m);
                    const isCurrent = (curY === this.state.displayedYear && curM === m);

                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = `month-picker-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'is-current-month' : ''}`;
                    cell.dataset.month = m;
                    cell.title = `${item.full} de ${this.state.displayedYear}`;
                    cell.innerHTML = `
                        <span class="month-abbr">${item.abbr}</span>
                        <span class="month-sub">${item.sub}</span>
                    `;

                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectMonth(this.state.displayedYear, m);
                    });

                    this.grid.appendChild(cell);
                });
            }
        },

        datePickers: {
            instances: {},
            monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            
            init() {
                this.create('history', {
                    wrapperId: 'history-date-picker-wrapper',
                    triggerId: 'history-date-trigger',
                    textId: 'history-date-text',
                    inputId: 'history-date',
                    popoverId: 'history-date-popover',
                    gridId: 'history-date-grid',
                    onSelect: (dateStr) => {
                        App.render.history(dateStr);
                    }
                });

                this.create('expense', {
                    wrapperId: 'expense-date-picker-wrapper',
                    triggerId: 'expense-date-trigger',
                    textId: 'expense-date-text',
                    inputId: 'expense-date',
                    popoverId: 'expense-date-popover',
                    gridId: 'expense-date-grid',
                    onSelect: (dateStr) => {
                        App.render.expenses(dateStr);
                    }
                });
            },

            create(key, cfg) {
                const wrapper = document.getElementById(cfg.wrapperId);
                const trigger = document.getElementById(cfg.triggerId);
                const text = document.getElementById(cfg.textId);
                const input = document.getElementById(cfg.inputId);
                const popover = document.getElementById(cfg.popoverId);
                const grid = document.getElementById(cfg.gridId);

                if (!wrapper || !trigger || !popover || !input) return;

                const initialDateVal = input.value || App.state.ui.today || new Date().toISOString().split('T')[0];
                const parts = initialDateVal.split('-').map(Number);
                const initY = parts[0] || new Date().getFullYear();
                const initM = parts[1] || (new Date().getMonth() + 1);
                const initD = parts[2] || new Date().getDate();

                const inst = {
                    selectedYear: initY,
                    selectedMonth: initM,
                    selectedDay: initD,
                    displayedYear: initY,
                    displayedMonth: initM,
                    isOpen: false,
                    wrapper, trigger, text, input, popover, grid, cfg
                };

                this.instances[key] = inst;

                // Formata display inicial
                this.updateValue(key, inst.selectedYear, inst.selectedMonth, inst.selectedDay, false);

                // Click no trigger abre o popover imediatamente
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggle(key);
                });

                // Botões de navegação no header do popover
                const prevBtn = popover.querySelector('.picker-prev-month');
                const nextBtn = popover.querySelector('.picker-next-month');

                if (prevBtn) {
                    prevBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.changeMonth(key, -1);
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.changeMonth(key, 1);
                    });
                }

                // Botão Ontem
                const btnYesterday = popover.querySelector('.picker-btn-yesterday');
                if (btnYesterday) {
                    btnYesterday.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const yesterday = new Date(Date.now() - 86400000);
                        this.selectDate(key, yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate());
                    });
                }

                // Botão Hoje
                const btnToday = popover.querySelector('.picker-btn-today');
                if (btnToday) {
                    btnToday.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const today = new Date();
                        this.selectDate(key, today.getFullYear(), today.getMonth() + 1, today.getDate());
                    });
                }

                // Fechar ao clicar fora
                document.addEventListener('click', (e) => {
                    if (inst.isOpen && !wrapper.contains(e.target)) {
                        this.close(key);
                    }
                });
            },

            toggle(key) {
                const inst = this.instances[key];
                if (!inst) return;
                if (inst.isOpen) this.close(key);
                else this.open(key);
            },

            open(key) {
                const inst = this.instances[key];
                if (!inst) return;

                // Fecha outros pickers abertos
                Object.keys(this.instances).forEach(k => {
                    if (k !== key && this.instances[k].isOpen) this.close(k);
                });
                if (App.monthPicker && App.monthPicker.state.isOpen) {
                    App.monthPicker.close();
                }

                inst.isOpen = true;
                inst.displayedYear = inst.selectedYear;
                inst.displayedMonth = inst.selectedMonth;
                inst.trigger.classList.add('open');
                inst.trigger.setAttribute('aria-expanded', 'true');
                inst.popover.classList.add('open');
                this.renderGrid(key);
                if (window.lucide) lucide.createIcons();
            },

            close(key) {
                const inst = this.instances[key];
                if (!inst) return;
                inst.isOpen = false;
                inst.trigger.classList.remove('open');
                inst.trigger.setAttribute('aria-expanded', 'false');
                inst.popover.classList.remove('open');
            },

            changeMonth(key, delta) {
                const inst = this.instances[key];
                if (!inst) return;
                inst.displayedMonth += delta;
                if (inst.displayedMonth > 12) {
                    inst.displayedMonth = 1;
                    inst.displayedYear += 1;
                } else if (inst.displayedMonth < 1) {
                    inst.displayedMonth = 12;
                    inst.displayedYear -= 1;
                }
                this.renderGrid(key);
                if (window.lucide) lucide.createIcons();
            },

            selectDate(key, year, month, day) {
                const inst = this.instances[key];
                if (!inst) return;
                inst.selectedYear = year;
                inst.selectedMonth = month;
                inst.selectedDay = day;
                inst.displayedYear = year;
                inst.displayedMonth = month;
                this.updateValue(key, year, month, day, true);
                this.close(key);
            },

            updateValue(key, year, month, day, triggerCallback = true) {
                const inst = this.instances[key];
                if (!inst) return;
                const mStr = String(month).padStart(2, '0');
                const dStr = String(day).padStart(2, '0');
                const dateKey = `${year}-${mStr}-${dStr}`;
                const formattedDisplay = `${dStr}/${mStr}/${year}`;

                if (inst.input) {
                    inst.input.value = dateKey;
                }
                if (inst.text) {
                    inst.text.textContent = formattedDisplay;
                }

                if (triggerCallback && typeof inst.cfg.onSelect === 'function') {
                    inst.cfg.onSelect(dateKey);
                }
            },

            renderGrid(key) {
                const inst = this.instances[key];
                if (!inst || !inst.grid) return;

                const popover = inst.popover;
                const monthNameEl = popover.querySelector('.picker-month-name');
                const yearNameEl = popover.querySelector('.picker-year-name');

                if (monthNameEl) monthNameEl.textContent = this.monthNames[inst.displayedMonth - 1];
                if (yearNameEl) yearNameEl.textContent = inst.displayedYear;

                inst.grid.innerHTML = '';

                const year = inst.displayedYear;
                const month = inst.displayedMonth; // 1-12

                // Dias no mês atual
                const daysInMonth = new Date(year, month, 0).getDate();
                // Dia da semana do 1º dia (0: Dom, 1: Seg...)
                const firstDayIndex = new Date(year, month - 1, 1).getDay();

                // Dias do mês anterior para preencher a primeira semana
                const prevMonthDays = new Date(year, month - 1, 0).getDate();

                // Hoje
                const now = new Date();
                const curY = now.getFullYear();
                const curM = now.getMonth() + 1;
                const curD = now.getDate();

                // 1. Células do mês anterior
                for (let i = firstDayIndex - 1; i >= 0; i--) {
                    const d = prevMonthDays - i;
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'date-picker-day-cell other-month';
                    cell.textContent = d;
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let pM = month - 1;
                        let pY = year;
                        if (pM < 1) { pM = 12; pY -= 1; }
                        this.selectDate(key, pY, pM, d);
                    });
                    inst.grid.appendChild(cell);
                }

                // 2. Células do mês atual
                for (let d = 1; d <= daysInMonth; d++) {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    const isSelected = (inst.selectedYear === year && inst.selectedMonth === month && inst.selectedDay === d);
                    const isToday = (curY === year && curM === month && curD === d);

                    cell.className = `date-picker-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`;
                    cell.textContent = d;
                    cell.title = `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectDate(key, year, month, d);
                    });
                    inst.grid.appendChild(cell);
                }

                // 3. Células do próximo mês para completar 35 ou 42 células
                const totalCells = firstDayIndex + daysInMonth;
                const remainingCells = totalCells <= 35 ? (35 - totalCells) : (42 - totalCells);

                for (let d = 1; d <= remainingCells; d++) {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'date-picker-day-cell other-month';
                    cell.textContent = d;
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let nM = month + 1;
                        let nY = year;
                        if (nM > 12) { nM = 1; nY += 1; }
                        this.selectDate(key, nY, nM, d);
                    });
                    inst.grid.appendChild(cell);
                }
            }
        },

        storage: {
            load() {
                const salesHistory = localStorage.getItem('salesHistory');
                const expenses = localStorage.getItem('expenses');
                const products = localStorage.getItem('products');
                const acaiPrice = localStorage.getItem('açaíPricePerKg');
                const sorvetePrice = localStorage.getItem('sorvetePricePerKg');
                const deletePassword = localStorage.getItem('deletePassword');
                const openOrders = localStorage.getItem('openOrders');
                const cashRegister = localStorage.getItem('cashRegister');
                const discountConfig = localStorage.getItem('discountConfig');
                const weightPresets = localStorage.getItem('weightPresets');

                if (salesHistory) App.state.salesHistory = JSON.parse(salesHistory);
                if (expenses) App.state.expenses = JSON.parse(expenses);
                if (products) App.state.products = JSON.parse(products);
                if (acaiPrice) App.state.config.açaíPricePerKg = parseFloat(acaiPrice);
                if (sorvetePrice) App.state.config.sorvetePricePerKg = parseFloat(sorvetePrice);
                if (deletePassword) App.state.config.deletePassword = deletePassword;
                if (openOrders) App.state.openOrders = JSON.parse(openOrders);
                if (cashRegister) App.state.cashRegister = JSON.parse(cashRegister);
                if (weightPresets) {
                    try {
                        const parsed = JSON.parse(weightPresets);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            App.state.config.weightPresets = parsed.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
                        }
                    } catch (e) {
                        console.error('Erro ao carregar atalhos de peso:', e);
                    }
                }
                if (discountConfig) {
                    try {
                        const parsed = JSON.parse(discountConfig);
                        App.state.discount = {
                            enabled: parsed.enabled !== undefined ? parsed.enabled : (parsed.active !== undefined ? parsed.active : true),
                            percentage: parsed.percentage !== undefined ? parseFloat(parsed.percentage) : 10,
                            targets: {
                                acai: parsed.targets?.acai !== undefined ? parsed.targets.acai : true,
                                sorvete: parsed.targets?.sorvete !== undefined ? parsed.targets.sorvete : true
                            },
                            days: Array.isArray(parsed.days) ? parsed.days.map(Number) : [4],
                            allDay: parsed.allDay !== undefined ? Boolean(parsed.allDay) : true,
                            startTime: parsed.startTime || '10:00',
                            endTime: parsed.endTime || '21:00',
                            active: false
                        };
                    } catch (e) {
                        console.error('Erro ao carregar configurações de desconto:', e);
                    }
                }
            },
            saveSalesHistory() {
                localStorage.setItem('salesHistory', JSON.stringify(App.state.salesHistory));
            },
            saveExpenses() {
                localStorage.setItem('expenses', JSON.stringify(App.state.expenses));
            },
            saveConfig() {
                localStorage.setItem('açaíPricePerKg', App.state.config.açaíPricePerKg);
                localStorage.setItem('sorvetePricePerKg', App.state.config.sorvetePricePerKg);
                localStorage.setItem('deletePassword', App.state.config.deletePassword);
                this.saveWeightPresets();
            },
            saveWeightPresets() {
                localStorage.setItem('weightPresets', JSON.stringify(App.state.config.weightPresets || [150, 250, 300, 400, 500, 700, 1000]));
            },
            saveProducts() {
                localStorage.setItem('products', JSON.stringify(App.state.products));
            },
            saveOpenOrders() {
                localStorage.setItem('openOrders', JSON.stringify(App.state.openOrders));
            },
            saveCashRegister() {
                localStorage.setItem('cashRegister', JSON.stringify(App.state.cashRegister));
            },
            saveDiscount() {
                const toSave = {
                    enabled: App.state.discount.enabled,
                    percentage: App.state.discount.percentage,
                    targets: App.state.discount.targets,
                    days: App.state.discount.days,
                    allDay: App.state.discount.allDay !== false,
                    startTime: App.state.discount.startTime || '10:00',
                    endTime: App.state.discount.endTime || '21:00'
                };
                localStorage.setItem('discountConfig', JSON.stringify(toSave));
            }
        }
    };

    App.init();
});