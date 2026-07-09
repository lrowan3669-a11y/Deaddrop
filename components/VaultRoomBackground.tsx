const CELL = 56;
const LINE = "color-mix(in srgb, var(--color-vault-gold) 6%, transparent)";
const DOT = "color-mix(in srgb, var(--color-vault-gold) 35%, transparent)";

const depositWallStyle: React.CSSProperties = {
  backgroundColor: "var(--color-vault-gunmetal)",
  backgroundImage: `
    repeating-linear-gradient(0deg, ${LINE} 0px, ${LINE} 1px, transparent 1px, transparent ${CELL}px),
    repeating-linear-gradient(90deg, ${LINE} 0px, ${LINE} 1px, transparent 1px, transparent ${CELL}px),
    radial-gradient(circle, ${DOT} 0px, ${DOT} 2px, transparent 2px, transparent 100%)
  `,
  backgroundSize: `${CELL}px ${CELL}px, ${CELL}px ${CELL}px, ${CELL}px ${CELL}px`,
};

export function VaultRoomBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-vault-black">
      <div className="absolute inset-y-0 left-0 w-20 opacity-70 sm:w-40 md:w-56" style={depositWallStyle} />
      <div className="absolute inset-y-0 right-0 w-20 opacity-70 sm:w-40 md:w-56" style={depositWallStyle} />

      <div
        className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-vault-gold) 18%, transparent), transparent 70%)",
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-1/4"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}
      />

      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 220px 80px rgba(0,0,0,0.85)" }} />
    </div>
  );
}
