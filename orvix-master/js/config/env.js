/**
 * Helper to clean and sanitize env variables
 */
function cleanEnv(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/,$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

export const env = {
  firebase: {
    apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY) || 'AIzaSyAuqx-U9kibzqNNUTjyeoCzJ7ZOhhbAPgo',
    authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || 'orvix-pdv.firebaseapp.com',
    projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID) || 'orvix-pdv',
    storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || 'orvix-pdv.firebasestorage.app',
    messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || '141216914335',
    appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID) || '1:141216914335:web:6105a4f6443431d9c3fbaa',
    measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || 'G-63QVZE3XFG',
    databaseId: cleanEnv(import.meta.env.VITE_FIREBASE_DATABASE_ID) || 'orvix-pdv-web'
  },

  // E-mail mestre único autorizado
  masterAdminEmail: cleanEnv(import.meta.env.VITE_MASTER_ADMIN_EMAIL).toLowerCase() || 'orvixsolucoes@gmail.com',

  /**
   * Verifica se o e-mail corresponde estritamente à conta master autorizada
   */
  isAuthorizedMaster(email = '') {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return clean === this.masterAdminEmail;
  },

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
