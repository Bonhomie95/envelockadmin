import { useEffect, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { api, auth } from "./lib/api";
import { Button, cn } from "./components/ui";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import UsersPage from "./pages/Users";

function useTheme() {
  const [dark, setDark] = useState(
    () => (localStorage.getItem("envelock.admin_theme") ?? "dark") === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("envelock.admin_theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/tenants", label: "Tenants", icon: Building2, end: false },
  { to: "/users", label: "Users", icon: Users, end: false },
];

function Shell({ children, theme }: { children: React.ReactNode; theme: ReturnType<typeof useTheme> }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    api
      .whoami()
      .then((w) => setEmail(w.email))
      .catch(() => {});
  }, []);

  async function signOut() {
    try {
      await api.logout();
    } catch {
      /* clearing the token is what matters */
    }
    auth.clear();
    navigate("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b bg-[var(--bg-raised)]">
        <div className="shell flex h-14 items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="accent" aria-hidden />
            <span className="text-[15px] font-bold tracking-tight">ENVELOCK</span>
            <span className="sect-label hidden border-l pl-2.5 sm:inline">ADMIN</span>
          </div>
          <nav className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto" aria-label="Console">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive ? "accent" : "fg-2 hover:text-[var(--fg)]",
                  )
                }
              >
                <Icon size={15} aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <span className="fg-3 mono hidden text-xs md:inline">{email}</span>
            <button
              onClick={theme.toggle}
              aria-label="Toggle theme"
              className="fg-2 flex size-10 cursor-pointer items-center justify-center hover:text-[var(--fg)]"
            >
              {theme.dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            </button>
            <Button variant="line" size="sm" onClick={signOut}>
              <LogOut size={13} aria-hidden />
              <span className="hidden sm:inline">SIGN OUT</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* Guards the admin routes: needs a session AND super-admin (whoami). A valid but
   non-admin session is bounced to a clear "not authorized" screen. */
function Protected({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const [state, setState] = useState<"checking" | "ok" | "denied" | "signedout">(
    "checking",
  );
  useEffect(() => {
    if (!auth.signedIn) {
      setState("signedout");
      return;
    }
    api
      .whoami()
      .then(() => setState("ok"))
      .catch((e) => setState(e?.status === 404 ? "denied" : "signedout"));
  }, []);

  if (state === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="fg-3 mono text-sm">Loading…</span>
      </div>
    );
  }
  if (state === "signedout") return <Navigate to="/login" replace />;
  if (state === "denied") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="panel max-w-md p-8 text-center">
          <ShieldCheck size={28} className="fg-3 mx-auto" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">Not authorized</h1>
          <p className="fg-2 mt-3 text-sm leading-relaxed">
            This account isn't a platform administrator. The admin console is
            restricted to operators on the allowlist.
          </p>
          <Button
            variant="line"
            size="sm"
            className="mt-6"
            onClick={() => {
              auth.clear();
              window.location.assign("/login");
            }}
          >
            SIGN OUT
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Shell theme={theme}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/tenants/:id" element={<TenantDetail />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  const theme = useTheme();
  const { pathname } = useLocation();
  return (
    <Routes>
      <Route path="/login" element={<Login theme={theme} />} />
      <Route path="/*" element={<Protected key={pathname === "/login" ? "l" : "a"} theme={theme} />} />
    </Routes>
  );
}
