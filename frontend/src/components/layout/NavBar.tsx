import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Server, AlertCircle, FileText, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext.js";

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
      isActive
        ? "bg-neutral-900 text-white shadow-xs"
        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200">
      {/* Guest Mode Banner */}
      {user?.isGuest && (
        <div className="bg-neutral-900 text-white px-4 py-2 text-xs font-normal flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider">
              Guest Mode
            </span>
            <span className="text-neutral-300 text-xs">Monitors limited to 2 sites.</span>
          </div>
          <Link
            to="/register"
            className="font-medium text-white hover:text-neutral-300 underline underline-offset-4 transition-colors"
          >
            Register to keep history & unlock unlimited monitors →
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group select-none">
              <span className="font-serif text-2xl font-bold tracking-tight text-neutral-900">
                pulse
              </span>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              <NavLink to="/" end className={navLinkClass}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </NavLink>
              <NavLink to="/monitors" className={navLinkClass}>
                <Server className="w-3.5 h-3.5" />
                Monitors
              </NavLink>
              <NavLink to="/incidents" className={navLinkClass}>
                <AlertCircle className="w-3.5 h-3.5" />
                Incidents
              </NavLink>
              <NavLink to="/reports" className={navLinkClass}>
                <FileText className="w-3.5 h-3.5" />
                Reports
              </NavLink>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2">
            <NavLink to="/account" className={navLinkClass}>
              <UserCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {user?.isGuest ? "Guest Account" : user?.displayName || user?.email}
              </span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

