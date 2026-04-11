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
    precipitation_probability: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    weather_code: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_speed_80m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    pressure_msl: number[];
  };
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
