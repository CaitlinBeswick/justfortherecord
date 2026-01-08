import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArtistImage, MBArtist } from "@/services/musicbrainz";
import { User } from "lucide-react";

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

interface SimilarArtistCardProps {
  artist: MBArtist;
}

export function SimilarArtistCard({ artist }: SimilarArtistCardProps) {
  const { data: artistImage } = useQuery({
    queryKey: ['artist-image', artist.id],
    queryFn: () => getArtistImage(artist.id),
    staleTime: 1000 * 60 * 60,
  });

  return (
    <Link
      to={`/artist/${artist.id}`}
      className="group flex flex-col items-center text-center p-3 rounded-lg hover:bg-secondary/50 transition-colors"
    >
      {artistImage ? (
        <img
          src={artistImage}
          alt={artist.name}
          className="w-20 h-20 rounded-full object-cover mb-2 border-2 border-border group-hover:border-primary transition-colors"
          onError={(e) => {
            // Hide image on error and show fallback
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div 
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 ${getArtistColor(artist.name)} ${artistImage ? 'hidden' : ''}`}
      >
        {getInitials(artist.name)}
      </div>
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {artist.name}
      </span>
      {artist.type && (
        <span className="text-xs text-muted-foreground">{artist.type}</span>
      )}
    </Link>
  );
}
