import { TOKENHUB_LOGIN_URL } from "@/constant/env";
import { getSub2ApiUser, normalizeSub2ApiUser, resolveSub2ApiOrigin, Sub2ApiAuthError, type Sub2ApiUser } from "@/services/api/sub2api";

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
