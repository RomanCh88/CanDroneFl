'use client';

import { useState } from 'react';
import { HourlyAssessment, DroneProfile } from '@/types';
import { getWeatherInfo } from '@/lib/wmoCodes';
import { useLanguage } from '@/contexts/LanguageContext';

interface TimelineProps {
  profiles: DroneProfile[];
  hourlyData: HourlyAssessment[][];
  selectedDroneId: string;
  onDroneSelect: (id: string) => void;
}

const statusBg = {
  GO: 'bg-[#00ff88]',
  CAUTION: 'bg-[#ffaa00]',
  NO_GO: 'bg-[#ff3344]',
};

const statusText = {
  GO: 'text-[#00ff88]',
  CAUTION: 'text-[#ffaa00]',
  NO_GO: 'text-[#ff3344]',
};

export default function Timeline({ profiles, hourlyData, selectedDroneId, onDroneSelect }: TimelineProps) {
  const { lang, tr } = useLanguage();
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const droneIndex = profiles.findIndex(p => p.id === selectedDroneId);
  const data = hourlyData[droneIndex] ?? [];
  const locale = lang === 'uk' ? 'uk-UA' : 'en-GB';

  function formatHour(isoTime: string) {
    const d = new Date(isoTime);
    return d.getHours().toString().padStart(2, '0') + ':00';
  }

  function formatDate(isoTime: string) {
    const d = new Date(isoTime);
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }

  const hovered = hoveredHour !== null ? data[hoveredHour] : null;

  return (
    <div>
      {/* Drone toggle */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {profiles.map(p => {
          const name = lang === 'uk' ? (p.nameUk ?? p.name) : p.name;
          return (
            <button
              key={p.id}
              onClick={() => onDroneSelect(p.id)}
              className={`px-3 py-1 text-xs font-mono border transition-colors ${
                p.id === selectedDroneId
                  ? 'border-[#00b4d8] text-[#00b4d8] bg-[#00b4d8]/10'
                  : 'border-[#1e2d45] text-[#4a6080] hover:border-[#4a6080]'
              }`}
            >
              {p.icon} {name}
            </button>
          );
        })}
      </div>

      {/* Timeline bar */}
      <div className="overflow-x-auto">
        <div className="flex gap-px min-w-max pb-2">
          {data.map((h, i) => {
            const d = new Date(h.time);
            const showDate = i === 0 || d.getHours() === 0;
            return (
              <div key={i} className="flex flex-col items-center">
                {showDate && (
                  <div className="text-[#4a6080] text-xs font-mono mb-1 whitespace-nowrap">
                    {formatDate(h.time)}
                  </div>
                )}
                {!showDate && <div className="mb-1 h-4" />}
                <div
                  className={`w-6 h-8 cursor-pointer transition-opacity ${statusBg[h.assessment.status]} ${
                    hoveredHour === i ? 'opacity-100 ring-1 ring-white' : 'opacity-70 hover:opacity-90'
                  }`}
                  onMouseEnter={() => setHoveredHour(i)}
                  onMouseLeave={() => setHoveredHour(null)}
                  title={`${formatHour(h.time)} — ${h.assessment.status}`}
                />
                <div className="text-[#4a6080] text-xs font-mono mt-1">
                  {d.getHours() % 6 === 0 ? formatHour(h.time) : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover detail */}
      {hovered && (
        <div className="border border-[#1e2d45] p-3 mt-2 bg-[#0d1424]">
          <div className="flex items-center gap-3 mb-2">
            <span className={`font-mono font-bold text-lg ${statusText[hovered.assessment.status]}`}>
              {hovered.assessment.status.replace('_', '-')}
            </span>
            <span className="text-[#4a6080] font-mono text-sm">
              {new Date(hovered.time).toLocaleString(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-lg">{getWeatherInfo(hovered.weather.weatherCode, lang).icon}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div><span className="text-[#4a6080]">{tr.windLabel} </span><span className="text-[#c8d0e0]">{hovered.weather.windSpeed.toFixed(1)} m/s ↑{hovered.weather.windGusts.toFixed(1)}</span></div>
            <div><span className="text-[#4a6080]">{tr.tempLabel} </span><span className="text-[#c8d0e0]">{hovered.weather.temperature.toFixed(1)}°C</span></div>
            <div><span className="text-[#4a6080]">{tr.visLabel} </span><span className="text-[#c8d0e0]">{(hovered.weather.visibility / 1000).toFixed(1)} km</span></div>
            <div><span className="text-[#4a6080]">{tr.precipLabel} </span><span className="text-[#c8d0e0]">{hovered.weather.precipitation.toFixed(1)} mm/h</span></div>
          </div>
          {hovered.assessment.reasons.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {hovered.assessment.reasons.map((r, i) => (
                <div key={i} className={`text-xs font-mono ${hovered.assessment.status === 'NO_GO' ? 'text-[#ff3344]' : 'text-[#ffaa00]'}`}>
                  ▶ {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
