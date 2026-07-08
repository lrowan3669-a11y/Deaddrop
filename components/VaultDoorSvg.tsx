const RIVET_COUNT = 20;
const SPOKE_COUNT = 6;
const PLATE_ANGLES = [45, 135, 225, 315];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function VaultDoorSvg({
  spinning = false,
  className = "",
}: {
  spinning?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 300 300" className={className}>
      <defs>
        <radialGradient id="doorMetal" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3f7a52" />
          <stop offset="45%" stopColor="#1b3324" />
          <stop offset="75%" stopColor="#0e1b13" />
          <stop offset="100%" stopColor="#040a06" />
        </radialGradient>
        <radialGradient id="wheelMetal" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#7dffab" />
          <stop offset="50%" stopColor="#1f7a4a" />
          <stop offset="100%" stopColor="#0a2015" />
        </radialGradient>
        <linearGradient id="hingeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f6b4c" />
          <stop offset="100%" stopColor="#0a1610" />
        </linearGradient>
        <radialGradient id="rivetMetal" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#9dffc0" />
          <stop offset="100%" stopColor="#1c3d28" />
        </radialGradient>
      </defs>

      {/* hinges */}
      <rect x="6" y="82" width="32" height="34" rx="6" fill="url(#hingeMetal)" stroke="#04120a" strokeWidth="2" />
      <circle cx="22" cy="99" r="5.5" fill="#04120a" />
      <rect x="6" y="184" width="32" height="34" rx="6" fill="url(#hingeMetal)" stroke="#04120a" strokeWidth="2" />
      <circle cx="22" cy="201" r="5.5" fill="#04120a" />

      {/* door body */}
      <circle cx="150" cy="150" r="134" fill="url(#doorMetal)" stroke="#04120a" strokeWidth="4" />
      <circle cx="150" cy="150" r="134" fill="none" stroke="#39ff6a" strokeOpacity="0.35" strokeWidth="2" />

      {/* rivet ring */}
      {Array.from({ length: RIVET_COUNT }).map((_, i) => {
        const { x, y } = polar(150, 150, 118, (i * 360) / RIVET_COUNT);
        return <circle key={i} cx={x} cy={y} r="4.5" fill="url(#rivetMetal)" stroke="#04120a" strokeWidth="1" />;
      })}

      {/* reinforcement plates */}
      {PLATE_ANGLES.map((angle) => {
        const { x, y } = polar(150, 150, 100, angle);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
            <rect x="-16" y="-11" width="32" height="22" rx="3" fill="url(#hingeMetal)" stroke="#04120a" strokeWidth="1.5" />
            <circle cx="-9" cy="0" r="2.5" fill="#04120a" />
            <circle cx="9" cy="0" r="2.5" fill="#04120a" />
          </g>
        );
      })}

      {/* side lock cylinder */}
      <circle cx="228" cy="128" r="13" fill="url(#rivetMetal)" stroke="#04120a" strokeWidth="2" />
      <circle cx="228" cy="128" r="5" fill="#04120a" />

      {/* wheel */}
      <g
        style={{ transformOrigin: "150px 150px" }}
        className={spinning ? "animate-[vault-spin_1.1s_linear_infinite]" : ""}
      >
        <circle cx="150" cy="150" r="58" fill="url(#wheelMetal)" stroke="#04120a" strokeWidth="3" />
        <circle cx="150" cy="150" r="58" fill="none" stroke="#39ff6a" strokeOpacity="0.4" strokeWidth="1.5" />
        {Array.from({ length: SPOKE_COUNT }).map((_, i) => {
          const angle = (i * 360) / SPOKE_COUNT;
          const inner = polar(150, 150, 20, angle);
          const outer = polar(150, 150, 52, angle);
          return (
            <g key={i}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#04120a"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="url(#wheelMetal)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx={outer.x} cy={outer.y} r="6" fill="url(#wheelMetal)" stroke="#04120a" strokeWidth="1.5" />
            </g>
          );
        })}
        <circle cx="150" cy="150" r="19" fill="url(#wheelMetal)" stroke="#04120a" strokeWidth="3" />
        <circle cx="150" cy="150" r="7" fill="#04120a" />
      </g>
    </svg>
  );
}
