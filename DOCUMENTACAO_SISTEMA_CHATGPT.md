# 📋 CONTEXTO DO PROJETO: ORVIX PDV & GESTÃO SAAS

> **Documento para Alimentação de IA / ChatGPT**  
> Este documento descreve de forma completa e estruturada toda a arquitetura, regras de negócio, tecnologias, modelagem de dados e interfaces do sistema **Orvix PDV**.

---

## 1. Visão Geral do Sistema

O **Orvix PDV** é um sistema comercial moderno e completo de **Ponto de Venda (PDV), Controle de Caixa e Gestão Comercial**, desenhado especificamente para estabelecimentos como **Açaís, Sorveterias, Lanchonetes e Comércio em Geral**.

O sistema opera no modelo **SaaS Multi-Tenant** (Software como Serviço para múltiplas empresas/lojas), com separação de ambientes entre a **operação diária das lojas** e o **painel de controle do proprietário da plataforma (Master Admin)**.

### Pilares Fundamentais:
1. **Ponto de Venda Híbrido**: Venda por **peso (KG na balança/tara)** + produtos unitários (bebidas, adicionais, potes, etc.).
2. **Multi-Tenancy por Chave de Licença**: Cada estabelecimento/filial possui sua própria chave (`ORVIX-XXXX-0000`) e dados isolados.
3. **Resiliência Offline-First**: Funciona integrado ao **Firebase (Auth + Firestore)** em nuvem, mas possui **modo de contingência 100% funcional em LocalStorage** se estiver sem internet ou sem credenciais.
4. **Painel Master Separado e Mobile-First**: O gestor do software acessa um link exclusivo (`/admin.html`), protegido por PIN Master ou Google Auth, para criar chaves, bloquear lojas inadimplentes e enviar dados via WhatsApp diretamente pelo smartphone.

---

## 2. Stack Tecnológica & Arquitetura

- **Frontend Core**: JavaScript Moderno (ES6+ Modules), HTML5 Semântico.
- **Estilização**: CSS Vanilla com arquitetura modular baseada em Atomic Tokens (`tokens.css`), Moléculas (`molecules.css`), Login (`login.css`), Tema Principal (`main.css`) e Painel Master (`admin.css`).
  - *Estética visual:* Dark Glassmorphism, tons de roxo neon (`#7c3aed`), tipografia moderna (*Plus Jakarta Sans*, *Inter*, *JetBrains Mono*).
- **Bundler & Dev Server**: **Vite 6** configurado para Multi-Page Application (MPA):
  - `main`: `index.html` (Aplicação do PDV para lojistas e operadores).
  - `admin`: `admin.html` (Portal Master para o dono da plataforma gerenciar licenças).
- **Backend / Database**:
  - **Firebase Authentication**: Login por e-mail/senha e Google OAuth.
  - **Cloud Firestore**: Coleções em tempo real com persistência local.
  - **StorageService**: Armazenamento em `localStorage` para fallback instantâneo e modo offline/demo.
- **Bibliotecas Auxiliares**:
  - `Lucide Icons`: Biblioteca de ícones vetoriais leves.
  - `HTML2Canvas` & `JSPDF`: Renderização e impressão térmica de comprovantes fiscais/não fiscais em PDF.

---

## 3. Estrutura de Pastas do Projeto

```text
Orvix_PDV - designer 2/
├── index.html                 # Aplicação do PDV (Vendas, Caixa, Despesas, Admin Loja)
├── admin.html                 # Painel Master Mobile-First (Emissão e Controle de Chaves)
├── vite.config.js             # Configuração do Vite (build multi-entry)
├── package.json               # Dependências e scripts (dev, build, preview)
├── .env.example               # Exemplo de variáveis de ambiente
├── .env                       # Variáveis ativas (Firebase, Chave Mestra, etc.)
│
├── src/
│   ├── config/
│   │   ├── env.js             # Sanitizador de variáveis e validador Master Admin
│   │   └── firebase.js        # Inicialização do Firebase (Auth + Firestore)
│   │
│   ├── services/              # Camada de Serviços e Regras de Negócio (Singletons)
│   │   ├── auth.service.js        # Autenticação, perfis e papéis (Admin vs Operador)
│   │   ├── license.service.js     # Licenças, multi-tenancy, chaves e sincronia realtime
│   │   ├── pos.service.js         # Carrinho de vendas, balança/peso e pagamentos
│   │   ├── products.service.js    # Catálogo de produtos, preços por KG e promoções
│   │   ├── cash.service.js        # Abertura, fechamento e balanço do caixa
│   │   ├── expenses.service.js    # Lançamento e histórico de despesas diárias
│   │   ├── orders.service.js      # Histórico de pedidos e comandas
│   │   ├── pdf.service.js         # Emissão de comprovantes térmicos
│   │   └── storage.service.js     # Wrapper com tratamento seguro para localStorage
│   │
│   ├── components/organisms/  # Componentes de interface modulares
│   │   ├── LoginForm.js               # Modal de Login / Registro
│   │   └── PendingApprovalModal.js    # Modal de ativação por chave ou bloqueio de licença
│   │
│   ├── admin/                 # Módulo do Painel Master
│   │   ├── admin.js           # Controlador do painel master (filtros, WhatsApp, CRUD)
│   │   └── admin.css          # Estilos mobile-first com botões táteis
│   │
│   ├── styles/                # CSS Modular da Aplicação Principal
│   │   ├── tokens.css         # Variáveis de cores, espaçamentos, sombras
│   │   ├── molecules.css      # Botões, inputs, cards e componentes atômicos
│   │   ├── main.css           # Estilos das abas do PDV, balança, catálogo
│   │   └── login.css          # Estilos dos modais de autenticação
│   │
│   └── main.js                # Orquestrador da aplicação principal (PDV)
```

