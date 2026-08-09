import React from 'react';

export default function LogoSVG({ className = "w-full h-full object-contain" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className}>
      <defs>
        {/* Gradient light blue circular background */}
        <radialGradient id="bgGrad" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#e0f7ff" />
          <stop offset="45%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </radialGradient>

        {/* Subtle inner rim for depth */}
        <radialGradient id="bgRimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="transparent" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
        </radialGradient>

        <linearGradient id="dropletBodyGrad" x1="50" y1="20" x2="150" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        <linearGradient id="limbGrad" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0369a1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mascotBlink {
          0%, 88%, 94%, 100% { transform: scaleY(1); }
          91% { transform: scaleY(0.1); }
        }
        @keyframes armWaveLeft {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
        }
        @keyframes armWaveRight {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes splashBob1 {
          0%, 100% { transform: translate(0px, 0px); opacity: 0.85; }
          50% { transform: translate(-3px, -5px); opacity: 1; }
        }
        @keyframes splashBob2 {
          0%, 100% { transform: translate(0px, 0px); opacity: 0.85; }
          50% { transform: translate(3px, -6px); opacity: 1; }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.88; }
        }
        .anim-bg { animation: bgPulse 4s infinite ease-in-out; }
        .anim-mascot-group {
          animation: mascotFloat 3.6s infinite ease-in-out;
          transform-origin: 100px 150px;
        }
        .anim-blink {
          animation: mascotBlink 4.2s infinite ease-in-out;
          transform-origin: 100px 112px;
        }
        .anim-arm-left {
          animation: armWaveLeft 3s infinite ease-in-out;
          transform-origin: 72px 110px;
        }
        .anim-arm-right {
          animation: armWaveRight 3s infinite ease-in-out 0.5s;
          transform-origin: 128px 110px;
        }
        .anim-splash-l1 { animation: splashBob1 2.8s infinite ease-in-out; transform-origin: 64px 52px; }
        .anim-splash-l2 { animation: splashBob2 3.2s infinite ease-in-out 0.4s; transform-origin: 52px 64px; }
        .anim-splash-r1 { animation: splashBob1 3s infinite ease-in-out 0.2s; transform-origin: 136px 52px; }
        .anim-splash-r2 { animation: splashBob2 3.4s infinite ease-in-out 0.6s; transform-origin: 148px 64px; }
      `}</style>

      {/* ── Gradient light-blue circular background ── */}
      <circle cx="100" cy="100" r="98" fill="url(#bgGrad)" className="anim-bg" />
      {/* Subtle inner rim / depth ring */}
      <circle cx="100" cy="100" r="98" fill="url(#bgRimGrad)" />
      {/* Crisp cyan border ring */}
      <circle cx="100" cy="100" r="97" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* Ground Shadow */}
      <ellipse cx="100" cy="182" rx="40" ry="5" fill="url(#shadowGrad)" />

      {/* Animated Mascot Body Group */}
      <g className="anim-mascot-group">

        {/* Side Water Splash Droplets (Left) */}
        <path className="anim-splash-l1" d="M 64 52 C 58 46, 50 48, 54 60 C 58 64, 66 60, 64 52 Z" fill="url(#splashGrad)" transform="rotate(-15 64 52)" />
        <path className="anim-splash-l2" d="M 52 64 C 48 60, 42 62, 45 70 C 48 73, 54 70, 52 64 Z" fill="url(#splashGrad)" transform="rotate(-25 52 64)" />

        {/* Side Water Splash Droplets (Right) */}
        <path className="anim-splash-r1" d="M 136 52 C 142 46, 150 48, 146 60 C 142 64, 134 60, 136 52 Z" fill="url(#splashGrad)" transform="rotate(15 136 52)" />
        <path className="anim-splash-r2" d="M 148 64 C 152 60, 158 62, 155 70 C 152 73, 146 70, 148 64 Z" fill="url(#splashGrad)" transform="rotate(25 148 64)" />

        {/* Left Cute Arm & Open Palm Hand */}
        <g className="anim-arm-left">
          <path d="M 72 110 Q 52 118 42 112" stroke="url(#limbGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 42 112 Q 38 104 36 108 M 42 112 Q 34 110 34 114 M 42 112 Q 35 118 37 121 M 42 112 Q 40 123 44 123" stroke="url(#limbGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* Right Cute Arm & Open Palm Hand */}
        <g className="anim-arm-right">
          <path d="M 128 110 Q 148 118 158 112" stroke="url(#limbGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 158 112 Q 162 104 164 108 M 158 112 Q 166 110 166 114 M 158 112 Q 165 118 163 121 M 158 112 Q 160 123 156 123" stroke="url(#limbGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* Left Leg & Shoe */}
        <path d="M 88 150 Q 86 166 84 174" stroke="url(#limbGrad)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
        <path d="M 84 174 Q 72 174 70 180 Q 72 184 86 182 Q 90 180 88 174 Z" fill="#0369a1" />

        {/* Right Leg & Shoe */}
        <path d="M 112 150 Q 114 166 116 174" stroke="url(#limbGrad)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
        <path d="M 116 174 Q 128 174 130 180 Q 128 184 114 182 Q 110 180 112 174 Z" fill="#0369a1" />

        {/* Main Water Droplet Character Body */}
        <path
          d="M 100 32
             C 100 32 60 82 60 118
             C 60 144 78 162 100 162
             C 122 162 140 144 140 118
             C 140 82 100 32 100 32 Z"
          fill="url(#dropletBodyGrad)"
        />

        {/* Glossy 3D Highlight Shine */}
        <ellipse cx="82" cy="74" rx="9" ry="15" fill="#ffffff" opacity="0.85" transform="rotate(-28 82 74)" />
        <circle cx="90" cy="92" r="4" fill="#ffffff" opacity="0.6" />

        {/* Cute Expressive Eyes */}
        <g className="anim-blink">
          {/* Left Eye */}
          <ellipse cx="88" cy="112" rx="4.5" ry="6" fill="#0f172a" />
          <circle cx="86.5" cy="110" r="1.8" fill="#ffffff" />
          <circle cx="89.5" cy="114" r="0.8" fill="#ffffff" />

          {/* Right Eye */}
          <ellipse cx="112" cy="112" rx="4.5" ry="6" fill="#0f172a" />
          <circle cx="110.5" cy="110" r="1.8" fill="#ffffff" />
          <circle cx="113.5" cy="114" r="0.8" fill="#ffffff" />
        </g>

        {/* Cute Rosy Cheeks */}
        <ellipse cx="78" cy="120" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
        <ellipse cx="122" cy="120" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />

        {/* Smile Nose line */}
        <path d="M 97 116 Q 100 118 103 116" stroke="#0369a1" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Happy Curved Mouth Smile */}
        <path d="M 91 123 Q 100 131 109 123" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      </g>
    </svg>
  );
}
