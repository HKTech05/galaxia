const BASE_URL = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api");

/* ─── Token helpers ─────────────────────────────────────── */

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("galaxia_token");
}

export function setToken(token: string) {
    localStorage.setItem("galaxia_token", token);
}

export function clearToken() {
    localStorage.removeItem("galaxia_token");
    localStorage.removeItem("galaxia_admin");
}

export function getAdmin(): { id: number; username: string; displayName: string; role: string } | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("galaxia_admin");
    return raw ? JSON.parse(raw) : null;
}

export function setAdmin(admin: any) {
    localStorage.setItem("galaxia_admin", JSON.stringify(admin));
}

/* ─── Fetch wrapper ─────────────────────────────────────── */

async function request<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.includes("admin-login")) {
            window.location.href = "/admin-login";
        }
        throw new Error("Unauthorized");
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data as T;
}

/* ─── Convenience methods ───────────────────────────────── */

export const api = {
    get: <T = any>(path: string) => request<T>(path),

    post: <T = any>(path: string, body?: any) =>
        request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

    patch: <T = any>(path: string, body?: any) =>
        request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

    delete: <T = any>(path: string) =>
        request<T>(path, { method: "DELETE" }),

    /** For file uploads (no JSON Content-Type) */
    upload: async <T = any>(path: string, formData: FormData): Promise<T> => {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers,
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Upload failed");
        }
        return res.json();
    },
};

/* ─── Auth helpers ──────────────────────────────────────── */

export async function login(username: string, password: string) {
    const data = await api.post<{ token: string; admin: any }>("/auth/login", { username, password });
    setToken(data.token);
    setAdmin(data.admin);
    return data;
}

export function logout() {
    clearToken();
    if (typeof window !== "undefined") {
        window.location.href = "/admin-login";
    }
}

export function isLoggedIn(): boolean {
    return !!getToken();
}

export function getRoleRedirect(role: string): string {
    switch (role) {
        case "dd_admin": return "/admin1";
        case "staycation_admin": return "/admin22";
        case "owner":
        case "developer":
        default: return "/admin3";
    }
}