---

## 4. Modelagem de Dados & Coleções (Firestore / Local)

### 4.1. Coleção `licenses` (Chaves de Ativação)
Cada documento tem como ID o código da chave (ex: `ORVIX-SERRA-8492`):
```json
{
  "key": "ORVIX-SERRA-8492",
  "tenantId": "tenant-acai-filial-centro",
  "tenantName": "Açaí da Serra - Filial Centro",
  "ownerEmail": "carlos@acaiserra.com",
  "ownerName": "Carlos Silva",
  "ownerPhone": "11987654321",
  "plan": "Mensal Pro",
  "status": "ativo",              // "ativo" | "bloqueado" | "expirado"
  "createdAt": "2026-09-02T10:00:00.000Z",
  "activatedAt": "2026-09-02T14:30:00.000Z",
  "expiresAt": "2026-10-02T23:59:59.000Z",
  "defaultInviteCode": "SERRA-8492",
  "maxDevices": 3,
  "notes": "Cliente pagou via Pix"
}
```

### 4.2. Coleção `tenants` (Estabelecimentos / Lojas)
Identifica a empresa cliente vinculada à chave:
```json
{
  "id": "tenant-acai-filial-centro",
  "nome": "Açaí da Serra - Filial Centro",
  "plan": "Mensal Pro",
  "statusLicenca": "ativo",
  "chaveLicenca": "ORVIX-SERRA-8492",
  "codigoConvite": "SERRA-8492",
  "dataExpiracao": "2026-10-02T23:59:59.000Z",
  "donoEmail": "carlos@acaiserra.com",
  "ownerUid": "user_uid_firebase"
}
```

### 4.3. Coleção `users` (Perfis de Usuários)
```json
{
  "uid": "firebase_auth_uid",
  "email": "operador@loja.com",
  "displayName": "Mariana Caixa",
  "role": "Operador PDV",         // "Administrador" ou "Operador PDV"
  "status": "ativo",              // "ativo" | "pendente" | "bloqueado"
  "tenantId": "tenant-acai-filial-centro",
  "tenantName": "Açaí da Serra - Filial Centro"
}
```

---

## 5. Módulos e Regras de Negócio Detalhadas

### 5.1. Ponto de Venda (PDV)
- **Balança & Cálculo de Peso**:
  - O operador clica no tipo (Açaí ou Sorvete), digita o peso bruto em gramas (ou usa botões de preset: 300g, 400g, 500g, 700g).
  - Cálculo de tara de recipientes (copos, potes) descontado automaticamente.
  - Preço por KG configurável no menu Administrativo com suporte a centavos.
- **Catálogo de Produtos Fixos**:
  - Cards visuais organizados por categorias (Bebidas, Adicionais, Potes).
  - Seletor de quantidade no próprio card `[- 1 +]`.
  - Ao clicar em **"Vender"**, adiciona ao carrinho e atualiza o badge `🛒 X no carrinho` no próprio card.
- **Carrinho de Compras**:
  - Lista detalhada de itens com remoção ou alteração rápida.
  - Aplicação automática de **Promoções / Descontos** configurados por dia da semana e horário.
  - Finalização com múltiplas formas de pagamento: **Dinheiro** (com cálculo automático de troco), **Cartão de Crédito**, **Cartão de Débito** e **Pix**.
  - Impressão térmica automática ou manual de comprovante.

### 5.2. Gestão de Caixa (Cash Service)
- **Abertura do Caixa**:
  - Exige informar saldo inicial em cédulas e moedas (fundo de troco).
