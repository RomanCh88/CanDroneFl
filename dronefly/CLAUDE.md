@AGENTS.md

# DroneFly — project notes

Drone weather flyability dashboard: for one location it gives a GO / CAUTION / NO_GO rating to each of 5 drone classes, for now and for the next 48 h.
Users: Ukrainian military and civilian drone operators. Funded by donations, no paywall.
The original spec is `../drone-wx-instructions.md` (repo root). Read it for the design intent and the rule thresholds.

## Stack
- Next.js **16.2.3** (App Router), React 19.2, Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no tailwind.config). See AGENTS.md: check `node_modules/next/dist/docs/` before using any Next API.
- Leaflet 1.9 + OSM tiles (CSS invert filter gives the dark map). Marker icons are loaded from unpkg.
- Weather: Open-Meteo `/v1/forecast`, called from the client. No key, no backend.
- Accounts (optional layer): **Firebase Auth (Google only) + Firestore**, firebase JS SDK 12, all client-side. Config comes from `NEXT_PUBLIC_FIREBASE_*` (see `.env.example`; in prod in `apphosting.yaml` with BUILD availability). **Without the env vars the app runs public-only** (no sign-in UI), which is the guarantee that the public version stays unchanged.
- Fonts: Exo 2 (labels) and JetBrains Mono (data) via `next/font`, both with cyrillic subsets.
- Hosting: **Firebase App Hosting** (`firebase.json` → backend `can-drone-fly`, project `candronefly`, `apphosting.yaml` minInstances 0, maxInstances 3 as a cost ceiling — raise if users see 429/503). The spec said Vercel; that was dropped.
- `.agents/skills/` + `skills-lock.json` = Firebase agent skills (installed tooling, not app code).

## Commands (run from `dronefly/`)
- `npm run dev` / `npm run build` / `npm start` / `npm run lint`
- **Run npm/next/eslint through WSL**: `wsl.exe -e bash -lc 'cd /mnt/d/CanDroneFly/dronefly && source ~/.nvm/nvm.sh; <cmd>'`. WSL has Node 20 (Next 16 needs ≥20.9); Windows has Node 18 and Linux-only native binaries in node_modules.
- Deploy rules: `firebase deploy --only firestore:rules` (firebase.json → `firestore.rules`).
- `build` runs `scripts/generate-icons.mjs` first (sharp: `public/icon.svg` → icon-192/512 + apple-touch-icon). sharp is **not** a declared dependency; it only works because Next pulls it in transitively.
- Typecheck on Windows: `node node_modules/typescript/bin/tsc --noEmit`. Lint + build clean as of 2026-11-21.
- ⚠ `node_modules` was installed under WSL/Linux. On Windows `eslint` and other bin shims are missing. Reinstall on the host OS you are using, or run from WSL.

