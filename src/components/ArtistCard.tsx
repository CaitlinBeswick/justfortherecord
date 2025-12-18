import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getArtistImage } from "@/services/musicbrainz";

interface ArtistCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  onClick?: () => void;
}

// Generate a consistent color based on the artist name
function getArtistColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function ArtistCard({ id, name, genres, onClick }: ArtistCardProps) {
  const initials = getInitials(name);
  const bgColor = getArtistColor(name);

  const { data: artistImage } = useQuery({
    queryKey: ['artist-image', id],
    queryFn: () => getArtistImage(id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer text-center"
      onClick={onClick}
    >
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border-2 border-border/50 transition-all duration-300 group-hover:border-primary/50">
        {artistImage ? (
          <img 
            src={artistImage} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`${artistImage ? 'hidden' : ''} w-full h-full ${bgColor} flex items-center justify-center`}>
          <span className="text-white font-bold text-2xl sm:text-3xl md:text-4xl drop-shadow-md">
            {initials}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      
      <div className="mt-3">
        <h3 className="font-sans font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {genres.slice(0, 2).join(" · ") || "Artist"}
        </p>
      </div>
    </motion.div>
  );
}
