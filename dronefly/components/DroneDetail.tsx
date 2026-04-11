'use client';

import { DroneProfile, FlyabilityAssessment } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface DroneDetailProps {
  drone: DroneProfile;
  assessment: FlyabilityAssessment;
}

const statusColor = {
  GO: 'text-[#00ff88] border-[#00ff88]',
  CAUTION: 'text-[#ffaa00] border-[#ffaa00]',
  NO_GO: 'text-[#ff3344] border-[#ff3344]',
};

const icingColor = {
  NONE: 'text-[#00ff88]',
  POSSIBLE: 'text-[#ffaa00]',
  LIKELY: 'text-[#ff3344]',
};

const thermalColor = {
  EFFECTIVE: 'text-[#00ff88]',
  DEGRADED: 'text-[#ffaa00]',
  BLIND: 'text-[#ff3344]',
};

const sensorColor = {
  CLEAR: 'text-[#00ff88]',
  DEGRADED: 'text-[#ffaa00]',
  BLIND: 'text-[#ff3344]',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1e2d45] p-3">
      <div className="text-[#4a6080] text-xs font-mono uppercase mb-2">// {title}</div>
      {children}
    </div>
  );
}

export default function DroneDetail({ drone, assessment: a }: DroneDetailProps) {
  const { lang, tr } = useLanguage();
  const sc = statusColor[a.status];
  const notes = lang === 'uk' ? (drone.notesUk ?? drone.notes) : drone.notes;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Status + Profile */}
      <Section title={tr.flightStatus}>
        <div className={`text-4xl font-bold font-mono border-l-4 pl-3 mb-3 ${sc}`}>
          {a.status === 'GO' ? tr.statusGo : a.status === 'CAUTION' ? tr.statusCaution : tr.statusNoGo}
        </div>
        <div className="text-[#c8d0e0] text-sm font-mono mb-1">{drone.icon} {lang === 'uk' ? (drone.nameUk ?? drone.name) : drone.name}</div>
        <div className="text-[#4a6080] text-xs mb-3">{notes}</div>
        {a.reasons.length > 0 ? (
          <ul className="space-y-1">
            {a.reasons.map((r, i) => (
              <li key={i} className={`text-xs font-mono ${a.status === 'NO_GO' ? 'text-[#ff3344]' : 'text-[#ffaa00]'}`}>
                ▶ {r}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[#00ff88] text-xs font-mono">{tr.allNominal}</div>
        )}
      </Section>

      {/* Sensors */}
      <Section title={tr.sensorStatus}>
        <div className="space-y-3">
          <div>
            <div className="text-[#4a6080] text-xs font-mono mb-1">{tr.visualCamera}</div>
            <div className={`text-lg font-bold font-mono ${sensorColor[a.sensorStatus]}`}>
              {a.sensorStatus === 'CLEAR' ? tr.sensorClear : a.sensorStatus === 'DEGRADED' ? tr.sensorDegraded : tr.sensorBlind}
            </div>
            {a.sensorReasons.map((r, i) => (
              <div key={i} className="text-xs font-mono text-[#ffaa00] mt-0.5">▶ {r}</div>
            ))}
            {a.sensorReasons.length === 0 && (
              <div className="text-xs font-mono text-[#4a6080]">{tr.noIssues}</div>
            )}
          </div>

          {drone.hasThermalCamera && (
            <div className="border-t border-[#1e2d45] pt-3">
              <div className="text-[#4a6080] text-xs font-mono mb-1">{tr.thermalCamera}</div>
              <div className={`text-lg font-bold font-mono ${thermalColor[a.thermalEffectiveness]}`}>
                {a.thermalEffectiveness === 'EFFECTIVE' ? tr.thermalEffective : a.thermalEffectiveness === 'DEGRADED' ? tr.thermalDegraded : tr.thermalBlind}
              </div>
              {a.thermalReasons.map((r, i) => (
                <div key={i} className="text-xs font-mono text-[#ffaa00] mt-0.5">▶ {r}</div>
              ))}
              {a.thermalReasons.length === 0 && (
                <div className="text-xs font-mono text-[#4a6080]">{tr.noIssues}</div>
              )}
            </div>
          )}

          <div className="border-t border-[#1e2d45] pt-3">
            <div className="text-[#4a6080] text-xs font-mono mb-1">{tr.icingRisk}</div>
            <div className={`text-lg font-bold font-mono ${icingColor[a.icingRisk]}`}>
              {a.icingRisk === 'NONE' ? tr.icingNone : a.icingRisk === 'POSSIBLE' ? tr.icingPossible : tr.icingLikely}
            </div>
          </div>
        </div>
      </Section>

      {/* Thresholds */}
      <Section title={tr.thresholds}>
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs font-mono text-[#4a6080] border-b border-[#1e2d45] pb-1 mb-1">
            <span>{tr.parameter}</span><span>{tr.actualLimit}</span>
          </div>
          <div className="text-[#c8d0e0] text-xs font-mono">
            <div className="text-[#4a6080] text-xs mb-1">{tr.rangeAdj} <span className="text-[#00b4d8]">{a.adjustedRange} km</span> <span className="text-[#4a6080]">({tr.nom} {drone.nominalRange} km)</span></div>
            <div className="text-[#4a6080] text-xs mb-2">{tr.enduranceAdj} <span className="text-[#00b4d8]">{a.adjustedEndurance} min</span> <span className="text-[#4a6080]">({tr.nom} {drone.nominalEndurance} min)</span></div>
          </div>
          <div className="text-[#4a6080] text-xs font-mono mt-1 space-y-0.5">
            <div className="flex justify-between"><span>{tr.maxWind}</span><span className="text-[#c8d0e0]">{drone.limits.maxWindSpeed} m/s</span></div>
            <div className="flex justify-between"><span>{tr.maxGusts}</span><span className="text-[#c8d0e0]">{drone.limits.maxWindGusts} m/s</span></div>
            <div className="flex justify-between"><span>{tr.tempRange}</span><span className="text-[#c8d0e0]">{drone.limits.minTemperature}°C – {drone.limits.maxTemperature}°C</span></div>
            <div className="flex justify-between"><span>{tr.maxPrecip}</span><span className="text-[#c8d0e0]">{drone.limits.maxPrecipitation} mm/h</span></div>
            <div className="flex justify-between"><span>{tr.maxSnow}</span><span className="text-[#c8d0e0]">{drone.limits.maxSnowfall} cm/h</span></div>
            <div className="flex justify-between"><span>{tr.minVisibility}</span><span className="text-[#c8d0e0]">{drone.limits.minVisibility} m</span></div>
            <div className="flex justify-between"><span>{tr.ipProtected}</span><span className={drone.hasIpProtection ? 'text-[#00ff88]' : 'text-[#ff3344]'}>{drone.hasIpProtection ? tr.yes : tr.no}</span></div>
            <div className="flex justify-between"><span>{tr.icingSusceptible}</span><span className={drone.limits.icingRisk ? 'text-[#ffaa00]' : 'text-[#00ff88]'}>{drone.limits.icingRisk ? tr.yes : tr.no}</span></div>
          </div>
        </div>
      </Section>
    </div>
  );
}
