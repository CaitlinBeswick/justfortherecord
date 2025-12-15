import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ArtistCard } from "@/components/ArtistCard";
import { popularArtists } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useState } from "react";

const allArtists = [
  ...popularArtists,
  {
    id: "7",
    name: "Daft Punk",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    genres: ["Electronic", "House"],
  },
  {
    id: "8",
    name: "Arctic Monkeys",
    imageUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop",
    genres: ["Indie Rock", "Alternative"],
  },
  {
    id: "9",
    name: "Bon Iver",
    imageUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop",
    genres: ["Indie Folk", "Alternative"],
  },
  {
    id: "10",
    name: "Tyler, the Creator",
    imageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300&fit=crop",
    genres: ["Hip Hop", "Neo-Soul"],
  },
  {
    id: "11",
    name: "Billie Eilish",
    imageUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
    genres: ["Pop", "Electropop"],
  },
  {
    id: "12",
    name: "The Weeknd",
    imageUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop",
    genres: ["R&B", "Pop"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

const Artists = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredArtists = allArtists.filter((artist) =>
    artist.name.toLowerCase().includes(search.toLowerCase())
  );

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
              <h1 className="font-serif text-4xl text-foreground">Artists</h1>
              <p className="text-muted-foreground mt-1">
                Discover and follow your favorite artists
              </p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search artists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-none focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8"
          >
            {filteredArtists.map((artist) => (
              <motion.div key={artist.id} variants={itemVariants}>
                <ArtistCard
                  {...artist}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>

          {filteredArtists.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No artists found matching "{search}"</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Artists;
