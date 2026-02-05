 import { ExternalLink } from "lucide-react";
 import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
 
 // Streaming service configuration with search URL generators
 const STREAMING_SERVICES = [
   {
     id: "spotify",
     name: "Spotify",
     icon: "🎧",
     bgColor: "bg-[#1DB954]/10 hover:bg-[#1DB954]/20",
     getUrl: (artist: string, album?: string) => 
       `https://open.spotify.com/search/${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
   },
   {
     id: "apple",
     name: "Apple Music",
     icon: "🍎",
     bgColor: "bg-[#FA243C]/10 hover:bg-[#FA243C]/20",
     getUrl: (artist: string, album?: string) => 
       `https://music.apple.com/search?term=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
   },
   {
     id: "youtube",
     name: "YouTube Music",
     icon: "🎶",
     bgColor: "bg-[#FF0000]/10 hover:bg-[#FF0000]/20",
     getUrl: (artist: string, album?: string) => 
       `https://music.youtube.com/search?q=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
   },
   {
     id: "deezer",
     name: "Deezer",
     icon: "🎵",
     bgColor: "bg-[#FF0092]/10 hover:bg-[#FF0092]/20",
     getUrl: (artist: string, album?: string) => 
       `https://www.deezer.com/search/${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
   },
   {
     id: "tidal",
     name: "Tidal",
     icon: "🌊",
     bgColor: "bg-foreground/10 hover:bg-foreground/20",
     getUrl: (artist: string, album?: string) => 
       `https://listen.tidal.com/search?q=${encodeURIComponent(album ? `${artist} ${album}` : artist)}`,
   },
 ];
 
 interface StreamingLinksProps {
   artistName: string;
   albumTitle?: string;
   compact?: boolean;
   className?: string;
 }
 
 export function StreamingLinks({ artistName, albumTitle, compact = false, className = "" }: StreamingLinksProps) {
   if (!artistName) return null;
 
   if (compact) {
     return (
       <div className={`flex items-center gap-1 ${className}`}>
         {STREAMING_SERVICES.slice(0, 4).map((service) => (
           <Tooltip key={service.id}>
             <TooltipTrigger asChild>
               <a
                 href={service.getUrl(artistName, albumTitle)}
                 target="_blank"
                 rel="noopener noreferrer"
                 className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors ${service.bgColor}`}
                 onClick={(e) => e.stopPropagation()}
               >
                 {service.icon}
               </a>
             </TooltipTrigger>
             <TooltipContent side="bottom">
               <p className="text-xs">Search on {service.name}</p>
             </TooltipContent>
           </Tooltip>
         ))}
       </div>
     );
   }
 
   return (
     <div className={`flex flex-wrap items-center gap-2 ${className}`}>
       <span className="text-xs text-muted-foreground mr-1">Listen on:</span>
       {STREAMING_SERVICES.map((service) => (
         <a
           key={service.id}
           href={service.getUrl(artistName, albumTitle)}
           target="_blank"
           rel="noopener noreferrer"
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${service.bgColor}`}
           onClick={(e) => e.stopPropagation()}
         >
           <span>{service.icon}</span>
           <span>{service.name}</span>
           <ExternalLink className="h-3 w-3 opacity-50" />
         </a>
       ))}
     </div>
   );
 }
