'use client';

import { WeatherData } from '@/types';
import { getWeatherInfo } from '@/lib/wmoCodes';
import { useLanguage } from '@/contexts/LanguageContext';
import WindIndicator from './WindIndicator';

interface WeatherPanelProps {
  weather: WeatherData;
  locationName: string;
}

function StatBox({ label, value, unit, warn = false }: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className="border border-[#1e2d45] p-3 bg-[#0d1424]">
      <div className="text-[#4a6080] text-xs font-mono uppercase mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold ${warn ? 'text-[#ffaa00]' : 'text-white'}`}>
        {value}
        {unit && <span className="text-[#4a6080] text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function WeatherPanel({ weather, locationName }: WeatherPanelProps) {
  const { lang, tr } = useLanguage();
  const c = weather.current;
  const wxInfo = getWeatherInfo(c.weather_code, lang);
  const visKm = (c.visibility / 1000).toFixed(1);
  const dewSpread = (c.temperature_2m - c.dew_point_2m).toFixed(1);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-3 pb-2 border-b border-[#1e2d45]">
        <span className="text-3xl">{wxInfo.icon}</span>
        <div>
          <div className="text-white font-mono font-bold text-lg">{wxInfo.description.toUpperCase()}</div>
          <div className="text-[#4a6080] text-xs font-mono">{locationName}</div>
        </div>
        <div className={`ml-auto px-2 py-1 text-xs font-mono font-bold border ${
          wxInfo.severity === 'severe' ? 'border-[#ff3344] text-[#ff3344]' :
          wxInfo.severity === 'moderate' ? 'border-[#ffaa00] text-[#ffaa00]' :
          wxInfo.severity === 'mild' ? 'border-[#ffaa00] text-[#ffaa00]' :
          'border-[#00ff88] text-[#00ff88]'
        }`}>
          WMO {c.weather_code}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBox label={tr.temperature} value={c.temperature_2m.toFixed(1)} unit="°C" warn={c.temperature_2m < 0} />
        <StatBox label={tr.humidity} value={c.relative_humidity_2m.toString()} unit="%" warn={c.relative_humidity_2m > 85} />
        <StatBox label={tr.pressure} value={c.pressure_msl.toFixed(0)} unit="hPa" />
        <StatBox label={tr.dewPoint} value={c.dew_point_2m.toFixed(1)} unit="°C" warn={Number(dewSpread) < 3} />
        <StatBox label={tr.visibility} value={visKm} unit="km" warn={c.visibility < 2000} />
        <StatBox label={tr.cloudCover} value={c.cloud_cover.toString()} unit="%" />
        <StatBox label={tr.precipitation} value={c.precipitation.toFixed(1)} unit="mm/h" warn={c.precipitation > 0} />
        <StatBox label={tr.snowfall} value={c.snowfall.toFixed(1)} unit="cm/h" warn={c.snowfall > 0} />
      </div>

      <div className="border border-[#1e2d45] p-3 bg-[#0d1424]">
        <div className="text-[#4a6080] text-xs font-mono uppercase mb-2">{tr.wind}</div>
        <WindIndicator
          direction={c.wind_direction_10m}
          speed={c.wind_speed_10m}
          gusts={c.wind_gusts_10m}
        />
      </div>

      {Number(dewSpread) < 3 && (
        <div className="border border-[#ffaa00] px-3 py-2 text-xs font-mono text-[#ffaa00]">
          {tr.dewPointSpreadAlert(dewSpread)}
        </div>
      )}
    </div>
  );
}
