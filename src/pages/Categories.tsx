import { api } from "@/convex/_generated/api";
import { Rail, RailSkeleton, SeriesCard } from "@/components/catalog-ui";
import { clayPosterBackground, hueFromString } from "@/lib/media";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Compass, Film, Flame, Star, Tv } from "lucide-react";
import { Link } from "react-router";

export default function Categories() {
  const genres = useQuery(api.catalog.genres);
  const anime = useQuery(api.catalog.browse, { type: "anime", sort: "latest", limit: 14 });
  const movies = useQuery(api.catalog.browse, { type: "movie", sort: "latest", limit: 14 });
  const top = useQuery(api.catalog.browse, { sort: "top", limit: 14 });
  const trending = useQuery(api.catalog.browse, { sort: "trending", limit: 14 });

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
          pick a mood
        </p>
        <h1 className="font-display mt-1 flex items-center gap-2 text-3xl font-extrabold sm:text-4xl">
          <Compass className="size-7 text-primary" />
          Categories
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every genre in the library, counted live as admins publish.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {genres === undefined
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="clay h-28 animate-pulse" />
            ))
          : genres.map((genre, index) => (
              <motion.div
                key={genre.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.35) }}
              >
                <Link
                  to={`/search?genre=${encodeURIComponent(genre.name)}`}
                  className="clay clay-press flex h-full flex-col justify-between gap-4 p-4 no-underline"
                >
                  <span
                    className="clay-sm flex size-11 items-center justify-center"
                    style={{
                      backgroundImage: clayPosterBackground(hueFromString(genre.name)),
                    }}
                  >
                    <Compass className="size-5 text-white/90" />
                  </span>
                  <span>
                    <span className="font-display block text-base font-bold">
                      {genre.name}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {genre.count} title{genre.count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </motion.div>
            ))}
      </section>

      <Rail
        title="Top rated"
        eyebrow="critics, allegedly"
        icon={<Star className="size-5 text-clay-butter" />}
      >
        {top
          ? top.slice(0, 10).map((series) => (
              <SeriesCard
                key={series._id}
                series={series}
                className="w-[164px] shrink-0 snap-start sm:w-[184px]"
              />
            ))
          : <RailSkeleton count={5} />}
      </Rail>

      <Rail
        title="Trending"
        eyebrow="everyone is watching"
        icon={<Flame className="size-5 text-clay-blush" />}
      >
        {trending
          ? trending.slice(0, 10).map((series) => (
              <SeriesCard
                key={series._id}
                series={series}
                className="w-[164px] shrink-0 snap-start sm:w-[184px]"
              />
            ))
          : <RailSkeleton count={5} />}
      </Rail>

      <div className="grid gap-8 lg:grid-cols-2">
        <Rail
          title="Anime series"
          icon={<Tv className="size-5 text-clay-lilac" />}
          action="All anime"
          actionHref="/search?type=anime"
        >
          {anime
            ? anime.slice(0, 8).map((series) => (
                <SeriesCard
                  key={series._id}
                  series={series}
                  className="w-[152px] shrink-0 snap-start sm:w-[172px]"
                />
              ))
            : <RailSkeleton count={4} />}
        </Rail>
        <Rail
          title="Movies"
          icon={<Film className="size-5 text-clay-sky" />}
          action="All movies"
          actionHref="/search?type=movie"
        >
          {movies
            ? movies.slice(0, 8).map((series) => (
                <SeriesCard
                  key={series._id}
                  series={series}
                  className="w-[152px] shrink-0 snap-start sm:w-[172px]"
                />
              ))
            : <RailSkeleton count={4} />}
        </Rail>
      </div>
    </div>
  );
}
