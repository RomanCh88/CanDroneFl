import { WeatherData } from '@/types';

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,snowfall,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_speed_80m,wind_direction_10m,wind_gusts_10m,pressure_msl',
    forecast_days: '2',
    timezone: 'auto',
    wind_speed_unit: 'ms',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}
