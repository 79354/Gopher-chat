'use client';

import { motion } from 'framer-motion';

interface GopherLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export const GopherLogo = ({
  size = 48,
  animated = false,
  className = '',
}: GopherLogoProps) => {
  const Wrapper: any = animated ? motion.svg : 'svg';

  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(animated && {
        animate: {
          y: [0, -4, 0],
          rotate: [-2, 2, -2],
        },
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      })}
    >
      {/* ===== BODY ===== */}
      <path
        d="M15.683,2.079c3.166,0,6.134.453,7.681,3.495,1.389,3.409.895,7.086,1.107,10.689.182,3.094.585,6.668-.85,9.536-1.51,3.016-5.283,3.775-8.392,3.664-2.442-.087-5.391-.884-6.769-3.115-1.617-2.617-.851-6.509-.734-9.421.139-3.449-.934-6.91.2-10.285,1.176-3.5,4.346-4.293,7.758-4.563"
        fill="#6ad7e5"
      />

      {/* ===== EARS ===== */}
      <path d="M7.894,7.309C4.731,6.42,7.083,2.4,9.622,4.052Z" fill="#6ad7e5" />
      <path d="M21.944,3.75c2.5-1.758,4.765,2.209,1.856,3.207Z" fill="#6ad7e5" />

      {/* ===== EYES ===== */}
      <path d="M9.788,6.863C10.524,9.74,15.13,9,14.956,6.118c-.208-3.456-5.873-2.789-5.169.745" fill="#fff" />
      <path d="M16.242,6.329c.568,3.3,5.97,2.431,5.194-.9-.7-2.988-5.383-2.161-5.194.9" fill="#fff" />

      {/* pupils */}
      <ellipse cx="11.058" cy="6.394" rx="0.778" ry="0.842" />
      <ellipse cx="17.574" cy="6.184" rx="0.765" ry="0.842" />
      <ellipse cx="11.412" cy="6.584" rx="0.183" ry="0.214" fill="#fff" />
      <ellipse cx="17.922" cy="6.374" rx="0.18" ry="0.214" fill="#fff" />

      {/* ===== NOSE / MOUTH ===== */}
      <path
        d="M14.787,8.663a1,1,0,0,0-.821,1.4c.435.788,1.407-.07,2.013.011.7.014,1.268.737,1.827.131.622-.674-.268-1.331-.964-1.624Z"
        fill="#f6d2a2"
      />

      {/* ===== LEFT ARM ===== */}
      <path
        d="M5.987,17.15c.04.826.865.444,1.239.186.355-.245.459-.041.49-.525a7.937,7.937,0,0,0,.039-.955,2.342,2.342,0,0,0-1.56.4c-.227.165-.651.69-.208.9"
        fill="#f6d2a2"
      />

      {/* ===== RIGHT ARM ===== */}
      <path
        d="M26.013,17.046c-.04.826-.865.444-1.239.186-.355-.245-.459-.041-.49-.525a7.936,7.936,0,0,1-.039-.955,2.342,2.342,0,0,1,1.56.4c.227.165.651.69.208.9"
        fill="#f6d2a2"
      />

      {/* ===== FEET ===== */}
      <path
        d="M11.124,28.662c-.746.115-1.166.789-1.788,1.131-.586.35-.811-.112-.863-.206-.092-.042-.084.039-.226-.1C7.7,28.625,8.812,28,9.39,27.572,10.195,27.409,10.7,28.107,11.124,28.662Z"
        fill="#f6d2a2"
      />
      <path
        d="M22.483,27.317c.636.393,1.8,1.583.844,2.16-.916.839-1.429-.921-2.234-1.165A2.225,2.225,0,0,1,22.483,27.317Z"
        fill="#f6d2a2"
      />
    </Wrapper>
  );
};

export const DiggingGopher = () => {
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'inline-block' }}
    >
      <GopherLogo size={64} />
    </motion.div>
  );
};

export const SleepingGopher = () => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <GopherLogo size={120} className="opacity-60" />
      <motion.div
        style={{ position: 'absolute', top: 6, right: 6 }}
        animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Zzz
      </motion.div>
    </div>
  );
};
