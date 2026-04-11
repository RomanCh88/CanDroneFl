export type Lang = 'uk' | 'en';

export type Translations = {
  // header
  useMyLocation: string;
  fetching: string;
  updated: string;
  // page sections
  currentConditions: string;
  platformDetail: (name: string) => string;
  forecastTimeline: string;
  loadingWeather: string;
  disclaimer: string;
  dataSource: string;
  mapSource: string;
  // weather panel
  temperature: string;
  humidity: string;
  pressure: string;
  dewPoint: string;
  visibility: string;
  cloudCover: string;
  precipitation: string;
  snowfall: string;
  wind: string;
  dewPointSpreadAlert: (n: string) => string;
  // drone detail
  flightStatus: string;
  sensorStatus: string;
  thresholds: string;
  visualCamera: string;
  thermalCamera: string;
  icingRisk: string;
  noIssues: string;
  allNominal: string;
  rangeAdj: string;
  enduranceAdj: string;
  parameter: string;
  actualLimit: string;
  maxWind: string;
  maxGusts: string;
  tempRange: string;
  maxPrecip: string;
  maxSnow: string;
  minVisibility: string;
  ipProtected: string;
  icingSusceptible: string;
  yes: string;
  no: string;
  nom: string;
  // timeline
  windLabel: string;
  tempLabel: string;
  visLabel: string;
  precipLabel: string;
  // best windows
  optimalWindows: (drone: string) => string;
  noWindows: string;
  goWindow: (h: number) => string;
  // donate
  supportCompact: string;
  supportTitle: string;
  crypto: string;
  paypal: string;
  monobank: string;
  donateNote: string;
  // assessment: NO_GO reasons
  windExceedsLimit: (spd: string, lim: number) => string;
  gustsExceedLimit: (spd: string, lim: number) => string;
  tempBelowLimit: (t: string, lim: number) => string;
  tempAboveLimit: (t: string, lim: number) => string;
  precipZeroTolerance: string;
  precipExceedsLimit: (v: string, lim: number) => string;
  snowZeroTolerance: string;
  snowExceedsLimit: (v: string, lim: number) => string;
  visibilityBelowLimit: (v: number, lim: number) => string;
  icingHighRisk: (t: string, h: number) => string;
  // assessment: CAUTION reasons
  windApproachingLimit: (spd: string, lim: number) => string;
  gustsApproachingLimit: (spd: string, lim: number) => string;
  tempNearMin: (t: string, lim: number) => string;
  precipPresent: (v: string) => string;
  visibilityBelow2x: (v: number) => string;
  highHumidity: (h: number) => string;
  potentialIcing: (t: string, h: number) => string;
  dewPointSpreadCaution: (n: string) => string;
  // sensor reasons
  visBlind: string;
  heavyPrecipBlind: string;
  reducedVisibility: string;
  rainOnLens: string;
  heavyCloudContrast: string;
  noThermalCamera: string;
  // thermal reasons
  heavyRainBlinds: string;
  denseFogBlinds: string;
  heavySnowBlinds: string;
  lightRainDegrades: string;
  fogDegrades: string;
  highHumidityDegrades: string;
  lightSnowDegrades: string;
  lowDeltaTDegrades: string;
  // wmo unknown
  wmoUnknown: string;
  // wind range
  windRangeImpact: string;
  windFrom: string;
  dirN: string;
  dirNE: string;
  dirE: string;
  dirSE: string;
  dirS: string;
  dirSW: string;
  dirW: string;
  dirNW: string;
  // consequences
  consequences: string;
  impactRange: string;
  impactEndurance: string;
  impactVisual: string;
  impactThermal: string;
  impactIcing: string;
  // statuses
  statusGo: string;
  statusCaution: string;
  statusNoGo: string;
  sensorClear: string;
  sensorDegraded: string;
  sensorBlind: string;
  thermalEffective: string;
  thermalDegraded: string;
  thermalBlind: string;
  icingNone: string;
  icingPossible: string;
  icingLikely: string;
};

