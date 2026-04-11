'use client';

interface WindIndicatorProps {
  direction: number; // degrees, meteorological (where wind comes FROM)
  speed: number;
  gusts: number;
}

export default function WindIndicator({ direction, speed, gusts }: WindIndicatorProps) {
  // Arrow points in the direction wind is GOING (180° from meteorological direction)
  const arrowDeg = (direction + 180) % 360;

  const compass = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const compassDir = compass[Math.round(direction / 22.5) % 16];

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 flex items-center justify-center">
        <div className="absolute inset-0 border border-[#1e2d45] rounded-full" />
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          style={{ transform: `rotate(${arrowDeg}deg)` }}
        >
          <polygon
            points="14,2 18,20 14,17 10,20"
            fill="#00b4d8"
            stroke="#00b4d8"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      <div className="font-mono text-sm">
        <span className="text-[#c8d0e0]">{speed.toFixed(1)}</span>
        <span className="text-[#4a6080] text-xs"> m/s </span>
        <span className="text-[#ffaa00] text-xs">↑{gusts.toFixed(1)}</span>
        <span className="text-[#4a6080] text-xs"> gust</span>
        <div className="text-[#00b4d8] text-xs">{compassDir} ({direction}°)</div>
      </div>
    </div>
  );
}
