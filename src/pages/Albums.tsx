import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AlbumCard } from "@/components/AlbumCard";
import { featuredAlbums } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { Filter, Grid, List } from "lucide-react";
import { useState } from "react";

const allAlbums = [
  ...featuredAlbums,
  {
    id: "7",
    title: "OK Computer",
    artist: "Radiohead",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    rating: 5,
    year: 1997,
  },
  {
    id: "8",
    title: "Kid A",
    artist: "Radiohead",
    coverUrl: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=400&h=400&fit=crop",
    rating: 5,
    year: 2000,
  },
  {
    id: "9",
    title: "Channel Orange",
    artist: "Frank Ocean",
    coverUrl: "https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400&h=400&fit=crop",
    rating: 4,
    year: 2012,
  },
  {
    id: "10",
    title: "good kid, m.A.A.d city",
    artist: "Kendrick Lamar",
    coverUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
    rating: 5,
    year: 2012,
  },
  {
    id: "11",
    title: "DAMN.",
    artist: "Kendrick Lamar",
    coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop",
    rating: 4,
    year: 2017,
  },
  {
    id: "12",
    title: "Lonerism",
    artist: "Tame Impala",
    coverUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&h=400&fit=crop",
    rating: 4,
    year: 2012,
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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Albums = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("rating");

  const sortedAlbums = [...allAlbums].sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "year") return (b.year || 0) - (a.year || 0);
    return a.title.localeCompare(b.title);
  });

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
              <h1 className="font-serif text-4xl text-foreground">Albums</h1>
              <p className="text-muted-foreground mt-1">
                {allAlbums.length} albums in the collection
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-1">
                <button className="p-2 rounded-md bg-surface-elevated">
                  <Grid className="h-4 w-4 text-foreground" />
                </button>
                <button className="p-2 rounded-md hover:bg-surface-elevated transition-colors">
                  <List className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg bg-secondary px-4 py-2 text-sm text-foreground border-none focus:ring-2 focus:ring-primary"
              >
                <option value="rating">Highest Rated</option>
                <option value="year">Newest First</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {sortedAlbums.map((album) => (
              <motion.div key={album.id} variants={itemVariants}>
                <AlbumCard
                  {...album}
                  onClick={() => navigate(`/album/${album.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default Albums;
