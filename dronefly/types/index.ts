export interface DroneProfile {
  id: string;
  name: string;
  nameUk?: string;
  icon: string;
  type: 'multirotor' | 'fixed_wing' | 'fpv';
  description: string;
  notesUk?: string;
  limits: {
    maxWindSpeed: number;
    maxWindGusts: number;
    minTemperature: number;
    maxTemperature: number;
    maxPrecipitation: number;
    maxSnowfall: number;
    minVisibility: number;
    maxCloudCover: number;
    icingRisk: boolean;
  };
  nominalRange: number;
  nominalEndurance: number;
  hasThermalCamera: boolean;
  hasIpProtection: boolean;
  notes: string;
  /** True for user-defined drones stored in Firestore (signed-in users only). */
  custom?: boolean;
  /** Detailed specs (payload-dependent). When present, range/endurance come from lib/performance.ts. */
  performance?: DronePerformance;
}

/** A spec given as "from–to" (e.g. 37–45 min). Calculations use `min` (conservative). */
export interface SpecRange {
  min: number;
  max: number;
}

/** Manufacturer / field specs, entered the way operators read them from a spec sheet. */
export interface DronePerformance {
  maxPayloadKg: number;          // e.g. 15
  enduranceEmptyMin: SpecRange;  // flight time without payload, e.g. 37–45
  enduranceLoadedMin: SpecRange; // flight time with a reference payload, e.g. 23–27
  loadedPayloadKg: number;       // that reference payload, e.g. 10
  speedEmptyKmh: SpecRange;      // max speed without payload, e.g. 80–100
  speedFullKmh: number;          // max speed at full payload, e.g. 40
  radiusEmptyKm: number;         // effective radius without payload, e.g. 15
  radiusFullKm: number;          // effective radius at full payload, e.g. 10
  maxRangeKm: number;            // absolute range / link limit, e.g. 20
  ceilingM: SpecRange;           // practical ceiling, e.g. 400–500
  /** Take-off mass without payload, incl. battery (kg). Enables "total weight" input. */
  emptyWeightKg?: number;
  /** Wind resistance without payload (m/s), e.g. 17. Absent on older records → limits.maxWindGusts. */
  windEmptyMs?: number;
  /** Wind resistance at full payload (m/s), e.g. 12. Absent on older records → limits.maxWindSpeed. */
  windFullMs?: number;
}

/** Performance at a given payload and weather (output of lib/performance.ts). */
export interface PerformanceResult {
  payloadKg: number;
  /** Flight time at this payload, before weather (min). */
  enduranceNominal: SpecRange;
  /** Flight time after cold penalty (min). */
  endurance: SpecRange;
  /** Max speed at this payload (km/h). */
  maxSpeedKmh: SpecRange;
  /** Airspeed used for wind maths (m/s) = lower max speed at this payload. */
  airspeedMs: number;
  /** Wind used for the calculation: max of 10 m and 80 m wind (m/s). */
  windMs: number;
  /** Effective radius at this payload, no weather (km). */
  radiusNominalKm: number;
  /** After cold, before wind (km). */
  radiusStillKm: number;
  /** After cold and worst-case (along-wind) out-and-back wind (km). */
  radiusWindKm: number;
  /** True when the radius was capped by maxRangeKm. */
  limitedByRange: boolean;
  /** Wind / airspeed ratio; ≥ 0.85 means return is not guaranteed. */
  windRatio: number;
  /** Sustained-wind limit at this payload (m/s) = min(spec interpolated by payload, 85 % of airspeed). */
  windLimitSustained: number;
  /** Gust limit at this payload (m/s) = min(1.25 × spec at payload, airspeed). */
  windLimitGust: number;
  /** Which bound set the sustained limit. */
  windLimitBy: 'spec' | 'speed';
  /** Total take-off weight (kg) when the empty weight is known. */
  totalWeightKg?: number;
}

/** A user's saved position (Firestore: users/{uid}/locations/{id}). */
export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** Synced preferences (Firestore: users/{uid}.prefs). */
export interface UserPrefs {
  lang?: 'uk' | 'en';
  defaultLocationId?: string | null;
  defaultDroneId?: string | null;
}

export interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    dew_point_2m: number;
    precipitation: number;
    rain: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    visibility: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    pressure_msl: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    weather_code: number[];
    cloud_cover: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_speed_80m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
  /** Offset of the location's timezone from UTC (seconds). */
  utc_offset_seconds?: number;
  timezone: string;
  timezone_abbreviation: string;
}

export interface FlyabilityAssessment {
  status: 'GO' | 'CAUTION' | 'NO_GO';
  reasons: string[];
  thermalEffectiveness: 'EFFECTIVE' | 'DEGRADED' | 'BLIND';
  thermalReasons: string[];
  adjustedRange: number;
  adjustedEndurance: number;
  icingRisk: 'NONE' | 'POSSIBLE' | 'LIKELY';
  sensorStatus: 'CLEAR' | 'DEGRADED' | 'BLIND';
  sensorReasons: string[];
  /** Only for drones with detailed specs. */
  performance?: PerformanceResult;
}

export interface HourlyAssessment {
  time: string;
  assessment: FlyabilityAssessment;
  weather: {
    temperature: number;
    windSpeed: number;
    windGusts: number;
    windDirection: number;
    precipitation: number;
    snowfall: number;
    visibility: number;
    cloudCover: number;
    humidity: number;
    dewPoint: number;
    weatherCode: number;
  };
}

export interface LaunchWindow {
  start: string;
  end: string;
  durationHours: number;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
}