- **Operação Contínua**:
  - Registra automaticamente cada venda nas categorias: Dinheiro, Cartão e Pix.
  - Suporta sangrias (retiradas) e suprimentos (entradas avulsas).
- **Fechamento do Caixa**:
  - Exibe resumo consolidado: Total de Vendas, Saldo em Caixa, Quebra/Sobra de Caixa e Relatório final para conferência do administrador.

### 5.3. Controle de Despesas (Expenses Service)
- Lançamento rápido de despesas diárias (Insumos, Fornecedores, Limpeza, Salários).
- Calendário interativo para navegar no histórico e somar o total de despesas de qualquer dia do ano.

### 5.4. Gestão Multi-Estabelecimentos e Equipe
- **O Cenário Multi-Lojas**:
  - Um mesmo cliente (`carlos@acaiserra.com`) pode ter 2 ou mais lojas (Loja Matriz, Loja Shopping).
  - Cada loja tem sua chave de ativação própria.
  - Os dados de vendas, despesas e estoque não se misturam.
- **Código de Convite de Equipe**:
  - Cada loja tem um código simples (ex: `SERRA-8492`).
  - Funcionários novos da loja usam esse código para se vincular instantaneamente como **Operadores de Caixa** sem precisar da chave mestre do dono.

---

## 6. Painel Master / Gestor SaaS (`/admin.html`)

O Portal Master foi desenvolvido com abordagem **Mobile-First** (ótima usabilidade no celular):

1. **Acesso & Segurança**:
   - **PIN Rápido**: Acesso instantâneo com senha mestra de 6 dígitos (`101520` por padrão).
   - **Google / E-mail**: Validação de e-mails cadastrados em `VITE_MASTER_ADMIN_EMAILS`.
2. **Dashboard com Métricas Rápidas**:
   - Total de Licenças Ativas, Lojas Cadastradas, Clientes Únicos e Licenças Bloqueadas/Vencidas.
3. **Gerador de Novas Chaves**:
   - Formulário rápido onde se informa nome da loja, e-mail do cliente, telefone, plano (Mensal, Trimestral, Anual, etc.) e limite de aparelhos.
   - Gera chaves com códigos amigáveis (ex: `ORVIX-SERRA-4921`).
4. **Controle Remoto com 1 Toque**:
   - **Botão WhatsApp**: Dispara a mensagem formatada para o cliente com um clique.
   - **Switch Liga/Desliga (Ativar / Bloquear)**: Bloqueia imediatamente o PDV do cliente caso esteja em atraso.
   - **Botão +30 Dias**: Renova a assinatura do cliente adicionando 30 dias à data de expiração.
5. **Bloqueio Remoto em Tempo Real**:
   - O PDV escuta a sua própria chave no Firestore. Se você mudar o status para `bloqueado` no celular, o PDV na loja física trava na hora e exibe a mensagem de suspensão.

---

## 7. Como Rodar o Projeto Localmente

### Pré-requisitos:
- **Node.js** v18+ instalado.

### Comandos:
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento local
npm run dev
```
O Vite iniciará em `http://localhost:3000/`.

- **PDV da Loja:** `http://localhost:3000/`
- **Painel Master de Licenças:** `http://localhost:3000/admin.html`

### Scripts Disponíveis:
- `npm run dev`: Inicia o servidor de desenvolvimento com Hot Module Replacement (HMR).
- `npm run build`: Compila a aplicação para produção na pasta `dist/` (com suporte a `index.html` e `admin.html`).
- `npm run preview`: Visualiza o build de produção localmente.

---

## 8. Variáveis de Ambiente (`.env`)

```env
# Configurações do Firebase
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234

# Permitir modo offline/demo quando sem credenciais
VITE_ALLOW_OFFLINE_DEMO=true

# Painel Master / SuperAdmin
VITE_MASTER_ADMIN_EMAILS="admin@orvix.com,seuemail@gmail.com"
VITE_MASTER_ADMIN_PIN=101520
```

---

## 9. Instruções Específicas para o ChatGPT

Ao solicitar modificações ou novas funcionalidades para o ChatGPT com base neste projeto:
1. **Lembre a IA** de que o projeto utiliza **JavaScript puro (Vanilla ES Modules)** sem React/Vue, manipulando o DOM de forma reativa e modular.
2. **Estilização**: Manter a consistência com `main.css`, `admin.css` e tokens de cores (`tokens.css`) preservando o tema Dark Glassmorphism.
3. **Resiliência Offline**: Sempre manter a lógica dupla nos serviços (primeiro tenta no Firestore; se falhar ou estiver offline, salva e busca no `StorageService` / `localStorage`).
4. **Multi-Tenancy**: Qualquer novo dado gerado (pedidos, despesas, produtos) deve respeitar o `tenantId` do estabelecimento logado.
