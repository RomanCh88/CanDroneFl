// Place-name search via Open-Meteo Geocoding (free, no key, CORS-enabled, same provider as weather).
// Only the typed text is sent — never the user's position.

export interface Place {
  id: number;
  name: string;
  admin1?: string;   // oblast / region
  admin2?: string;   // district
  countryCode?: string;
  country?: string;
  lat: number;
  lng: number;
  population?: number;
}

interface RawPlace {
  id: number; name: string; admin1?: string; admin2?: string; country_code?: string; country?: string;
  latitude: number; longitude: number; population?: number;
}

export async function searchPlaces(query: string, lang: 'uk' | 'en', signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ name: q, count: '8', language: lang, format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const json: { results?: RawPlace[] } = await res.json();
  return (json.results ?? []).map(r => ({
    id: r.id, name: r.name, admin1: r.admin1, admin2: r.admin2,
    countryCode: r.country_code, country: r.country,
    lat: r.latitude, lng: r.longitude, population: r.population,
  }));
}