const uk: Translations = {
  useMyLocation: 'МОЄ МІСЦЕ',
  fetching: '⟳ ОТРИМАННЯ',
  updated: 'ОНВ',
  currentConditions: '// ПОТОЧНИЙ СТАН — ОБЕРІТЬ ПЛАТФОРМУ',
  platformDetail: (name) => `// ДЕТАЛІ ПЛАТФОРМИ — ${name}`,
  forecastTimeline: '// ПРОГНОЗ НА 48 ГОДИН',
  loadingWeather: 'ЗАВАНТАЖЕННЯ ПОГОДНИХ ДАНИХ...',
  disclaimer:
    '⚠ ЗАСТЕРЕЖЕННЯ: Цей інструмент надає лише оцінки на основі погодних умов. Реальна придатність до польоту залежить від багатьох факторів: РЕБ-середовища, повітряного простору, рельєфу, стану БПЛА та кваліфікації оператора. Завжди застосовуйте оперативне судження.',
  dataSource: 'ДАНІ:',
  mapSource: 'КАРТА:',
  temperature: 'Температура',
  humidity: 'Вологість',
  pressure: 'Тиск',
  dewPoint: 'Точка роси',
  visibility: 'Видимість',
  cloudCover: 'Хмарність',
  precipitation: 'Опади',
  snowfall: 'Снігопад',
  wind: 'Вітер',
  dewPointSpreadAlert: (n) => `⚠ СПРЕД ТОЧКИ РОСИ ${n}°C — РИЗИК ТУМАНУ`,
  flightStatus: 'СТАТУС ПОЛЬОТУ',
  sensorStatus: 'СТАН СЕНСОРІВ',
  thresholds: 'ЛІМІТИ',
  visualCamera: 'ВІЗУАЛЬНА КАМЕРА',
  thermalCamera: 'ТЕПЛОВІЗОР',
  icingRisk: 'РИЗИК ОБМЕРЗАННЯ',
  noIssues: 'Без порушень',
  allNominal: '▶ Всі умови в нормі',
  rangeAdj: 'ДАЛЬНІСТЬ (КОРЕГ.):',
  enduranceAdj: 'ТРИВАЛІСТЬ (КОРЕГ.):',
  parameter: 'ПАРАМЕТР',
  actualLimit: 'ФАКТ / ЛІМІТ',
  maxWind: 'Макс. вітер',
  maxGusts: 'Макс. пориви',
  tempRange: 'Діап. темп.',
  maxPrecip: 'Макс. опади',
  maxSnow: 'Макс. сніг',
  minVisibility: 'Мін. видимість',
  ipProtected: 'IP-захист',
  icingSusceptible: 'Схильн. до обмерзання',
  yes: 'ТАК',
  no: 'НІ',
  nom: 'ном.',
  windLabel: 'Вітер:',
  tempLabel: 'Темп.:',
  visLabel: 'Вид.:',
  precipLabel: 'Опади:',
  optimalWindows: (drone) => `// ОПТИМАЛЬНІ ВІКНА — ${drone} — НАСТУПНІ 48 ГОД`,
  noWindows: 'ЛЬОТНИХ ВІКОН НЕ ЗНАЙДЕНО В НАСТУПНІ 48 ГОД',
  goWindow: (h) => `${h}г ПОЛІТ`,
  supportCompact: 'ПІДТРИМАТИ ◈',
  supportTitle: '// ПІДТРИМАТИ ПРОЄКТ',
  crypto: '◈ КРИПТО (NOWPayments)',
  paypal: '$ PAYPAL',
  monobank: '₴ MONOBANK',
  donateNote: 'Безкоштовний інструмент. Без реклами. Пожертви підтримують розробку.',
  windExceedsLimit: (spd, lim) => `Вітер ${spd} м/с перевищує ліміт (${lim} м/с)`,
  gustsExceedLimit: (spd, lim) => `Пориви ${spd} м/с перевищують ліміт (${lim} м/с)`,
  tempBelowLimit: (t, lim) => `Темп. ${t}°C нижче ліміту (${lim}°C)`,
  tempAboveLimit: (t, lim) => `Темп. ${t}°C вище ліміту (${lim}°C)`,
  precipZeroTolerance: 'Виявлено опади — нульова толерантність',
  precipExceedsLimit: (v, lim) => `Опади ${v} мм/год перевищують ліміт (${lim} мм/год)`,
  snowZeroTolerance: 'Виявлено снігопад — нульова толерантність',
  snowExceedsLimit: (v, lim) => `Снігопад ${v} см/год перевищує ліміт (${lim} см/год)`,
  visibilityBelowLimit: (v, lim) => `Видимість ${v}м нижче ліміту (${lim}м)`,
  icingHighRisk: (t, h) => `Високий ризик обмерзання: темп. ${t}°C, вологість ${h}%`,
  windApproachingLimit: (spd, lim) => `Вітер ${spd} м/с наближається до ліміту (${lim} м/с)`,
  gustsApproachingLimit: (spd, lim) => `Пориви ${spd} м/с наближаються до ліміту (${lim} м/с)`,
  tempNearMin: (t, lim) => `Темп. ${t}°C близько до мінімуму (${lim}°C)`,
  precipPresent: (v) => `Присутні опади (${v} мм/год)`,
  visibilityBelow2x: (v) => `Видимість ${v}м нижче 2x мінімуму`,
  highHumidity: (h) => `Висока вологість ${h}% — ризик вологи`,
  potentialIcing: (t, h) => `Можливі умови обмерзання: темп. ${t}°C, вологість ${h}%`,
  dewPointSpreadCaution: (n) => `Спред точки роси ${n}°C — ризик утворення туману`,
  visBlind: 'Видимість <300м — сенсор осліп',
  heavyPrecipBlind: 'Сильні опади засліплюють лінзу',
  reducedVisibility: 'Знижена видимість (300–1000м)',
  rainOnLens: 'Дощ/сніг на лінзі',
  heavyCloudContrast: 'Густа хмарність знижує контраст',
  noThermalCamera: 'Тепловізор відсутній',
  heavyRainBlinds: 'Сильний дощ (>4мм/год) осліплює тепловізор',
  denseFogBlinds: 'Густий туман (<200м) осліплює тепловізор',
  heavySnowBlinds: 'Сильний снігопад (>2см/год) осліплює тепловізор',
  lightRainDegrades: 'Слабкий-помірний дощ погіршує теплове зображення',
  fogDegrades: 'Туман/серпанок погіршує теплове зображення',
  highHumidityDegrades: 'Дуже висока вологість (>95%) погіршує теплове зображення',
  lightSnowDegrades: 'Слабкий снігопад погіршує теплове зображення',
  lowDeltaTDegrades: 'Низька різниця температур між повітрям і землею знижує тепловий контраст',
  wmoUnknown: 'Невідомо',
  windRangeImpact: 'ВПЛИВ ВІТРУ НА ДАЛЬНІСТЬ',
  windFrom: 'Вітер з',
  dirN: 'Пн',
  dirNE: 'ПнСх',
  dirE: 'Сх',
  dirSE: 'ПдСх',
  dirS: 'Пд',
  dirSW: 'ПдЗх',
  dirW: 'Зх',
  dirNW: 'ПнЗх',
  consequences: 'НАСЛІДКИ',
  impactRange: 'Дальність польоту',
  impactEndurance: 'Час польоту',
  impactVisual: 'Візуальний сенсор',
  impactThermal: 'Тепловізор',
  impactIcing: 'Ймовірність обмерзання',
  statusGo: 'ДОЗВІЛ',
  statusCaution: 'ОБЕРЕЖНО',
  statusNoGo: 'ЗАБОРОНА',
  sensorClear: 'ЧИСТО',
  sensorDegraded: 'ПОГІРШЕНО',
  sensorBlind: 'СЛІПИЙ',
  thermalEffective: 'ЕФЕКТИВНО',
  thermalDegraded: 'ПОГІРШЕНО',
  thermalBlind: 'СЛІПИЙ',
  icingNone: 'ВІДСУТНЄ',
  icingPossible: 'МОЖЛИВЕ',
  icingLikely: 'ЙМОВІРНЕ',
};

