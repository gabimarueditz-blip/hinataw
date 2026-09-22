import { ClayPill, EmptyClay } from "@/components/catalog-ui";
import { clayPosterBackground, hueFromString, initialsOf } from "@/lib/media";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * The cast of Hinataw.exe — original characters from the series in the
 * library. Static roster for now; when admins gain a character manager this
 * can move into Convex without changing the page's shape.
 */
type Character = {
  name: string;
  series: string;
  role: string;
  bio: string;
  traits: string[];
  quote: string;
  accent: number;
};

const CHARACTERS: Character[] = [
  {
    name: "Ayame Kurogane",
    series: "Hinata Protocol",
    role: "The Courier",
    bio: "A courier with a shattered memory who boots the machine every night. Her bloodline is the passphrase, and the city rewrites itself around her deliveries.",
    traits: ["Byakugan-sharp focus", "Never drops a package", "Forgets her own birthday"],
    quote: "If the streets have changed again, I'll just memorize the new ones.",
    accent: 342,
  },
  {
    name: "Nue",
    series: "Hinata Protocol",
    role: "The Machine",
    bio: "The thing under the city that rebuilds the rail map every midnight. It speaks in timetables, imprints on couriers, and is trying — badly — to say sorry.",
    traits: ["Rewrites geography", "Speaks in station chimes", "Imprinted on Ayame"],
    quote: "ROUTE RECALCULATED. APOLOGY ATTACHED. DO NOT OPEN DURING TRANSIT.",
    accent: 258,
  },
  {
    name: "Kaito Mizuhara",
    series: "Hinata Protocol",
    role: "Rival Courier",
    bio: "The only courier faster than Ayame, and the only one who noticed the city's night edits. He delivers secrets to stay ahead of the machine that erased his district.",
    traits: ["Street-map savant", "Rides the rail seams", "Owes everyone ramen"],
    quote: "The shortcut isn't a shortcut until someone dangerous takes it first.",
    accent: 210,
  },
  {
    name: "Sana Hoshikawa",
    series: "Clay Garden Days",
    role: "The Ceramicist",
    bio: "Runs the shared studio with a kiln and far too many feelings. Throws a perfect bowl when she's happy, and a perfect vase when she's not — which says everything.",
    traits: ["Reads glaze charts like horoscopes", "Feeds everyone first", "Cries at good trimming"],
    quote: "Clay remembers every finger that shaped it. That's the scary part.",
    accent: 172,
  },
  {
    name: "Rin Takeda",
    series: "Clay Garden Days",
    role: "Kiln Night Lead",
    bio: "Declared herself in charge of kiln nights because nobody stopped her. Pulls all-night firings, narrates the cones like a sports commentator, hides snack stashes everywhere.",
    traits: ["Kiln whisperer", "Competitive about tea", "Naps in the glaze room"],
    quote: "Cone six at midnight. If it cracks, it was art. If it survives, it was luck.",
    accent: 96,
  },
  {
    name: "Umi Shiozaki",
    series: "Lantern Sea",
    role: "The Lighthouse Keeper",
    bio: "The lantern sea took her village's memory this century, and she swam after it. Keeps one lamp lit for every person whose name she is still trying to remember.",
    traits: ["Longest breath-hold on record", "Names every wave", "Salt in her hair, always"],
    quote: "The sea returns what it takes — it just doesn't promise when.",
    accent: 300,
  },
  {
    name: "Master Tetsu",
    series: "Midnight Ramen Club",
    role: "The 1 A.M. Chef",
    bio: "Opens the underground bar only for people who cannot sleep. Never writes orders down — remembers every bowl, every regular, and every heartbreak that came with them.",
    traits: ["Broth simmers 18 hours", "Never asks twice", "Knows your order means your mood"],
    quote: "Sit down. The usual? No — tonight you'll have what you actually need.",
    accent: 62,
  },
  {
    name: "Mochi",
    series: "Pocket Kaiju",
    role: "Teacup Kaiju",
    bio: "A monster the size of a teacup who refuses to be a metaphor. Tsunami-grade tantrums over misplaced snacks, but guards the apartment balcony like it's Tokyo Bay.",
    traits: ["City-block-level sneeze", "Roars in squeaks", "Loves the radiator"],
    quote: "(A tiny, apocalyptic growl that translates roughly to: feed me.)",
    accent: 200,
  },
  {
    name: "Hana Serizawa",
    series: "Rooftop Physics",
    role: "The Glider Pilot",
    bio: "Builds homemade gliders out of scaffolding and stubbornness. Keeps a notebook of every stall, every wind shear, and every rehearsal of the confession gravity keeps interrupting.",
    traits: ["Calculates lift by feel", "Afraid of escalators", "Logbook 07 and counting"],
    quote: "Gravity always wins. I just want it to win a little later tonight.",
    accent: 350,
  },
];

function CharacterAvatar({ character, className }: { character: Character; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display flex items-center justify-center text-4xl font-extrabold text-white/85 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]",
        className,
      )}
      style={{ backgroundImage: clayPosterBackground(character.accent) }}
    >
      {initialsOf(character.name)}
    </span>
  );
}

export default function Characters() {
  const seriesNames = useMemo(
    () => Array.from(new Set(CHARACTERS.map((character) => character.series))),
    [],
  );
  const [filter, setFilter] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter ? CHARACTERS.filter((character) => character.series === filter) : CHARACTERS),
    [filter],
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
          the cast of hinataw.exe
        </p>
        <h1 className="font-display mt-1 flex items-center gap-2 text-3xl font-extrabold sm:text-4xl">
          <Users className="size-7 text-primary" />
          Anime Characters
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The couriers, ceramicists and teacup kaiju behind the shows — meet
          them before you stream their stories.
        </p>
      </div>

      {/* series filter */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <ClayPill active={filter === null} onClick={() => setFilter(null)}>
          All cast
        </ClayPill>
        {seriesNames.map((name) => (
          <ClayPill
            key={name}
            active={filter === name}
            onClick={() => setFilter(filter === name ? null : name)}
          >
            {name}
          </ClayPill>
        ))}
      </div>

      {/* character grid */}
      {visible.length === 0 ? (
        <EmptyClay
          title="No characters here yet"
          description="Pick another series filter — the cast is still backstage."
          icon={<Users className="size-6" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((character, index) => (
            <motion.article
              key={character.name}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.45 }}
              whileHover={{ y: -5 }}
              className="clay clay-press flex flex-col gap-4 p-5"
            >
              <div className="flex items-center gap-4">
                <CharacterAvatar
                  character={character}
                  className="clay-sm size-16 shrink-0 rounded-[1.3rem]"
                />
                <div className="min-w-0">
                  <h2 className="font-display truncate text-lg font-extrabold">
                    {character.name}
                  </h2>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {character.role} · {character.series}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{character.bio}</p>

              <div className="flex flex-wrap gap-1.5">
                {character.traits.map((trait) => (
                  <span
                    key={trait}
                    className="clay-sm px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              <blockquote
                className="clay-well mt-auto rounded-2xl p-3 text-xs leading-5 font-semibold text-foreground/85 italic"
                style={{ borderLeft: `3px solid oklch(0.7 0.14 ${hueFromString(character.name)})` }}
              >
                “{character.quote}”
              </blockquote>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
