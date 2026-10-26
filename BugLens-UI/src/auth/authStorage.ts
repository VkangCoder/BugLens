import { isLoginResponse, type AuthSession } from "@/types/auth";

const KEY = "buglens.auth";

let memory: AuthSession | null = null;

type StoreKind = "local" | "session";

function getStore(kind: StoreKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // accessing the property can also throw
  }
}

function isExpired(session: AuthSession): boolean {
  const expireAt = Date.parse(session.expireAt);
  return Number.isNaN(expireAt) || expireAt <= Date.now();
}

function removeFrom(kind: StoreKind): void {
  try {
    getStore(kind)?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function readFrom(kind: StoreKind): AuthSession | null {
  try {
    const raw = getStore(kind)?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isLoginResponse(parsed) && !isExpired(parsed)) return parsed;
  } catch {
    /* broken JSON → treat as missing */
  }
  removeFrom(kind); // clean up when broken or expired
  return null;
}

/** Called once at app startup (AuthProvider). */
export function restoreSession(): AuthSession | null {
  memory = readFrom("local") ?? readFrom("session");
  return memory;
}

export function getSession(): AuthSession | null {
  if (memory && isExpired(memory)) clearSession();
  return memory;
}

export function setSession(session: AuthSession, remember: boolean): void {
  clearSession();
  memory = session;
  try {
    getStore(remember ? "local" : "session")?.setItem(KEY, JSON.stringify(session));
  } catch {
    /* quota exceeded / blocked: still kept in memory */
  }
}

export function clearSession(): void {
  memory = null;
  removeFrom("local");
  removeFrom("session");
}
