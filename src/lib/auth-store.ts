/**
 * Real auth store backed by the API.
 * Preserves the previous surface — useAuth(), authStore.login/logout/setBusiness —
 * so existing components don't need rewrites.
 */
import { useSyncExternalStore } from "react";
import { authApi, type AuthUser } from "./api/endpoints";
import { tokens, apiConfigured } from "./api/client";

type State = {
  user: (AuthUser & { name: string }) | null;
  businessId: string;
  initialized: boolean;
};

const BIZ_KEY = "nexora.activeBusiness";
const readInitial = (): State => {
  if (typeof window === "undefined") {
    return { user: null, businessId: "all", initialized: false };
  }
  return {
    user: null,
    businessId: localStorage.getItem(BIZ_KEY) ?? "all",
    initialized: false,
  };
};

let state: State = readInitial();
const listeners = new Set<() => void>();
const emit = () => {
  if (typeof window !== "undefined") {
    localStorage.setItem(BIZ_KEY, state.businessId);
  }
  listeners.forEach((l) => l());
};

async function bootstrap() {
  if (state.initialized) return;
  if (apiConfigured() && tokens.access && !state.user) {
    try {
      const me = await authApi.me();
      state = { ...state, user: { ...me, name: me.name } };
    } catch {
      tokens.clear();
      state = { ...state, user: null };
    }
  }
  state = { ...state, initialized: true };
  emit();
}

export const authStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    if (!state.initialized) void bootstrap();
    return () => listeners.delete(l);
  },
  async login(email: string, password: string) {
    if (!apiConfigured()) throw new Error("Authentication service is not configured.");
    const res = await authApi.login({ email, password });
    tokens.set(res.accessToken, res.refreshToken);
    state = { ...state, user: res.user, initialized: true };
    emit();
  },
  async register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    countryCode?: string;
    gst?: string;
  }) {
    if (!apiConfigured()) throw new Error("Authentication service is not configured.");
    const res = await authApi.register(input);
    tokens.set(res.accessToken, res.refreshToken);
    state = { ...state, user: res.user, initialized: true };
    emit();
  },
  async logout() {
    const rt = tokens.refresh;
    if (apiConfigured() && rt) {
      try {
        await authApi.logout(rt);
      } catch {
        /* ignore */
      }
    }
    tokens.clear();
    state = { ...state, user: null };
    emit();
  },
  setBusiness(id: string) {
    state = { ...state, businessId: id };
    emit();
  },
};

const serverSnapshot: State = { user: null, businessId: "all", initialized: true };

export const useAuth = () =>
  useSyncExternalStore(
    authStore.subscribe,
    () => authStore.get(),
    () => serverSnapshot,
  );

export const useRole = () => useAuth().user?.role ?? null;
export const hasRole = (...roles: Array<"admin" | "manager" | "employee">) => {
  const r = authStore.get().user?.role;
  return r ? roles.includes(r) : false;
};
