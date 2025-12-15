import { motion } from "framer-motion";

interface ArtistCardProps {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
  onClick?: () => void;
}

export function ArtistCard({ name, imageUrl, genres, onClick }: ArtistCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer text-center"
      onClick={onClick}
    >
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      
      <div className="mt-3">
        <h3 className="font-sans font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {genres.slice(0, 2).join(" · ")}
        </p>
      </div>
    </motion.div>
  );
}
