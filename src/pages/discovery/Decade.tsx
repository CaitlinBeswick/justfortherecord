import { Navbar } from "@/components/Navbar";
import { DiscoveryNav } from "@/components/discovery/DiscoveryNav";
// import { EssentialAlbumsSection } from "@/components/discovery/EssentialAlbumsSection";
import { Footer } from "@/components/Footer";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  searchReleases,
  getYear,
  getArtistNames,
  type MBReleaseGroup,
} from "@/services/musicbrainz";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumCoverWithFallback } from "@/components/AlbumCoverWithFallback";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const DECADE_NAMES: Record<string, string> = {
  "2020-2029": "2020s",
  "2010-2019": "2010s",
  "2000-2009": "2000s",
  "1990-1999": "1990s",
  "1980-1989": "1980s",
  "1970-1979": "1970s",
  "1960-1969": "1960s",
  "1900-1959": "Pre-1960",
};

const DECADE_COLORS: Record<string, string> = {
  "2020s": "from-violet-500 to-fuchsia-500",
  "2010s": "from-cyan-500 to-teal-500",
  "2000s": "from-rose-500 to-pink-500",
  "1990s": "from-emerald-500 to-green-500",
  "1980s": "from-orange-500 to-amber-500",
  "1970s": "from-yellow-500 to-lime-500",
  "1960s": "from-indigo-500 to-purple-500",
  "Pre-1960": "from-stone-500 to-neutral-600",
};

// Essential albums for each era - curated classics
const ESSENTIAL_ALBUMS: Record<string, { title: string; artist: string }[]> = {
  "2020s": [
    { title: "Fetch the Bolt Cutters", artist: "Fiona Apple" },
    { title: "Future Nostalgia", artist: "Dua Lipa" },
    { title: "folklore", artist: "Taylor Swift" },
    { title: "RENAISSANCE", artist: "Beyoncé" },
    { title: "Mr. Morale & The Big Steppers", artist: "Kendrick Lamar" },
    { title: "SOS", artist: "SZA" },
  ],
  "2010s": [
    { title: "To Pimp a Butterfly", artist: "Kendrick Lamar" },
    { title: "Blonde", artist: "Frank Ocean" },
    { title: "Lemonade", artist: "Beyoncé" },
    { title: "My Beautiful Dark Twisted Fantasy", artist: "Kanye West" },
    { title: "Random Access Memories", artist: "Daft Punk" },
    { title: "Channel Orange", artist: "Frank Ocean" },
  ],
  "2000s": [
    { title: "Kid A", artist: "Radiohead" },
    { title: "In Rainbows", artist: "Radiohead" },
    { title: "Is This It", artist: "The Strokes" },
    { title: "Funeral", artist: "Arcade Fire" },
    { title: "The Blueprint", artist: "JAY-Z" },
    { title: "Stankonia", artist: "OutKast" },
  ],
  "1990s": [
    { title: "OK Computer", artist: "Radiohead" },
    { title: "Nevermind", artist: "Nirvana" },
    { title: "The Miseducation of Lauryn Hill", artist: "Lauryn Hill" },
    { title: "Illmatic", artist: "Nas" },
    { title: "Loveless", artist: "My Bloody Valentine" },
    { title: "Achtung Baby", artist: "U2" },
  ],
  "1980s": [
    { title: "Purple Rain", artist: "Prince" },
    { title: "Thriller", artist: "Michael Jackson" },
    { title: "The Joshua Tree", artist: "U2" },
    { title: "Remain in Light", artist: "Talking Heads" },
    { title: "Sign o' the Times", artist: "Prince" },
    { title: "Disintegration", artist: "The Cure" },
  ],
  "1970s": [
    { title: "Rumours", artist: "Fleetwood Mac" },
    { title: "The Dark Side of the Moon", artist: "Pink Floyd" },
    { title: "Songs in the Key of Life", artist: "Stevie Wonder" },
    { title: "Led Zeppelin IV", artist: "Led Zeppelin" },
    { title: "What's Going On", artist: "Marvin Gaye" },
    { title: "Horses", artist: "Patti Smith" },
  ],
  "1960s": [
    { title: "Sgt. Pepper's Lonely Hearts Club Band", artist: "The Beatles" },
    { title: "Pet Sounds", artist: "The Beach Boys" },
    { title: "Abbey Road", artist: "The Beatles" },
    { title: "Kind of Blue", artist: "Miles Davis" },
    { title: "Are You Experienced", artist: "The Jimi Hendrix Experience" },
    { title: "The Velvet Underground & Nico", artist: "The Velvet Underground" },
  ],
  "Pre-1960": [
    { title: "Kind of Blue", artist: "Miles Davis" },
    { title: "Time Out", artist: "The Dave Brubeck Quartet" },
    { title: "Ella and Louis", artist: "Ella Fitzgerald & Louis Armstrong" },
    { title: "Blue Train", artist: "John Coltrane" },
    { title: "Birth of the Cool", artist: "Miles Davis" },
    { title: "Songs for Swingin' Lovers!", artist: "Frank Sinatra" },
  ],
};

