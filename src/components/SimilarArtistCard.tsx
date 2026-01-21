import { Link } from "react-router-dom";
import { MBArtist } from "@/services/musicbrainz";
import { ArtistImage } from "./ArtistImage";

interface SimilarArtistCardProps {
  artist: MBArtist;
}

export function SimilarArtistCard({ artist }: SimilarArtistCardProps) {
  return (
    <Link
      to={`/artist/${artist.id}`}
      className="group flex flex-col items-center text-center p-3 rounded-lg hover:bg-secondary/50 transition-colors"
    >
      <div className="mb-2 border-2 border-border group-hover:border-primary transition-colors rounded-full overflow-hidden">
        <ArtistImage 
          artistId={artist.id} 
          artistName={artist.name} 
          size="lg" 
          className="!w-20 !h-20 rounded-full"
        />
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
