import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { api, type TenantRow } from "../lib/api";
import { Badge } from "../components/ui";

export default function Tenants() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .tenants(query)
        .then((r) => {
          if (!live) return;
          setRows(r.tenants);
          setTotal(r.total);
        })
        .catch(() => live && setRows([]))
        .finally(() => live && setLoading(false));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="shell py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
        <span className="fg-3 mono text-xs">{total} total</span>
      </div>

      <div className="relative mt-4">
        <Search size={15} className="fg-3 absolute top-1/2 left-3 -translate-y-1/2" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or domain…"
          className="field pl-10"
        />
      </div>

      <div className="panel mt-4 divide-y">
        {loading && rows.length === 0 ? (
          <p className="fg-3 p-8 text-center text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="fg-3 p-8 text-center text-sm">No tenants match.</p>
        ) : (
          rows.map((t) => (
            <Link
              key={t.id}
              to={`/tenants/${t.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {t.primary_domain ?? t.name}
                  </span>
                  <Badge label={t.effective_plan} tone={t.effective_plan} />
                  {t.trial_active && (
                    <Badge label={`TRIAL ${t.trial_days_left}d`} tone="pending" />
                  )}
                  {!t.is_active && <Badge label="SUSPENDED" tone="suspended" />}
                </div>
                <div className="fg-3 mono mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                  <span className="tnum">{t.users} users</span>
                  <span className="tnum">{t.mailboxes} mailboxes</span>
                  <span className={t.open_alerts > 0 ? "text-[var(--warn)] tnum" : "tnum"}>
                    {t.open_alerts} open alerts
                  </span>
                  {t.payment_method_ok && <span className="text-[var(--ok)]">card on file</span>}
                </div>
              </div>
              <ChevronRight size={16} className="fg-3 shrink-0" aria-hidden />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