## Architecture
- `app/page.tsx`: the public dashboard, one `'use client'` page. Uses `allProfiles = DRONE_PROFILES + customDrones`; applies the user's default location/drone once per sign-in; accepts deep links `/?lat=&lng=&name=` and `/?drone=<id>` (from the profile page; query is stripped after reading). Holds all state (location, weather, selected drone, selected forecast hour). It fetches on location change and every 15 min, builds `currentAssessments` (from `weather.current`) and `hourlyAssessments[drone][48]` (sliced from the current local hour), and finds the best windows. It recomputes everything on every render (no memoisation).
- `app/layout.tsx`: fonts, metadata, PWA meta, `<PWARegister/>`, `<Providers>` (`app/providers.tsx`: Language → Auth → UserData).
- `app/profile/`: account page (sign in / out, preferences, saved locations CRUD, custom drones CRUD via `components/profile/DroneForm.tsx`). `layout.tsx` sets noindex metadata.
- `lib/firebase.ts` (lazy init, `isFirebaseConfigured`), `lib/userData.ts` (Firestore CRUD and subscriptions), `contexts/AuthContext.tsx` (Google popup sign-in), `contexts/UserDataContext.tsx` (live data keyed by uid + two-way language sync), `components/AccountMenu.tsx` and `components/SavedLocationsMenu.tsx` (header).
- Firestore: `users/{uid}` {displayName,email,photoURL,createdAt,updatedAt,prefs{lang,defaultLocationId,defaultDroneId}}, `users/{uid}/locations/{id}`, `users/{uid}/drones/{id}`. Custom drone app ids are `custom_<docId>`. `firestore.rules`: owner-only, with field whitelists and numeric bounds that mirror `BOUNDS` in DroneForm (keep both in sync). `app/manifest.ts` → `/manifest.webmanifest`.
- `lib/weather.ts` + `hooks/useWeather.ts`: Open-Meteo, client-side on purpose (free tier is per-IP; a server proxy would pool all users on one IP). `forecast_hours=48` → hourly[0] is the location's current hour (fixes the old browser-clock/timezone bug). Coords rounded to 0.01°. Hook: localStorage cache (`dronefly.wx`, 8 entries) shown instantly (stale-while-revalidate, "CACHED" badge), 300 ms debounce + AbortController (no out-of-order results), refresh every 15 min only while visible + on return/online, retry backoff. `fetchRouteWeather` = many points in ONE request with wind at 10/80/120/180 m (planner). Dashboard ratings are `useMemo`'d; payload uses `useDeferredValue`.
- `public/sw.js` (v2): navigation network-first (fixes stale shell after deploys), static cache-first, weather network-first capped at 20 entries, non-GET untouched.
- `lib/assessment.ts`: `assess(drone, WeatherPoint, lang)` is the core rules engine (NO_GO → CAUTION → GO), plus icing risk, visual sensor status and `findBestWindows` (≥2 consecutive GO hours).
- `lib/thermal.ts`: thermal camera EFFECTIVE/DEGRADED/BLIND. `lib/range.ts`: `adjustRange` (wind penalty), `adjustEndurance` (cold penalty), `windRangeMultiplier` (per-heading, used by DroneDetail's range rose).
- `lib/droneProfiles.ts`: the 5 profiles (fpv, mavic, heavy, fixed_small, fixed_large). Values match the spec. `EXAMPLE_SPEC_DRONE` = form prefill built from a real operator spec sheet (15 kg heavy multirotor).
- **Detailed specs (`DroneProfile.performance`, custom drones only)**: payload-dependent model in `lib/performance.ts` (pure). Inputs as on a spec sheet: max payload; endurance empty and at a reference payload (min–max); max speed empty (min–max) and at full load; effective radius empty/full; max range; ceiling (min–max). "From–to" ranges → calculations use `min`. Model: linear interpolation by payload; cold −1 %/°C below 0 (max −30 %); wind = max(10 m, 80 m); out-and-back radius factor `(s²−a²)/(v·s)` with v = lower max speed at payload (worst case along-wind `1−(w/v)²`); NO_GO when wind ≥ 85 % of v ("no return"), CAUTION when wind cuts radius > 30 % or 80 m wind > limit. `assess(drone, wx, lang, { payloadKg })` returns `performance`; `adjustedRange` = radius after wind, `adjustedEndurance` = lower flight time after cold. Dashboard: `components/PayloadControl.tsx` (per-drone payload in localStorage `dronefly.payloads`, default = reference payload); DroneDetail shows a performance table + round-trip radius by heading. Verified against the spec sheet (0 kg → 37–45 min, 10 kg → 23–27 min, full → 40 km/h, radius 15 → 10 km).
- `lib/i18n.ts`: typed `Translations`, uk + en. **All user-facing strings, including assessment reasons, come from here**, so the engine takes `lang`. `contexts/LanguageContext.tsx`: default `uk`, persisted in localStorage (`dronefly.lang`), synced to the profile when signed in.
- `lib/wmoCodes.ts`: WMO code → description/icon/severity.
- **Location search** (`components/LocationSearch.tsx`, dashboard header, "/" focuses): `lib/coords.ts` parses WGS84 decimal (dot or comma decimals, N/S/E/W letters before/after, any order), DMS / degrees-decimal-minutes, and MGRS (via the `mgrs` package, any even precision; returns the square centre) locally/offline; free text → `lib/geocode.ts` (Open-Meteo Geocoding, sends only the typed text). `toMGRS()` also labels the dashboard map. Parser cases verified 13/13 (incl. S/W negatives and rejecting "N 50 E", minutes ≥ 60).
- `components/`: Map (dynamic, ssr:false), WeatherPanel, DroneCards, DroneDetail, Timeline (48 cells per drone, click selects a forecast hour), BestWindows, WindIndicator, DonateButton, PWARegister.
- `types/index.ts`: DroneProfile, WeatherData (raw Open-Meteo shape), FlyabilityAssessment, HourlyAssessment, Location.
- Styling: mostly inline `style={{}}` hex colours plus a few Tailwind arbitrary values. Palette: bg `#0a0f1a`, card `#141b2d`, border `#1e2d45`, muted `#4a6080`, GO `#00ff88`, CAUTION `#ffaa00`, NO_GO `#ff3344`, accent `#00b4d8`. Design rules: flat, angular HUD look, no gradients, shadows or rounded corners.

## Done (MVP + polish, git history up to 4a79aab)
Weather fetch and panel · 5 profiles + assessment engine · drone cards · map picker (click/drag) + geolocation · 48 h timeline starting at the current hour, with per-hour detail · detail panel (reasons, thermal, sensor, icing, range/endurance, thresholds, directional range) · best windows · UA/EN i18n (the spec listed it as future work) · donate section · disclaimer/credits · PWA (manifest, icons, SW, iOS meta) · 15-min auto refresh.
Detailed drone specs with payload model (2026-11-21). Rules deployed 2026-11-21 (before emptyWeight/wind fields — redeploy needed).
Phase 1 accounts (2026-11-21, not deployed yet): Google sign-in, /profile, saved locations, custom drones (shown on the dashboard with a CUSTOM badge), synced preferences, Firestore rules. Donations hidden (`lib/features.ts`).

## Invite-only accounts (built 2026-11-22, not yet tested end-to-end)
- First server code: Next route handlers + `firebase-admin` (`lib/server/*`, server-only — never import from client). Credentials: App Hosting service account in prod; locally ADC (`gcloud auth application-default login` in WSL).
- Firestore (server-written only; rules deny client writes): `members/{uid}` {via: invite|request|legacy|admin}, `invites/{code}` (12-char code, 24 h, single use, revocable), `inviteQuota/{uid}` {stamps[]} (10 per rolling 24 h, enforced in a transaction), `accessRequests/{uid}` {status pending|approved|rejected}. Rules: `users/**` requires owner AND membership; own `members`/`accessRequests` doc readable.
- Bootstrap: `/api/access/me` auto-creates membership for the admin (ADMIN_EMAIL) and for legacy users who already had `users/{uid}`.
- Routes: `POST /api/access/me`, `POST /api/access/request` (emails the admin via Resend from candronefly.org; re-request after 24 h), `POST /api/access/decide` (form POST from `/access/decide` page — GET only shows the confirmation page so email link scanners can't approve), `GET/POST /api/invites`, `GET/POST/DELETE /api/invites/[code]`.
- Approval links: HMAC-SHA256(APPROVAL_SECRET, uid.action.exp), 7-day expiry, timing-safe compare (10/10 tamper tests passed).
- Client: `AuthContext.member` (null/true/false, live via members/{uid}), `components/access/AccessGate.tsx` (non-members on /profile and /mission: redeem code or request access), `components/access/InvitesPanel.tsx` (profile), `/invite/[code]` landing (auto-accepts after sign-in). UserData only loads for members.
- Secrets: ADMIN_EMAIL (private — keep it OUT of the repo, this file and the client), APPROVAL_SECRET, RESEND_API_KEY, EMAIL_FROM. Local: `.env.local`. Prod: Secret Manager, entries prepared (commented) in apphosting.yaml.

## Mission planner (`/mission`, signed-in only) — Phase 2, built 2026-11-21, not yet browser-tested
- Files: `app/mission/`, `components/mission/MissionPlanner.tsx` (state + side panel), `components/mission/MissionMap.tsx` (Leaflet: draggable A/WP/B, route, reach polygons, range circle, turn-back ✕, wind box, legend), `lib/mission.ts` (pure maths), `lib/geo.ts`, `lib/missionStore.ts`, `lib/missionExport.ts`, `hooks/useRouteWeather.ts`.
- Maths: airspeed ≤ max speed at payload (AUTO = best margin, scanned 1 km/h); usable time = endurance(min, cold) × speed factor (1 up to 80 % vmax → 0.9 at vmax) × (1 − reserve); per leg g = √(v²−c²)+a with vector-averaged wind of route samples at the chosen altitude (interpolated 10/80/120/180 m); return turn-back point by binary search; one-way battery-limit point; reach polygons (72 headings, NOT capped — the max-range circle is drawn separately). Non-spec drones use type speed defaults (flagged "estimated").
- Feasibility (user decision 2026-11-21: "you can fly in any condition, just the distance gets low"): NOT FEASIBLE only for physics — battery (time > usable) or a leg with ground speed ≤ 0. Wind/gust over the drone's limits and points beyond max range are amber WARNINGS (route drawn amber). Gust at altitude = mean wind aloft + (10 m gust − 10 m wind), additive (a multiplicative ratio produced fake 26 m/s gusts in light wind).
- Missions are NEVER in Firestore: sessionStorage by default, opt-in localStorage, per uid (`dronefly.missions.<uid>`), "clear all". Route weather cached in memory only. Weather requests send coords rounded to ~1 km.
- Exports (all local): JSON, GPX 1.1 (wpt+rte), KML (route+areas), CSV (legs, UTF-8 BOM), PNG (canvas: OSM tiles — CORS `*` verified — with the dark filter, overlays, summary panel).
- Weight/wind: specs have optional `emptyWeightKg` (→ take-off weight input on dashboard + planner) and `windEmptyMs`/`windFullMs` (user confirmed "12–17" means 17 empty → 12 full). Limits at payload: sustained = min(spec(p), 0.85·v), gust = min(1.25·spec(p), v). Older records fall back to limits.maxWindGusts/maxWindSpeed as empty/full.
- Known model gap: computed out-and-back radius (9.2 km at 10 kg, no reserve) is below the spec sheet's 11.7 km because we use the lower endurance/speed values — the planner shows the spec radius for comparison.
- Dev note: dev server in WSL on /mnt/d may miss files created from Windows (new routes 404) → restart it or use `WATCHPACK_POLLING=true`.

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
- Last location isn't persisted for anonymous users. Firestore has no per-user document count limit (rules can't count), so add a cap before abuse becomes a concern.
- Firestore rules have not been tested with the emulator yet.
- No analytics/monitoring. Open-Meteo's free tier is non-commercial; check its terms against a donation-funded app and consider attribution and rate limits.
- Leaflet marker images come from unpkg; bundle them locally for offline/PWA use.

## Conventions
- Commit style: `ADD: …` / `FIX: …`.
- Every new user-facing string goes into both `uk` and `en` in `lib/i18n.ts` (the type enforces it).
- Keep the assessment logic pure (no React) in `lib/`. Units are always metric: m/s, °C, m, mm.
