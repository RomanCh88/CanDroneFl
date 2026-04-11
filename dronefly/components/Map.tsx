'use client';

import { useEffect, useRef } from 'react';

interface MapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function Map({ lat, lng, onLocationChange }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    // Dynamically import Leaflet
    import('leaflet').then(L => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;
      // Fix default icon paths for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 8,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        className: 'map-tiles',
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat, pos.lng);
      });

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when lat/lng changes externally
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
    }
  }, [lat, lng]);

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px' }} />
      <div className="absolute bottom-2 left-2 bg-black/70 text-[#00b4d8] text-xs font-mono px-2 py-1 z-[1000]">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
      <style jsx global>{`
        .leaflet-container {
          background: #0a0f1a;
        }
        .map-tiles {
          filter: invert(1) hue-rotate(180deg) brightness(0.8) saturate(0.6);
        }
        .leaflet-control-zoom a {
          background: #141b2d !important;
          color: #c8d0e0 !important;
          border-color: #1e2d45 !important;
        }
        .leaflet-control-attribution {
          background: rgba(10, 15, 26, 0.8) !important;
          color: #4a6080 !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #00b4d8 !important;
        }
      `}</style>
    </div>
  );
}
