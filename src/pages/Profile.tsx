import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatClock, timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Play,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const history = useQuery(api.history.recentlyWatched, { limit: 24 }) ?? [];
  const removeEntry = useMutation(api.history.removeEntry);
  const clearAll = useMutation(api.history.clearAll);
  const adminLogin = useMutation(api.admin.adminLogin);
  const lockAdmin = useMutation(api.admin.lockAdmin);

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin({ adminId, password });
      toast.success("Studio unlocked");
      navigate("/studio");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unlock failed.";
      setError(
        message.includes("Invalid") ? "Invalid admin ID or password." : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
          your corner
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">
          Profile & history
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <section className="clay h-fit p-6">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "clay-sm flex size-16 items-center justify-center",
                isAdmin ? "bg-clay-butter/25 text-clay-butter" : "bg-clay-sky/20 text-clay-sky",
              )}
            >
              {isAdmin ? <ShieldCheck className="size-7" /> : <UserRound className="size-7" />}
            </span>
            <div className="min-w-0">
              <p className="font-display truncate text-xl font-extrabold">
                {isAdmin ? "Administrator" : "Guest viewer"}
              </p>
              <p className="truncate text-xs font-semibold text-muted-foreground">
                {user?.email ?? "anonymous session · no email required"}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="clay-well rounded-2xl p-3">
              <dt className="font-bold text-muted-foreground">Access</dt>
              <dd className="font-display mt-0.5 text-sm font-bold">
                {isAdmin ? "Watch + publish" : "Watch only"}
              </dd>
            </div>
            <div className="clay-well rounded-2xl p-3">
              <dt className="font-bold text-muted-foreground">History entries</dt>
              <dd className="font-display mt-0.5 text-sm font-bold">{history.length}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/home">
              <Button variant="secondary" className="clay-sm rounded-full font-bold">
                <Play className="mr-2 size-4" />
                Back to streaming
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Link to="/studio">
                  <Button className="clay-press rounded-full font-bold">
                    <Sparkles className="mr-2 size-4" />
                    Open studio
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="rounded-full font-bold text-muted-foreground"
                  onClick={async () => {
                    await lockAdmin({});
                    toast.success("Studio locked — you are a guest again");
                  }}
                >
                  <Lock className="mr-2 size-4" />
                  Lock studio
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="rounded-full font-bold text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </Button>
          </div>

          {!isAdmin && (
            <form onSubmit={handleUnlock} className="clay-sm mt-6 space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Unlock className="size-4 text-clay-butter" />
                <p className="font-display text-sm font-bold">Unlock the admin studio</p>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Uploads, edits, publishing and deletion stay behind this check.
                Credentials are configured by the site owner, not published
                here.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="profile-admin-id" className="text-[11px] font-bold">
                  Admin ID
                </Label>
                <Input
                  id="profile-admin-id"
                  value={adminId}
                  onChange={(event) => setAdminId(event.target.value)}
                  placeholder="Your admin ID"
                  className="clay-well h-10 rounded-2xl border-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-admin-password" className="text-[11px] font-bold">
                  Password
                </Label>
                <Input
                  id="profile-admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••"
                  className="clay-well h-10 rounded-2xl border-none"
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/15 px-3 py-2 text-[11px] font-semibold text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="clay-press h-10 w-full rounded-2xl font-bold"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 size-4" />
                    Unlock
                  </>
                )}
              </Button>
            </form>
          )}
        </section>

        <section className="clay p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display flex items-center gap-2 text-lg font-bold">
                <Play className="size-4 text-primary" />
                Watch history
              </h2>
              <p className="text-xs text-muted-foreground">
                Used by Continue Watching and resume playback.
              </p>
            </div>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="clay-sm rounded-full text-[11px] font-bold text-muted-foreground"
                onClick={async () => {
                  await clearAll({});
                  toast.success("History cleared");
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Clear all
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="clay-well mt-5 rounded-[1.5rem] px-5 py-10 text-center">
              <p className="font-display text-sm font-bold">Nothing watched yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start an episode and it will show up here with your exact position.
              </p>
              <Link to="/home" className="mt-4 inline-block">
                <Button className="clay-press rounded-full font-bold">
                  Find something to watch
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {history.map((row) => (
                <li key={row._id} className="clay-well flex items-center gap-3 rounded-2xl p-3">
                  <Link
                    to={`/watch/${row.episode._id}`}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <span className="block truncate text-sm font-bold">
                      {row.series.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      Ep {row.episode.episodeNumber} · {row.episode.title} ·{" "}
                      {formatClock(row.positionSeconds)} · {timeAgo(row.updatedAt)}
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/30">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac"
                        style={{ width: `${Math.min(row.progress * 100, 100)}%` }}
                      />
                    </span>
                  </Link>
                  <Link
                    to={`/watch/${row.episode._id}`}
                    className="clay-sm clay-press flex size-9 shrink-0 items-center justify-center text-primary"
                    aria-label="Resume"
                  >
                    <Play className="size-4 fill-current" />
                  </Link>
                  <button
                    type="button"
                    aria-label="Remove from history"
                    onClick={() => void removeEntry({ historyId: row._id })}
                    className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
