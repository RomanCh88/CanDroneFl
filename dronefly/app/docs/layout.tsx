import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Docs — DroneFly',
  description:
    'How to use DroneFly: weather ratings for drones, 48-hour forecast, location search, custom drones, payload model and mission planner — and how every rating is calculated.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
