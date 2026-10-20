import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Server,
  AlertTriangle,
  FileText,
  UserCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext.js";
import { CursorSpotlight } from "../ui/CursorSpotlight.js";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: Activity, exact: true },
  { path: "/monitors", label: "Monitors", icon: Server },
  { path: "/incidents", label: "Incidents", icon: AlertTriangle },
  { path: "/reports", label: "Reports", icon: FileText },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<{ [path: string]: HTMLAnchorElement | null }>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const activePath = location.pathname;

  // React Bits style: calculate active pill position and smoothly slide indicator
  const updateIndicator = () => {
    let matchedPath: string | null = null;

    if (activePath === "/") {
      matchedPath = "/";
    } else {
      const match = NAV_ITEMS.filter((i) => i.path !== "/").find((i) =>
        activePath.startsWith(i.path)
      );
      if (match) matchedPath = match.path;
    }

    if (matchedPath && linkRefs.current[matchedPath] && navRef.current) {
      const target = linkRefs.current[matchedPath]!;
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      setIndicator({
        left: targetRect.left - navRect.left,
        width: targetRect.width,
        visible: true,
      });
    } else {
      setIndicator((prev) => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    updateIndicator();
  }, [activePath]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Guest Mode Notice Banner */}
      {user?.isGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 backdrop-blur-md">
          <Link
            to="/register"
            className="hover:underline flex items-center gap-1.5 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Upgrade to keep history & unlimited monitors &rarr;</span>
          </Link>
        </div>
      )}

      {/* Floating Glacé Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="glace-nav-bar relative overflow-hidden rounded-2xl px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
          {/* Live Cursor Spotlight Feedback on NavBar */}
          <CursorSpotlight size={300} opacity={0.12} />

          {/* Logo & Brand */}
          <div className="flex items-center gap-6 relative z-10">
            <Link to="/" className="flex items-center gap-2 group select-none">
              <span className="font-serif text-2xl font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                pulse
              </span>
            </Link>

            {/* Glacé Spring Sliding Pill Navigation */}
            <nav
              ref={navRef}
              className="relative hidden md:flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] overflow-hidden"
              aria-label="Main Navigation"
            >
              {/* Sliding Active Pill */}
              {indicator.visible && (
                <span
                  className="absolute top-1 bottom-1 rounded-full bg-white/[0.14] border border-white/[0.20] shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] pointer-events-none transition-all"
                  style={{
                    left: `${indicator.left}px`,
                    width: `${indicator.width}px`,
                    transitionTimingFunction: "var(--glace-spring, cubic-bezier(0.16, 1, 0.3, 1))",
                    transitionDuration: "420ms",
                  }}
                  aria-hidden="true"
                />
              )}

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePath === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    ref={(el) => {
                      linkRefs.current[item.path] = el;
                    }}
                    className={`relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                      isActive
                        ? "text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 relative z-10">
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                  isActive
                    ? "bg-white/[0.16] text-white border-white/[0.25] shadow-sm"
                    : "glace-pill text-zinc-300 hover:text-white"
                }`
              }
            >
              <UserCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">
                {user?.isGuest ? "Guest Account" : user?.displayName || user?.email}
              </span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 glace-pill rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Dock */}
      <div className="md:hidden fixed bottom-4 inset-x-4 z-50">
        <nav className="glace-nav-bar relative overflow-hidden rounded-full p-1.5 flex items-center justify-around shadow-2xl">
          <CursorSpotlight size={220} opacity={0.12} />
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={`relative z-10 flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] rounded-full transition-all ${
                  isActive
                    ? "bg-white/[0.14] text-white shadow-xs font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
