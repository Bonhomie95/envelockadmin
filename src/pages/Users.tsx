import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Search, UserCheck, UserX } from "lucide-react";
import { api, type UserRow } from "../lib/api";
import { Badge, Button } from "../components/ui";

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.users(query);
      setRows(r.users);
      setTotal(r.total);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => void fetchUsers(), 200);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await fetchUsers();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <span className="fg-3 mono text-xs">{total} total</span>
      </div>

      <div className="relative mt-4">
        <Search size={15} className="fg-3 absolute top-1/2 left-3 -translate-y-1/2" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          className="field pl-10"
        />
      </div>

      <div className="panel mt-4 divide-y">
        {loading && rows.length === 0 ? (
          <p className="fg-3 p-8 text-center text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="fg-3 p-8 text-center text-sm">No users match.</p>
        ) : (
          rows.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge label={u.role} tone={u.role} />
                  <Badge label={u.status} tone={u.status} />
                  <Link
                    to={`/tenants/${u.tenant_id}`}
                    className="fg-3 mono text-[11px] hover:text-[var(--accent)]"
                  >
                    {u.tenant_name}
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {u.status === "pending" && (
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={busy !== null}
                    onClick={() => act(`ap-${u.id}`, () => api.approveUser(u.id))}
                  >
                    <UserCheck size={12} aria-hidden /> APPROVE
                  </Button>
                )}
                {u.status === "active" && u.role !== "owner" && (
                  <Button
                    size="sm"
                    variant="line"
                    disabled={busy !== null}
                    onClick={() => act(`su-${u.id}`, () => api.suspendUser(u.id))}
                  >
                    <UserX size={12} aria-hidden /> SUSPEND
                  </Button>
                )}
                {u.status === "suspended" && (
                  <Button
                    size="sm"
                    variant="line"
                    disabled={busy !== null}
                    onClick={() => act(`re-${u.id}`, () => api.activateUser(u.id))}
                  >
                    <Check size={12} aria-hidden /> REACTIVATE
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
