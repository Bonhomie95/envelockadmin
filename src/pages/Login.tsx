import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Moon, ShieldCheck, Sun } from "lucide-react";
import { ApiError, api, auth } from "../lib/api";
import { Button } from "../components/ui";

export default function Login({
  theme,
}: {
  theme: { dark: boolean; toggle: () => void };
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(token: string, refresh?: string) {
    auth.set(token, refresh);
    try {
      await api.whoami();
      navigate("/");
    } catch (e) {
      auth.clear();
      setError(
        e instanceof ApiError && e.notAdmin
          ? "This account isn't a platform administrator."
          : "Could not verify access. Try again.",
      );
      setStep("credentials");
    }
  }

  async function submitCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(email.trim(), password);
      setMfaToken(r.mfa_token);
      if (r.mfa_setup_required) {
        // MFA not enrolled — a session is issued now (MFA is deferrable).
        const s = await api.mfaSkip(r.mfa_token);
        await finish(s.access_token, s.refresh_token);
      } else {
        setStep("code");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const v = await api.mfaVerify(mfaToken, code.trim());
      await finish(v.access_token, v.refresh_token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <button
        onClick={theme.toggle}
        aria-label="Toggle theme"
        className="fg-3 fixed top-4 right-4 flex size-10 cursor-pointer items-center justify-center hover:text-[var(--fg)]"
      >
        {theme.dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      </button>

      <div className="panel w-full max-w-sm p-8">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={22} className="accent" aria-hidden />
          <span className="text-lg font-bold tracking-tight">ENVELOCK</span>
          <span className="sect-label border-l pl-2.5">ADMIN</span>
        </div>
        <h1 className="mt-6 text-xl font-bold">
          {step === "credentials" ? "Operator sign in" : "Two-factor code"}
        </h1>
        <p className="fg-2 mt-2 text-sm leading-relaxed">
          {step === "credentials"
            ? "Platform administrators only. Use your Envelock credentials."
            : "Enter the 6-digit code from your authenticator app."}
        </p>

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="sect-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@envelock.com"
                className="field mt-1.5"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sect-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1.5"
                autoComplete="current-password"
              />
            </div>
            <Button variant="accent" className="w-full" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Lock size={14} aria-hidden />}
              CONTINUE
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-6 space-y-4">
            <input
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="field mono tnum text-center text-lg tracking-[0.3em]"
            />
            <Button variant="accent" className="w-full" disabled={busy || code.length < 6}>
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
              VERIFY
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setCode("");
                setError(null);
              }}
              className="fg-3 mono w-full text-center text-xs hover:text-[var(--fg)]"
            >
              ← Back
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
