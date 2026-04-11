import { DroneProfile, FlyabilityAssessment } from '@/types';
import { assessThermal } from './thermal';
import { adjustRange, adjustEndurance } from './range';
import { Lang, getTranslations } from './i18n';

interface WeatherPoint {
  temperature: number;
  humidity: number;
  dewPoint: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  cloudCover: number;
  visibility: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  weatherCode: number;
}

function assessIcingRisk(
  temp: number,
  humidity: number,
  dewPoint: number,
  precipitation: number,
  cloudCover: number
): 'NONE' | 'POSSIBLE' | 'LIKELY' {
  const dewPointSpread = temp - dewPoint;

  if (temp >= -5 && temp <= 2 && humidity > 90 && (precipitation > 0 || cloudCover > 80)) {
    return 'LIKELY';
  }
  if (temp >= -8 && temp <= 5 && humidity > 80 && dewPointSpread < 3) {
    return 'POSSIBLE';
  }
  return 'NONE';
}

const FOG_CODES = new Set([45, 48]);

function assessSensor(
  visibility: number,
  precipitation: number,
  cloudCover: number,
  weatherCode: number,
  lang: Lang
): { status: 'CLEAR' | 'DEGRADED' | 'BLIND'; reasons: string[] } {
  const tr = getTranslations(lang);
  const reasons: string[] = [];
  const isFog = FOG_CODES.has(weatherCode);

  if (visibility < 300) {
    reasons.push(isFog ? tr.fogVisBlind : tr.visBlind);
    return { status: 'BLIND', reasons };
  }
  if (precipitation > 8) {
    reasons.push(tr.heavyPrecipBlind);
    return { status: 'BLIND', reasons };
  }

  if (visibility >= 300 && visibility < 1000) {
    reasons.push(isFog ? tr.fogVisDegraded : tr.reducedVisibility);
  } else if (isFog) {
    // Fog present but visibility still >1000m — flag early
    reasons.push(tr.fogVisPresent);
  }
  if (precipitation > 0.5) {
    reasons.push(tr.rainOnLens);
  }
  if (cloudCover > 90) {
    reasons.push(tr.heavyCloudContrast);
  }

  if (reasons.length > 0) {
    return { status: 'DEGRADED', reasons };
  }

  return { status: 'CLEAR', reasons: [] };
}

