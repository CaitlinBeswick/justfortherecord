import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

interface TrophyWithConfettiProps {
  className?: string;
}

export function TrophyWithConfetti({ className = "h-5 w-5" }: TrophyWithConfettiProps) {
  const [isHovered, setIsHovered] = useState(false);

  const confettiColors = [
    'bg-yellow-400',
    'bg-primary',
    'bg-green-500',
    'bg-pink-500',
    'bg-blue-500',
    'bg-purple-500',
  ];

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Trophy className={`${className} shrink-0 text-yellow-500 animate-pulse`} />
      
      <AnimatePresence>
        {isHovered && (
          <>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 360) / 12;
              const radians = (angle * Math.PI) / 180;
              const distance = 20 + Math.random() * 15;
              const size = 3 + Math.random() * 3;
              
              return (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0,
                    x: 0,
                    y: 0,
                    scale: 0,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: Math.cos(radians) * distance,
                    y: Math.sin(radians) * distance,
                    scale: [0, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.03,
                    ease: "easeOut",
                  }}
                  className={`absolute left-1/2 top-1/2 rounded-full ${confettiColors[i % confettiColors.length]}`}
                  style={{
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                  }}
                />
              );
            })}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
