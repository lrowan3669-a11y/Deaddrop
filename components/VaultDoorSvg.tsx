const RIVET_COUNT = 20;
const SPOKE_COUNT = 6;
const PLATE_ANGLES = [45, 135, 225, 315];

const OUTLINE = "var(--color-vault-black)";
const RIM_GLOW = "var(--color-vault-gold)";

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
          <stop offset="0%" style={{ stopColor: "var(--color-vault-gold)" }} />
          <stop offset="45%" style={{ stopColor: "var(--color-vault-gold-dark)" }} />
          <stop offset="75%" style={{ stopColor: "var(--color-vault-steel)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-vault-black)" }} />
        </radialGradient>
        <radialGradient id="wheelMetal" cx="35%" cy="30%" r="75%">
          <stop offset="0%" style={{ stopColor: "var(--color-vault-gold)" }} />
          <stop offset="50%" style={{ stopColor: "var(--color-vault-gold-dark)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-vault-steel)" }} />
        </radialGradient>
        <linearGradient id="hingeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "var(--color-vault-gold-dark)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-vault-gunmetal)" }} />
        </linearGradient>
        <radialGradient id="rivetMetal" cx="35%" cy="30%" r="75%">
          <stop offset="0%" style={{ stopColor: "var(--color-vault-gold)" }} />
          <stop offset="100%" style={{ stopColor: "var(--color-vault-gold-dark)" }} />
        </radialGradient>
      </defs>

      {/* hinges */}
      <rect x="6" y="82" width="32" height="34" rx="6" fill="url(#hingeMetal)" style={{ stroke: OUTLINE }} strokeWidth="2" />
      <circle cx="22" cy="99" r="5.5" style={{ fill: OUTLINE }} />
      <rect x="6" y="184" width="32" height="34" rx="6" fill="url(#hingeMetal)" style={{ stroke: OUTLINE }} strokeWidth="2" />
      <circle cx="22" cy="201" r="5.5" style={{ fill: OUTLINE }} />

      {/* door body */}
      <circle cx="150" cy="150" r="134" fill="url(#doorMetal)" style={{ stroke: OUTLINE }} strokeWidth="4" />
      <circle cx="150" cy="150" r="134" fill="none" style={{ stroke: RIM_GLOW }} strokeOpacity="0.35" strokeWidth="2" />

      {/* rivet ring */}
      {Array.from({ length: RIVET_COUNT }).map((_, i) => {
        const { x, y } = polar(150, 150, 118, (i * 360) / RIVET_COUNT);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4.5"
            fill="url(#rivetMetal)"
            style={{ stroke: OUTLINE }}
            strokeWidth="1"
          />
        );
      })}

      {/* reinforcement plates */}
      {PLATE_ANGLES.map((angle) => {
        const { x, y } = polar(150, 150, 100, angle);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
            <rect
              x="-16"
              y="-11"
              width="32"
              height="22"
              rx="3"
              fill="url(#hingeMetal)"
              style={{ stroke: OUTLINE }}
              strokeWidth="1.5"
            />
            <circle cx="-9" cy="0" r="2.5" style={{ fill: OUTLINE }} />
            <circle cx="9" cy="0" r="2.5" style={{ fill: OUTLINE }} />
          </g>
        );
      })}

      {/* side lock cylinder */}
      <circle cx="228" cy="128" r="13" fill="url(#rivetMetal)" style={{ stroke: OUTLINE }} strokeWidth="2" />
      <circle cx="228" cy="128" r="5" style={{ fill: OUTLINE }} />

      {/* wheel */}
      <g
        style={{ transformOrigin: "150px 150px" }}
        className={spinning ? "animate-[vault-spin_1.1s_linear_infinite]" : ""}
      >
        <circle cx="150" cy="150" r="58" fill="url(#wheelMetal)" style={{ stroke: OUTLINE }} strokeWidth="3" />
        <circle cx="150" cy="150" r="58" fill="none" style={{ stroke: RIM_GLOW }} strokeOpacity="0.4" strokeWidth="1.5" />
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
                style={{ stroke: OUTLINE }}
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
              <circle
                cx={outer.x}
                cy={outer.y}
                r="6"
                fill="url(#wheelMetal)"
                style={{ stroke: OUTLINE }}
                strokeWidth="1.5"
              />
            </g>
          );
        })}
        <circle cx="150" cy="150" r="19" fill="url(#wheelMetal)" style={{ stroke: OUTLINE }} strokeWidth="3" />
        <circle cx="150" cy="150" r="7" style={{ fill: OUTLINE }} />
      </g>
    </svg>
  );
}
