import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRelatedArtists, getArtistImage } from "@/services/musicbrainz";
import { Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface RelatedArtistsProps {
  artistId: string;
  artistName: string;
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

function RelatedArtistCard({ artist }: { artist: { id: string; name: string; type: string; relationshipType: string } }) {
  const [imageError, setImageError] = useState(false);
  
  const { data: artistImage } = useQuery({
    queryKey: ['artist-image', artist.id],
    queryFn: () => getArtistImage(artist.id),
    staleTime: 1000 * 60 * 60,
  });

  return (
    <Link 
      to={`/artist/${artist.id}`}
      className="group flex flex-col items-center text-center p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-border transition-all"
    >
      <div className="relative mb-3">
        {artistImage && !imageError ? (
          <img 
            src={artistImage} 
            alt={artist.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-border/50 group-hover:border-primary/50 transition-colors"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-16 h-16 rounded-full ${getArtistColor(artist.name)} border-2 border-border/50 group-hover:border-primary/50 transition-colors flex items-center justify-center`}>
            <span className="text-white font-semibold text-lg">
              {getInitials(artist.name)}
            </span>
          </div>
        )}
      </div>
      <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
        {artist.name}
      </h4>
      <p className="text-xs text-muted-foreground mt-1">
        {artist.relationshipType}
      </p>
    </Link>
  );
}

export function RelatedArtists({ artistId, artistName }: RelatedArtistsProps) {
  const { data: relatedArtists = [], isLoading } = useQuery({
    queryKey: ['related-artists', artistId],
    queryFn: () => getRelatedArtists(artistId),
    staleTime: 1000 * 60 * 30,
  });

  // Don't render if no related artists
  if (isLoading || relatedArtists.length === 0) {
    return null;
  }

  // Group by relationship type
  const grouped = relatedArtists.reduce((acc, artist) => {
    const key = artist.relationshipType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(artist);
    return acc;
  }, {} as Record<string, typeof relatedArtists>);

  // Order groups by importance
  const groupOrder = ['Member', 'Band', 'Also performs as', 'Also known as', 'Collaborator', 'Supporting musician'];
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Limit to 8 artists total
  const displayedArtists = relatedArtists.slice(0, 8);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12 mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-xl text-foreground">Related Artists</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {displayedArtists.map((artist) => (
          <RelatedArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      
      {relatedArtists.length > 8 && (
        <p className="text-sm text-muted-foreground mt-3 text-center">
          +{relatedArtists.length - 8} more related artists
        </p>
      )}
    </motion.section>
  );
}
