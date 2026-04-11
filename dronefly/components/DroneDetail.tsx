'use client';

import { DroneProfile, FlyabilityAssessment } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { windRangeMultiplier } from '@/lib/range';

interface DroneDetailProps {
  drone: DroneProfile;
  assessment: FlyabilityAssessment;
  windSpeed: number;
  windDirection: number;
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

function impactColor(pct: number) {
  if (pct >= 75) return '#ff3344';
  if (pct >= 35) return '#ff7700';
  return '#ffaa00';
}

function windPctColor(pct: number) {
  if (pct >= 10) return '#00ff88';
  if (pct >= -20) return '#ffaa00';
  if (pct >= -50) return '#ff7700';
  return '#ff3344';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1e2d45] p-3">
      <div className="text-[#4a6080] text-xs font-mono uppercase mb-2">// {title}</div>
      {children}
    </div>
  );
}

function ImpactRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  const color = impactColor(pct);
  const barWidth = Math.min(pct, 100);
  return (
    <div className="py-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[#4a6080] text-xs font-mono">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 w-full bg-[#1e2d45]">
        <div className="h-1 transition-all" style={{ width: `${barWidth}%`, background: color }} />
      </div>
    </div>
  );
}

/** Returns which compass label the wind is coming FROM */
function windSourceLabel(windFromDeg: number, dirLabels: string[]): string {
  const idx = Math.round(((windFromDeg % 360) + 360) % 360 / 45) % 8;
  return dirLabels[idx];
}

