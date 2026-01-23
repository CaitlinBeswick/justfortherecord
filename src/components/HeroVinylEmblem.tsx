import { motion } from "framer-motion";

interface HeroVinylEmblemProps {
  className?: string;
}

export function HeroVinylEmblem({ className = "" }: HeroVinylEmblemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
      className={`absolute pointer-events-none select-none ${className}`}
      style={{
        top: "50%",
        left: "21%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 blur-2xl opacity-20 bg-primary rounded-full scale-110" />
      
      {/* Main vinyl SVG with slow spin animation */}
      <svg
        viewBox="0 0 120 120"
        className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-52 lg:h-52 drop-shadow-lg animate-vinyl-spin"
        aria-hidden="true"
      >
        {/* Outer record */}
        <circle cx="60" cy="60" r="56" fill="#1a1a1a" />
        
        {/* Subtle grooves */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="38" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
        
        {/* Glossy highlight arc */}
        <path
          d="M 30 30 Q 60 20, 90 35"
          fill="none"
          stroke="white"
          strokeWidth="0.8"
          opacity="0.08"
          strokeLinecap="round"
        />
        
        {/* Center label - using primary color (red) */}
        <circle cx="60" cy="60" r="22" fill="hsl(var(--primary))" />
        
        {/* Label texture rings */}
        <circle cx="60" cy="60" r="18" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="0.3" opacity="0.15" />
        <circle cx="60" cy="60" r="14" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="0.3" opacity="0.1" />
        
        {/* JFTR text on label */}
        <text
          x="60"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--primary-foreground))"
          fontSize="7"
          fontWeight="700"
          fontFamily="serif"
          letterSpacing="0.5"
        >
          JFTR
        </text>
        
        {/* Small tagline */}
        <text
          x="60"
          y="67"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--primary-foreground))"
          fontSize="3"
          fontWeight="400"
          opacity="0.8"
        >
          MUSIC DIARY
        </text>
        
        {/* Spindle hole */}
        <circle cx="60" cy="60" r="3" fill="#1a1a1a" />
        
        {/* Spindle highlight */}
        <circle cx="60" cy="60" r="1.5" fill="#333" />
      </svg>
    </motion.div>
  );
}
