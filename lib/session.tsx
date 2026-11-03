"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SessionUser } from "./types";

const KEY = "av_user";
const listeners = new Set<() => void>();

// Cacheamos el valor crudo para que getSnapshot devuelva una referencia estable.
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function readUser(): SessionUser | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cachedUser;
  }
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  try {
    cachedUser = raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

function writeUser(user: SessionUser | null) {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage bloqueado: se mantiene solo en memoria.
    cachedRaw = user ? JSON.stringify(user) : null;
    cachedUser = user;
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Snapshot de servidor = null: el primer render coincide con el servidor.
  const user = useSyncExternalStore(subscribe, readUser, () => null);
  const login = useCallback((u: SessionUser) => writeUser(u), []);
  const logout = useCallback(() => writeUser(null), []);
  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
