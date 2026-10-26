export function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div className="skeleton" style={{ height: 140, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: "40%" }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td colSpan={100}>
        <div className="skeleton" style={{ height: 40 }} />
      </td>
    </tr>
  );
}

export function SkeletonGrid({ count = 6, columns, className = "grid-cards", style = {} }) {
  const gridStyle = columns
    ? { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 16, ...style }
    : style;

  return (
    <div className={className} style={gridStyle}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: "2.5px solid rgba(139,92,246,0.25)",
        borderTopColor: "#8b5cf6",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <img
          src="/eventsphere-emblem.png"
          alt="EventSphere"
          style={{
            width: 48,
            height: 48,
            objectFit: "contain",
            filter: "drop-shadow(0 4px 16px rgba(139, 92, 246, 0.5))",
            animation: "pulse 1.8s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Spinner size={18} />
        <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Loading Event<span className="text-gradient">Sphere</span>...
        </span>
      </div>
    </div>
  );
}

PageLoader.SkeletonGrid = SkeletonGrid;
PageLoader.SkeletonCard = SkeletonCard;
PageLoader.SkeletonRow = SkeletonRow;
PageLoader.Spinner = Spinner;
