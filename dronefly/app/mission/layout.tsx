import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission planner — DroneFly',
  robots: { index: false },
};

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
