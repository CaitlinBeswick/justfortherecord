import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Search, Users, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// Popular artists to fetch - we'll search for these in batches
const POPULAR_ARTIST_NAMES = [
  "The Beatles", "Pink Floyd", "Led Zeppelin", "Queen", "David Bowie",
  "Radiohead", "Kendrick Lamar", "Frank Ocean", "Tame Impala", "Arctic Monkeys",
  "The Rolling Stones", "Nirvana", "Bob Dylan", "Prince", "Michael Jackson",
  "Beyoncé", "Taylor Swift", "Drake", "Kanye West", "The Weeknd",
  "Daft Punk", "Gorillaz", "Coldplay", "Muse", "Red Hot Chili Peppers",
  "Foo Fighters", "Green Day", "Blink-182", "Linkin Park", "System of a Down",
  "Metallica", "Iron Maiden", "Black Sabbath", "AC/DC", "Guns N' Roses",
  "Fleetwood Mac", "Eagles", "The Beach Boys", "The Doors", "Jimi Hendrix",
  "Stevie Wonder", "Marvin Gaye", "Aretha Franklin", "James Brown", "Ray Charles",
  "Miles Davis", "John Coltrane", "Louis Armstrong", "Ella Fitzgerald", "Duke Ellington",
  "Bob Marley", "Peter Tosh", "Jimmy Cliff", "Toots and the Maytals", "Burning Spear",
  "Kraftwerk", "Depeche Mode", "New Order", "Pet Shop Boys", "Erasure",
  "The Cure", "Joy Division", "Siouxsie and the Banshees", "Bauhaus", "Echo & the Bunnymen",
  "R.E.M.", "U2", "The Smiths", "Morrissey", "The Stone Roses",
  "Oasis", "Blur", "Pulp", "Suede", "Elastica",
  "Nine Inch Nails", "Marilyn Manson", "Tool", "A Perfect Circle", "Puscifer",
  "The White Stripes", "The Black Keys", "Kings of Leon", "The Strokes", "Interpol",
  "LCD Soundsystem", "MGMT", "Empire of the Sun", "Justice", "Phoenix",
  "Vampire Weekend", "Foster the People", "The War on Drugs", "Arcade Fire", "Fleet Foxes",
  "Bon Iver", "Sufjan Stevens", "Phoebe Bridgers", "Big Thief", "Adrianne Lenker",
  "Tyler, the Creator", "Mac DeMarco", "King Krule", "Steve Lacy", "Daniel Caesar",
  "SZA", "Solange", "Janelle Monáe", "FKA twigs", "Kelela",
  "Billie Eilish", "Lorde", "Charli XCX", "Grimes", "St. Vincent",
  "Bjork", "Kate Bush", "Fiona Apple", "PJ Harvey", "Portishead",
  "Massive Attack", "Tricky", "Burial", "Four Tet", "Floating Points",
  "Aphex Twin", "Boards of Canada", "Autechre", "Squarepusher", "Amon Tobin",
  "Flying Lotus", "Thundercat", "Kamasi Washington", "Robert Glasper", "Terrace Martin",
  "J Dilla", "Madlib", "MF DOOM", "Madvillain", "Stones Throw",
  "OutKast", "A Tribe Called Quest", "Wu-Tang Clan", "Nas", "Jay-Z",
  "Eminem", "Dr. Dre", "Snoop Dogg", "Ice Cube", "N.W.A",
  "Tupac Shakur", "The Notorious B.I.G.", "DMX", "Method Man", "Redman",
  "Run-D.M.C.", "Beastie Boys", "Public Enemy", "Eric B. & Rakim", "Grandmaster Flash",
  "The Prodigy", "The Chemical Brothers", "Fatboy Slim", "Underworld", "Orbital",
  "Deadmau5", "Skrillex", "Diplo", "Major Lazer", "Jack Ü",
  "Calvin Harris", "Avicii", "David Guetta", "Tiësto", "Armin van Buuren",
  "Above & Beyond", "Kaskade", "Pretty Lights", "Bassnectar", "Odesza",
  "Disclosure", "Kaytranada", "Jamie xx", "Nicolas Jaar", "Caribou",
  "The xx", "Beach House", "Warpaint", "Alvvays", "Japanese Breakfast",
  "Mitski", "Snail Mail", "Soccer Mommy", "Clairo", "Beabadoobee",
  "Dua Lipa", "Bad Bunny", "Rosalía", "J Balvin", "Daddy Yankee",
  "Shakira", "Ricky Martin", "Gloria Estefan", "Marc Anthony", "Celia Cruz",
  "Buena Vista Social Club", "Compay Segundo", "Ibrahim Ferrer", "Omara Portuondo", "Rubén González",
  "Fela Kuti", "Tony Allen", "King Sunny Ade", "Youssou N'Dour", "Salif Keita",
  "Ali Farka Touré", "Tinariwen", "Amadou & Mariam", "Angelique Kidjo", "Cesária Évora",
  "Johnny Cash", "Dolly Parton", "Willie Nelson", "Merle Haggard", "Waylon Jennings",
  "Hank Williams", "George Jones", "Patsy Cline", "Loretta Lynn", "Emmylou Harris",
  "Chris Stapleton", "Sturgill Simpson", "Jason Isbell", "Tyler Childers", "Colter Wall",
  "Leonard Cohen", "Joni Mitchell", "Neil Young", "Tom Waits", "Nick Cave",
  "PJ Harvey", "Elliott Smith", "Jeff Buckley", "Nick Drake", "Tim Buckley",
  "Sigur Rós", "Mogwai", "Explosions in the Sky", "Godspeed You! Black Emperor", "This Will Destroy You",
];

const PopularArtists = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Fetch popular artists in batches
  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['popular-artists-250'],
    queryFn: async () => {
      const results: MBArtist[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < Math.min(POPULAR_ARTIST_NAMES.length, 250); i += batchSize) {
        const batch = POPULAR_ARTIST_NAMES.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (name) => {
            try {
              const searchResults = await searchArtists(name);
              return searchResults.find(a => 
                a.name.toLowerCase() === name.toLowerCase()
              ) || searchResults[0] || null;
            } catch {
              return null;
            }
          })
        );
        results.push(...batchResults.filter((r): r is MBArtist => r !== null));
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < POPULAR_ARTIST_NAMES.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return results;
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!search.trim()) return artists;
    const searchLower = search.toLowerCase();
    return artists.filter(artist => 
      artist.name.toLowerCase().includes(searchLower) ||
      artist.genres?.some(g => g.name.toLowerCase().includes(searchLower))
    );
  }, [artists, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Popular Artists</h1>
              <p className="text-muted-foreground mt-1">
                Top 250 artists across all genres
              </p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter artists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading artists...</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {artists.length} / 250 loaded
              </p>
            </div>
          ) : filteredArtists.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Showing {filteredArtists.length} artists
              </p>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6"
              >
                {filteredArtists.map((artist, index) => (
                  <motion.div key={artist.id} variants={itemVariants}>
                    <ArtistCard
                      id={artist.id}
                      name={artist.name}
                      genres={artist.genres?.slice(0, 2).map((g) => g.name) || []}
                      onClick={() => navigate(`/artist/${artist.id}`)}
                      fetchDelay={index * 50}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          ) : (
            <div className="text-center py-20">
              <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search ? `No artists found matching "${search}"` : "No artists available"}
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PopularArtists;