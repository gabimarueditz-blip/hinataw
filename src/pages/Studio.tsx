import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PosterArt } from "@/components/catalog-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUploadQueue } from "@/components/upload-queue";
import { GENRE_SUGGESTIONS, formatDuration, timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Eye,
  EyeOff,
  FileVideo,
  Film,
  Info,
  Layers,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Tv,
  Wand2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type ContentType = "anime" | "movie";
type PublishStatus = "published" | "draft";

interface SeriesFormState {
  seriesId?: Id<"series">;
  title: string;
  type: ContentType;
  genres: string[];
  description: string;
  posterUrl: string;
  posterStorageId?: string;
  posterPreview?: string;
  accent: number;
  year: string;
  rating: string;
  trending: boolean;
  publishStatus: PublishStatus;
}

const emptySeries: SeriesFormState = {
  title: "",
  type: "anime",
  genres: [],
  description: "",
  posterUrl: "",
  accent: 320,
  year: String(new Date().getFullYear()),
  rating: "",
  trending: false,
  publishStatus: "draft",
};

function parseDuration(input: string) {
  const value = input.trim();
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(":").map((part) => Number(part) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function StatusPill({ status }: { status: PublishStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
        status === "published"
          ? "bg-clay-mint/20 text-clay-mint"
          : "bg-clay-butter/20 text-clay-butter",
      )}
    >
      {status}
    </span>
  );
}

export default function Studio() {
  const me = useQuery(api.admin.me);
  const isAdmin = me?.isAdmin === true;

  if (me === undefined) {
    return (
      <div className="clay flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return <UnlockCard />;

  return <StudioWorkspace />;
}

function UnlockCard() {
  const adminLogin = useMutation(api.admin.adminLogin);
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin({ adminId, password });
      toast.success("Studio unlocked");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unlock failed.";
      setError(message.includes("Invalid") ? "Invalid admin ID or password." : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="clay p-7">
        <span className="clay-sm mx-auto flex size-14 items-center justify-center text-clay-butter">
          <Lock className="size-6" />
        </span>
        <h1 className="font-display mt-4 text-center text-2xl font-extrabold">
          Studio is locked
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Only the admin ID can upload, edit, publish or delete content.
        </p>

        <div className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="studio-id" className="text-[11px] font-bold">
              Admin ID
            </Label>
            <Input
              id="studio-id"
              value={adminId}
              onChange={(event) => setAdminId(event.target.value)}
              placeholder="7788"
              className="clay-well h-11 rounded-2xl border-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-password" className="text-[11px] font-bold">
              Password
            </Label>
            <Input
              id="studio-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••"
              className="clay-well h-11 rounded-2xl border-none"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-destructive/15 px-3 py-2 text-[11px] font-semibold text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="clay-press h-11 w-full rounded-2xl font-bold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Unlock studio"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setAdminId("7788");
              setPassword("123");
            }}
            className="w-full rounded-2xl bg-clay-mint/15 px-3 py-2 text-[11px] font-bold text-clay-mint"
          >
            Fill demo credentials (7788 / 123)
          </button>
        </div>

        <Link
          to="/home"
          className="mt-5 block text-center text-[11px] font-semibold text-muted-foreground no-underline hover:text-foreground"
        >
          ← back to streaming
        </Link>
      </form>
    </div>
  );
}

function StudioWorkspace() {
  const overview = useQuery(api.catalog.studioOverview, {});
  const saveSeries = useMutation(api.catalog.saveSeries);
  const setSeriesStatus = useMutation(api.catalog.setSeriesStatus);
  const deleteSeries = useMutation(api.catalog.deleteSeries);
  const saveEpisode = useMutation(api.catalog.saveEpisode);
  const setEpisodeStatus = useMutation(api.catalog.setEpisodeStatus);
  const deleteEpisode = useMutation(api.catalog.deleteEpisode);
  const createUploadUrl = useMutation(api.uploads.createUploadUrl);
  const inspectLink = useQuery;
  const analyzeStream = useAction(api.videos.analyzeStream);
  const ingestWithApiVideo = useAction(api.videos.ingestWithApiVideo);
  const { enqueue } = useUploadQueue();

  const [tab, setTab] = useState("library");
  const [form, setForm] = useState<SeriesFormState>(emptySeries);
  const [genreDraft, setGenreDraft] = useState("");
  const [savingSeries, setSavingSeries] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Id<"series"> | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const detail = useQuery(
    api.catalog.adminSeries,
    selectedSeries ? { seriesId: selectedSeries } : "skip",
  );
  const activity = useQuery(api.admin.recentActivity, {});

  const episodeCounts = overview?.episodeCounts ?? {};
  const seriesList = overview?.series ?? [];

  const editingSeries = useMemo(
    () => seriesList.find((item) => item._id === form.seriesId) ?? null,
    [seriesList, form.seriesId],
  );

  const addGenre = (value: string) => {
    const genre = value.trim();
    if (!genre) return;
    setForm((prev) =>
      prev.genres.some((item) => item.toLowerCase() === genre.toLowerCase())
        ? prev
        : { ...prev, genres: [...prev.genres, genre] },
    );
    setGenreDraft("");
  };

  const startEdit = (seriesId: Id<"series">) => {
    const target = seriesList.find((item) => item._id === seriesId);
    if (!target) return;
    setForm({
      seriesId: target._id,
      title: target.title,
      type: target.type,
      genres: [...target.genres],
      description: target.description,
      posterUrl: target.posterUrl ?? "",
      posterStorageId: undefined,
      posterPreview: target.posterUrl,
      accent: target.accent ?? 320,
      year: target.year ? String(target.year) : "",
      rating: target.rating ? String(target.rating) : "",
      trending: Boolean(target.trending),
      publishStatus: target.publishStatus,
    });
    setTab("series");
  };

  const handlePosterFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Posters must be image files (jpg, png, webp).");
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, posterPreview: preview }));
    const { promise } = enqueue({
      file,
      kind: "poster",
      label: `Poster · ${file.name}`,
      requestUrl: () => createUploadUrl({}),
    });
    try {
      const storageId = await promise;
      setForm((prev) => ({ ...prev, posterStorageId: storageId }));
      toast.success("Poster uploaded");
    } catch {
      toast.error("Poster upload failed — retry it from the transfer dock.");
    }
  };

  const submitSeries = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      toast.error("Give the series a title first.");
      return;
    }
    setSavingSeries(true);
    try {
      await saveSeries({
        seriesId: form.seriesId,
        title: form.title,
        type: form.type,
        genres: form.genres,
        description: form.description,
        posterUrl: form.posterUrl || undefined,
        posterStorageId: form.posterStorageId,
        accent: Number(form.accent) || 320,
        year: form.year ? Number(form.year) : undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        trending: form.trending,
        publishStatus: form.publishStatus,
      });
      toast.success(form.seriesId ? "Series updated" : "Series created");
      setForm(emptySeries);
      setTab("library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the series.");
    } finally {
      setSavingSeries(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-clay-butter uppercase">
            admin studio
          </p>
          <h1 className="font-display mt-1 flex items-center gap-2 text-3xl font-extrabold sm:text-4xl">
            <Sparkles className="size-7 text-clay-butter" />
            Hinataw.exe control room
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload files or paste links, tag genres, then flip content live.
          </p>
        </div>
        <span className="clay-sm flex w-fit items-center gap-2 px-4 py-2 text-[11px] font-bold text-clay-mint">
          <ShieldCheck className="size-3.5" />
          Verified admin session
        </span>
      </div>

      {/* ------------------------------- stats ------------------------------- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Titles", value: overview?.totals.series ?? 0, icon: Film },
          { label: "Published", value: overview?.totals.published ?? 0, icon: Eye },
          { label: "Drafts", value: overview?.totals.drafts ?? 0, icon: EyeOff },
          { label: "Episodes", value: overview?.totals.episodes ?? 0, icon: Layers },
          {
            label: "Minutes watched",
            value: overview?.totals.minutesStreamed ?? 0,
            icon: TrendingUp,
          },
        ].map((stat) => (
          <div key={stat.label} className="clay p-4">
            <stat.icon className="size-4 text-clay-mint" />
            <p className="font-display mt-2 text-2xl font-extrabold">{stat.value}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="clay-sm h-auto w-full flex-wrap justify-start gap-1 rounded-[1.4rem] p-1.5">
          <TabsTrigger value="library" className="rounded-2xl px-4 py-2 text-xs font-bold">
            Library
          </TabsTrigger>
          <TabsTrigger value="series" className="rounded-2xl px-4 py-2 text-xs font-bold">
            {form.seriesId ? "Edit series" : "New series"}
          </TabsTrigger>
          <TabsTrigger value="episodes" className="rounded-2xl px-4 py-2 text-xs font-bold">
            Episodes & uploads
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-2xl px-4 py-2 text-xs font-bold">
            Activity
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------ library ------------------------------ */}
        <TabsContent value="library" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Series library</h2>
            <Button
              className="clay-press rounded-full font-bold"
              onClick={() => {
                setForm(emptySeries);
                setTab("series");
              }}
            >
              <Plus className="mr-2 size-4" />
              New series
            </Button>
          </div>

          {seriesList.length === 0 ? (
            <div className="clay-well rounded-[1.5rem] px-5 py-12 text-center">
              <p className="font-display text-sm font-bold">The shelf is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first series, then upload episodes to it.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {seriesList.map((series) => (
                <li key={series._id} className="clay flex flex-wrap items-center gap-4 p-3 sm:p-4">
                  <span className="clay-well h-20 w-14 shrink-0 overflow-hidden rounded-2xl">
                    <PosterArt series={series} rounded="rounded-xl" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display truncate text-base font-bold">
                        {series.title}
                      </p>
                      <StatusPill status={series.publishStatus} />
                      {series.trending && (
                        <span className="rounded-full bg-clay-blush/20 px-2.5 py-1 text-[10px] font-bold text-clay-blush uppercase">
                          trending
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {series.type === "anime" ? "Anime" : "Movie"} ·{" "}
                      {episodeCounts[series._id] ?? 0} episode
                      {(episodeCounts[series._id] ?? 0) === 1 ? "" : "s"} ·{" "}
                      {series.genres.join(", ") || "no genres"} · updated{" "}
                      {timeAgo(series.updatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="clay-sm rounded-full text-[11px] font-bold"
                      onClick={() =>
                        void setSeriesStatus({
                          seriesId: series._id,
                          publishStatus:
                            series.publishStatus === "published" ? "draft" : "published",
                        })
                      }
                    >
                      {series.publishStatus === "published" ? (
                        <>
                          <EyeOff className="mr-1.5 size-3.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 size-3.5" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="clay-sm rounded-full text-[11px] font-bold"
                      onClick={() => {
                        setSelectedSeries(series._id);
                        setTab("episodes");
                      }}
                    >
                      <Layers className="mr-1.5 size-3.5" />
                      Episodes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-[11px] font-bold"
                      onClick={() => startEdit(series._id)}
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      Edit
                    </Button>
                    {confirmKey === series._id ? (
                      <span className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full text-[11px] font-bold"
                          onClick={async () => {
                            await deleteSeries({ seriesId: series._id });
                            toast.success("Series deleted");
                            setConfirmKey(null);
                          }}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-[11px]"
                          onClick={() => setConfirmKey(null)}
                        >
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-[11px] font-bold text-destructive hover:text-destructive"
                        onClick={() => setConfirmKey(series._id)}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------------------------------ series form ------------------------------ */}
        <TabsContent value="series">
          <form onSubmit={submitSeries} className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <div className="clay space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">
                  {form.seriesId ? "Edit series" : "Create a series"}
                </h2>
                {form.seriesId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-[11px] font-bold"
                    onClick={() => setForm(emptySeries)}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Start fresh
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="series-title" className="text-[11px] font-bold">
                  Series name
                </Label>
                <Input
                  id="series-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Hinata Protocol"
                  className="clay-well h-11 rounded-2xl border-none font-semibold"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Type</Label>
                  <div className="flex gap-2">
                    {(["anime", "movie"] as ContentType[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, type: value })}
                        className={cn(
                          "clay-press flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold",
                          form.type === value
                            ? "bg-primary text-primary-foreground"
                            : "clay-sm text-muted-foreground",
                        )}
                      >
                        {value === "anime" ? (
                          <Tv className="size-3.5" />
                        ) : (
                          <Film className="size-3.5" />
                        )}
                        {value === "anime" ? "Anime" : "Movie"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Publish state</Label>
                  <div className="flex gap-2">
                    {(["published", "draft"] as PublishStatus[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, publishStatus: value })}
                        className={cn(
                          "clay-press flex-1 rounded-2xl px-3 py-2.5 text-xs font-bold capitalize",
                          form.publishStatus === value
                            ? "bg-primary text-primary-foreground"
                            : "clay-sm text-muted-foreground",
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="series-description" className="text-[11px] font-bold">
                  Description
                </Label>
                <Textarea
                  id="series-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="What is this story about?"
                  rows={4}
                  className="clay-well rounded-2xl border-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold">Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {form.genres.map((genre) => (
                    <span
                      key={genre}
                      className="clay-sm flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold"
                    >
                      {genre}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            genres: form.genres.filter((item) => item !== genre),
                          })
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={genreDraft}
                    onChange={(event) => setGenreDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addGenre(genreDraft);
                      }
                    }}
                    placeholder="Add a genre and press Enter"
                    className="clay-well h-10 rounded-2xl border-none text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="clay-sm rounded-2xl font-bold"
                    onClick={() => addGenre(genreDraft)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_SUGGESTIONS.filter(
                    (genre) =>
                      !form.genres.some(
                        (item) => item.toLowerCase() === genre.toLowerCase(),
                      ),
                  )
                    .slice(0, 8)
                    .map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => addGenre(genre)}
                        className="rounded-full bg-foreground/8 px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        + {genre}
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="series-year" className="text-[11px] font-bold">
                    Year
                  </Label>
                  <Input
                    id="series-year"
                    value={form.year}
                    onChange={(event) => setForm({ ...form, year: event.target.value })}
                    className="clay-well h-10 rounded-2xl border-none text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="series-rating" className="text-[11px] font-bold">
                    Rating (0-10)
                  </Label>
                  <Input
                    id="series-rating"
                    value={form.rating}
                    onChange={(event) => setForm({ ...form, rating: event.target.value })}
                    placeholder="8.7"
                    className="clay-well h-10 rounded-2xl border-none text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Trending</Label>
                  <div className="clay-well flex h-10 items-center justify-between rounded-2xl px-3">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {form.trending ? "Featured" : "Normal"}
                    </span>
                    <Switch
                      checked={form.trending}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, trending: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* poster + accent */}
            <div className="space-y-4">
              <div className="clay p-6">
                <h3 className="font-display text-base font-bold">Poster art</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Upload a 2:3 image, or leave it empty for the generated clay
                  gradient.
                </p>

                <div className="mt-4 flex gap-4">
                  <span className="clay-well aspect-2/3 w-28 shrink-0 overflow-hidden rounded-2xl">
                    <PosterArt
                      series={{
                        title: form.title || "Untitled",
                        posterUrl: form.posterPreview || form.posterUrl || undefined,
                        accent: Number(form.accent),
                      }}
                      rounded="rounded-xl"
                    />
                  </span>
                  <div className="flex-1 space-y-2">
                    <label className="clay-sm clay-press flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[11px] font-bold">
                      <CloudUpload className="size-4 text-clay-mint" />
                      Upload poster
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handlePosterFile(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <Input
                      value={form.posterUrl}
                      onChange={(event) =>
                        setForm({ ...form, posterUrl: event.target.value })
                      }
                      placeholder="…or paste an image URL"
                      className="clay-well h-10 rounded-2xl border-none text-[11px]"
                    />
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">
                        Clay accent · hue {form.accent}
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={form.accent}
                        onChange={(event) =>
                          setForm({ ...form, accent: Number(event.target.value) })
                        }
                        className="w-full accent-[var(--clay-blush)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {editingSeries && (
                <div className="clay p-6">
                  <h3 className="font-display text-base font-bold">Live preview</h3>
                  <div className="clay-well mt-3 rounded-2xl p-4">
                    <p className="font-display text-lg font-bold">
                      {form.title || "Untitled series"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {form.type === "anime" ? "Anime" : "Movie"}
                      {form.year ? ` · ${form.year}` : ""}
                      {form.rating ? ` · ${form.rating}★` : ""}
                    </p>
                    <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                      {form.description || "No description yet."}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={savingSeries}
                size="lg"
                className="clay-press h-12 w-full rounded-2xl font-bold"
              >
                {savingSeries ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    {form.seriesId ? "Save changes" : "Create series"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ------------------------------ episodes ------------------------------ */}
        <TabsContent value="episodes" className="space-y-5">
          <EpisodeManager
            seriesList={seriesList}
            selectedSeries={selectedSeries}
            onSelect={setSelectedSeries}
            detail={detail}
            saveEpisode={saveEpisode}
            setEpisodeStatus={setEpisodeStatus}
            deleteEpisode={deleteEpisode}
            createUploadUrl={createUploadUrl}
            enqueue={enqueue}
            analyzeStream={analyzeStream}
            ingestWithApiVideo={ingestWithApiVideo}
            inspectLink={inspectLink}
          />
        </TabsContent>

        {/* ------------------------------ activity ------------------------------ */}
        <TabsContent value="activity" className="space-y-4">
          <div className="clay p-6">
            <h2 className="font-display text-lg font-bold">Security notes</h2>
            <ul className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-clay-mint" />
                Admin credentials are verified inside a Convex mutation — the
                password never ships to the browser and every admin mutation
                re-checks the role server-side.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-clay-mint" />
                Set <code className="text-foreground">ADMIN_ID</code> and{" "}
                <code className="text-foreground">ADMIN_PASSWORD</code> in the Keys
                tab to replace the demo 7788 / 123 pair.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-clay-mint" />
                Add <code className="text-foreground">API_VIDEO_API_KEY</code> to
                turn on automatic 480p / 720p / 1080p HLS transcoding for 1 GB+
                uploads.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-clay-mint" />
                Playback is stream-only: the player never renders a download
                control, and links are validated before they are stored.
              </li>
            </ul>
          </div>

          <div className="clay p-6">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <Activity className="size-4 text-clay-butter" />
              Recent admin activity
            </h2>
            {activity && activity.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {activity.map((row) => (
                  <li
                    key={row._id}
                    className="clay-well flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs"
                  >
                    <span className="font-semibold">{row.action}</span>
                    <span className="text-muted-foreground">{timeAgo(row.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Nothing logged yet.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================================================================== */
/* Episode manager                                                       */
/* ==================================================================== */

interface EpisodeManagerProps {
  seriesList: Array<{
    _id: Id<"series">;
    title: string;
    type: ContentType;
    publishStatus: PublishStatus;
  }>;
  selectedSeries: Id<"series"> | null;
  onSelect: (id: Id<"series">) => void;
  detail:
    | {
        episodes: Array<{
          _id: Id<"episodes">;
          episodeNumber: number;
          title: string;
          videoUrl: string;
          hlsUrl?: string;
          durationSeconds?: number;
          publishStatus: PublishStatus;
          sourceKind?: string;
        }>;
      }
    | null
    | undefined;
  saveEpisode: ReturnType<typeof useMutation<typeof api.catalog.saveEpisode>>;
  setEpisodeStatus: ReturnType<typeof useMutation<typeof api.catalog.setEpisodeStatus>>;
  deleteEpisode: ReturnType<typeof useMutation<typeof api.catalog.deleteEpisode>>;
  createUploadUrl: ReturnType<typeof useMutation<typeof api.uploads.createUploadUrl>>;
  enqueue: ReturnType<typeof useUploadQueue>["enqueue"];
  analyzeStream: (args: { url: string }) => Promise<{
    kind: "hls" | "file";
    hlsUrl?: string;
    qualities: { label: string; url: string }[];
    message: string;
  }>;
  ingestWithApiVideo: (args: {
    title: string;
    url: string;
  }) => Promise<{ hlsUrl: string; playerUrl: string; videoId: string }>;
  inspectLink: typeof useQuery;
}

function EpisodeManager({
  seriesList,
  selectedSeries,
  onSelect,
  detail,
  saveEpisode,
  setEpisodeStatus,
  deleteEpisode,
  createUploadUrl,
  enqueue,
  analyzeStream,
  ingestWithApiVideo,
}: EpisodeManagerProps) {
  const inspectLink = useAction(api.uploads.inspectLink);
  const [mode, setMode] = useState<"file" | "link" | "api">("link");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("published");

  const [link, setLink] = useState("");
  const [linkInfo, setLinkInfo] = useState<{
    ok: boolean;
    kind: "hls" | "file";
    directUrl: string;
    host: string;
    notes: string[];
  } | null>(null);
  const [qualities, setQualities] = useState<{ label: string; url: string }[]>([]);
  const [checking, setChecking] = useState(false);
  const [apiVideoResult, setApiVideoResult] = useState<{
    hlsUrl: string;
    playerUrl: string;
    videoId: string;
  } | null>(null);
  const [videoStorageId, setVideoStorageId] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const episodes = detail?.episodes ?? [];

  const activeSeries = seriesList.find((item) => item._id === selectedSeries);

  const checkLink = async () => {
    if (!link.trim()) {
      toast.error("Paste a link first.");
      return;
    }
    setChecking(true);
    setApiVideoResult(null);
    try {
      const info = await inspectLink({ url: link.trim() });
      setLinkInfo(info);
      if (!info.ok) {
        toast.error(info.notes[0] ?? "That link cannot be used.");
        return;
      }
      const analysis = await analyzeStream({ url: info.directUrl });
      setQualities(analysis.qualities ?? []);
      toast.success(analysis.message);
    } catch (err) {
      setLinkInfo({
        ok: true,
        kind: "file",
        directUrl: link.trim(),
        host: "",
        notes: [
          "Could not pre-inspect the stream (host blocked the check). The player will still try to play it natively.",
        ],
      });
      setQualities([{ label: "Auto", url: link.trim() }]);
      toast.warning(err instanceof Error ? err.message : "Stream check failed.");
    } finally {
      setChecking(false);
    }
  };

  const ingest = async () => {
    if (!link.trim()) {
      toast.error("Paste a link first.");
      return;
    }
    setChecking(true);
    try {
      const result = await ingestWithApiVideo({
        title: title || `${activeSeries?.title ?? "Episode"}`,
        url: link.trim(),
      });
      setApiVideoResult(result);
      setQualities([{ label: "Auto", url: result.hlsUrl }]);
      toast.success("api.video is transcoding — HLS playback URL ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "api.video ingest failed.");
    } finally {
      setChecking(false);
    }
  };

  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name)) {
      toast.error("Only video files are accepted.");
      return;
    }
    setVideoName(file.name);
    const { promise } = enqueue({
      file,
      kind: "video",
      label: `Episode · ${file.name}`,
      requestUrl: () => createUploadUrl({}),
    });
    toast.info("Upload started — it keeps running while you browse.");
    try {
      const storageId = await promise;
      setVideoStorageId(storageId);
      toast.success("Video uploaded and ready to attach");
    } catch {
      setVideoName(null);
      toast.error("Upload failed — retry from the transfer dock.");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSeries) {
      toast.error("Pick a series for this episode.");
      return;
    }

    const number = Number(episodeNumber) || episodes.length + 1;
    const durationSeconds = parseDuration(duration) || undefined;

    if (mode === "file" && !videoStorageId) {
      toast.error("Upload a video file first (or switch to link mode).");
      return;
    }
    if (mode !== "file" && !apiVideoResult && !linkInfo) {
      toast.error("Validate or paste a stream link first.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "file") {
        await saveEpisode({
          seriesId: selectedSeries,
          episodeNumber: number,
          title: title || `Episode ${number}`,
          description: description || undefined,
          videoStorageId: videoStorageId ?? undefined,
          sourceKind: "file",
          durationSeconds,
          publishStatus,
        });
      } else if (mode === "api" && apiVideoResult) {
        await saveEpisode({
          seriesId: selectedSeries,
          episodeNumber: number,
          title: title || `Episode ${number}`,
          description: description || undefined,
          videoUrl: apiVideoResult.hlsUrl,
          hlsUrl: apiVideoResult.hlsUrl,
          qualities: [{ label: "Auto", url: apiVideoResult.hlsUrl }],
          sourceKind: "api.video",
          durationSeconds,
          publishStatus,
        });
      } else {
        const direct = apiVideoResult?.hlsUrl ?? linkInfo?.directUrl ?? link.trim();
        await saveEpisode({
          seriesId: selectedSeries,
          episodeNumber: number,
          title: title || `Episode ${number}`,
          description: description || undefined,
          videoUrl: direct,
          hlsUrl: direct.toLowerCase().includes(".m3u8") ? direct : undefined,
          qualities: qualities.length > 0 ? qualities : [{ label: "Auto", url: direct }],
          sourceKind: direct.toLowerCase().includes(".m3u8") ? "hls" : "link",
          durationSeconds,
          publishStatus,
        });
      }

      toast.success(`Episode ${number} saved`);
      setEpisodeNumber("");
      setTitle("");
      setDescription("");
      setDuration("");
      setLink("");
      setLinkInfo(null);
      setQualities([]);
      setVideoStorageId(null);
      setVideoName(null);
      setApiVideoResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the episode.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="clay p-5">
        <h2 className="font-display text-lg font-bold">Choose a series</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Episodes are attached to the series you pick here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {seriesList.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Create a series first.
            </span>
          )}
          {seriesList.map((series) => (
            <button
              key={series._id}
              type="button"
              onClick={() => onSelect(series._id)}
              className={cn(
                "clay-press rounded-full px-4 py-2 text-xs font-bold",
                selectedSeries === series._id
                  ? "bg-primary text-primary-foreground"
                  : "clay-sm text-muted-foreground",
              )}
            >
              {series.title}
            </button>
          ))}
        </div>
      </div>

      {selectedSeries ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={submit} className="clay space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-bold">
                Add episode to {activeSeries?.title}
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Upload a file (background, resumable, progress-tracked) or paste a
                validated link.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[5rem_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="episode-number" className="text-[11px] font-bold">
                  Ep #
                </Label>
                <Input
                  id="episode-number"
                  inputMode="numeric"
                  value={episodeNumber}
                  onChange={(event) => setEpisodeNumber(event.target.value)}
                  placeholder={String(episodes.length + 1)}
                  className="clay-well h-11 rounded-2xl border-none font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="episode-title" className="text-[11px] font-bold">
                  Episode title
                </Label>
                <Input
                  id="episode-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Boot Sequence"
                  className="clay-well h-11 rounded-2xl border-none font-semibold"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="episode-duration" className="text-[11px] font-bold">
                  Length (mm:ss)
                </Label>
                <Input
                  id="episode-duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="24:10"
                  className="clay-well h-11 rounded-2xl border-none font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold">Publish</Label>
                <div className="flex gap-2">
                  {(["published", "draft"] as PublishStatus[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPublishStatus(value)}
                      className={cn(
                        "clay-press flex-1 rounded-2xl px-3 py-2.5 text-xs font-bold capitalize",
                        publishStatus === value
                          ? "bg-primary text-primary-foreground"
                          : "clay-sm text-muted-foreground",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="episode-description" className="text-[11px] font-bold">
                Episode description
              </Label>
              <Textarea
                id="episode-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional summary shown under the player."
                className="clay-well rounded-2xl border-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold">Video source</Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "file", label: "Upload file", icon: FileVideo },
                    { value: "link", label: "Paste link", icon: Link2 },
                    { value: "api", label: "api.video", icon: Wand2 },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "clay-press flex flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-bold",
                      mode === option.value
                        ? "bg-primary text-primary-foreground"
                        : "clay-sm text-muted-foreground",
                    )}
                  >
                    <option.icon className="size-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "file" && (
              <div className="clay-well space-y-2 rounded-2xl p-4">
                <label className="clay-sm clay-press flex cursor-pointer items-center gap-2 px-3 py-3 text-xs font-bold">
                  <CloudUpload className="size-4 text-clay-mint" />
                  {videoName ? "Choose a different file" : "Select a video file"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleVideoFile(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {videoName && (
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    {videoStorageId ? (
                      <CheckCircle2 className="size-3.5 text-clay-mint" />
                    ) : (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    {videoName}
                    {videoStorageId ? " · uploaded" : " · uploading in background"}
                  </p>
                )}
                <p className="text-[10px] leading-5 text-muted-foreground">
                  Uploads continue while you navigate, show live progress in the
                  dock, and auto-retry up to 4 times on network drops.
                </p>
              </div>
            )}

            {(mode === "link" || mode === "api") && (
              <div className="clay-well space-y-3 rounded-2xl p-4">
                <div className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(event) => {
                      setLink(event.target.value);
                      setLinkInfo(null);
                    }}
                    placeholder={
                      mode === "api"
                        ? "https://… direct video or Drive link"
                        : "https://… .m3u8 or mp4 / Drive link"
                    }
                    className="clay-sm h-11 rounded-2xl border-none text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="clay-sm rounded-2xl font-bold"
                    disabled={checking}
                    onClick={mode === "api" ? ingest : checkLink}
                  >
                    {checking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : mode === "api" ? (
                      <Wand2 className="size-4" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </Button>
                </div>

                {linkInfo && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold">
                      {linkInfo.ok ? (
                        <CheckCircle2 className="size-3.5 text-clay-mint" />
                      ) : (
                        <AlertTriangle className="size-3.5 text-destructive" />
                      )}
                      {linkInfo.kind === "hls" ? "Adaptive HLS" : "Direct stream"}
                      {linkInfo.host ? ` · ${linkInfo.host}` : ""}
                    </p>
                    {linkInfo.notes.map((note) => (
                      <p
                        key={note}
                        className="flex gap-1.5 text-[10px] leading-5 text-muted-foreground"
                      >
                        <Info className="mt-0.5 size-3 shrink-0" />
                        {note}
                      </p>
                    ))}
                    <p className="truncate text-[10px] text-muted-foreground">
                      resolved: {linkInfo.directUrl}
                    </p>
                  </div>
                )}

                {apiVideoResult && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-clay-mint">
                      <CheckCircle2 className="size-3.5" />
                      api.video asset {apiVideoResult.videoId}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {apiVideoResult.hlsUrl}
                    </p>
                  </div>
                )}

                {qualities.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {qualities.map((quality) => (
                      <span
                        key={quality.label}
                        className="rounded-full bg-clay-mint/15 px-2.5 py-1 text-[10px] font-bold text-clay-mint"
                      >
                        {quality.label}
                      </span>
                    ))}
                  </div>
                )}

                {mode === "api" && (
                  <p className="flex gap-1.5 text-[10px] leading-5 text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" />
                    Requires API_VIDEO_API_KEY in the Keys tab. Without it, use a
                    file upload or a direct HLS link.
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={saving}
              className="clay-press h-12 w-full rounded-2xl font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Save episode
                </>
              )}
            </Button>
          </form>

          <div className="clay p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Episodes ({episodes.length})
              </h2>
              <Link
                to={`/series/${selectedSeries}`}
                className="clay-sm clay-press px-3 py-1.5 text-[11px] font-bold text-muted-foreground no-underline hover:text-foreground"
              >
                View page
              </Link>
            </div>

            {detail === undefined ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="clay-well h-16 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : episodes.length === 0 ? (
              <div className="clay-well mt-4 rounded-2xl px-4 py-10 text-center text-xs text-muted-foreground">
                No episodes yet — add the first one on the left.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {episodes.map((episode) => (
                  <motion.li
                    key={episode._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="clay-well flex flex-wrap items-center gap-3 rounded-2xl p-3"
                  >
                    <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-extrabold text-primary">
                      {episode.episodeNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{episode.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {episode.sourceKind ?? "link"} ·{" "}
                        {episode.durationSeconds
                          ? formatDuration(episode.durationSeconds)
                          : "length unknown"}
                        {episode.hlsUrl ? " · HLS" : ""}
                      </p>
                    </div>
                    <StatusPill status={episode.publishStatus} />
                    <Link
                      to={`/watch/${episode._id}`}
                      className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Preview episode"
                    >
                      <Play className="size-3.5" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-[10px] font-bold"
                      onClick={() =>
                        void setEpisodeStatus({
                          episodeId: episode._id,
                          publishStatus:
                            episode.publishStatus === "published" ? "draft" : "published",
                        })
                      }
                    >
                      {episode.publishStatus === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    {confirmKey === episode._id ? (
                      <span className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full text-[10px] font-bold"
                          onClick={async () => {
                            await deleteEpisode({ episodeId: episode._id });
                            toast.success("Episode deleted");
                            setConfirmKey(null);
                          }}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-[10px]"
                          onClick={() => setConfirmKey(null)}
                        >
                          No
                        </Button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete episode"
                        onClick={() => setConfirmKey(episode._id)}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="clay-well rounded-[1.5rem] px-5 py-12 text-center text-sm text-muted-foreground">
          Pick a series above to manage its episodes.
        </div>
      )}
    </div>
  );
}
