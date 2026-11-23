'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { WeatherData, FlyabilityAssessment, HourlyAssessment, Location, DroneProfile } from '@/types';
import { useWeather } from '@/hooks/useWeather';
import { DRONE_PROFILES } from '@/lib/droneProfiles';
import { assess, findBestWindows } from '@/lib/assessment';
import { defaultPayload } from '@/lib/performance';
import PayloadControl from '@/components/PayloadControl';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserData } from '@/contexts/UserDataContext';
import { useAuth } from '@/contexts/AuthContext';
import AccountMenu from '@/components/AccountMenu';
import SavedLocationsMenu from '@/components/SavedLocationsMenu';
import LocationSearch from '@/components/LocationSearch';
import WeatherPanel from '@/components/WeatherPanel';
import DroneCards from '@/components/DroneCards';
import DroneDetail from '@/components/DroneDetail';
import Timeline from '@/components/Timeline';
import BestWindows from '@/components/BestWindows';
import DonateButton from '@/components/DonateButton';
import ThanksButton from '@/components/ThanksButton';
import { SHOW_DONATIONS } from '@/lib/features';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

const DEFAULT_LOCATION: Location = { lat: 50.4501, lng: 30.5234, name: 'Київ, Україна' };
const PAYLOAD_KEY = 'dronefly.payloads';

function buildWeatherPoint(wx: WeatherData['current']) {
  return {
    temperature: wx.temperature_2m,
    humidity: wx.relative_humidity_2m,
    dewPoint: wx.dew_point_2m,
    precipitation: wx.precipitation,
    rain: wx.rain,
    snowfall: wx.snowfall,
    cloudCover: wx.cloud_cover,
    visibility: wx.visibility,
    windSpeed: wx.wind_speed_10m,
    windGusts: wx.wind_gusts_10m,
    windDirection: wx.wind_direction_10m,
    weatherCode: wx.weather_code,
  };
}

