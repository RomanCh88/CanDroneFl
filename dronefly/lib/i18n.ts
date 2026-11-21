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
  fogVisBlind: string;
  fogVisDegraded: string;
  fogVisPresent: string;
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
  // forecast hour
  forecastDetailFor: (time: string) => string;
  forecastHint: string;
  close: string;
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
  // account
  signIn: string;
  signOut: string;
  profile: string;
  signInFailed: (code: string) => string;
  popupBlocked: string;
  savedLocations: string;
  saveCurrentLocation: string;
  noSavedLocations: string;
  locationNamePlaceholder: string;
  customBadge: string;
  // profile page
  profileTitle: string;
  backToDashboard: string;
  account: string;
  signInToUnlock: string;
  signInBenefits: string[];
  authUnavailable: string;
  loadingProfile: string;
  preferences: string;
  language: string;
  defaultLocation: string;
  defaultDrone: string;
  none: string;
  setDefault: string;
  isDefault: string;
  addLocation: string;
  nameLabel: string;
  latLabel: string;
  lngLabel: string;
  edit: string;
  rename: string;
  deleteLabel: string;
  confirmDelete: string;
  save: string;
  cancel: string;
  saving: string;
  saveFailed: string;
  customDrones: string;
  noCustomDrones: string;
  addDrone: string;
  editDrone: string;
  newDrone: string;
  startFrom: string;
  droneType: string;
  typeFpv: string;
  typeMultirotor: string;
  typeFixedWing: string;
  icon: string;
  minTemp: string;
  maxTemp: string;
  nominalRange: string;
  nominalEndurance: string;
  hasThermal: string;
  notesLabel: string;
  invalidField: (field: string) => string;
  useOnDashboard: string;
  // detailed specs / performance
  windNoReturn: (w: string, v: string, kg: number) => string;
  windAloftExceeds: (w: string, lim: number) => string;
  windCutsRadius: (pct: number, km: number) => string;
  specsTitle: string;
  useDetailedSpecs: string;
  specsHint: string;
  specParam: string;
  specValue: string;
  specNote: string;
  fromLabel: string;
  toLabel: string;
  specMaxPayload: string;
  specRange: string;
  specRadius: string;
  specRadiusEmpty: string;
  specRadiusFull: string;
  specEndurance: string;
  specEnduranceEmpty: string;
  specEnduranceLoaded: string;
  specAtPayload: string;
  specSpeed: string;
  specSpeedEmpty: string;
  specSpeedFull: string;
  specCeiling: string;
  specWind: string;
  specWindSustained: string;
  specWindGusts: string;
  specConservativeNote: string;
  exampleTemplate: string;
  payload: string;
  payloadHint: string;
  perfTitle: (kg: number) => string;
  perfEndurance: string;
  perfMaxSpeed: string;
  perfRadiusNominal: string;
  perfRadiusStill: string;
  perfRadiusWind: string;
  perfWindUsed: string;
  perfWindRatio: string;
  perfCeiling: string;
  perfLimitedByRange: (km: number) => string;
  perfModelNote: string;
  roundTripTitle: string;
  roundTripNote: string;
  cannotReturn: string;
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
  fogVisBlind: 'Туман — видимість <300м, візуальний сенсор засліплений',
  fogVisDegraded: 'Туман знижує видимість (300–1000м)',
  fogVisPresent: 'Туман — знижена дальність огляду',
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
  forecastDetailFor: (time) => `// ПРОГНОЗ НА ${time}`,
  forecastHint: 'Натисніть на годину для детального звіту',
  close: 'ЗАКРИТИ',
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
  signIn: 'УВІЙТИ',
  signOut: 'ВИЙТИ',
  profile: 'ПРОФІЛЬ',
  signInFailed: (code) => `Не вдалося увійти (${code})`,
  popupBlocked: 'Браузер заблокував вікно входу — дозвольте спливаючі вікна для цього сайту',
  savedLocations: 'ЗБЕРЕЖЕНІ ТОЧКИ',
  saveCurrentLocation: '+ ЗБЕРЕГТИ ПОТОЧНУ',
  noSavedLocations: 'Немає збережених точок',
  locationNamePlaceholder: 'Назва точки',
  customBadge: 'ВЛАСНИЙ',
  profileTitle: '// ПРОФІЛЬ ОПЕРАТОРА',
  backToDashboard: '← ДО ПАНЕЛІ',
  account: 'АКАУНТ',
  signInToUnlock: 'Увійдіть, щоб відкрити розширені можливості',
  signInBenefits: ['Збережені точки та швидке перемикання між ними', 'Власні БПЛА з власними лімітами', 'Синхронізація налаштувань між пристроями'],
  authUnavailable: 'Вхід тимчасово недоступний.',
  loadingProfile: 'ЗАВАНТАЖЕННЯ ПРОФІЛЮ...',
  preferences: 'НАЛАШТУВАННЯ',
  language: 'Мова',
  defaultLocation: 'Точка за замовчуванням',
  defaultDrone: 'БПЛА за замовчуванням',
  none: '— немає —',
  setDefault: 'ЗА ЗАМОВЧ.',
  isDefault: '★ ЗА ЗАМОВЧ.',
  addLocation: '+ ДОДАТИ ТОЧКУ',
  nameLabel: 'Назва',
  latLabel: 'Широта',
  lngLabel: 'Довгота',
  edit: 'РЕДАГУВАТИ',
  rename: 'ПЕРЕЙМЕНУВАТИ',
  deleteLabel: 'ВИДАЛИТИ',
  confirmDelete: 'ТОЧНО?',
  save: 'ЗБЕРЕГТИ',
  cancel: 'СКАСУВАТИ',
  saving: 'ЗБЕРЕЖЕННЯ...',
  saveFailed: "Не вдалося зберегти. Перевірте з'єднання.",
  customDrones: 'ВЛАСНІ БПЛА',
  noCustomDrones: 'Власних БПЛА ще немає',
  addDrone: '+ ДОДАТИ БПЛА',
  editDrone: '// РЕДАГУВАННЯ БПЛА',
  newDrone: '// НОВИЙ БПЛА',
  startFrom: 'Шаблон',
  droneType: 'Тип',
  typeFpv: 'FPV',
  typeMultirotor: 'Мультикоптер',
  typeFixedWing: 'Літак',
  icon: 'Іконка',
  minTemp: 'Мін. темп. (°C)',
  maxTemp: 'Макс. темп. (°C)',
  nominalRange: 'Дальність (км)',
  nominalEndurance: 'Час польоту (хв)',
  hasThermal: 'Тепловізор',
  notesLabel: 'Нотатки',
  invalidField: (f) => `Некоректне значення: ${f}`,
  useOnDashboard: 'ВІДКРИТИ НА ПАНЕЛІ',
  windNoReturn: (w, v, kg) => `Вітер ${w} м/с близький до швидкості БПЛА ${v} м/с при вантажі ${kg} кг — повернення не гарантоване`,
  windAloftExceeds: (w, lim) => `Вітер на висоті 80 м ${w} м/с вище ліміту (${lim} м/с)`,
  windCutsRadius: (pct, km) => `Вітер зменшує радіус на ${pct}% (до ${km} км туди-назад)`,
  specsTitle: 'ТТХ',
  useDetailedSpecs: 'Детальні ТТХ (вантаж, швидкість, радіус)',
  specsHint: 'Вводьте як у таблиці характеристик. Діапазони «від–до» — розрахунок бере менше значення.',
  specParam: 'Параметр',
  specValue: 'Показник',
  specNote: 'Примітки',
  fromLabel: 'від',
  toLabel: 'до',
  specMaxPayload: 'Корисне навантаження',
  specRange: 'Дальність польоту',
  specRadius: 'Ефективний радіус',
  specRadiusEmpty: 'без вантажу',
  specRadiusFull: 'з повним вантажем',
  specEndurance: 'Тривалість польоту',
  specEnduranceEmpty: 'без вантажу',
  specEnduranceLoaded: 'з вантажем',
  specAtPayload: 'при вантажі',
  specSpeed: 'Максимальна швидкість',
  specSpeedEmpty: 'без вантажу',
  specSpeedFull: 'з повним вантажем',
  specCeiling: 'Практична стеля',
  specWind: 'Стійкість до вітру',
  specWindSustained: 'постійний',
  specWindGusts: 'пориви',
  specConservativeNote: 'менше значення використовується в розрахунку',
  exampleTemplate: 'Приклад: важкий коптер 15 кг (ТТХ)',
  payload: 'ВАНТАЖ',
  payloadHint: 'Вантаж на цей виліт — усі розрахунки перераховуються',
  perfTitle: (kg) => `ХАРАКТЕРИСТИКИ ПРИ ВАНТАЖІ ${kg} КГ`,
  perfEndurance: 'Тривалість польоту',
  perfMaxSpeed: 'Макс. швидкість',
  perfRadiusNominal: 'Радіус за ТТХ',
  perfRadiusStill: 'Радіус з урахуванням холоду',
  perfRadiusWind: 'Радіус з урахуванням вітру',
  perfWindUsed: 'Вітер у розрахунку (макс. 10 м / 80 м)',
  perfWindRatio: 'Вітер / швидкість БПЛА',
  perfCeiling: 'Практична стеля',
  perfLimitedByRange: (km) => `обмежено макс. дальністю ${km} км`,
  perfModelNote: 'Модель: лінійна інтерполяція ТТХ за вантажем; холод −1%/°C нижче 0; вітер — політ туди-назад, найгірший випадок (вздовж вітру). Повернення не гарантоване при вітрі ≥ 85% швидкості.',
  roundTripTitle: 'РАДІУС ТУДИ-НАЗАД ЗА НАПРЯМКОМ',
  roundTripNote: 'Для польоту туди-назад зустрічний і попутний вітер дають однаковий результат — найгірше летіти вздовж вітру, найкраще поперек.',
  cannotReturn: 'НЕМАЄ ПОВЕРНЕННЯ',
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
  fogVisBlind: 'Fog — visibility <300m, visual sensor blind',
  fogVisDegraded: 'Fog reduces visibility (300–1000m)',
  fogVisPresent: 'Fog detected — visual range reduced',
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
  forecastDetailFor: (time) => `// FORECAST FOR ${time}`,
  forecastHint: 'Click any hour bar for a full report',
  close: 'CLOSE',
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
  signIn: 'SIGN IN',
  signOut: 'SIGN OUT',
  profile: 'PROFILE',
  signInFailed: (code) => `Sign-in failed (${code})`,
  popupBlocked: 'The browser blocked the sign-in window — allow pop-ups for this site',
  savedLocations: 'SAVED LOCATIONS',
  saveCurrentLocation: '+ SAVE CURRENT',
  noSavedLocations: 'No saved locations',
  locationNamePlaceholder: 'Location name',
  customBadge: 'CUSTOM',
  profileTitle: '// OPERATOR PROFILE',
  backToDashboard: '← DASHBOARD',
  account: 'ACCOUNT',
  signInToUnlock: 'Sign in to unlock extended options',
  signInBenefits: ['Saved locations with quick switching', 'Custom drones with your own limits', 'Preferences synced across devices'],
  authUnavailable: 'Sign-in is temporarily unavailable.',
  loadingProfile: 'LOADING PROFILE...',
  preferences: 'PREFERENCES',
  language: 'Language',
  defaultLocation: 'Default location',
  defaultDrone: 'Default drone',
  none: '— none —',
  setDefault: 'SET DEFAULT',
  isDefault: '★ DEFAULT',
  addLocation: '+ ADD LOCATION',
  nameLabel: 'Name',
  latLabel: 'Latitude',
  lngLabel: 'Longitude',
  edit: 'EDIT',
  rename: 'RENAME',
  deleteLabel: 'DELETE',
  confirmDelete: 'SURE?',
  save: 'SAVE',
  cancel: 'CANCEL',
  saving: 'SAVING...',
  saveFailed: 'Could not save. Check your connection.',
  customDrones: 'CUSTOM DRONES',
  noCustomDrones: 'No custom drones yet',
  addDrone: '+ ADD DRONE',
  editDrone: '// EDIT DRONE',
  newDrone: '// NEW DRONE',
  startFrom: 'Template',
  droneType: 'Type',
  typeFpv: 'FPV',
  typeMultirotor: 'Multirotor',
  typeFixedWing: 'Fixed-wing',
  icon: 'Icon',
  minTemp: 'Min temp (°C)',
  maxTemp: 'Max temp (°C)',
  nominalRange: 'Range (km)',
  nominalEndurance: 'Endurance (min)',
  hasThermal: 'Thermal camera',
  notesLabel: 'Notes',
  invalidField: (f) => `Invalid value: ${f}`,
  useOnDashboard: 'OPEN ON DASHBOARD',
  windNoReturn: (w, v, kg) => `Wind ${w} m/s is close to drone speed ${v} m/s at ${kg} kg payload — return not guaranteed`,
  windAloftExceeds: (w, lim) => `Wind at 80 m ${w} m/s above limit (${lim} m/s)`,
  windCutsRadius: (pct, km) => `Wind cuts radius by ${pct}% (to ${km} km out-and-back)`,
  specsTitle: 'SPECS',
  useDetailedSpecs: 'Detailed specs (payload, speed, radius)',
  specsHint: 'Enter values as on the spec sheet. For "from–to" ranges the calculation uses the lower value.',
  specParam: 'Parameter',
  specValue: 'Value',
  specNote: 'Notes',
  fromLabel: 'from',
  toLabel: 'to',
  specMaxPayload: 'Payload capacity',
  specRange: 'Flight range',
  specRadius: 'Effective radius',
  specRadiusEmpty: 'empty',
  specRadiusFull: 'at full payload',
  specEndurance: 'Flight time',
  specEnduranceEmpty: 'empty',
  specEnduranceLoaded: 'with payload',
  specAtPayload: 'at payload',
  specSpeed: 'Max speed',
  specSpeedEmpty: 'empty',
  specSpeedFull: 'at full payload',
  specCeiling: 'Practical ceiling',
  specWind: 'Wind resistance',
  specWindSustained: 'sustained',
  specWindGusts: 'gusts',
  specConservativeNote: 'the lower value is used in calculations',
  exampleTemplate: 'Example: heavy multirotor 15 kg (specs)',
  payload: 'PAYLOAD',
  payloadHint: 'Payload for this sortie — all calculations update',
  perfTitle: (kg) => `PERFORMANCE AT ${kg} KG PAYLOAD`,
  perfEndurance: 'Flight time',
  perfMaxSpeed: 'Max speed',
  perfRadiusNominal: 'Radius per specs',
  perfRadiusStill: 'Radius after cold',
  perfRadiusWind: 'Radius after wind',
  perfWindUsed: 'Wind used (max of 10 m / 80 m)',
  perfWindRatio: 'Wind / drone speed',
  perfCeiling: 'Practical ceiling',
  perfLimitedByRange: (km) => `capped by max range ${km} km`,
  perfModelNote: 'Model: specs interpolated linearly by payload; cold −1%/°C below 0; wind = out-and-back flight, worst case (along the wind). Return not guaranteed when wind ≥ 85% of drone speed.',
  roundTripTitle: 'OUT-AND-BACK RADIUS BY HEADING',
  roundTripNote: 'For an out-and-back flight head- and tailwind give the same result — flying along the wind is worst, across it is best.',
  cannotReturn: 'NO RETURN',
};

const translations: Record<Lang, Translations> = { uk, en };

export function getTranslations(lang: Lang): Translations {
  return translations[lang];
}
