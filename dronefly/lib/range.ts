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
