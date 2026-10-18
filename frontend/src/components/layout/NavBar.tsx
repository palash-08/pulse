import { Link, NavLink, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, Server, AlertCircle, FileText, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext.js";

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Guest Mode Banner */}
      {user?.isGuest && (
        <div className="bg-amber-500 text-slate-900 px-4 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
              Guest Mode
            </span>
            <span>You can monitor at most 2 sites. Data is temporary.</span>
          </div>
          <Link
            to="/register"
            className="underline font-bold hover:text-white transition-colors"
          >
            Register now to keep your data & unlock unlimited monitors →
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <span className="tracking-tight">Pulse</span>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink to="/monitors" className={navLinkClass}>
                <Server className="w-4 h-4" />
                Monitors
              </NavLink>
              <NavLink to="/incidents" className={navLinkClass}>
                <AlertCircle className="w-4 h-4" />
                Incidents
              </NavLink>
              <NavLink to="/reports" className={navLinkClass}>
                <FileText className="w-4 h-4" />
                Reports
              </NavLink>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <NavLink to="/account" className={navLinkClass}>
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">
                {user?.isGuest ? "Guest Account" : user?.displayName || user?.email}
              </span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
