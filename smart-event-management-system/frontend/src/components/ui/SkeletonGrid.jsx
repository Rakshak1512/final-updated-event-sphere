import React from "react";
import { SkeletonCard, SkeletonGrid as BaseSkeletonGrid } from "./Loader.jsx";

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

export default SkeletonGrid;
