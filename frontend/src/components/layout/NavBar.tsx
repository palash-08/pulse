import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  LayoutDashboard,
  Server,
  AlertCircle,
  FileText,
  UserCircle,
  LogOut,
  Menu,
  X,
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
  const location = useLocation();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
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
          {/* 1. Left Pill: Brand Name (stays locked to left location) */}
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

          {/* 2. Center Pill: Nav links (stays centered at its location) */}
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
                        layoutId="nav-active-pill"
                        className="absolute inset-0 bg-neutral-200/80 dark:bg-neutral-800 rounded-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* 3. Right Pill: Actions, Theme Toggle & Account (stays locked to right location) */}
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

            {/* Mobile Menu Toggle Icon */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              title={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (<768px) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-2 pointer-events-auto w-full rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 p-3 md:hidden flex flex-col gap-1"
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3.5 py-2 text-[14px] font-medium rounded-xl transition-colors ${
                      isActive
                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {user && (
                <>
                  <div className="my-1.5 border-t border-neutral-200/60 dark:border-neutral-800/60" />
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <NavLink
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    >
                      <UserCircle className="w-4 h-4 text-neutral-500" />
                      <span className="truncate max-w-[180px]">
                        {user.isGuest ? "Guest Account" : user.displayName || user.email}
                      </span>
                    </NavLink>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="p-1.5 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