const DiscoveryDecade = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { range: rawRange } = useParams<{ range: string }>();
  const [offset, setOffset] = useState(0);

  const { range, decadeName, startYear, endYear } = useMemo(() => {
    const decoded = rawRange ? decodeURIComponent(rawRange) : "";
    const [start, end] = decoded.split("-").map(Number);
    return {
      range: decoded,
      decadeName: DECADE_NAMES[decoded] || decoded,
      startYear: start || 2020,
      endYear: end || 2029,
    };
  }, [rawRange]);

  const decadeColor = DECADE_COLORS[decadeName] || "from-primary to-primary/80";
  const essentialAlbums = ESSENTIAL_ALBUMS[decadeName] || [];

  const { data: releases = [], isLoading, error, isFetching } = useQuery({
    queryKey: ["decade-releases", range, offset],
    queryFn: async () => {
      // Use MusicBrainz date range search with offset for pagination
      // Use 30 albums to ensure complete rows across all grid layouts (divisible by 2,3,5,6)
      const query = `firstreleasedate:[${startYear} TO ${endYear}] AND primarytype:album`;
      return (await searchReleases(query, 30, offset)) as MBReleaseGroup[];
    },
    enabled: !!range,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleRefresh = () => {
    // Increment offset to get next batch of results
    setOffset(prev => prev + 30);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <DiscoveryNav activeTab="explore" />

        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link 
            to="/discovery/explore" 
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">{decadeName}</h1>
          <p className="text-muted-foreground">Albums released in the {decadeName.toLowerCase()}</p>
        </motion.header>

        {/* Essential Albums Section - commented out for future use */}
        {/* {essentialAlbums.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <EssentialAlbumsSection
              decade={decadeName}
              albums={essentialAlbums}
              color={decadeColor}
            />
          </motion.div>
        )} */}

        {/* All Albums Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Albums from the {decadeName.toLowerCase()}
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-6 text-center">
              <p className="text-destructive">Failed to load decade results</p>
            </div>
          ) : releases.length === 0 ? (
            <div className="bg-card/30 rounded-xl border border-border/50 p-6 text-center">
              <p className="text-muted-foreground">No albums found for this decade.</p>
            </div>
          ) : (
            <motion.section variants={containerVariants} initial="hidden" animate="visible">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {releases.map((rg) => (
                  <motion.div
                    key={rg.id}
                    variants={itemVariants}
                    onClick={() => navigate(`/album/${rg.id}`)}
                    className="cursor-pointer group"
                  >
                    <AlbumCoverWithFallback releaseGroupId={rg.id} title={rg.title} />
                    <h3 className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {rg.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getArtistNames(rg["artist-credit"]) || ""}
                    </p>
                    {rg["first-release-date"] && (
                      <p className="text-xs text-muted-foreground/60">{getYear(rg["first-release-date"])}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoveryDecade;
