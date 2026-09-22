import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConvexAuth, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BrandArt } from "@/components/BrandArt";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirect(returnTo: string | null, fallback: string) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

export default function AuthPage({ redirectAfterAuth = "/home" }: AuthProps) {
  const { isLoading, isAuthenticated, signIn } = useAuth();
  const { isAuthenticated: convexAuthed } = useConvexAuth();
  const adminLogin = useMutation(api.admin.adminLogin);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirect(searchParams.get("returnTo"), redirectAfterAuth);

  const [showAdmin, setShowAdmin] = useState(searchParams.get("mode") === "admin");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAdmin, setPendingAdmin] = useState(false);

  const intentRef = useRef<"guest" | "admin" | null>(null);
  const settledRef = useRef(false);

  /* Guests normally bounce straight through to the app… */
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (settledRef.current) return;
    if (intentRef.current === "admin" || pendingAdmin) return;
    navigate(redirect, { replace: true });
  }, [isLoading, isAuthenticated, navigate, redirect, pendingAdmin]);

  /* …admins get verified first, then land in the studio. */
  useEffect(() => {
    if (!pendingAdmin || !convexAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        await adminLogin({ adminId, password });
        if (cancelled) return;
        settledRef.current = true;
        toast.success("Studio unlocked");
        setPendingAdmin(false);
        navigate("/studio", { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Admin sign-in failed.";
        setError(message.includes("Invalid") ? "Invalid admin ID or password." : message);
        setPendingAdmin(false);
        setBusy(false);
        intentRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingAdmin, convexAuthed, adminLogin, adminId, password, navigate]);

  const handleGuest = async () => {
    setError(null);
    setBusy(true);
    intentRef.current = "guest";
    try {
      await signIn("anonymous");
      toast.success("Guest session ready — enjoy the stream");
      navigate(redirect, { replace: true });
    } catch (err) {
      console.error("Guest sign-in error:", err);
      setError("Could not start a guest session. Please try again.");
      setBusy(false);
      intentRef.current = null;
    }
  };

  const handleAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    intentRef.current = "admin";

    if (!adminId.trim() || !password) {
      setError("Enter both the admin ID and the password.");
      setBusy(false);
      return;
    }

    try {
      if (!convexAuthed) {
        await signIn("anonymous");
        setPendingAdmin(true);
        return;
      }
      await adminLogin({ adminId, password });
      settledRef.current = true;
      toast.success("Studio unlocked");
      navigate("/studio", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Admin sign-in failed.";
      setError(message.includes("Invalid") ? "Invalid admin ID or password." : message);
      setBusy(false);
      intentRef.current = null;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden className="clay-blob fixed -top-24 left-1/4 size-80 bg-clay-blush/45" />
      <div aria-hidden className="clay-blob fixed -right-20 bottom-0 size-80 bg-clay-sky/35" />

      <header className="relative z-10 px-4 py-4 sm:px-8">
        <Link
          to="/"
          className="clay-sm clay-press inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground no-underline hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-14">
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="clay p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <span className="clay-sm relative flex size-14 items-center justify-center overflow-hidden">
                <BrandArt className="size-[72%]" />
              </span>
              <h1 className="font-display mt-3 text-2xl font-extrabold">
                Hinataw<span className="text-primary">.exe</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={handleGuest}
              disabled={busy}
              className="clay-press mt-7 flex w-full items-center gap-4 rounded-[1.6rem] bg-primary px-5 py-4 text-left disabled:opacity-70"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-foreground/20">
                {busy && intentRef.current === "guest" ? (
                  <Loader2 className="size-5 animate-spin text-primary-foreground" />
                ) : (
                  <UserRound className="size-5 text-primary-foreground" />
                )}
              </span>
              <span className="flex-1">
                <span className="font-display block text-base font-extrabold text-primary-foreground">
                  Guest login
                </span>
                <span className="block text-[11px] font-semibold text-primary-foreground/75">
                  No email, no password — watch instantly
                </span>
              </span>
              <ArrowRight className="size-5 text-primary-foreground/80" />
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {!showAdmin ? (
              <button
                type="button"
                onClick={() => setShowAdmin(true)}
                className="clay-sm clay-press flex w-full items-center gap-4 rounded-[1.6rem] px-5 py-4 text-left"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-clay-butter/20">
                  <Lock className="size-5 text-clay-butter" />
                </span>
                <span className="flex-1">
                  <span className="font-display block text-base font-extrabold">
                    Admin login
                  </span>
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    Upload, publish and manage the library
                  </span>
                </span>
                <KeyRound className="size-5 text-muted-foreground" />
              </button>
            ) : (
              <AnimatePresence>
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleAdmin}
                  className="clay-sm space-y-3 overflow-hidden p-5"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-clay-butter" />
                    <p className="font-display text-sm font-bold">Admin console</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="adminId" className="text-[11px] font-bold">
                      Admin ID
                    </Label>
                    <Input
                      id="adminId"
                      autoComplete="off"
                      value={adminId}
                      onChange={(event) => setAdminId(event.target.value)}
                      placeholder="Your admin ID"
                      disabled={busy}
                      className="clay-well h-11 rounded-2xl border-none text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-[11px] font-bold">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={reveal ? "text" : "password"}
                        autoComplete="off"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••"
                        disabled={busy}
                        className="clay-well h-11 rounded-2xl border-none pr-11 text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setReveal((prev) => !prev)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={reveal ? "Hide password" : "Show password"}
                      >
                        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="clay-press h-11 w-full rounded-2xl font-bold"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 size-4" />
                        Unlock studio
                      </>
                    )}
                  </Button>

                  <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Admin credentials are managed by the site owner in the Keys
                    tab — reach out if you need studio access.
                  </p>
                </motion.form>
              </AnimatePresence>
            )}

            {error && (
              <p className="mt-4 rounded-2xl bg-destructive/15 px-4 py-3 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}

            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Guests can browse, stream and keep watch history. Uploading,
              editing, publishing and deleting stay locked behind the admin ID.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
