import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  LayoutDashboard,
  Server,
  AlertCircle,
  FileText,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext.js";
import { ThemeToggle } from "../ui/ThemeToggle.js";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", end: true, icon: LayoutDashboard },
  { label: "Monitors", to: "/monitors", icon: Server },
  { label: "Incidents", to: "/incidents", icon: AlertCircle },
  { label: "Reports", to: "/reports", icon: FileText },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  // Sync scroll state with threshold between 20px and 40px (30px)
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 30 && !isScrolled) {
      setIsScrolled(true);
    } else if (latest <= 30 && isScrolled) {
      setIsScrolled(false);
    }
  });

  // Initialize scroll state on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsScrolled(window.scrollY > 30);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* 1. Top Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
        <motion.div
          initial={false}
          animate={{
            y: isScrolled ? 12 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        >
          <div className="flex items-center justify-between h-16">
            {/* Left Pill: Brand Name */}
            <div
              className={`pointer-events-auto flex items-center h-10 transition-all duration-300 ${
                isScrolled
                  ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-4"
                  : "bg-transparent border border-transparent px-1"
              }`}
            >
              <Link to="/" className="select-none inline-flex items-center">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white transition-colors">
                  pulse
                </span>
              </Link>
            </div>

            {/* Center Pill: Desktop Nav links (hidden on mobile) */}
            <nav
              className={`hidden md:flex items-center h-10 transition-all duration-300 pointer-events-auto ${
                isScrolled
                  ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-2"
                  : "bg-transparent border border-transparent px-0"
              }`}
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative px-3.5 py-1 text-[14px] font-medium transition-colors duration-200 rounded-full select-none ${
                      isActive
                        ? "text-neutral-900 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="desktop-nav-active-pill"
                          className="absolute inset-0 bg-neutral-200/80 dark:bg-neutral-800 rounded-full"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Right Pill: Theme Toggle, Account & Logout */}
            <div
              className={`pointer-events-auto flex items-center h-10 gap-1.5 sm:gap-2 transition-all duration-300 ${
                isScrolled
                  ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-2.5 sm:px-3"
                  : "bg-transparent border border-transparent px-1"
              }`}
            >
              <ThemeToggle variant="ghost" size="sm" />

              {user ? (
                <>
                  <NavLink
                    to="/account"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 rounded-full transition-colors"
                    title="Account Settings"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span className="hidden sm:inline truncate max-w-[120px]">
                      {user.isGuest ? "Guest" : user.displayName || user.email}
                    </span>
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/login"
                    className="px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 rounded-full transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </header>

      {/* 2. Mobile Floating Bottom Navigation Pill (md:hidden) */}
      <div
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
        className="fixed inset-x-0 z-40 md:hidden flex justify-center pointer-events-none px-4"
      >
        <nav
          aria-label="Mobile Navigation"
          className="pointer-events-auto flex items-center justify-around w-full max-w-sm h-14 bg-white/75 dark:bg-neutral-900/75 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-full px-2 py-1 transition-colors duration-200"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all duration-200 rounded-full select-none ${
                  isActive
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center w-10 h-6">
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-active-pill"
                        className="absolute inset-0 bg-neutral-200/80 dark:bg-neutral-800 rounded-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={`relative z-10 w-4 h-4 transition-transform duration-200 ${
                        isActive
                          ? "scale-110 text-neutral-900 dark:text-white"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    />
                  </div>
                  <span
                    className={`relative z-10 text-[10px] mt-0.5 tracking-tight transition-colors duration-200 ${
                      isActive
                        ? "font-semibold text-neutral-900 dark:text-white"
                        : "font-normal text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
