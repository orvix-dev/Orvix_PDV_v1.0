/**
 * ==========================================================================
 * ORVIX PDV — SESSION VALIDATION SERVICE
 * ==========================================================================
 * Valida, com tempo limite curto, a sessão do usuário logado:
 *   1. Aguarda o Firebase Auth restaurar o token
 *   2. Busca os estabelecimentos vinculados no servidor
 *   3. Consulta o status da chave de licença usada pelo estabelecimento
 *
 * Toda falha é normalizada em um SessionError com um `code` conhecido, que a
 * tela de carregamento (SessionGate) usa para escolher a mensagem e as ações.
 */

import { firebaseDb } from '../config/firebase.js';
import { authService } from './auth.service.js';
import { licenseService } from './license.service.js';

export const SESSION_ERROR = Object.freeze({
  TIMEOUT: 'timeout',
  OFFLINE: 'offline',
  SERVER: 'server',
  AUTH_EXPIRED: 'auth_expired',
  LICENSE_INVALID: 'license_invalid',
  LICENSE_EXPIRED: 'license_expired',
  LICENSE_BLOCKED: 'license_blocked'
});

/** Erros causados pela chave/licença (oferecem logoff + suporte) */
export const LICENSE_ERROR_CODES = [
  SESSION_ERROR.LICENSE_INVALID,
  SESSION_ERROR.LICENSE_EXPIRED,
  SESSION_ERROR.LICENSE_BLOCKED,
  SESSION_ERROR.AUTH_EXPIRED
];

/** Erros de conectividade (oferecem recarregar / testar internet / suporte) */
export const CONNECTIVITY_ERROR_CODES = [
  SESSION_ERROR.TIMEOUT,
  SESSION_ERROR.OFFLINE,
  SESSION_ERROR.SERVER
];

export class SessionError extends Error {
  constructor(code, message = '', details = {}) {
    super(message || code);
    this.name = 'SessionError';
    this.code = code;
    this.details = details;
  }
}

const TIMEOUT_TOKEN = '__ORVIX_SESSION_TIMEOUT__';

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export class SessionService {
  /**
   * Cria um prazo (deadline) compartilhado entre as etapas da validação.
   */
  createDeadline(timeoutMs) {
    const endsAt = Date.now() + timeoutMs;
    return {
      remaining: () => Math.max(0, endsAt - Date.now())
    };
  }

  /**
   * Executa uma promessa respeitando o tempo restante do prazo.
   */
  async withDeadline(promise, deadline) {
    const ms = deadline.remaining();
    if (ms <= 0) throw new SessionError(SESSION_ERROR.TIMEOUT);

    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(TIMEOUT_TOKEN)), ms);
    });

    try {
      return await Promise.race([promise, timeout]);
    } catch (err) {
      throw this.normalizeError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Etapa 1 — garante que a autenticação foi restaurada pelo Firebase
   */
  async ensureAuth(deadline) {
    this._assertOnline();
    await this.withDeadline(authService.waitForAuthReady(), deadline);
    const user = authService.getCurrentUser();
    if (!user) throw new SessionError(SESSION_ERROR.AUTH_EXPIRED);
    return user;
  }

  /**
   * Etapa 2 — busca os estabelecimentos do usuário diretamente no servidor
   */
  async fetchTenants(user, deadline) {
    this._assertOnline();
    return this.withDeadline(licenseService.fetchUserTenantsRemote(user), deadline);
  }

  /**
   * Etapa 3 — consulta o status da chave de licença do estabelecimento
   */
  async validateTenantLicense(tenant, deadline) {
    this._assertOnline();
    const key = tenant?.chaveLicenca || null;
    const license = key
      ? await this.withDeadline(licenseService.fetchLicenseRemote(key), deadline)
      : null;

    const verdict = this.evaluate(tenant, license);
    if (!verdict.ok) {
      throw new SessionError(verdict.code, '', { tenant, license, key, expiresAt: verdict.expiresAt });
    }
    return { tenant, license };
  }

  /**
   * Regras de negócio do status da chave (puro, sem I/O — reutilizado pelo watcher em tempo real)
   */
  evaluate(tenant = {}, license = null) {
    const key = tenant?.chaveLicenca || license?.key || null;
    const statuses = [tenant?.statusLicenca, tenant?.status, license?.status];

    if (statuses.includes('bloqueado')) {
      return { ok: false, code: SESSION_ERROR.LICENSE_BLOCKED, key };
    }

    const expiresAt = toDate(license?.expiresAt) || toDate(tenant?.dataExpiracao);
    const isExpired =
      statuses.includes('expirado') ||
      (expiresAt && expiresAt.getTime() < Date.now());

    if (isExpired) {
      return { ok: false, code: SESSION_ERROR.LICENSE_EXPIRED, key, expiresAt };
    }

    // A loja aponta para uma chave que não existe mais no servidor
    if (tenant?.chaveLicenca && !license && firebaseDb) {
      return { ok: false, code: SESSION_ERROR.LICENSE_INVALID, key };
    }

    return { ok: true, key, expiresAt };
  }

  /**
   * Converte qualquer erro (timeout, Firestore, rede) para SessionError
   */
  normalizeError(err) {
    if (err instanceof SessionError) return err;

    const code = err?.code || '';
    const msg = err?.message || '';

    if (msg === TIMEOUT_TOKEN || msg.includes('TIMEOUT') || code === 'deadline-exceeded') {
      return new SessionError(SESSION_ERROR.TIMEOUT, msg);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new SessionError(SESSION_ERROR.OFFLINE, msg);
    }
    if (code === 'unauthenticated' || code === 'permission-denied') {
      return new SessionError(SESSION_ERROR.AUTH_EXPIRED, msg);
    }
    if (code === 'unavailable' || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('offline')) {
      return new SessionError(SESSION_ERROR.OFFLINE, msg);
    }
    return new SessionError(SESSION_ERROR.SERVER, msg || 'Erro desconhecido');
  }

  _assertOnline() {
    if (firebaseDb && typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new SessionError(SESSION_ERROR.OFFLINE);
    }
  }

  /**
   * Teste rápido de conectividade: internet + servidor (Firebase)
   */
  async testConnection() {
    const probe = async (url) => {
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        return { ok: true, ms: Math.round(performance.now() - started) };
      } catch {
        return { ok: false, ms: null };
      } finally {
        clearTimeout(timer);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { internet: { ok: false, ms: null }, server: { ok: false, ms: null } };
    }

    const [internet, server] = await Promise.all([
      probe('https://www.gstatic.com/generate_204'),
      probe('https://firestore.googleapis.com/')
    ]);
    return { internet, server };
  }
}

export const sessionService = new SessionService();
