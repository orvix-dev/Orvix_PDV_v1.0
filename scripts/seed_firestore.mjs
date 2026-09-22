import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAuqx-U9kibzqNNUTjyeoCzJ7ZOhhbAPgo",
  authDomain: "orvix-pdv.firebaseapp.com",
  projectId: "orvix-pdv",
  storageBucket: "orvix-pdv.firebasestorage.app",
  messagingSenderId: "141216914335",
  appId: "1:141216914335:web:6105a4f6443431d9c3fbaa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, 'orvix-pdv-web');

async function seed() {
  console.log('Autenticando no Firebase...');
  await signInWithEmailAndPassword(auth, 'lucas.teste.pdv@teste.com', 'password123');
  console.log('Autenticado com sucesso!');

  console.log('Criando coleção licenses...');
  const licenses = {
    'ORVIX-MASTER-2026': {
      key: 'ORVIX-MASTER-2026',
      tenantId: 'acai-da-serra-matriz',
      tenantName: 'Açaí da Serra - Matriz',
      ownerEmail: 'orvixsolucoes@gmail.com',
      ownerName: 'Administrador Master',
      ownerPhone: '11999990000',
      plan: 'Enterprise Multi-Lojas',
      status: 'disponivel',
      createdAt: new Date().toISOString(),
      expiresAt: '2027-12-31T23:59:59.000Z',
      defaultInviteCode: 'SERRA-2026',
      maxDevices: 10,
      notes: 'Licença Matriz principal do sistema'
    },
    'ORVIX-SERRA-2026': {
      key: 'ORVIX-SERRA-2026',
      tenantId: 'acai-da-serra-filial',
      tenantName: 'Açaí da Serra - Filial Centro',
      ownerEmail: 'krlosaugus1@gmail.com',
      ownerName: 'Carlos Silva',
      ownerPhone: '11987654321',
      plan: 'Pro Multi-User',
      status: 'disponivel',
      createdAt: new Date().toISOString(),
      expiresAt: '2027-12-31T23:59:59.000Z',
      defaultInviteCode: 'SERRA-8492',
      maxDevices: 5,
      notes: 'Filial Centro comercial'
    },
    'DEMO-TESTE-PDV': {
      key: 'DEMO-TESTE-PDV',
      tenantId: 'demo-estabelecimento',
      tenantName: 'Estabelecimento Demonstração',
      ownerEmail: 'demo@orvixpdv.com',
      ownerName: 'Lojista Demonstração',
      ownerPhone: '11999998888',
      plan: 'Trial 30 Dias',
      status: 'disponivel',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      defaultInviteCode: 'DEMO-1234',
      maxDevices: 2,
      notes: 'Chave para testes de homologação'
    }
  };

  for (const [key, data] of Object.entries(licenses)) {
    await setDoc(doc(db, 'licenses', key), {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log(`  ✓ Licença criada: ${key}`);
  }

  console.log('Criando coleção tenants...');
  const tenants = {
    'acai-da-serra-matriz': {
      id: 'acai-da-serra-matriz',
      nome: 'Açaí da Serra - Matriz',
      plan: 'Enterprise',
      statusLicenca: 'ativo',
      chaveLicenca: 'ORVIX-MASTER-2026',
      codigoConvite: 'SERRA-2026',
      dataExpiracao: '2027-12-31T23:59:59.000Z',
      donoEmail: 'orvixsolucoes@gmail.com',
      ownerEmail: 'orvixsolucoes@gmail.com',
      onboardingCompleted: true,
      kgPricesConfigured: true,
      productsConfigured: true,
      config: {
        acaiPricePerKg: 49.90,
        sorvetePricePerKg: 49.90,
        deletePassword: '1015'
      }
    },
    'acai-da-serra-filial': {
      id: 'acai-da-serra-filial',
      nome: 'Açaí da Serra - Filial Centro',
      plan: 'Pro Multi-User',
      statusLicenca: 'ativo',
      chaveLicenca: 'ORVIX-SERRA-2026',
      codigoConvite: 'SERRA-8492',
      dataExpiracao: '2027-12-31T23:59:59.000Z',
      donoEmail: 'krlosaugus1@gmail.com',
      ownerEmail: 'krlosaugus1@gmail.com',
      onboardingCompleted: true,
      kgPricesConfigured: true,
      productsConfigured: true,
      config: {
        acaiPricePerKg: 49.90,
        sorvetePricePerKg: 49.90,
        deletePassword: '1015'
      }
    },
    'demo-estabelecimento': {
      id: 'demo-estabelecimento',
      nome: 'Estabelecimento Demonstração',
      plan: 'Trial 30 Dias',
      statusLicenca: 'ativo',
      chaveLicenca: 'DEMO-TESTE-PDV',
      codigoConvite: 'DEMO-1234',
      dataExpiracao: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      donoEmail: 'demo@orvixpdv.com',
      ownerEmail: 'demo@orvixpdv.com',
      onboardingCompleted: false,
      kgPricesConfigured: false,
      productsConfigured: false
    }
  };

  for (const [id, data] of Object.entries(tenants)) {
    await setDoc(doc(db, 'tenants', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log(`  ✓ Estabelecimento criado: ${id}`);
  }

  console.log('Criando subcoleções de produtos padrão em tenants/acai-da-serra-matriz/products...');
  const defaultProducts = [
    { id: 'prod-1', name: "Água Mineral 500ml", price: 3.00, category: "Bebidas", active: true },
    { id: 'prod-2', name: "Água com Gás 500ml", price: 3.50, category: "Bebidas", active: true },
    { id: 'prod-3', name: "Refrigerante Lata", price: 5.00, category: "Bebidas", active: true },
    { id: 'prod-4', name: "Suco Natural de Laranja 400ml", price: 7.00, category: "Bebidas", active: true },
    { id: 'prod-5', name: "Picolé Gourmet", price: 6.00, category: "Sorvetes", active: true }
  ];

  for (const prod of defaultProducts) {
    await setDoc(doc(db, 'tenants', 'acai-da-serra-matriz', 'products', prod.id), {
      ...prod,
      createdAt: serverTimestamp()
    });
  }
  console.log('  ✓ 5 produtos padrão adicionados à matriz.');

  console.log('Criando coleção de cash_sessions inicial...');
  await setDoc(doc(db, 'cash_sessions', 'session-demo-01'), {
    id: 'session-demo-01',
    tenantId: 'acai-da-serra-matriz',
    operatorUid: 'H3OM6o8uLVMxKQFwxrCOAlROBcx1',
    operatorName: 'Carlos',
    openedAt: new Date().toISOString(),
    initialBalance: 100.00,
    status: 'aberto',
    totalCashSales: 0,
    totalCardSales: 0,
    totalPixSales: 0
  });
  console.log('  ✓ Sessão de caixa de exemplo criada.');

  console.log('\nTodas as coleções e regras foram criadas com sucesso no Firestore (orvix-pdv-web)!');
}

seed().then(() => process.exit(0)).catch(err => {
  console.error('Erro ao popular Firestore:', err);
  process.exit(1);
});
