import { Lang } from './i18n';

interface WmoEntry {
  description: string;
  descriptionUk: string;
  icon: string;
  severity: 'clear' | 'mild' | 'moderate' | 'severe';
}

export const WMO_CODES: Record<number, WmoEntry> = {
  0:  { description: 'Clear sky',                    descriptionUk: 'Ясне небо',                     icon: '☀️',  severity: 'clear' },
  1:  { description: 'Mainly clear',                 descriptionUk: 'Переважно ясно',                icon: '🌤️', severity: 'clear' },
  2:  { description: 'Partly cloudy',                descriptionUk: 'Мінлива хмарність',             icon: '⛅',  severity: 'clear' },
  3:  { description: 'Overcast',                     descriptionUk: 'Похмуро',                       icon: '☁️',  severity: 'mild' },
  45: { description: 'Fog',                          descriptionUk: 'Туман',                         icon: '🌫️', severity: 'moderate' },
  48: { description: 'Depositing rime fog',          descriptionUk: 'Крижаний туман',                icon: '🌫️', severity: 'severe' },
  51: { description: 'Light drizzle',                descriptionUk: 'Слабка мряка',                  icon: '🌦️', severity: 'mild' },
  53: { description: 'Moderate drizzle',             descriptionUk: 'Помірна мряка',                 icon: '🌦️', severity: 'moderate' },
  55: { description: 'Dense drizzle',                descriptionUk: 'Густа мряка',                   icon: '🌧️', severity: 'moderate' },
  56: { description: 'Light freezing drizzle',       descriptionUk: 'Слабка крижана мряка',          icon: '🌧️', severity: 'severe' },
  57: { description: 'Dense freezing drizzle',       descriptionUk: 'Густа крижана мряка',           icon: '🌧️', severity: 'severe' },
  61: { description: 'Slight rain',                  descriptionUk: 'Слабкий дощ',                   icon: '🌧️', severity: 'mild' },
  63: { description: 'Moderate rain',                descriptionUk: 'Помірний дощ',                  icon: '🌧️', severity: 'moderate' },
  65: { description: 'Heavy rain',                   descriptionUk: 'Сильний дощ',                   icon: '🌧️', severity: 'severe' },
  66: { description: 'Light freezing rain',          descriptionUk: 'Слабкий крижаний дощ',          icon: '🌧️', severity: 'severe' },
  67: { description: 'Heavy freezing rain',          descriptionUk: 'Сильний крижаний дощ',          icon: '🌧️', severity: 'severe' },
  71: { description: 'Slight snowfall',              descriptionUk: 'Слабкий снігопад',              icon: '🌨️', severity: 'moderate' },
  73: { description: 'Moderate snowfall',            descriptionUk: 'Помірний снігопад',             icon: '🌨️', severity: 'moderate' },
  75: { description: 'Heavy snowfall',               descriptionUk: 'Сильний снігопад',              icon: '🌨️', severity: 'severe' },
  77: { description: 'Snow grains',                  descriptionUk: 'Снігові зерна',                 icon: '🌨️', severity: 'moderate' },
  80: { description: 'Slight rain showers',          descriptionUk: 'Слабкі зливи',                  icon: '🌦️', severity: 'mild' },
  81: { description: 'Moderate rain showers',        descriptionUk: 'Помірні зливи',                 icon: '🌧️', severity: 'moderate' },
  82: { description: 'Violent rain showers',         descriptionUk: 'Сильні зливи',                  icon: '🌧️', severity: 'severe' },
  85: { description: 'Slight snow showers',          descriptionUk: 'Слабкі снігові зливи',          icon: '🌨️', severity: 'moderate' },
  86: { description: 'Heavy snow showers',           descriptionUk: 'Сильні снігові зливи',          icon: '🌨️', severity: 'severe' },
  95: { description: 'Thunderstorm',                 descriptionUk: 'Гроза',                         icon: '⛈️', severity: 'severe' },
  96: { description: 'Thunderstorm w/ slight hail',  descriptionUk: 'Гроза зі слабким градом',       icon: '⛈️', severity: 'severe' },
  99: { description: 'Thunderstorm w/ heavy hail',   descriptionUk: 'Гроза з сильним градом',        icon: '⛈️', severity: 'severe' },
};

export function getWeatherInfo(code: number, lang: Lang = 'uk') {
  const entry = WMO_CODES[code];
  if (!entry) {
    return { description: lang === 'uk' ? 'Невідомо' : 'Unknown', icon: '❓', severity: 'mild' as const };
  }
  return {
    description: lang === 'uk' ? entry.descriptionUk : entry.description,
    icon: entry.icon,
    severity: entry.severity,
  };
}
