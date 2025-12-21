import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { useNavigate } from "react-router-dom";
import { Search, Users, Loader2, X } from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchArtists, MBArtist } from "@/services/musicbrainz";
import { Skeleton } from "@/components/ui/skeleton";
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.01 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// Skeleton component for artist cards
const ArtistCardSkeleton = () => (
  <div className="flex flex-col items-center gap-3">
    <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full" />
    <div className="text-center w-full">
      <Skeleton className="h-4 w-20 mx-auto mb-2" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  </div>
);

const GENRE_FILTERS = [
  "Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Classical", 
  "R&B", "Metal", "Folk", "Country", "Blues", "Punk", 
  "Indie", "Soul", "Reggae", "Latin"
];

const PAGE_SIZE = 24;
// Extended list of 1000 popular artists
const POPULAR_ARTIST_NAMES = [
  // Classic Rock & Rock Icons
  "The Beatles", "Pink Floyd", "Led Zeppelin", "Queen", "David Bowie",
  "The Rolling Stones", "The Who", "The Doors", "Jimi Hendrix", "Cream",
  "Deep Purple", "Black Sabbath", "Aerosmith", "KISS", "Van Halen",
  "AC/DC", "Guns N' Roses", "Bon Jovi", "Def Leppard", "Scorpions",
  "ZZ Top", "Lynyrd Skynyrd", "The Allman Brothers Band", "Creedence Clearwater Revival", "The Eagles",
  "Fleetwood Mac", "Heart", "Journey", "Boston", "Foreigner",
  "REO Speedwagon", "Styx", "Kansas", "Chicago", "Toto",
  // Alternative & Indie Rock
  "Radiohead", "Nirvana", "Pearl Jam", "Soundgarden", "Alice in Chains",
  "R.E.M.", "The Smiths", "The Cure", "Depeche Mode", "New Order",
  "Joy Division", "Pixies", "Sonic Youth", "The Stone Roses", "Oasis",
  "Blur", "Pulp", "Suede", "Elastica", "The Verve",
  "Arctic Monkeys", "The Strokes", "Interpol", "The Libertines", "Franz Ferdinand",
  "Bloc Party", "Kaiser Chiefs", "The Killers", "Kings of Leon", "Muse",
  "Coldplay", "Snow Patrol", "Keane", "Travis", "Stereophonics",
  "The White Stripes", "The Black Keys", "Queens of the Stone Age", "Foo Fighters", "Green Day",
  "Blink-182", "Sum 41", "Good Charlotte", "Fall Out Boy", "My Chemical Romance",
  "Panic! at the Disco", "Paramore", "Twenty One Pilots", "Imagine Dragons", "OneRepublic",
  // Metal
  "Metallica", "Iron Maiden", "Judas Priest", "Megadeth", "Slayer",
  "Anthrax", "Pantera", "Sepultura", "Machine Head", "Lamb of God",
  "Mastodon", "Gojira", "Opeth", "Tool", "A Perfect Circle",
  "Nine Inch Nails", "Marilyn Manson", "Rammstein", "System of a Down", "Korn",
  "Deftones", "Slipknot", "Linkin Park", "Evanescence", "Breaking Benjamin",
  "Three Days Grace", "Disturbed", "Godsmack", "Shinedown", "Avenged Sevenfold",
  // Pop Icons
  "Michael Jackson", "Madonna", "Prince", "Whitney Houston", "Janet Jackson",
  "Mariah Carey", "Celine Dion", "Britney Spears", "Christina Aguilera", "Jennifer Lopez",
  "Beyoncé", "Rihanna", "Lady Gaga", "Katy Perry", "Taylor Swift",
  "Ariana Grande", "Dua Lipa", "Billie Eilish", "Olivia Rodrigo", "Doja Cat",
  "Justin Timberlake", "Bruno Mars", "The Weeknd", "Ed Sheeran", "Harry Styles",
  "Shawn Mendes", "Charlie Puth", "Post Malone", "Khalid", "Lauv",
  "Lorde", "Charli XCX", "Carly Rae Jepsen", "Robyn", "Sia",
  // Hip Hop & Rap
  "Kendrick Lamar", "Kanye West", "Jay-Z", "Nas", "Eminem",
  "Dr. Dre", "Snoop Dogg", "Ice Cube", "Tupac Shakur", "The Notorious B.I.G.",
  "Wu-Tang Clan", "A Tribe Called Quest", "OutKast", "Run-D.M.C.", "Beastie Boys",
  "Public Enemy", "N.W.A", "DMX", "50 Cent", "Lil Wayne",
  "Drake", "Travis Scott", "J. Cole", "Future", "Migos",
  "Tyler, the Creator", "Frank Ocean", "Chance the Rapper", "Childish Gambino", "Kid Cudi",
  "A$AP Rocky", "ScHoolboy Q", "Joey Bada$$", "Denzel Curry", "JID",
  "Mac Miller", "Logic", "Anderson .Paak", "Vince Staples", "Earl Sweatshirt",
  "MF DOOM", "Madlib", "J Dilla", "Flying Lotus", "Thundercat",
  // R&B & Soul
  "Stevie Wonder", "Marvin Gaye", "Aretha Franklin", "James Brown", "Ray Charles",
  "Otis Redding", "Sam Cooke", "Al Green", "Curtis Mayfield", "Bill Withers",
  "Luther Vandross", "Teddy Pendergrass", "Barry White", "Lionel Richie", "Smokey Robinson",
  "Diana Ross", "Gladys Knight", "Patti LaBelle", "Chaka Khan", "Donna Summer",
  "Usher", "R. Kelly", "D'Angelo", "Maxwell", "Erykah Badu",
  "Lauryn Hill", "Mary J. Blige", "TLC", "Destiny's Child", "Aaliyah",
  "Alicia Keys", "John Legend", "SZA", "Solange", "Janelle Monáe",
  "H.E.R.", "Jhené Aiko", "Summer Walker", "Daniel Caesar", "Steve Lacy",
  // Electronic & Dance
  "Daft Punk", "The Chemical Brothers", "The Prodigy", "Fatboy Slim", "Underworld",
  "Orbital", "Aphex Twin", "Boards of Canada", "Autechre", "Squarepusher",
  "Massive Attack", "Portishead", "Tricky", "UNKLE", "DJ Shadow",
  "Moby", "Basement Jaxx", "Groove Armada", "Zero 7", "Air",
  "Kraftwerk", "Tangerine Dream", "Jean-Michel Jarre", "Vangelis", "Brian Eno",
  "Deadmau5", "Skrillex", "Diplo", "Calvin Harris", "David Guetta",
  "Tiësto", "Armin van Buuren", "Above & Beyond", "Swedish House Mafia", "Avicii",
  "Marshmello", "The Chainsmokers", "Kygo", "Zedd", "Martin Garrix",
  "Disclosure", "Kaytranada", "Jamie xx", "Four Tet", "Nicolas Jaar",
  "Caribou", "Bonobo", "Jon Hopkins", "Floating Points", "Burial",
  "Odesza", "Rufus Du Sol", "Lane 8", "Ben Böhmer", "Tycho",
  // Jazz
  "Miles Davis", "John Coltrane", "Charlie Parker", "Thelonious Monk", "Duke Ellington",
  "Louis Armstrong", "Ella Fitzgerald", "Billie Holiday", "Sarah Vaughan", "Nina Simone",
  "Dizzy Gillespie", "Art Blakey", "Herbie Hancock", "Wayne Shorter", "Chick Corea",
  "Pat Metheny", "Keith Jarrett", "Oscar Peterson", "Bill Evans", "Dave Brubeck",
  "Charles Mingus", "Ornette Coleman", "Sun Ra", "Pharoah Sanders", "Alice Coltrane",
  "Kamasi Washington", "Robert Glasper", "Esperanza Spalding", "Christian Scott", "Ambrose Akinmusire",
  // Classical & Orchestral
  "Johann Sebastian Bach", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Frédéric Chopin", "Franz Schubert",
  "Johannes Brahms", "Pyotr Ilyich Tchaikovsky", "Claude Debussy", "Maurice Ravel", "Igor Stravinsky",
  "Gustav Mahler", "Richard Wagner", "Giuseppe Verdi", "Giacomo Puccini", "Johann Strauss II",
  // Folk & Singer-Songwriter
  "Bob Dylan", "Joni Mitchell", "Leonard Cohen", "Neil Young", "Tom Waits",
  "Nick Cave", "Jeff Buckley", "Elliott Smith", "Nick Drake", "Tim Buckley",
  "Simon & Garfunkel", "James Taylor", "Carole King", "Cat Stevens", "Van Morrison",
  "Bruce Springsteen", "Tom Petty", "John Mellencamp", "Jackson Browne", "Don Henley",
  "Sufjan Stevens", "Bon Iver", "Fleet Foxes", "Iron & Wine", "The National",
  "Arcade Fire", "The War on Drugs", "Father John Misty", "Big Thief", "Phoebe Bridgers",
  // Country
  "Johnny Cash", "Dolly Parton", "Willie Nelson", "Merle Haggard", "Waylon Jennings",
  "Hank Williams", "George Jones", "Patsy Cline", "Loretta Lynn", "Emmylou Harris",
  "Kenny Rogers", "Glen Campbell", "Conway Twitty", "George Strait", "Alan Jackson",
  "Garth Brooks", "Tim McGraw", "Faith Hill", "Shania Twain", "Reba McEntire",
  "Chris Stapleton", "Sturgill Simpson", "Jason Isbell", "Tyler Childers", "Colter Wall",
  "Kacey Musgraves", "Maren Morris", "Luke Combs", "Morgan Wallen", "Zach Bryan",
  // Reggae & World
  "Bob Marley", "Peter Tosh", "Jimmy Cliff", "Toots and the Maytals", "Burning Spear",
  "Lee Scratch Perry", "Dennis Brown", "Gregory Isaacs", "Black Uhuru", "Steel Pulse",
  "Fela Kuti", "King Sunny Ade", "Youssou N'Dour", "Salif Keita", "Ali Farka Touré",
  "Tinariwen", "Amadou & Mariam", "Angelique Kidjo", "Cesária Évora", "Buena Vista Social Club",
  // Experimental & Art Rock
  "Bjork", "Kate Bush", "Fiona Apple", "PJ Harvey", "St. Vincent",
  "Tori Amos", "Joanna Newsom", "Grimes", "FKA twigs", "Arca",
  "Sigur Rós", "Mogwai", "Explosions in the Sky", "Godspeed You! Black Emperor", "This Will Destroy You",
  "Swans", "Sunn O)))", "Boris", "Earth", "Sleep",
  "Talking Heads", "Television", "Wire", "Pere Ubu", "Devo",
  "Velvet Underground", "Iggy Pop", "Patti Smith", "Blondie", "Ramones",
  // Punk & Post-Punk
  "Sex Pistols", "The Clash", "Dead Kennedys", "Black Flag", "Minor Threat",
  "Bad Brains", "Misfits", "Social Distortion", "The Offspring", "NOFX",
  "Bad Religion", "Pennywise", "Rancid", "Dropkick Murphys", "Rise Against",
  "Siouxsie and the Banshees", "Bauhaus", "Echo & the Bunnymen", "Cocteau Twins", "Dead Can Dance",
  // Indie Pop & Dream Pop
  "The xx", "Beach House", "Warpaint", "Alvvays", "Japanese Breakfast",
  "Mitski", "Snail Mail", "Soccer Mommy", "Clairo", "Beabadoobee",
  "Mac DeMarco", "King Krule", "Rex Orange County", "Cavetown", "mxmtoon",
  "Vampire Weekend", "Foster the People", "MGMT", "Empire of the Sun", "Phoenix",
  "LCD Soundsystem", "Hot Chip", "Cut Copy", "The Knife", "Röyksopp",
  // Latin
  "Bad Bunny", "Rosalía", "J Balvin", "Daddy Yankee", "Ozuna",
  "Anuel AA", "Maluma", "Karol G", "Becky G", "Nicky Jam",
  "Shakira", "Ricky Martin", "Gloria Estefan", "Marc Anthony", "Celia Cruz",
  "Selena", "Luis Miguel", "Juan Gabriel", "Vicente Fernández", "Julio Iglesias",
  "Manu Chao", "Café Tacvba", "Molotov", "Maná", "Juanes",
  // K-Pop & J-Pop
  "BTS", "BLACKPINK", "EXO", "TWICE", "Red Velvet",
  "NCT", "Stray Kids", "SEVENTEEN", "aespa", "NewJeans",
  "Perfume", "Babymetal", "ONE OK ROCK", "X Japan", "RADWIMPS",
  // More Modern Artists
  "Tame Impala", "Glass Animals", "Gorillaz", "alt-J", "Jungle",
  "Parcels", "Khruangbin", "Still Woozy", "Dayglow", "Wallows",
  "The 1975", "Wolf Alice", "IDLES", "Fontaines D.C.", "Wet Leg",
  "Turnstile", "Spiritbox", "Bring Me the Horizon", "Sleep Token", "Bad Omens",
  "Doja Cat", "Megan Thee Stallion", "Cardi B", "Nicki Minaj", "Ice Spice",
  "Lil Nas X", "Jack Harlow", "Lil Baby", "Roddy Ricch", "DaBaby",
  "Pop Smoke", "Juice WRLD", "XXXTentacion", "Lil Peep", "Trippie Redd",
  "Playboi Carti", "Lil Uzi Vert", "21 Savage", "Gunna", "Young Thug",
  "Willow", "Jaden", "Dominic Fike", "Omar Apollo", "Ruel",
  "Rina Sawayama", "Caroline Polachek", "Christine and the Queens", "Arlo Parks", "Joy Crookes",
  "Little Simz", "Stormzy", "Dave", "Skepta", "slowthai",
  "Jorja Smith", "Mahalia", "Raye", "PinkPantheress", "Shygirl",
  // Legacy Artists
  "Elvis Presley", "Chuck Berry", "Little Richard", "Fats Domino", "Jerry Lee Lewis",
  "Buddy Holly", "Roy Orbison", "Everly Brothers", "Ricky Nelson", "Bo Diddley",
  "B.B. King", "Muddy Waters", "Howlin' Wolf", "John Lee Hooker", "Robert Johnson",
  "Lead Belly", "Woody Guthrie", "Pete Seeger", "Joan Baez", "Odetta",
  "Frank Sinatra", "Dean Martin", "Sammy Davis Jr.", "Nat King Cole", "Tony Bennett",
  "Barbra Streisand", "Judy Garland", "Liza Minnelli", "Bette Midler", "Cher",
  // More Contemporary
  "Adele", "Sam Smith", "Lewis Capaldi", "Hozier", "James Bay",
  "George Ezra", "Tom Odell", "Vance Joy", "Dean Lewis", "JP Saxe",
  "Finneas", "Dermot Kennedy", "Noah Kahan", "Zach Bryan", "Hozier",
  "Tate McRae", "Gracie Abrams", "Madison Beer", "Sabrina Carpenter", "Dove Cameron",
  "Conan Gray", "Ricky Montgomery", "Girl in Red", "MUNA", "Boygenius",
  "Julien Baker", "Lucy Dacus", "Angel Olsen", "Waxahatchee", "Sharon Van Etten",
  "Weyes Blood", "Hand Habits", "Adrianne Lenker", "Cassandra Jenkins", "Bartees Strange",
  "black midi", "Black Country, New Road", "Squid", "Dry Cleaning", "Yard Act",
  "Shame", "Sleaford Mods", "Amyl and the Sniffers", "King Gizzard & the Lizard Wizard", "Tropical Fuck Storm",
  "Courtney Barnett", "Stella Donnelly", "Julia Jacklin", "Alex Cameron", "RVG",
  "Orville Peck", "Ethel Cain", "Weyes Blood", "Aldous Harding", "Marissa Nadler",
  "Grouper", "Julianna Barwick", "Kali Malone", "Sarah Davachi", "Éliane Radigue",
  // Electronic Producers
  "SOPHIE", "AG Cook", "Danny L Harle", "Umru", "Hannah Diamond",
  "100 gecs", "Dorian Electra", "Rico Nasty", "Ashnikko", "Uffie",
  "Boys Noize", "Gesaffelstein", "SebastiAn", "Kavinsky", "Carpenter Brut",
  "Perturbator", "Dance With the Dead", "GosT", "Lazerhawk", "FM-84",
  "The Midnight", "Gunship", "Timecop1983", "Michael Oakley", "NINA",
  // More Metal
  "Behemoth", "Dimmu Borgir", "Cradle of Filth", "Emperor", "Mayhem",
  "Burzum", "Darkthrone", "Immortal", "Gorgoroth", "Satyricon",
  "Enslaved", "Ihsahn", "Leprous", "Haken", "Between the Buried and Me",
  "Animals as Leaders", "Periphery", "TesseracT", "Meshuggah", "Gojira",
  "Trivium", "Bullet for My Valentine", "Killswitch Engage", "All That Remains", "As I Lay Dying",
  "Parkway Drive", "Architects", "While She Sleeps", "Knocked Loose", "Code Orange",
  // More Jazz & Fusion
  "Snarky Puppy", "Jacob Collier", "Cory Wong", "Vulfpeck", "Fearless Flyers",
  "Theo Croker", "Marquis Hill", "Makaya McCraven", "Jeff Parker", "Nate Smith",
  "Terrace Martin", "Terri Lyne Carrington", "Melissa Aldana", "Joel Ross", "Immanuel Wilkins",
  // Ambient & New Age
  "Enya", "Yanni", "Kitaro", "George Winston", "Windham Hill",
  "Harold Budd", "William Basinski", "Stars of the Lid", "Tim Hecker", "Fennesz",
  "Nils Frahm", "Ólafur Arnalds", "Max Richter", "Jóhann Jóhannsson", "Hildur Guðnadóttir",
  // Film & TV Composers
  "Hans Zimmer", "John Williams", "Ennio Morricone", "Danny Elfman", "Howard Shore",
  "James Horner", "Thomas Newman", "Alexandre Desplat", "Michael Giacchino", "Alan Silvestri",
  // More World Music
  "Ravi Shankar", "Anoushka Shankar", "Zakir Hussain", "A.R. Rahman", "Asha Bhosle",
  "Nusrat Fateh Ali Khan", "Rahat Fateh Ali Khan", "Abida Parveen", "Ghulam Ali", "Mehdi Hassan",
  "Fairuz", "Oum Kalthoum", "Amr Diab", "Nancy Ajram", "Elissa",
  "Emel Mathlouthi", "Mashrou' Leila", "47Soul", "DAM", "Cairokee",
  // Misc Contemporary
  "Porcupine Tree", "Steven Wilson", "Riverside", "Katatonia", "Anathema",
  "Alcest", "Deafheaven", "Liturgy", "Oathbreaker", "Myrkur",
  "Chelsea Wolfe", "Emma Ruth Rundle", "Anna von Hausswolff", "Lingua Ignota", "The Body",
  "Full of Hell", "Primitive Man", "Bell Witch", "Thou", "Inter Arma",
  "Elder", "Pallbearer", "YOB", "Neurosis", "Isis",
  "Pelican", "Russian Circles", "If These Trees Could Talk", "Caspian", "Mono",
  // Singer-Songwriter Contemporary
  "Phoebe Bridgers", "Julien Baker", "Lucy Dacus", "boygenius", "Soccer Mommy",
  "Snail Mail", "Sidney Gish", "Frankie Cosmos", "Forth Wanderers", "pronoun",
  "Jay Som", "Hatchie", "Fazerdaze", "Hand Habits", "Haley Heynderickx",
  "Kevin Morby", "Steve Gunn", "William Tyler", "Ryley Walker", "Marisa Anderson",
  // Funk & Disco
  "Parliament-Funkadelic", "Sly and the Family Stone", "Earth, Wind & Fire", "Kool & the Gang", "The Commodores",
  "Rick James", "The Gap Band", "Zapp", "Cameo", "Midnight Star",
  "Chic", "Bee Gees", "ABBA", "KC and the Sunshine Band", "Gloria Gaynor",
  "Donna Summer", "Sister Sledge", "The Trammps", "Tavares", "Sylvester",
  "Dua Lipa", "Doja Cat", "Jessie Ware", "Roisin Murphy", "Kylie Minogue",
  // Additional Artists
  "HAIM", "Wet Leg", "Dry Cleaning", "Goat Girl", "Sorry",
  "Porridge Radio", "PVA", "Working Men's Club", "Sports Team", "Warmduscher",
  "Fat White Family", "Sleaford Mods", "The Fall", "Mark E. Smith", "Cabaret Voltaire",
  "Throbbing Gristle", "Coil", "Current 93", "Nurse with Wound", "Swans"
];

