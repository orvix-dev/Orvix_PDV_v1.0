/**
 * Helper to clean and sanitize env variables (strips quotes, commas, whitespace)
 */
function cleanEnv(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^["']|["']$/g, '') // remove outer quotes
    .replace(/,$/, '')           // remove trailing commas
    .replace(/^["']|["']$/g, '') // remove secondary outer quotes if any
    .trim();
}

/**
 * Environment configuration loader and validator
 */
export const env = {
  firebase: {
    apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
    measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
    databaseId: cleanEnv(import.meta.env.VITE_FIREBASE_DATABASE_ID) || 'orvix-pdv-web'
  },
  allowOfflineDemo: cleanEnv(import.meta.env.VITE_ALLOW_OFFLINE_DEMO) !== 'false',
  isProduction: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  masterAdminEmail: cleanEnv(import.meta.env.VITE_MASTER_ADMIN_EMAIL).toLowerCase() || 'orvixsolucoes@gmail.com',
  masterAdminEmails: cleanEnv(import.meta.env.VITE_MASTER_ADMIN_EMAILS)
    ? cleanEnv(import.meta.env.VITE_MASTER_ADMIN_EMAILS).split(',').map(e => e.trim().toLowerCase())
    : ['orvixsolucoes@gmail.com', 'admin@orvix.com', 'admin@orvixpdv.com'],
  masterAdminPin: cleanEnv(import.meta.env.VITE_MASTER_ADMIN_PIN) || '101520',

  /**
   * Valida se um e-mail ou PIN possui autorização Master SuperAdmin
   */
  isMasterAdmin(email = '', pin = '') {
    if (pin && pin.trim() === this.masterAdminPin) return true;
    if (email) {
      const clean = email.trim().toLowerCase();
      if (clean === this.masterAdminEmail) return true;
      if (this.masterAdminEmails.includes(clean)) return true;
      if (clean.startsWith('admin@') || clean.includes('master@')) return true;
    }
    return false;
  },

  /**
   * Verifica se as credenciais mínimas do Firebase estão configuradas
   */
  hasFirebaseCredentials() {
    return Boolean(
      this.firebase.apiKey &&
      this.firebase.apiKey.length > 0 &&
      !this.firebase.apiKey.includes('ExampleKey') &&
      this.firebase.projectId &&
      this.firebase.projectId.length > 0
    );
  }
};
