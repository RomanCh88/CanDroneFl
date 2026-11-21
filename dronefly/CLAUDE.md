@AGENTS.md

# DroneFly — project notes

Drone weather flyability dashboard: for one location it gives a GO / CAUTION / NO_GO rating to each of 5 drone classes, for now and for the next 48 h.
Users: Ukrainian military and civilian drone operators. Funded by donations, no paywall.
The original spec is `../drone-wx-instructions.md` (repo root). Read it for the design intent and the rule thresholds.

## Stack
- Next.js **16.2.3** (App Router), React 19.2, Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no tailwind.config). See AGENTS.md: check `node_modules/next/dist/docs/` before using any Next API.
- Leaflet 1.9 + OSM tiles (CSS invert filter gives the dark map). Marker icons are loaded from unpkg.
- Weather: Open-Meteo `/v1/forecast`, called from the client. No key, no backend, no DB.
- Fonts: Exo 2 (labels) and JetBrains Mono (data) via `next/font`, both with cyrillic subsets.
- Hosting: **Firebase App Hosting** (`firebase.json` → backend `can-drone-fly`, project `candronefly`, `apphosting.yaml` minInstances 0). The spec said Vercel; that was dropped.
- `.agents/skills/` + `skills-lock.json` = Firebase agent skills (installed tooling, not app code).

## Commands (run from `dronefly/`)
- `npm run dev` / `npm run build` / `npm start` / `npm run lint`
- `build` runs `scripts/generate-icons.mjs` first (sharp: `public/icon.svg` → icon-192/512 + apple-touch-icon). sharp is **not** a declared dependency; it only works because Next pulls it in transitively.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit` (clean as of 2026-11-21). `npx tsc` fails on Windows because of the missing bin shims below.
- ⚠ `node_modules` was installed under WSL/Linux. On Windows `eslint` and other bin shims are missing. Reinstall on the host OS you are using, or run from WSL.

## Architecture
- `app/page.tsx`: the whole app, one `'use client'` page. Holds all state (location, weather, selected drone, selected forecast hour). It fetches on location change and every 15 min, builds `currentAssessments` (from `weather.current`) and `hourlyAssessments[drone][48]` (sliced from the current local hour), and finds the best windows. It recomputes everything on every render (no memoisation).
- `app/layout.tsx`: fonts, metadata, PWA meta, `<PWARegister/>`. `app/manifest.ts` → `/manifest.webmanifest`.
- `lib/weather.ts`: Open-Meteo fetch (`forecast_days=3` so the 48 h slice always fits, `wind_speed_unit=ms`, `timezone=auto`).
- `lib/assessment.ts`: `assess(drone, WeatherPoint, lang)` is the core rules engine (NO_GO → CAUTION → GO), plus icing risk, visual sensor status and `findBestWindows` (≥2 consecutive GO hours).
- `lib/thermal.ts`: thermal camera EFFECTIVE/DEGRADED/BLIND. `lib/range.ts`: `adjustRange` (wind penalty), `adjustEndurance` (cold penalty), `windRangeMultiplier` (per-heading, used by DroneDetail's range rose).
- `lib/droneProfiles.ts`: the 5 profiles (fpv, mavic, heavy, fixed_small, fixed_large). Values match the spec.
- `lib/i18n.ts`: typed `Translations`, uk + en. **All user-facing strings, including assessment reasons, come from here**, so the engine takes `lang`. `contexts/LanguageContext.tsx`: default `uk`, not persisted.
- `lib/wmoCodes.ts`: WMO code → description/icon/severity.
- `components/`: Map (dynamic, ssr:false), WeatherPanel, DroneCards, DroneDetail, Timeline (48 cells per drone, click selects a forecast hour), BestWindows, WindIndicator, DonateButton, PWARegister.
- `public/sw.js`: hand-written service worker. Network-first for Open-Meteo (offline fallback to last forecast), cache-first for `/_next/static` + listed assets.
- `types/index.ts`: DroneProfile, WeatherData (raw Open-Meteo shape), FlyabilityAssessment, HourlyAssessment, Location.
- Styling: mostly inline `style={{}}` hex colours plus a few Tailwind arbitrary values. Palette: bg `#0a0f1a`, card `#141b2d`, border `#1e2d45`, muted `#4a6080`, GO `#00ff88`, CAUTION `#ffaa00`, NO_GO `#ff3344`, accent `#00b4d8`. Design rules: flat, angular HUD look, no gradients, shadows or rounded corners.

## Done (MVP + polish, git history up to 4a79aab)
Weather fetch and panel · 5 profiles + assessment engine · drone cards · map picker (click/drag) + geolocation · 48 h timeline starting at the current hour, with per-hour detail · detail panel (reasons, thermal, sensor, icing, range/endurance, thresholds, directional range) · best windows · UA/EN i18n (the spec listed it as future work) · donate section · disclaimer/credits · PWA (manifest, icons, SW, iOS meta) · 15-min auto refresh.

## Known issues / gaps (found while reviewing the code, 2026-11-21)
Bugs / correctness:
- **SW serves a stale app shell**: `'/'` is in `STATIC_ASSETS`, so it hits the cache-first branch before the navigate branch, and `CACHE_NAME` never changes. Users can be stuck on an old build after a deploy. Needs network-first HTML plus versioned caches (or Serwist).
- **Timezone mismatch**: `currentHourStart` builds "now" from the *browser* clock, but Open-Meteo times are in the *location's* tz. This is wrong whenever the picked location is in another timezone. Use `utc_offset_seconds` from the response.
- `thermal.ts` low-ΔT check is dead code (groundTemp = temp+3 → ΔT is always 3, and the check is `< 3`). Needs a real model (day/night, cloud, sun).
- Sensor rules missing from the spec: night (no is_day/sunrise data is fetched), low-sun glare. `maxCloudCover` exists but is never checked.
- The icing NO_GO condition repeats the `assessIcingRisk` thresholds inline (it checks `rain`, while the helper checks `precipitation`). Unify them.
- `adjustRange` ignores wind direction. Fetched but unused: `precipitation_probability`, `wind_speed_80m`, cloud layers, pressure.
- Location name for clicked points is only coordinates (no reverse geocoding/search).
Production readiness:
- Donate links are placeholders (`nowpayments.io/donation`, `paypal.me`, `send.monobank.ua`). **Donations are hidden** via `SHOW_DONATIONS = false` in `lib/features.ts` (user decision 2026-11-21); set real links before flipping it back on.
- README is still the create-next-app boilerplate. `public/` still has the default next/vercel/file/globe/window SVGs.
- No tests at all (the rules engine is pure and easy to unit-test). No CI. No error boundary. No retry/backoff on the fetch.
- No SEO/OG metadata, no `metadataBase`, no viewport/themeColor export, `lang` on `<html>` is fixed to `uk`.
- Layout is desktop-first: the map/weather row is a fixed 40/60 split with 380px height, which breaks on phones.
- Language and last location are not persisted (localStorage).
- No analytics/monitoring. Open-Meteo's free tier is non-commercial; check its terms against a donation-funded app and consider attribution and rate limits.
- Leaflet marker images come from unpkg; bundle them locally for offline/PWA use.
- `.claude/settings.local.json` holds Linux/WSL paths. Several new files (firebase config, AGENTS.md, CLAUDE.md, .agents) are untracked.

## Conventions
- Commit style: `ADD: …` / `FIX: …`.
- Every new user-facing string goes into both `uk` and `en` in `lib/i18n.ts` (the type enforces it).
- Keep the assessment logic pure (no React) in `lib/`. Units are always metric: m/s, °C, m, mm.