const PopularArtists = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const clearGenres = () => setSelectedGenres([]);

  async function fetchPopularArtistsPage(offset: number): Promise<MBArtist[]> {
    const maxArtists = Math.min(POPULAR_ARTIST_NAMES.length, offset + PAGE_SIZE);
    const names = POPULAR_ARTIST_NAMES.slice(offset, maxArtists);

    const results: MBArtist[] = [];
    const batchSize = 3; // keep small to avoid provider throttling

    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (name) => {
          try {
            const searchResults = await searchArtists(name);
            return (
              searchResults.find(a => a.name.toLowerCase() === name.toLowerCase()) ||
              searchResults[0] ||
              null
            );
          } catch {
            return null;
          }
        })
      );

      results.push(...batchResults.filter((r): r is MBArtist => r !== null));

      if (i + batchSize < names.length) {
        await new Promise(resolve => setTimeout(resolve, 60));
      }
    }

    return results;
  }

  const {
    data,
    isPending,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<MBArtist[]>({
    queryKey: ['popular-artists'],
    queryFn: ({ pageParam }) => fetchPopularArtistsPage(Number(pageParam ?? 0)),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const nextOffset = allPages.length * PAGE_SIZE;
      return nextOffset < POPULAR_ARTIST_NAMES.length ? nextOffset : undefined;
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  const artists = useMemo(() => data?.pages.flat() ?? ([] as MBArtist[]), [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore]);
  // Filter artists based on search and genres
  const filteredArtists = useMemo(() => {
    let filtered = artists;
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(artist => 
        artist.name.toLowerCase().includes(searchLower) ||
        artist.genres?.some(g => g.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by genres
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(artist => 
        artist.genres?.some(g => 
          selectedGenres.some(sg => g.name.toLowerCase().includes(sg.toLowerCase()))
        )
      );
    }
    
    return filtered;
  }, [artists, search, selectedGenres]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-serif text-4xl text-foreground">Popular Artists</h1>
              <p className="text-muted-foreground mt-1">
                Discover artists across all genres
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

          {/* Genre Filters */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Filter by genre:</span>
              {selectedGenres.length > 0 && (
                <button
                  onClick={clearGenres}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRE_FILTERS.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {isPending && artists.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {Array.from({ length: 24 }).map((_, index) => (
                <ArtistCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredArtists.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Showing {filteredArtists.length} artists
                {selectedGenres.length > 0 && ` (filtered by ${selectedGenres.join(', ')})`}
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
                      fetchDelay={index * 30}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Infinite Scroll Trigger */}
              {hasNextPage && !search && selectedGenres.length === 0 && (
                <div ref={loadMoreRef} className="flex justify-center mt-8 py-4">
                  {(isFetchingNextPage || isFetching) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading more artists...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Users className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search || selectedGenres.length > 0
                  ? "No artists found matching your filters"
                  : "No artists available"}
              </p>
              {(search || selectedGenres.length > 0) && (
                <button
                  onClick={() => { setSearch(""); clearGenres(); }}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PopularArtists;