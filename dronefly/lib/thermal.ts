import { Lang, getTranslations } from './i18n';

export function assessThermal(
  precipitation: number,
  visibility: number,
  snowfall: number,
  humidity: number,
  temperature: number,
  lang: Lang = 'uk'
): { effectiveness: 'EFFECTIVE' | 'DEGRADED' | 'BLIND'; reasons: string[] } {
  const tr = getTranslations(lang);
  const reasons: string[] = [];

  // BLIND conditions
  if (precipitation > 4) {
    reasons.push(tr.heavyRainBlinds);
    return { effectiveness: 'BLIND', reasons };
  }
  if (visibility < 200) {
    reasons.push(tr.denseFogBlinds);
    return { effectiveness: 'BLIND', reasons };
  }
  if (snowfall > 2) {
    reasons.push(tr.heavySnowBlinds);
    return { effectiveness: 'BLIND', reasons };
  }

  // DEGRADED conditions
  if (precipitation >= 0.5 && precipitation <= 4) {
    reasons.push(tr.lightRainDegrades);
  }
  if (visibility >= 200 && visibility <= 1000) {
    reasons.push(tr.fogDegrades);
  }
  if (humidity > 95) {
    reasons.push(tr.highHumidityDegrades);
  }
  if (snowfall > 0 && snowfall <= 2) {
    reasons.push(tr.lightSnowDegrades);
  }
  // Low delta-T: assume ground is ~3°C warmer in daytime
  const groundTemp = temperature + 3;
  const deltaT = Math.abs(temperature - groundTemp);
  if (deltaT < 3) {
    reasons.push(tr.lowDeltaTDegrades);
  }

  if (reasons.length > 0) {
    return { effectiveness: 'DEGRADED', reasons };
  }

  return { effectiveness: 'EFFECTIVE', reasons: [] };
}
