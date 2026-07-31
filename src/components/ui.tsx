import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "accent" | "line" | "quiet" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "line",
  size = "md",
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded font-mono font-medium tracking-wide uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-2.5 py-1.5 text-[11px]", md: "px-4 py-2.5 text-xs" };
  const variants: Record<Variant, string> = {
    accent: "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90",
    line: "border border-[var(--rule)] text-[var(--fg-2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
    quiet: "text-[var(--fg-3)] hover:text-[var(--fg)]",
    danger: "border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

const TONE: Record<string, string> = {
  guard: "border-[var(--rule)] fg-3",
  essential: "border-[var(--accent)] accent",
  complete: "border-[var(--accent)] accent",
  solo: "border-[var(--rule)] fg-2",
  active: "border-[var(--ok)] text-[var(--ok)]",
  pending: "border-[var(--warn)] text-[var(--warn)]",
  suspended: "border-[var(--danger)] text-[var(--danger)]",
  critical: "border-[var(--danger)] text-[var(--danger)]",
  high: "border-[var(--warn)] text-[var(--warn)]",
  medium: "border-[var(--rule)] fg-2",
  low: "border-[var(--rule)] fg-3",
  owner: "border-[var(--accent)] accent",
  admin: "border-[var(--rule)] fg-2",
  member: "border-[var(--rule)] fg-3",
};

export function Badge({ label, tone }: { label: string; tone?: string }) {
  const cls = TONE[(tone ?? label).toLowerCase()] ?? "border-[var(--rule)] fg-3";
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export function Stat({ label, value, hot }: { label: string; value: ReactNode; hot?: boolean }) {
  return (
    <div className="panel p-4">
      <div
        className={cn(
          "mono tnum text-2xl font-semibold",
          hot ? "text-[var(--danger)]" : "text-[var(--fg)]",
        )}
      >
        {value}
      </div>
      <div className="sect-label mt-1">{label}</div>
    </div>
  );
}