export default function DroneDetail({ drone, assessment: a, windSpeed, windDirection }: DroneDetailProps) {
  const { lang, tr } = useLanguage();
  const sc = statusColor[a.status];
  const notes = lang === 'uk' ? (drone.notesUk ?? drone.notes) : drone.notes;

  // Consequence percentages
  const rangeLoss = Math.max(0, Math.round((1 - a.adjustedRange / drone.nominalRange) * 100));
  const enduranceLoss = Math.max(0, Math.round((1 - a.adjustedEndurance / drone.nominalEndurance) * 100));
  const visualLoss = a.sensorStatus === 'BLIND' ? 100 : a.sensorStatus === 'DEGRADED' ? 50 : 0;
  const thermalLoss = a.thermalEffectiveness === 'BLIND' ? 100 : a.thermalEffectiveness === 'DEGRADED' ? 50 : 0;
  const icingPct = a.icingRisk === 'LIKELY' ? 85 : a.icingRisk === 'POSSIBLE' ? 40 : 0;

  const hasConsequences = a.status !== 'GO';

  // Wind directional range data — 8 compass points
  const dirLabels = [tr.dirN, tr.dirNE, tr.dirE, tr.dirSE, tr.dirS, tr.dirSW, tr.dirW, tr.dirNW];
  const dirArrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const dirDegrees = [0, 45, 90, 135, 180, 225, 270, 315];

  const windDirs = dirDegrees.map((heading) => {
    const factor = windRangeMultiplier(heading, windDirection, windSpeed, drone.type);
    const rangekm = Math.round(drone.nominalRange * factor * 10) / 10;
    const pct = Math.round((factor - 1) * 100);
    return { rangekm, pct };
  });

  const windFromLabel = windSourceLabel(windDirection, dirLabels);
  const bestIdx = windDirs.reduce((bi, d, i) => d.pct > windDirs[bi].pct ? i : bi, 0);
  const worstIdx = windDirs.reduce((wi, d, i) => d.pct < windDirs[wi].pct ? i : wi, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Status + Profile */}
        <Section title={tr.flightStatus}>
          <div className={`text-4xl font-bold font-mono border-l-4 pl-3 mb-3 ${sc}`}>
            {a.status === 'GO' ? tr.statusGo : a.status === 'CAUTION' ? tr.statusCaution : tr.statusNoGo}
          </div>
          <div className="text-[#c8d0e0] text-sm font-mono mb-1">{drone.icon} {lang === 'uk' ? (drone.nameUk ?? drone.name) : drone.name}</div>
          <div className="text-[#4a6080] text-xs mb-3">{notes}</div>
          {a.reasons.length > 0 ? (
            <ul className="space-y-1 mb-3">
              {a.reasons.map((r, i) => (
                <li key={i} className={`text-xs font-mono ${a.status === 'NO_GO' ? 'text-[#ff3344]' : 'text-[#ffaa00]'}`}>
                  ▶ {r}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#00ff88] text-xs font-mono mb-3">{tr.allNominal}</div>
          )}

          {hasConsequences && (
            <div className="border-t border-[#1e2d45] pt-2 mt-1">
              <div className="text-[#4a6080] text-xs font-mono mb-2">// {tr.consequences}</div>
              <div className="space-y-0.5">
                {rangeLoss > 0 && (
                  <ImpactRow label={tr.impactRange} value={`−${rangeLoss}%`} pct={rangeLoss} />
                )}
                {enduranceLoss > 0 && (
                  <ImpactRow label={tr.impactEndurance} value={`−${enduranceLoss}%`} pct={enduranceLoss} />
                )}
                {visualLoss > 0 && (
                  <ImpactRow label={tr.impactVisual} value={`−${visualLoss}%`} pct={visualLoss} />
                )}
                {drone.hasThermalCamera && thermalLoss > 0 && (
                  <ImpactRow label={tr.impactThermal} value={`−${thermalLoss}%`} pct={thermalLoss} />
                )}
                {icingPct > 0 && (
                  <ImpactRow label={tr.impactIcing} value={`~${icingPct}%`} pct={icingPct} />
                )}
                {rangeLoss === 0 && enduranceLoss === 0 && visualLoss === 0 &&
                  (!drone.hasThermalCamera || thermalLoss === 0) && icingPct === 0 && (
                  <div className="text-[#4a6080] text-xs font-mono">{tr.noIssues}</div>
                )}
              </div>
            </div>
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

      {/* Wind directional range panel — full width */}
      <Section title={tr.windRangeImpact}>
        <div className="text-[#4a6080] text-xs font-mono mb-3">
          {tr.windFrom}: {windFromLabel} {windSpeed.toFixed(1)} m/s
          <span className="ml-4 text-[#00ff88]">▲ {dirLabels[bestIdx]} {dirArrows[bestIdx]} {windDirs[bestIdx].rangekm} km ({windDirs[bestIdx].pct >= 0 ? '+' : ''}{windDirs[bestIdx].pct}%)</span>
          <span className="ml-4 text-[#ff3344]">▼ {dirLabels[worstIdx]} {dirArrows[worstIdx]} {windDirs[worstIdx].rangekm} km ({windDirs[worstIdx].pct}%)</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {dirDegrees.map((_, i) => {
            const { rangekm, pct } = windDirs[i];
            const color = windPctColor(pct);
            const isBest = i === bestIdx;
            const isWorst = i === worstIdx;
            return (
              <div
                key={i}
                className="border p-2 text-center"
                style={{
                  borderColor: isBest ? '#00ff88' : isWorst ? '#ff3344' : '#1e2d45',
                  background: isBest ? 'rgba(0,255,136,0.05)' : isWorst ? 'rgba(255,51,68,0.05)' : '#0d1424',
                }}
              >
                <div className="text-[#4a6080] text-xs font-mono">{dirLabels[i]}</div>
                <div className="text-lg my-0.5" style={{ color }}>{dirArrows[i]}</div>
                <div className="text-white text-xs font-mono font-bold">{rangekm}<span className="text-[#4a6080] text-xs font-normal ml-0.5">km</span></div>
                <div className="text-xs font-mono font-bold" style={{ color }}>
                  {pct >= 0 ? '+' : ''}{pct}%
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
