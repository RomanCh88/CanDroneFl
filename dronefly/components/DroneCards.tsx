'use client';

import { DroneProfile, FlyabilityAssessment } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface DroneCardsProps {
  profiles: DroneProfile[];
  assessments: FlyabilityAssessment[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const statusColor = {
  GO: { text: 'text-[#00ff88]', border: 'border-[#00ff88]', bg: 'bg-[#00ff88]/10' },
  CAUTION: { text: 'text-[#ffaa00]', border: 'border-[#ffaa00]', bg: 'bg-[#ffaa00]/10' },
  NO_GO: { text: 'text-[#ff3344]', border: 'border-[#ff3344]', bg: 'bg-[#ff3344]/10' },
};

export default function DroneCards({ profiles, assessments, selectedId, onSelect }: DroneCardsProps) {
  const { lang } = useLanguage();

  return (
    <div className="grid grid-cols-5 gap-2">
      {profiles.map((drone, i) => {
        const a = assessments[i];
        if (!a) return null;
        const colors = statusColor[a.status];
        const isSelected = drone.id === selectedId;
        const name = lang === 'uk' ? (drone.nameUk ?? drone.name) : drone.name;

        return (
          <button
            key={drone.id}
            onClick={() => onSelect(drone.id)}
            className={`border p-3 text-left transition-all cursor-pointer ${colors.border} ${colors.bg} ${
              isSelected ? 'ring-1 ring-white/20' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <div className="text-xl mb-1">{drone.icon}</div>
            <div className="text-[#c8d0e0] text-xs font-mono mb-2 leading-tight">{name}</div>
            <div className={`text-xl font-bold font-mono ${colors.text}`}>{a.status.replace('_', '-')}</div>
            <div className="text-[#4a6080] text-xs font-mono mt-1">
              ↗ {a.adjustedRange} km
            </div>
            <div className="text-[#4a6080] text-xs font-mono">
              ⏱ {a.adjustedEndurance} min
            </div>
          </button>
        );
      })}
    </div>
  );
}
