const TOKEN_KEY = "envelock.admin_token";
const REFRESH_KEY = "envelock.admin_refresh";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
  get unauthorized() {
    return this.status === 401;
  }
  get notAdmin() {
    // The console gate returns 404 to a valid session that isn't a super-admin.
    return this.status === 404;
  }
}

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get refreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(token: string, refresh?: string | null) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  get signedIn() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },
};

// Keep a long-lived operator session alive past the 15-minute access-token TTL by
// exchanging the refresh token on a 401, then replaying the request once.
let refreshInFlight: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  const rt = auth.refreshToken;
  if (!rt) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: rt }),
        });
        if (!res.ok) {
          auth.clear();
          return false;
        }
        const b = (await res.json()) as { access_token: string; refresh_token?: string };
        auth.set(b.access_token, b.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = auth.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (
    res.status === 401 &&
    !retried &&
    auth.refreshToken &&
    !path.includes("/auth/")
  ) {
    if (await tryRefresh()) return request<T>(path, init, true);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body.detail as string) ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface Overview {
  tenants: number;
  users: number;
  pending_users: number;
  mailboxes: number;
  open_alerts: number;
  critical_open: number;
  paying_tenants: number;
  active_trials: number;
  plan_distribution: Record<string, number>;
  generated_at: string;
}

export interface TenantRow {
  id: string;
  name: string;
  primary_domain: string | null;
  is_active: boolean;
  users: number;
  mailboxes: number;
  open_alerts: number;
  created_at: string | null;
  subscribed_plan: string;
  effective_plan: string;
  trial_active: boolean;
  trial_days_left: number;
  trial_ends_at: string | null;
  payment_method_ok: boolean;
  has_billing_account: boolean;
}

export interface UserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  tenant_id: string;
  tenant_name: string;
  created_at: string | null;
}

export interface TenantDetailFull {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string | null;
  subscribed_plan: string;
  effective_plan: string;
  trial_active: boolean;
  trial_days_left: number;
  trial_ends_at: string | null;
  payment_method_ok: boolean;
  has_billing_account: boolean;
  users: {
    id: string;
    email: string;
    role: string;
    status: string;
    mfa_enabled: boolean;
    created_at: string | null;
  }[];
  mailboxes: {
    id: string;
    address: string;
    mailbox_class: string;
    protection_level: string;
    sources: string[];
  }[];
  domains: {
    registrable_domain: string;
    verified: boolean;
    dmarc_policy: string | null;
    is_defensive: boolean;
  }[];
  recent_alerts: {
    id: string;
    tier: string;
    title: string;
    state: string;
    created_at: string | null;
  }[];
}

// ── API ──────────────────────────────────────────────────────────────────────
export const api = {
  // Sign in with Envelock credentials. Handles both the "MFA not yet set up"
  // (deferrable → skip) and "MFA enrolled" (verify with a code) cases.
  login: (email: string, password: string) =>
    request<{ mfa_token: string; mfa_setup_required?: boolean; mfa_required?: boolean }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),
  mfaSkip: (mfaToken: string) =>
    request<{ access_token: string; refresh_token?: string }>("/api/v1/auth/mfa/skip", {
      method: "POST",
      body: JSON.stringify({ token: mfaToken }),
    }),
  mfaVerify: (mfaToken: string, code: string) =>
    request<{ access_token: string; refresh_token?: string }>("/api/v1/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    }),
  logout: () => request<unknown>("/api/v1/auth/logout", { method: "POST" }),

  whoami: () => request<{ email: string; is_superadmin: boolean }>("/api/v1/admin/whoami"),
  overview: () => request<Overview>("/api/v1/admin/overview"),

  tenants: (query = "", offset = 0) =>
    request<{ total: number; limit: number; offset: number; tenants: TenantRow[] }>(
      `/api/v1/admin/tenants?query=${encodeURIComponent(query)}&offset=${offset}`,
    ),
  tenant: (id: string) => request<TenantDetailFull>(`/api/v1/admin/tenants/${id}`),

  users: (query = "", offset = 0) =>
    request<{ total: number; limit: number; offset: number; users: UserRow[] }>(
      `/api/v1/admin/users?query=${encodeURIComponent(query)}&offset=${offset}`,
    ),

  setPlan: (tenantId: string, plan: string) =>
    request<unknown>(`/api/v1/admin/tenants/${tenantId}/plan`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  extendTrial: (tenantId: string, days: number) =>
    request<unknown>(`/api/v1/admin/tenants/${tenantId}/extend-trial`, {
      method: "POST",
      body: JSON.stringify({ days }),
    }),
  suspendTenant: (tenantId: string) =>
    request<unknown>(`/api/v1/admin/tenants/${tenantId}/suspend`, { method: "POST" }),
  activateTenant: (tenantId: string) =>
    request<unknown>(`/api/v1/admin/tenants/${tenantId}/activate`, { method: "POST" }),

  approveUser: (userId: string) =>
    request<unknown>(`/api/v1/admin/users/${userId}/approve`, { method: "POST" }),
  suspendUser: (userId: string) =>
    request<unknown>(`/api/v1/admin/users/${userId}/suspend`, { method: "POST" }),
  activateUser: (userId: string) =>
    request<unknown>(`/api/v1/admin/users/${userId}/activate`, { method: "POST" }),
  setRole: (userId: string, role: string) =>
    request<unknown>(`/api/v1/admin/users/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
};