export function assess(drone: DroneProfile, wx: WeatherPoint, lang: Lang = 'uk'): FlyabilityAssessment {
  const tr = getTranslations(lang);
  const noGoReasons: string[] = [];
  const cautionReasons: string[] = [];
  const { limits } = drone;

  // --- NO_GO checks ---
  if (wx.windSpeed > limits.maxWindSpeed) {
    noGoReasons.push(tr.windExceedsLimit(wx.windSpeed.toFixed(1), limits.maxWindSpeed));
  }
  if (wx.windGusts > limits.maxWindGusts) {
    noGoReasons.push(tr.gustsExceedLimit(wx.windGusts.toFixed(1), limits.maxWindGusts));
  }
  if (wx.temperature < limits.minTemperature) {
    noGoReasons.push(tr.tempBelowLimit(wx.temperature.toFixed(1), limits.minTemperature));
  }
  if (wx.temperature > limits.maxTemperature) {
    noGoReasons.push(tr.tempAboveLimit(wx.temperature.toFixed(1), limits.maxTemperature));
  }
  if (limits.maxPrecipitation === 0 && wx.precipitation > 0) {
    noGoReasons.push(tr.precipZeroTolerance);
  }
  if (limits.maxPrecipitation > 0 && wx.precipitation > limits.maxPrecipitation) {
    noGoReasons.push(tr.precipExceedsLimit(wx.precipitation.toFixed(1), limits.maxPrecipitation));
  }
  if (limits.maxSnowfall === 0 && wx.snowfall > 0) {
    noGoReasons.push(tr.snowZeroTolerance);
  }
  if (limits.maxSnowfall > 0 && wx.snowfall > limits.maxSnowfall) {
    noGoReasons.push(tr.snowExceedsLimit(wx.snowfall.toFixed(1), limits.maxSnowfall));
  }
  if (wx.visibility < limits.minVisibility) {
    noGoReasons.push(tr.visibilityBelowLimit(wx.visibility, limits.minVisibility));
  }

  // Icing NO_GO
  const icingRisk = assessIcingRisk(wx.temperature, wx.humidity, wx.dewPoint, wx.precipitation, wx.cloudCover);
  if (
    limits.icingRisk &&
    wx.temperature >= -5 && wx.temperature <= 2 &&
    wx.humidity > 90 &&
    (wx.rain > 0 || wx.cloudCover > 80)
  ) {
    noGoReasons.push(tr.icingHighRisk(wx.temperature.toFixed(1), wx.humidity));
  }

  if (noGoReasons.length > 0) {
    const thermal = assessThermal(wx.precipitation, wx.visibility, wx.snowfall, wx.humidity, wx.temperature, lang);
    const sensor = assessSensor(wx.visibility, wx.precipitation, wx.cloudCover, wx.weatherCode, lang);
    return {
      status: 'NO_GO',
      reasons: noGoReasons,
      thermalEffectiveness: drone.hasThermalCamera ? thermal.effectiveness : 'BLIND',
      thermalReasons: drone.hasThermalCamera ? thermal.reasons : [tr.noThermalCamera],
      adjustedRange: adjustRange(drone.nominalRange, wx.windSpeed, drone.type),
      adjustedEndurance: adjustEndurance(drone.nominalEndurance, wx.temperature),
      icingRisk,
      sensorStatus: sensor.status,
      sensorReasons: sensor.reasons,
    };
  }

  // --- CAUTION checks ---
  if (wx.windSpeed > limits.maxWindSpeed * 0.8) {
    cautionReasons.push(tr.windApproachingLimit(wx.windSpeed.toFixed(1), limits.maxWindSpeed));
  }
  if (wx.windGusts > limits.maxWindGusts * 0.8) {
    cautionReasons.push(tr.gustsApproachingLimit(wx.windGusts.toFixed(1), limits.maxWindGusts));
  }
  if (wx.temperature < limits.minTemperature + 5) {
    cautionReasons.push(tr.tempNearMin(wx.temperature.toFixed(1), limits.minTemperature));
  }
  if (wx.precipitation > 0 && wx.precipitation <= limits.maxPrecipitation) {
    cautionReasons.push(tr.precipPresent(wx.precipitation.toFixed(1)));
  }
  if (wx.visibility < limits.minVisibility * 2) {
    cautionReasons.push(tr.visibilityBelow2x(wx.visibility));
  }
  if (wx.humidity > 85) {
    cautionReasons.push(tr.highHumidity(wx.humidity));
  }
  if (wx.temperature >= -2 && wx.temperature <= 5 && wx.humidity > 80) {
    cautionReasons.push(tr.potentialIcing(wx.temperature.toFixed(1), wx.humidity));
  }
  const dewPointSpread = wx.temperature - wx.dewPoint;
  if (dewPointSpread < 3) {
    cautionReasons.push(tr.dewPointSpreadCaution(dewPointSpread.toFixed(1)));
  }

  const thermal = assessThermal(wx.precipitation, wx.visibility, wx.snowfall, wx.humidity, wx.temperature, lang);
  const sensor = assessSensor(wx.visibility, wx.precipitation, wx.cloudCover, wx.weatherCode, lang);

  return {
    status: cautionReasons.length > 0 ? 'CAUTION' : 'GO',
    reasons: cautionReasons,
    thermalEffectiveness: drone.hasThermalCamera ? thermal.effectiveness : 'BLIND',
    thermalReasons: drone.hasThermalCamera ? thermal.reasons : [tr.noThermalCamera],
    adjustedRange: adjustRange(drone.nominalRange, wx.windSpeed, drone.type),
    adjustedEndurance: adjustEndurance(drone.nominalEndurance, wx.temperature),
    icingRisk,
    sensorStatus: sensor.status,
    sensorReasons: sensor.reasons,
  };
}

export function findBestWindows(
  hourlyTimes: string[],
  assessments: FlyabilityAssessment[]
): { start: string; end: string; durationHours: number }[] {
  const windows: { start: string; end: string; durationHours: number }[] = [];
  let windowStart: string | null = null;
  let windowCount = 0;

  for (let i = 0; i < assessments.length; i++) {
    if (assessments[i].status === 'GO') {
      if (!windowStart) {
        windowStart = hourlyTimes[i];
        windowCount = 1;
      } else {
        windowCount++;
      }
    } else {
      if (windowStart && windowCount >= 2) {
        windows.push({
          start: windowStart,
          end: hourlyTimes[i - 1],
          durationHours: windowCount,
        });
      }
      windowStart = null;
      windowCount = 0;
    }
  }

  if (windowStart && windowCount >= 2) {
    windows.push({
      start: windowStart,
      end: hourlyTimes[assessments.length - 1],
      durationHours: windowCount,
    });
  }

  return windows;
}
