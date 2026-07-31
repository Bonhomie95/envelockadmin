import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Building2, CreditCard, Inbox, Users } from "lucide-react";
import { api, type Overview as OverviewData } from "../lib/api";
import { Stat } from "../components/ui";

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .overview()
      .then(setData)
      .catch(() => setError("Could not load platform metrics."));
  }, []);

  if (error) return <p className="shell py-10 text-sm text-[var(--danger)]">{error}</p>;
  if (!data) return <p className="shell fg-3 py-10 text-sm">Loading…</p>;

  const plans = Object.entries(data.plan_distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="shell py-8">
      <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
      <p className="fg-2 mt-1 text-sm">Everything across every tenant, at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Tenants" value={data.tenants} />
        <Stat label="Users" value={data.users} />
        <Stat label="Mailboxes" value={data.mailboxes} />
        <Stat label="Paying tenants" value={data.paying_tenants} />
        <Stat label="Active trials" value={data.active_trials} />
        <Stat label="Pending users" value={data.pending_users} hot={data.pending_users > 0} />
        <Stat label="Open alerts" value={data.open_alerts} />
        <Stat label="Critical open" value={data.critical_open} hot={data.critical_open > 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="sect-label">Plan distribution</h2>
          <ul className="mt-4 space-y-2.5" role="list">
            {plans.map(([plan, n]) => {
              const pct = data.tenants ? Math.round((n / data.tenants) * 100) : 0;
              return (
                <li key={plan}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="capitalize">{plan}</span>
                    <span className="mono tnum fg-2">
                      {n} <span className="fg-3">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded bg-[var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="sect-label">Jump to</h2>
          <div className="mt-4 grid gap-2">
            <Link
              to="/tenants"
              className="flex items-center gap-3 rounded border px-4 py-3 text-sm transition-colors hover:border-[var(--accent)]"
            >
              <Building2 size={16} className="accent" aria-hidden /> Manage tenants
            </Link>
            <Link
              to="/users"
              className="flex items-center gap-3 rounded border px-4 py-3 text-sm transition-colors hover:border-[var(--accent)]"
            >
              <Users size={16} className="accent" aria-hidden /> Manage users
            </Link>
            <Link
              to="/tenants?filter=trials"
              className="flex items-center gap-3 rounded border px-4 py-3 text-sm transition-colors hover:border-[var(--accent)]"
            >
              <CreditCard size={16} className="accent" aria-hidden /> Billing & trials
            </Link>
          </div>
          <div className="fg-3 mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t pt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <Inbox size={12} aria-hidden /> {data.open_alerts} open alerts
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={12} aria-hidden /> {data.critical_open} critical
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
