// Estimated cruise speeds by type (m/s)
const CRUISE_SPEED: Record<'multirotor' | 'fixed_wing' | 'fpv', number> = {
  fpv: 22,
  multirotor: 12,
  fixed_wing: 25,
};

/**
 * Returns a range multiplier for a drone flying on a specific heading given current wind.
 * windFromDeg: meteorological direction (where wind comes FROM).
 * Positive multiplier > 1 means tailwind benefit, < 1 means headwind penalty.
 */
export function windRangeMultiplier(
  headingDeg: number,
  windFromDeg: number,
  windSpeed: number,
  droneType: 'multirotor' | 'fixed_wing' | 'fpv'
): number {
  if (windSpeed === 0) return 1;
  const cruise = CRUISE_SPEED[droneType];
  const windBlowingDeg = (windFromDeg + 180) % 360;
  const angleDiff = ((headingDeg - windBlowingDeg + 360) % 360) * (Math.PI / 180);
  const windComponent = windSpeed * Math.cos(angleDiff); // positive = tailwind
  return Math.max(0.05, (cruise + windComponent) / cruise);
}

export function adjustRange(
  nominalRange: number,
  windSpeed: number,
  droneType: 'multirotor' | 'fixed_wing' | 'fpv'
): number {
  const penaltyPerMs = droneType === 'multirotor' || droneType === 'fpv' ? 0.06 : 0.03;
  const rangeFactor = Math.max(0.3, 1 - windSpeed * penaltyPerMs);
  return Math.round(nominalRange * rangeFactor * 10) / 10;
}

export function adjustEndurance(nominalEndurance: number, temperature: number): number {
  if (temperature < 0) {
    const coldPenalty = Math.min(0.3, Math.abs(temperature) * 0.01);
    return Math.round(nominalEndurance * (1 - coldPenalty));
  }
  return nominalEndurance;
}