const en: Translations = {
  useMyLocation: 'USE MY LOCATION',
  fetching: '⟳ FETCHING',
  updated: 'UPD',
  currentConditions: '// CURRENT CONDITIONS — SELECT PLATFORM FOR DETAILS',
  platformDetail: (name) => `// PLATFORM DETAIL — ${name}`,
  forecastTimeline: '// 48H FORECAST TIMELINE',
  loadingWeather: 'LOADING WEATHER DATA...',
  disclaimer:
    '⚠ DISCLAIMER: This tool provides weather-based estimates only. Actual flyability depends on many factors not captured here including EW environment, airspace, terrain, specific drone condition, and operator skill. Always apply operational judgment.',
  dataSource: 'DATA:',
  mapSource: 'MAP:',
  temperature: 'Temperature',
  humidity: 'Humidity',
  pressure: 'Pressure',
  dewPoint: 'Dew Point',
  visibility: 'Visibility',
  cloudCover: 'Cloud Cover',
  precipitation: 'Precipitation',
  snowfall: 'Snowfall',
  wind: 'Wind',
  dewPointSpreadAlert: (n) => `⚠ DEW POINT SPREAD ${n}°C — FOG RISK`,
  flightStatus: 'FLIGHT STATUS',
  sensorStatus: 'SENSOR STATUS',
  thresholds: 'THRESHOLDS',
  visualCamera: 'VISUAL CAMERA',
  thermalCamera: 'THERMAL CAMERA',
  icingRisk: 'ICING RISK',
  noIssues: 'No issues',
  allNominal: '▶ All conditions nominal',
  rangeAdj: 'RANGE ADJ:',
  enduranceAdj: 'ENDURANCE ADJ:',
  parameter: 'PARAMETER',
  actualLimit: 'ACTUAL / LIMIT',
  maxWind: 'Max wind',
  maxGusts: 'Max gusts',
  tempRange: 'Temp range',
  maxPrecip: 'Max precip',
  maxSnow: 'Max snow',
  minVisibility: 'Min visibility',
  ipProtected: 'IP protected',
  icingSusceptible: 'Icing susceptible',
  yes: 'YES',
  no: 'NO',
  nom: 'nom.',
  windLabel: 'Wind:',
  tempLabel: 'Temp:',
  visLabel: 'Vis:',
  precipLabel: 'Precip:',
  optimalWindows: (drone) => `// OPTIMAL LAUNCH WINDOWS — ${drone} — NEXT 48H`,
  noWindows: 'NO FLYABLE WINDOWS FOUND IN NEXT 48H',
  goWindow: (h) => `${h}h GO`,
  supportCompact: 'SUPPORT ◈',
  supportTitle: '// SUPPORT THIS PROJECT',
  crypto: '◈ CRYPTO (NOWPayments)',
  paypal: '$ PAYPAL',
  monobank: '₴ MONOBANK JAR',
  donateNote: 'Free tool. No ads. No paywalls. Donations keep it running.',
  windExceedsLimit: (spd, lim) => `Wind ${spd} m/s exceeds limit (${lim} m/s)`,
  gustsExceedLimit: (spd, lim) => `Gusts ${spd} m/s exceed limit (${lim} m/s)`,
  tempBelowLimit: (t, lim) => `Temp ${t}°C below limit (${lim}°C)`,
  tempAboveLimit: (t, lim) => `Temp ${t}°C above limit (${lim}°C)`,
  precipZeroTolerance: 'Precipitation detected — zero tolerance',
  precipExceedsLimit: (v, lim) => `Precipitation ${v} mm/h exceeds limit (${lim} mm/h)`,
  snowZeroTolerance: 'Snowfall detected — zero tolerance',
  snowExceedsLimit: (v, lim) => `Snowfall ${v} cm/h exceeds limit (${lim} cm/h)`,
  visibilityBelowLimit: (v, lim) => `Visibility ${v}m below limit (${lim}m)`,
  icingHighRisk: (t, h) => `High icing risk: temp ${t}°C, humidity ${h}%, icing conditions`,
  windApproachingLimit: (spd, lim) => `Wind ${spd} m/s approaching limit (${lim} m/s)`,
  gustsApproachingLimit: (spd, lim) => `Gusts ${spd} m/s approaching limit (${lim} m/s)`,
  tempNearMin: (t, lim) => `Temp ${t}°C near minimum (${lim}°C)`,
  precipPresent: (v) => `Precipitation present (${v} mm/h)`,
  visibilityBelow2x: (v) => `Visibility ${v}m below 2x minimum`,
  highHumidity: (h) => `High humidity ${h}% — moisture risk`,
  potentialIcing: (t, h) => `Potential icing conditions: temp ${t}°C, humidity ${h}%`,
  dewPointSpreadCaution: (n) => `Dew point spread ${n}°C — fog formation risk`,
  visBlind: 'Visibility <300m — visual sensor blind',
  heavyPrecipBlind: 'Heavy precipitation obscuring lens',
  reducedVisibility: 'Reduced visibility (300–1000m)',
  rainOnLens: 'Rain/snow on lens',
  heavyCloudContrast: 'Heavy cloud cover reduces visual contrast',
  noThermalCamera: 'No thermal camera',
  heavyRainBlinds: 'Heavy rain (>4mm/h) blinds thermal sensor',
  denseFogBlinds: 'Dense fog (<200m visibility) blinds thermal sensor',
  heavySnowBlinds: 'Heavy snowfall (>2cm/h) blinds thermal sensor',
  lightRainDegrades: 'Light-moderate rain degrades thermal',
  fogDegrades: 'Fog/haze degrades thermal',
  highHumidityDegrades: 'Very high humidity (>95%) degrades thermal',
  lightSnowDegrades: 'Light snowfall degrades thermal',
  lowDeltaTDegrades: 'Low temperature delta between air and ground degrades thermal contrast',
  wmoUnknown: 'Unknown',
  windRangeImpact: 'WIND RANGE IMPACT',
  windFrom: 'Wind from',
  dirN: 'N',
  dirNE: 'NE',
  dirE: 'E',
  dirSE: 'SE',
  dirS: 'S',
  dirSW: 'SW',
  dirW: 'W',
  dirNW: 'NW',
  consequences: 'CONSEQUENCES',
  impactRange: 'Flight range',
  impactEndurance: 'Flight time',
  impactVisual: 'Visual sensor',
  impactThermal: 'Thermal camera',
  impactIcing: 'Icing probability',
  statusGo: 'GO',
  statusCaution: 'CAUTION',
  statusNoGo: 'NO-GO',
  sensorClear: 'CLEAR',
  sensorDegraded: 'DEGRADED',
  sensorBlind: 'BLIND',
  thermalEffective: 'EFFECTIVE',
  thermalDegraded: 'DEGRADED',
  thermalBlind: 'BLIND',
  icingNone: 'NONE',
  icingPossible: 'POSSIBLE',
  icingLikely: 'LIKELY',
};

const translations: Record<Lang, Translations> = { uk, en };

export function getTranslations(lang: Lang): Translations {
  return translations[lang];
}
