import { TOKENHUB_LOGIN_URL } from "@/constant/env";
import { getSub2ApiUser, normalizeSub2ApiUser, resolveSub2ApiOrigin, Sub2ApiAuthError, type Sub2ApiUser } from "@/services/api/sub2api";
import localforage from "localforage";

const SESSION_STORAGE_KEY = "infinite-canvas:sub2api-session";
const AUTH_QUERY_KEYS = ["token", "user_id", "theme", "lang", "ui_mode", "src_host", "src_url"];

type StoredSession = {
    issuerOrigin: string;
    token: string;
    userId: number;
};

export type Sub2ApiBootstrap = {
    session: StoredSession & { scope: string };
    user: Sub2ApiUser;
};

/**
 * 获取当前用户的存储键前缀
 * 如果用户已登录，返回 "infinite-canvas:user_{userId}:"
 * 否则返回 "infinite-canvas:" (未登录状态的默认前缀)
 */
export function getUserStoragePrefix(): string {
    const stored = readStoredSession();
    if (stored?.userId) {
        return `infinite-canvas:user_${stored.userId}:`;
    }
    return "infinite-canvas:";
}

/**
 * 获取带用户 ID 的存储键
 * 例如: getScopedStorageKey("ai_config_store") => "infinite-canvas:user_1:ai_config_store"
 */
export function getScopedStorageKey(key: string): string {
    return `${getUserStoragePrefix()}${key}`;
}

/**
 * 清空当前用户的业务数据（配置、画布、资产等）
 * 在用户切换时调用，避免数据混淆
 */
export async function clearUserData() {
    const prefix = getUserStoragePrefix();

    // 清空 localStorage 中的业务数据
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // 清空 localforage 中的所有数据
    try {
        await localforage.clear();
    } catch (error) {
        console.error("Failed to clear localforage:", error);
    }
}

export async function bootstrapSub2ApiSession(): Promise<Sub2ApiBootstrap | null> {
    try {
        const query = new URLSearchParams(window.location.search);
        const queryToken = query.get("token")?.trim() || "";
        const queryUserId = parseUserId(query.get("user_id"));
        const stored = readStoredSession();
        const issuerOrigin = resolveSub2ApiOrigin(stored?.issuerOrigin);
        const token = queryToken || (stored?.issuerOrigin === issuerOrigin ? stored.token : "");

        if (!token) {
            redirectToLogin();
            return null;
        }

        clearAuthQueryParams();
        const user = normalizeSub2ApiUser(await getSub2ApiUser(issuerOrigin, token));
        if (queryUserId !== null && queryUserId !== user.id) throw new Sub2ApiAuthError(200, "Sub2API user mismatch");
        if (["disabled", "banned", "deleted", "inactive"].includes((user.status || "").toLowerCase())) throw new Sub2ApiAuthError(403);

        const session = {
            issuerOrigin,
            token,
            userId: user.id,
            scope: `sub2api:${issuerOrigin}:${user.id}`,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        return { session, user };
    } catch {
        clearSub2ApiSession();
        redirectToLogin();
        return null;
    }
}

export function clearSub2ApiSession() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function readStoredSession(): StoredSession | null {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<StoredSession>;
        if (!value.token || !value.issuerOrigin || typeof value.userId !== "number") return null;
        return { issuerOrigin: value.issuerOrigin, token: value.token, userId: value.userId };
    } catch {
        clearSub2ApiSession();
        return null;
    }
}

function parseUserId(value: string | null) {
    if (!value || !/^\d+$/.test(value)) return null;
    const userId = Number(value);
    return Number.isSafeInteger(userId) ? userId : null;
}

function clearAuthQueryParams() {
    const params = new URLSearchParams(window.location.search);
    AUTH_QUERY_KEYS.forEach((key) => params.delete(key));
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

function redirectToLogin() {
    if (window.location.href.startsWith(TOKENHUB_LOGIN_URL)) return;
    window.location.replace(TOKENHUB_LOGIN_URL);
}
