import { SUB2API_BASE_URL } from "@/constant/env";

export type Sub2ApiBinding = boolean | {
    bound?: boolean;
    bound_count?: number;
    provider?: string;
    provider_label?: string | null;
    display_name?: string | null;
    subject_hint?: string | null;
    can_bind?: boolean;
    can_unbind?: boolean;
    [key: string]: unknown;
};

export type Sub2ApiUser = {
    id: number;
    username: string;
    email: string;
    avatar_url?: string | null;
    role?: string | null;
    balance?: number | null;
    status?: string | null;
    auth_bindings?: Record<string, Sub2ApiBinding>;
    identity_bindings?: Record<string, Sub2ApiBinding>;
};

export class Sub2ApiAuthError extends Error {
    readonly status: number;

    constructor(status: number, message = "Sub2API authentication failed") {
        super(message);
        this.name = "Sub2ApiAuthError";
        this.status = status;
    }
}

export function resolveSub2ApiOrigin(sourceOrigin?: string) {
    const raw = SUB2API_BASE_URL || sourceOrigin || window.location.origin;
    const url = new URL(raw, window.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Sub2API must use HTTP or HTTPS");
    }
    return url.origin;
}

export async function getSub2ApiUser(origin: string, token: string, signal?: AbortSignal): Promise<Sub2ApiUser> {
    // 本地开发时使用 Vite proxy 避免跨域
    const isDev = import.meta.env.DEV;
    const endpoint = isDev ? "/sub2api-proxy/api/v1/user/profile" : `${origin}/api/v1/user/profile`;

    const response = await fetch(endpoint, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-store",
        },
        cache: "no-store",
        credentials: "omit",
        signal,
    });

    if (!response.ok) {
        throw new Sub2ApiAuthError(response.status);
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new Error("Sub2API returned an invalid response");
    }

    const data = unwrapResponse(payload);
    if (!isSub2ApiUser(data)) throw new Error("Sub2API returned an invalid user");
    return data;
}

function unwrapResponse(payload: unknown) {
    if (!payload || typeof payload !== "object") return payload;
    const value = payload as Record<string, unknown>;
    if ("code" in value && value.code !== 0) throw new Sub2ApiAuthError(200, "Sub2API rejected the session");
    return "data" in value ? value.data : payload;
}

function isSub2ApiUser(value: unknown): value is Sub2ApiUser {
    if (!value || typeof value !== "object") return false;
    const user = value as Record<string, unknown>;
    return (typeof user.id === "number" || (typeof user.id === "string" && /^\d+$/.test(user.id))) && (typeof user.username === "string" || typeof user.email === "string");
}

export function normalizeSub2ApiUser(user: Sub2ApiUser): Sub2ApiUser {
    return {
        ...user,
        id: Number(user.id),
        username: user.username?.trim() || "",
        email: user.email?.trim() || "",
        avatar_url: user.avatar_url?.trim() || "",
    };
}

export type Sub2ApiKey = {
    id: number | string;
    name: string;
    key: string;
    status?: string;
    created_at?: string;
    [key: string]: unknown;
};

export async function getSub2ApiKeys(origin: string, token: string, signal?: AbortSignal): Promise<Sub2ApiKey[]> {
    const isDev = import.meta.env.DEV;
    const endpoint = isDev ? "/sub2api-proxy/api/v1/keys" : `${origin}/api/v1/keys`;

    const response = await fetch(endpoint, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-store",
        },
        cache: "no-store",
        credentials: "omit",
        signal,
    });

    if (!response.ok) {
        throw new Sub2ApiAuthError(response.status, "Failed to fetch API keys");
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new Error("Sub2API returned an invalid response");
    }

    const data = unwrapResponse(payload);

    // 处理分页响应格式: { items: [...], total, page, ... }
    const items = Array.isArray(data) ? data : (data && typeof data === 'object' && Array.isArray((data as any).items)) ? (data as any).items : [];

    if (!Array.isArray(items)) return [];
    return items
        .filter((item): item is Sub2ApiKey => {
            if (!item || typeof item !== "object") return false;
            const key = item as Record<string, unknown>;
            return (typeof key.id === "number" || typeof key.id === "string") && typeof key.name === "string" && typeof key.key === "string";
        })
        .map((key) => ({
            ...key,
            id: typeof key.id === "string" ? key.id : String(key.id),
            name: key.name.trim(),
            key: key.key.trim(),
        }));
}
