import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BrandArt } from "./BrandArt";
import { Compass, Home, LogOut, Search, Sparkles, UserRound, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { UploadDock } from "@/components/upload-queue";
import { DonateButton } from "@/components/DonateButton";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/characters", label: "Cast", icon: Users },
  { to: "/categories", label: "Categories", icon: Compass },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/home" className="flex items-center gap-3 no-underline">
      <span className="clay-sm relative flex size-10 items-center justify-center overflow-hidden">
        <BrandArt className="size-6" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="font-display block text-lg font-extrabold text-foreground">
            Hinataw<span className="text-primary">.exe</span>
          </span>
          <span className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            clay stream
          </span>
        </span>
      )}
    </Link>
  );
}

export function AdminChip() {
  return (
    <Link
      to="/studio"
      className="clay-sm clay-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-clay-butter"
    >
      <Sparkles className="size-3.5" />
      Studio
    </Link>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="clay-blob pointer-events-none fixed -top-24 -left-20 size-72 bg-clay-blush/40"
      />
      <div
        aria-hidden
        className="clay-blob pointer-events-none fixed top-1/3 -right-24 size-80 bg-clay-sky/30"
      />

      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled ? "backdrop-blur-xl" : "",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6",
            scrolled ? "clay-sm mt-2 rounded-full border-none" : "",
          )}
        >
          <BrandMark />

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold no-underline transition",
                    isActive
                      ? "clay-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <DonateButton label="Donate to the creator" />
            {isAdmin && <AdminChip />}
            <NavLink
              to="/profile"
              className="clay-sm clay-press flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground no-underline hover:text-foreground"
            >
              <UserRound className="size-3.5" />
              <span className="hidden max-w-24 truncate sm:block">
                {user?.role === "admin" ? "Admin" : "Guest"}
              </span>
            </NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="clay-sm clay-press flex size-9 items-center justify-center text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pt-4 pb-32 sm:px-6 md:pb-16">
        {children ?? <Outlet />}
      </main>

      <UploadDock />

      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const [visible, setVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < last || y < 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden"
        >
          <div className="clay safe-bottom mx-auto flex max-w-md items-center justify-between gap-1 rounded-[2rem] p-2">
            {NAV.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "clay-press flex flex-1 flex-col items-center gap-1 rounded-[1.5rem] px-2 py-2.5 no-underline transition",
                    active ? "clay-sm text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("size-5", active && "scale-110")} />
                  <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
