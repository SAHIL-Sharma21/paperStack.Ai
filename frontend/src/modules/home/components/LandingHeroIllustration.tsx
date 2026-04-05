export function LandingHeroIllustration({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
    >
      <svg
        viewBox="0 0 480 400"
        className="h-auto w-full max-w-[min(100%,420px)] drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="landing-grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="landing-grad-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27272a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.95" />
          </linearGradient>
          <filter id="landing-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <ellipse cx="280" cy="200" rx="160" ry="140" fill="url(#landing-grad-orange)" opacity="0.12" />

        {/* Back card — library stack */}
        <g opacity="0.85">
          <rect
            x="72"
            y="88"
            width="220"
            height="260"
            rx="16"
            fill="url(#landing-grad-glass)"
            stroke="#3f3f46"
            strokeWidth="1.5"
          />
          <rect x="96" y="118" width="172" height="10" rx="3" fill="#52525b" opacity="0.5" />
          <rect x="96" y="138" width="140" height="8" rx="2" fill="#52525b" opacity="0.35" />
          <rect x="96" y="154" width="160" height="8" rx="2" fill="#52525b" opacity="0.35" />
          <rect x="96" y="182" width="172" height="72" rx="8" fill="#27272a" stroke="#52525b" />
          <path
            d="M120 210h104M120 226h80M120 242h120"
            stroke="#71717a"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Floating document */}
        <g filter="url(#landing-glow)">
          <rect
            x="200"
            y="48"
            width="200"
            height="240"
            rx="14"
            fill="#18181b"
            stroke="#fb923c"
            strokeWidth="2"
            opacity="0.98"
          />
          <rect x="224" y="76" width="152" height="12" rx="3" fill="#fb923c" opacity="0.35" />
          <rect x="224" y="100" width="120" height="8" rx="2" fill="#71717a" opacity="0.5" />
          <rect x="224" y="116" width="140" height="8" rx="2" fill="#71717a" opacity="0.35" />
          <rect x="224" y="148" width="152" height="100" rx="8" fill="#27272a" stroke="#3f3f46" />
          <circle cx="300" cy="198" r="36" fill="url(#landing-grad-orange)" opacity="0.2" />
          <path
            d="M276 198l14 14 28-32"
            stroke="url(#landing-grad-orange)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Magnifying glass — search metaphor */}
        <g transform="translate(320 248)">
          <circle
            r="42"
            stroke="#fb923c"
            strokeWidth="3"
            fill="rgba(24,24,27,0.4)"
          />
          <line
            x1="28"
            y1="28"
            x2="58"
            y2="58"
            stroke="#fb923c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M-12 -8c-8 12-8 28 0 40"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>

        {/* Semantic “nodes” */}
        <circle cx="118" cy="62" r="5" fill="#fb923c" opacity="0.7" />
        <circle cx="58" cy="200" r="4" fill="#a1a1aa" opacity="0.6" />
        <circle cx="430" cy="120" r="4" fill="#a1a1aa" opacity="0.5" />
        <path
          d="M118 62 Q 200 100 258 168"
          stroke="#52525b"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          opacity="0.7"
        />
        <path
          d="M58 200 Q 140 180 224 200"
          stroke="#52525b"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
