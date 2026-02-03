'use client';

import { motion } from 'framer-motion';

interface GopherLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export const GopherLogo = ({ size = 48, animated = false, className = '' }: GopherLogoProps) => {
  const Wrapper = animated ? motion.svg : 'svg';
  
  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(animated && {
        animate: {
          y: [0, -5, 0],
          rotate: [-2, 2, -2],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      })}
    >
      {/* Gopher body */}
      <ellipse cx="50" cy="60" rx="28" ry="25" fill="#00ADD8" />
      
      {/* Gopher head */}
      <circle cx="50" cy="35" r="22" fill="#00ADD8" />
      
      {/* Left ear */}
      <ellipse cx="35" cy="20" rx="8" ry="12" fill="#00ADD8" />
      
      {/* Right ear */}
      <ellipse cx="65" cy="20" rx="8" ry="12" fill="#00ADD8" />
      
      {/* Left eye */}
      <circle cx="42" cy="32" r="4" fill="white" />
      <circle cx="43" cy="31" r="2" fill="#1e293b" />
      
      {/* Right eye */}
      <circle cx="58" cy="32" r="4" fill="white" />
      <circle cx="59" cy="31" r="2" fill="#1e293b" />
      
      {/* Nose */}
      <ellipse cx="50" cy="42" rx="3" ry="4" fill="#0891b2" />
      
      {/* Mouth */}
      <path
        d="M 45 45 Q 50 48 55 45"
        stroke="#0891b2"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Left tooth */}
      <rect x="47" y="45" width="2" height="4" fill="white" rx="1" />
      
      {/* Right tooth */}
      <rect x="51" y="45" width="2" height="4" fill="white" rx="1" />
      
      {/* Left arm */}
      <ellipse cx="25" cy="65" rx="6" ry="12" fill="#00ADD8" />
      
      {/* Right arm */}
      <ellipse cx="75" cy="65" rx="6" ry="12" fill="#00ADD8" />
      
      {/* Belly accent */}
      <ellipse cx="50" cy="68" rx="12" ry="10" fill="#7dd3f0" opacity="0.3" />
    </Wrapper>
  );
};

export const DiggingGopher = () => {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
        rotate: [-5, 5, -5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <GopherLogo size={64} />
    </motion.div>
  );
};

export const SleepingGopher = () => {
  return (
    <div className="relative">
      <GopherLogo size={120} className="opacity-50" />
      <motion.div
        className="absolute top-8 right-2 text-4xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        💤
      </motion.div>
    </div>
  );
};
