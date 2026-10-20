import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  AlertCircle,
  FileText,
  UserCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext.js";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/monitors", label: "Monitors", icon: Server },
  { path: "/incidents", label: "Incidents", icon: AlertCircle },
  { path: "/reports", label: "Reports", icon: FileText },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const activePath = (() => {
    if (location.pathname === "/") return "/";
    if (location.pathname.startsWith("/monitors")) return "/monitors";
    if (location.pathname.startsWith("/incidents")) return "/incidents";
    if (location.pathname.startsWith("/reports")) return "/reports";
    return "";
  })();

  const updateIndicator = () => {
    if (!activePath) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const currentEl = linkRefs.current[activePath];
    const parentEl = navRef.current;

    if (currentEl && parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      const currentRect = currentEl.getBoundingClientRect();

      setIndicator({
        left: currentRect.left - parentRect.left,
        width: currentRect.width,
        visible: true,
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [location.pathname, activePath]);

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Guest Mode Warning Banner */}
      {user?.isGuest && (
        <div className="bg-[#0f0f13] text-zinc-200 px-4 py-2 text-xs font-normal flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider">
              Guest Mode
            </span>
            <span className="text-zinc-400 text-xs hidden sm:inline">
              Guest monitors are limited to 2 endpoints.
            </span>
          </div>
          <Link
            to="/register"
            className="font-medium text-amber-200 hover:text-amber-100 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to keep history & unlimited monitors &rarr;</span>
          </Link>
        </div>
      )}

      {/* Floating Glacé Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="glace-nav-bar rounded-2xl px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group select-none">
              <span className="font-serif text-2xl font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                pulse
              </span>
            </Link>

            {/* Glacé Spring Sliding Pill Navigation */}
            <nav
              ref={navRef}
              className="relative hidden md:flex items-center p-1 rounded-full bg-white/[0.03] border border-white/[0.07] overflow-hidden"
              aria-label="Main Navigation"
            >
              {/* Sliding Active Pill */}
              {indicator.visible && (
                <span
                  className="absolute top-1 bottom-1 rounded-full bg-white/[0.12] border border-white/[0.18] shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] pointer-events-none transition-all"
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
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
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
          <div className="flex items-center gap-2">
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                  isActive
                    ? "bg-white/[0.14] text-white border-white/[0.22] shadow-sm"
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

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-around mt-2 p-1 rounded-2xl glace-card-container text-xs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-white/[0.12] text-white shadow-xs font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </header>
  );
}
