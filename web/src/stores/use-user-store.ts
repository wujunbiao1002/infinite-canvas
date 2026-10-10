import { create } from "zustand";

import type { Sub2ApiBinding, Sub2ApiUser } from "@/services/api/sub2api";

export type LocalUser = {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    role: string;
    balance: number | null;
    status: string;
    authBindings: Record<string, Sub2ApiBinding>;
    identityBindings: Record<string, Sub2ApiBinding>;
};

export type UserSession = {
    issuerOrigin: string;
    token: string;
    userId: number;
    scope: string;
};

type UserStore = {
    user: LocalUser | null;
    session: UserSession | null;
    setSession: (session: UserSession, user: Sub2ApiUser) => void;
    clearSession: () => void;
};

export function mapSub2ApiUser(user: Sub2ApiUser): LocalUser {
    return {
        id: String(user.id),
        username: user.username || "",
        email: user.email || "",
        displayName: user.username || user.email || String(user.id),
        avatarUrl: user.avatar_url || "",
        role: user.role || "user",
        balance: typeof user.balance === "number" ? user.balance : null,
        status: user.status || "active",
        authBindings: user.auth_bindings || {},
        identityBindings: user.identity_bindings || {},
    };
}

export const useUserStore = create<UserStore>()((set) => ({
    user: null,
    session: null,
    setSession: (session, user) => set({ session, user: mapSub2ApiUser(user) }),
    clearSession: () => set({ user: null, session: null }),
}));