export default function Home() {
  const { lang, setLang, tr } = useLanguage();
  const { user, loading: authLoading, member } = useAuth();
  const { ready: userReady, prefs, locations, customDrones } = useUserData();
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const { weather, loading, error, updatedAt: lastUpdated, stale } = useWeather(location.lat, location.lng);
  const [selectedDroneId, setSelectedDroneId] = useState(DRONE_PROFILES[0].id);
  const [forecastHourIndex, setForecastHourIndex] = useState<number | null>(null);

  // Payload per drone (drones with detailed specs only), remembered on this device.
  // Lazy init is safe: payload only affects output after weather loads on the client.
  const [payloads, setPayloads] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(PAYLOAD_KEY) ?? '{}'); } catch { return {}; }
  });
  const setPayload = useCallback((droneId: string, kg: number) => {
    setPayloads(prev => {
      const next = { ...prev, [droneId]: kg };
      try { localStorage.setItem(PAYLOAD_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const payloadFor = useCallback(
    (d: DroneProfile) => (d.performance ? Math.min(payloads[d.id] ?? defaultPayload(d.performance), d.performance.maxPayloadKg) : undefined),
    [payloads]
  );

  // Built-in profiles + the signed-in user's custom drones.
  const allProfiles: DroneProfile[] = useMemo(() => [...DRONE_PROFILES, ...customDrones], [customDrones]);

  // If the selected drone disappears (deleted custom drone / sign-out), fall back to the first one.
  // Wait while custom drones may still be loading, so a deep-linked custom drone isn't dropped.
  const profilesSettled = !authLoading && (!user || member === false || userReady);
  // Derived (not stored): the selection itself is kept so it comes back if the drone reappears.
  const effectiveDroneId = !profilesSettled || allProfiles.some(p => p.id === selectedDroneId)
    ? selectedDroneId
    : allProfiles[0].id;

  // Deep link from the profile page: /?lat=..&lng=..&name=..  or  /?drone=<id>
  const deepLinked = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    if (params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng)
        && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      // Reading the URL once on mount is syncing with an external system.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation({ lat, lng, name: params.get('name')?.slice(0, 60) || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      deepLinked.current = true;
    }
    const drone = params.get('drone');
    if (drone) {
      setSelectedDroneId(drone);
      deepLinked.current = true;
    }
    if (params.size > 0) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Apply the user's default location / drone once per sign-in (unless a deep link chose them).
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (!userReady) { defaultsApplied.current = false; return; }
    if (defaultsApplied.current) return;
    defaultsApplied.current = true;
    if (deepLinked.current) return;
    const loc = locations.find(l => l.id === prefs.defaultLocationId);
    // Applying remote defaults once when the user's data arrives (external store).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loc) setLocation({ lat: loc.lat, lng: loc.lng, name: loc.name });
    if (prefs.defaultDroneId && allProfiles.some(p => p.id === prefs.defaultDroneId)) {
      setSelectedDroneId(prefs.defaultDroneId);
    }
  }, [userReady, locations, prefs, allProfiles]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setLocation({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  }, []);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: lang === 'uk' ? 'Моє місце' : 'My Location' }),
      () => {}
    );
  }, [lang]);

  // Ratings are recomputed only when their inputs change. The payload slider updates
  // `payloads` on every tick; deferring it keeps dragging smooth.
  const deferredPayloads = useDeferredValue(payloads);

  const currentAssessments: FlyabilityAssessment[] = useMemo(() => {
    if (!weather) return [];
    const pf = (d: DroneProfile) => d.performance
      ? Math.min(deferredPayloads[d.id] ?? defaultPayload(d.performance), d.performance.maxPayloadKg) : undefined;
    return allProfiles.map(drone => assess(
      drone,
      // `current` has no 80 m wind; use the current hour's value (hourly starts at the current hour).
      { ...buildWeatherPoint(weather.current), windSpeed80: weather.hourly.wind_speed_80m?.[0] },
      lang,
      { payloadKg: pf(drone) }
    ));
  }, [weather, allProfiles, lang, deferredPayloads]);

  // `forecast_hours=48` returns exactly 48 hours starting at the location's current hour
  // (in the location's timezone), so no browser-clock slicing is needed.
  const hourlyAssessments: HourlyAssessment[][] = useMemo(() => {
    if (!weather) return [];
    const h = weather.hourly;
    const pf = (d: DroneProfile) => d.performance
      ? Math.min(deferredPayloads[d.id] ?? defaultPayload(d.performance), d.performance.maxPayloadKg) : undefined;
    return allProfiles.map(drone =>
      h.time.map((time, i) => ({
        time,
        assessment: assess(drone, {
          temperature: h.temperature_2m[i],
          humidity: h.relative_humidity_2m[i],
          dewPoint: h.dew_point_2m[i],
          precipitation: h.precipitation[i],
          rain: h.rain[i],
          snowfall: h.snowfall[i],
          cloudCover: h.cloud_cover[i],
          visibility: h.visibility[i],
          windSpeed: h.wind_speed_10m[i],
          windGusts: h.wind_gusts_10m[i],
          windDirection: h.wind_direction_10m[i],
          weatherCode: h.weather_code[i],
          windSpeed80: h.wind_speed_80m?.[i],
        }, lang, { payloadKg: pf(drone) }),
        weather: {
          temperature: h.temperature_2m[i],
          windSpeed: h.wind_speed_10m[i],
          windGusts: h.wind_gusts_10m[i],
          windDirection: h.wind_direction_10m[i],
          precipitation: h.precipitation[i],
          snowfall: h.snowfall[i],
          visibility: h.visibility[i],
          cloudCover: h.cloud_cover[i],
          humidity: h.relative_humidity_2m[i],
          dewPoint: h.dew_point_2m[i],
          weatherCode: h.weather_code[i],
        },
      }))
    );
  }, [weather, allProfiles, lang, deferredPayloads]);

  const handleDroneSelect = useCallback((id: string) => {
    setSelectedDroneId(id);
    setForecastHourIndex(null);
  }, []);

  const selectedDroneIndex = allProfiles.findIndex(p => p.id === effectiveDroneId);
  const selectedDrone = allProfiles[selectedDroneIndex];
  const selectedAssessment = currentAssessments[selectedDroneIndex];
  const selectedHourly = hourlyAssessments[selectedDroneIndex] ?? [];
  const bestWindows = selectedHourly.length > 0
    ? findBestWindows(selectedHourly.map(h => h.time), selectedHourly.map(h => h.assessment))
    : [];

  const droneName = lang === 'uk' ? (selectedDrone?.nameUk ?? selectedDrone?.name ?? '') : (selectedDrone?.name ?? '');

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0a0f1a', fontFamily: 'var(--font-exo2), sans-serif' }}>
      {/* HEADER */}
      <header className="border-b flex items-center px-4 py-3 gap-4 flex-wrap" style={{ borderColor: '#1e2d45', background: '#080d17' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛩</span>
          <span className="font-bold text-lg tracking-widest" style={{ fontFamily: 'var(--font-exo2)', color: '#00b4d8' }}>
            DRONEFLY
          </span>
          <span className="text-xs ml-2 px-1 border" style={{ borderColor: '#1e2d45', color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
            WX
          </span>
        </div>

        <LocationSearch onSelect={setLocation} />

        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs" style={{ color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
            📍 {location.name}
          </span>
          <button
            onClick={handleGeolocate}
            className="text-xs px-2 py-1 border transition-colors"
            style={{ borderColor: '#1e2d45', color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}
          >
            {tr.useMyLocation}
          </button>
          <SavedLocationsMenu current={location} onSelect={setLocation} />
        </div>

        {lastUpdated && (
          <span className="text-xs ml-1" style={{ color: '#2d4060', fontFamily: 'var(--font-jetbrains)' }}>
            {tr.updated} {lastUpdated.toLocaleTimeString(lang === 'uk' ? 'uk-UA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
            {stale && <span className="ml-1 text-[#ffaa00]" title={tr.cachedHint}>· {tr.cached}</span>}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {loading && (
            <span className="text-xs animate-pulse" style={{ color: '#00b4d8', fontFamily: 'var(--font-jetbrains)' }}>
              {tr.fetching}
            </span>
          )}

          <ThanksButton />

          <Link
            href="/docs"
            className="text-xs px-2 py-1 border font-mono tracking-wider transition-colors hover:text-[#00b4d8]"
            style={{ borderColor: '#1e2d45', color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}
          >
            ? {tr.navDocs}
          </Link>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
            className="text-xs px-2 py-1 border font-mono tracking-wider transition-colors"
            style={{ borderColor: '#1e2d45', fontFamily: 'var(--font-jetbrains)' }}
            title={lang === 'uk' ? 'Switch to English' : 'Перейти на українську'}
          >
            <span style={{ color: lang === 'uk' ? '#00b4d8' : '#4a6080' }}>UA</span>
            <span style={{ color: '#2d4060' }}>|</span>
            <span style={{ color: lang === 'en' ? '#00b4d8' : '#4a6080' }}>EN</span>
          </button>

          <AccountMenu />
          {SHOW_DONATIONS && <DonateButton compact />}
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="px-4 py-2 border-b text-sm" style={{ borderColor: '#ff3344', background: '#1a0808', color: '#ff3344', fontFamily: 'var(--font-jetbrains)' }}>
          ⚠ {error}
        </div>
      )}

      {/* MAP + WEATHER */}
      <div className="flex border-b" style={{ borderColor: '#1e2d45', height: '380px' }}>
        <div className="border-r" style={{ width: '40%', borderColor: '#1e2d45' }}>
          <MapComponent lat={location.lat} lng={location.lng} onLocationChange={handleLocationChange} />
        </div>
        <div className="p-4 overflow-y-auto" style={{ width: '60%' }}>
          {weather ? (
            <WeatherPanel weather={weather} locationName={location.name} />
          ) : loading ? (
            <div className="flex items-center justify-center h-full" style={{ color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
              <span className="animate-pulse">{tr.loadingWeather}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 space-y-4">
        {weather && currentAssessments.length > 0 && (
          <section>
            <div className="text-xs mb-2" style={{ color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
              {tr.currentConditions}
            </div>
            <DroneCards
              profiles={allProfiles}
              assessments={currentAssessments}
              selectedId={effectiveDroneId}
              onSelect={handleDroneSelect}
            />
          </section>
        )}

        {weather && selectedDrone && selectedAssessment && (
          <section className="border-t pt-4" style={{ borderColor: '#1e2d45' }}>
            <div className="text-xs mb-3" style={{ color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
              {tr.platformDetail(droneName.toUpperCase())}
            </div>
            {selectedDrone.performance && (
              <PayloadControl
                perf={selectedDrone.performance}
                value={payloadFor(selectedDrone) ?? 0}
                onChange={kg => setPayload(selectedDrone.id, kg)}
              />
            )}
            <DroneDetail
              drone={selectedDrone}
              assessment={selectedAssessment}
              windSpeed={weather.current.wind_speed_10m}
              windDirection={weather.current.wind_direction_10m}
            />
          </section>
        )}

        {weather && hourlyAssessments.length > 0 && (
          <section className="border-t pt-4" style={{ borderColor: '#1e2d45' }}>
            <div className="text-xs mb-3" style={{ color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}>
              {tr.forecastTimeline}
            </div>
            <Timeline
              profiles={allProfiles}
              hourlyData={hourlyAssessments}
              selectedDroneId={effectiveDroneId}
              onDroneSelect={handleDroneSelect}
              selectedHour={forecastHourIndex}
              onHourSelect={setForecastHourIndex}
            />
          </section>
        )}

        {weather && forecastHourIndex !== null && selectedHourly[forecastHourIndex] && selectedDrone && (
          <section className="border-t pt-4" style={{ borderColor: '#00b4d8' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs" style={{ color: '#00b4d8', fontFamily: 'var(--font-jetbrains)' }}>
                {tr.forecastDetailFor(
                  new Date(selectedHourly[forecastHourIndex].time).toLocaleString(
                    lang === 'uk' ? 'uk-UA' : 'en-GB',
                    { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                  )
                )}
              </div>
              <button
                onClick={() => setForecastHourIndex(null)}
                className="text-xs px-2 py-1 border transition-colors font-mono"
                style={{ borderColor: '#1e2d45', color: '#4a6080', fontFamily: 'var(--font-jetbrains)' }}
              >
                × {tr.close}
              </button>
            </div>
            <DroneDetail
              drone={selectedDrone}
              assessment={selectedHourly[forecastHourIndex].assessment}
              windSpeed={selectedHourly[forecastHourIndex].weather.windSpeed}
              windDirection={selectedHourly[forecastHourIndex].weather.windDirection}
            />
          </section>
        )}

        {weather && (
          <section className="border-t pt-4" style={{ borderColor: '#1e2d45' }}>
            <BestWindows windows={bestWindows} droneName={droneName} />
          </section>
        )}

        {SHOW_DONATIONS && (
          <section className="border-t pt-4" style={{ borderColor: '#1e2d45' }}>
            <DonateButton />
          </section>
        )}

        <footer className="border-t pt-4 pb-8" style={{ borderColor: '#1e2d45' }}>
          <div className="text-xs space-y-1" style={{ color: '#2d4060', fontFamily: 'var(--font-jetbrains)' }}>
            <div>{tr.disclaimer}</div>
            <div>
              {tr.dataSource}{' '}
              <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00b4d8' }}>
                Open-Meteo.com
              </a>{' '}
              · {tr.mapSource}{' '}
              <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer" style={{ color: '#00b4d8' }}>
                OpenStreetMap
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
