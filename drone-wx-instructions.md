# DroneFly — Drone Weather Flyability Dashboard

## Claude Code Instruction Set

### What to build

A web app that shows whether different types of drones can fly in current and forecasted weather conditions. It pulls real-time weather data and applies drone-specific flight envelope rules to give instant GO / CAUTION / NO-GO assessments.

The app is built for military and civilian drone operators. UI language: **English** (with potential for Ukrainian localization later). Aesthetic: **dark, utilitarian, military-tactical** — think HUD/cockpit style. No playful colors, no rounded corners, no "SaaS landing page" vibes.

Donation-based, not paywalled.

---

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Weather API**: Open-Meteo (free, no API key required)
- **Map**: Leaflet.js with OpenStreetMap tiles (free)
- **Deployment target**: Vercel (free tier)
- **Donations**: NOWPayments donation widget (crypto) + optional PayPal/Monobank link
- **No database needed** — everything is client-side, stateless

---

### Open-Meteo API Query

Use this exact endpoint structure. No API key needed.

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lng}
  &current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,snowfall,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl
  &hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_speed_80m,wind_direction_10m,wind_gusts_10m,pressure_msl
  &forecast_days=2
  &timezone=auto
  &wind_speed_unit=ms
```

Key notes:
- `wind_speed_unit=ms` — everything in m/s, not km/h
- `visibility` is in meters
- `precipitation` is in mm
- `cloud_cover` is percentage (0-100)
- `weather_code` uses WMO codes (see table below)
- `forecast_days=2` — gives 48 hours of hourly data
- Default location: Kyiv (50.4501, 30.5234)

---

### Drone Categories and Flight Envelopes

Define these as a config object/constant. Users should be able to see thresholds.

```typescript
interface DroneProfile {
  id: string;
  name: string;
  nameUk?: string; // Ukrainian name for future i18n
  icon: string; // emoji or icon identifier
  type: 'multirotor' | 'fixed_wing' | 'fpv';
  description: string;
  limits: {
    maxWindSpeed: number;      // m/s - sustained wind
    maxWindGusts: number;      // m/s - gust tolerance
    minTemperature: number;    // °C
    maxTemperature: number;    // °C
    maxPrecipitation: number;  // mm/h — 0 means no rain at all
    maxSnowfall: number;       // cm/h — 0 means no snow at all
    minVisibility: number;     // meters — for visual LOS / FPV
    maxCloudCover: number;     // % — 100 means doesn't matter
    icingRisk: boolean;        // susceptible to icing
  };
  nominalRange: number;        // km — typical max range in ideal conditions
  nominalEndurance: number;    // minutes — typical flight time
  hasThermalCamera: boolean;
  hasIpProtection: boolean;    // weather-sealed
  notes: string;
}
```

#### Profiles to include:

**1. FPV Kamikaze (small racing-style)**
```
maxWindSpeed: 12,
maxWindGusts: 15,
minTemperature: -15,
maxTemperature: 45,
maxPrecipitation: 0.5,  // light drizzle ok, not rain
maxSnowfall: 0,
minVisibility: 500,      // FPV needs some vis for launch/recovery
maxCloudCover: 100,      // doesn't care
icingRisk: true,
nominalRange: 10,
nominalEndurance: 15,
hasThermalCamera: false,
hasIpProtection: false,
notes: "Lightweight, agile. Very vulnerable to gusts. No weather sealing."
```

**2. DJI Mavic class (consumer multirotor)**
```
maxWindSpeed: 10,
maxWindGusts: 12,
minTemperature: -10,
maxTemperature: 40,
maxPrecipitation: 0,     // zero rain tolerance
maxSnowfall: 0,
minVisibility: 1000,
maxCloudCover: 100,
icingRisk: true,
nominalRange: 15,
nominalEndurance: 35,
hasThermalCamera: true,   // some models
hasIpProtection: false,
notes: "Standard recon platform. Very intolerant to precipitation."
```

**3. Heavy multirotor (Matrice / Baba Yaga class)**
```
maxWindSpeed: 14,
maxWindGusts: 17,
minTemperature: -20,
maxTemperature: 50,
maxPrecipitation: 2.5,   // can handle light rain
maxSnowfall: 0.5,
minVisibility: 800,
maxCloudCover: 100,
icingRisk: true,
nominalRange: 15,
nominalEndurance: 35,
hasThermalCamera: true,
hasIpProtection: true,
notes: "Payload-capable. Better weather tolerance. Larger target for EW."
```

**4. Fixed-wing recon (Leleka / Fury type)**
```
maxWindSpeed: 15,
maxWindGusts: 20,
minTemperature: -25,
maxTemperature: 45,
maxPrecipitation: 1.0,
maxSnowfall: 0.5,
minVisibility: 300,
maxCloudCover: 100,
icingRisk: true,
nominalRange: 50,
nominalEndurance: 120,
hasThermalCamera: true,
hasIpProtection: false,
notes: "Long endurance. Handles wind well. Vulnerable to icing at altitude."
```

**5. Large fixed-wing (Orlan / ZALA class)**
```
maxWindSpeed: 20,
maxWindGusts: 28,
minTemperature: -35,
maxTemperature: 50,
maxPrecipitation: 4.0,
maxSnowfall: 1.0,
minVisibility: 200,
maxCloudCover: 100,
icingRisk: false,          // has de-icing systems
nominalRange: 120,
nominalEndurance: 960,     // 16 hours
hasThermalCamera: true,
hasIpProtection: true,
notes: "All-weather capable. De-icing equipped. Catapult launch."
```

---

### Flyability Assessment Logic

For each drone profile and each hourly weather data point, compute:

```typescript
interface FlyabilityAssessment {
  status: 'GO' | 'CAUTION' | 'NO_GO';
  reasons: string[];           // list of specific issues
  thermalEffectiveness: 'EFFECTIVE' | 'DEGRADED' | 'BLIND';
  thermalReasons: string[];
  adjustedRange: number;       // km, adjusted for wind
  adjustedEndurance: number;   // minutes, adjusted for conditions
  icingRisk: 'NONE' | 'POSSIBLE' | 'LIKELY';
  sensorStatus: 'CLEAR' | 'DEGRADED' | 'BLIND';
  sensorReasons: string[];
}
```

#### Status rules:

**NO_GO** if ANY of these:
- `wind_speed_10m > limits.maxWindSpeed`
- `wind_gusts_10m > limits.maxWindGusts`
- `temperature_2m < limits.minTemperature`
- `temperature_2m > limits.maxTemperature`
- `precipitation > limits.maxPrecipitation` AND `limits.maxPrecipitation == 0`
- `snowfall > limits.maxSnowfall` AND `limits.maxSnowfall == 0`
- `visibility < limits.minVisibility`
- Icing: `icingRisk == true` AND `temperature_2m` between -5°C and 2°C AND `relative_humidity_2m > 90%` AND `(rain > 0 OR cloud_cover > 80)`

**CAUTION** if ANY of these:
- Wind speed > 80% of max
- Wind gusts > 80% of max
- Temperature within 5°C of min limit
- Precipitation > 0 but within limits
- Visibility < 2x minimum limit
- Humidity > 85% (moisture concerns)
- Icing: temperature between -2°C and 5°C AND humidity > 80%
- Dew point spread (temperature - dew_point) < 3°C (fog formation risk)

**GO**: Everything else.

#### Thermal camera effectiveness:

**BLIND**:
- Heavy rain (precipitation > 4 mm/h)
- Dense fog (visibility < 200m)
- Heavy snowfall (snowfall > 2 cm/h)

**DEGRADED**:
- Light-moderate rain (precipitation 0.5-4 mm/h)
- Fog (visibility 200-1000m)
- Very high humidity (> 95%)
- Low delta-T: abs(temperature_2m - typical_ground_temp) < 3°C
  (use temperature_2m itself as proxy for summer daytime, assume ground ~2-4°C warmer)
- Light snowfall

**EFFECTIVE**: Everything else.

#### Sensor (visual camera) status:

**BLIND**:
- Visibility < 300m
- Heavy precipitation obscuring lens
- Night AND no thermal (use sunrise/sunset from API if available, or calculate)

**DEGRADED**:
- Visibility 300-1000m
- Light rain/snow on lens
- Cloud cover > 90% reducing contrast
- Low sun angle (glare)

**CLEAR**: Everything else.

#### Range adjustment:

```typescript
// Headwind reduces range, tailwind extends it
// For multirotors: wind has massive impact
// For fixed-wing: less impact but still significant

function adjustRange(nominalRange: number, windSpeed: number, windDirection: number, headingToTarget: number, droneType: string): number {
  const headwindComponent = windSpeed * Math.cos((windDirection - headingToTarget) * Math.PI / 180);
  
  // Simplified: assume worst case (pure headwind for outbound)
  // Multirotors: each m/s of headwind costs ~5-8% range
  // Fixed-wing: each m/s costs ~2-4% range
  const penaltyPerMs = droneType === 'multirotor' || droneType === 'fpv' ? 0.06 : 0.03;
  
  const rangeFactor = Math.max(0.3, 1 - (windSpeed * penaltyPerMs));
  return Math.round(nominalRange * rangeFactor * 10) / 10;
}

// Temperature also affects battery
// Below 0°C: ~1% loss per degree below 0
function adjustEndurance(nominalEndurance: number, temperature: number): number {
  if (temperature < 0) {
    const coldPenalty = Math.min(0.3, Math.abs(temperature) * 0.01);
    return Math.round(nominalEndurance * (1 - coldPenalty));
  }
  return nominalEndurance;
}
```

#### Icing risk:

```typescript
function assessIcingRisk(temp: number, humidity: number, dewPoint: number, precipitation: number, cloudCover: number): 'NONE' | 'POSSIBLE' | 'LIKELY' {
  const dewPointSpread = temp - dewPoint;
  
  if (temp >= -5 && temp <= 2 && humidity > 90 && (precipitation > 0 || cloudCover > 80)) {
    return 'LIKELY';
  }
  if (temp >= -8 && temp <= 5 && humidity > 80 && dewPointSpread < 3) {
    return 'POSSIBLE';
  }
  return 'NONE';
}
```

---

### WMO Weather Codes Reference

Use this for displaying weather conditions and for assessment logic:

```typescript
const WMO_CODES: Record<number, { description: string; icon: string; severity: 'clear' | 'mild' | 'moderate' | 'severe' }> = {
  0: { description: 'Clear sky', icon: '☀️', severity: 'clear' },
  1: { description: 'Mainly clear', icon: '🌤️', severity: 'clear' },
  2: { description: 'Partly cloudy', icon: '⛅', severity: 'clear' },
  3: { description: 'Overcast', icon: '☁️', severity: 'mild' },
  45: { description: 'Fog', icon: '🌫️', severity: 'moderate' },
  48: { description: 'Depositing rime fog', icon: '🌫️', severity: 'severe' },
  51: { description: 'Light drizzle', icon: '🌦️', severity: 'mild' },
  53: { description: 'Moderate drizzle', icon: '🌦️', severity: 'moderate' },
  55: { description: 'Dense drizzle', icon: '🌧️', severity: 'moderate' },
  56: { description: 'Light freezing drizzle', icon: '🌧️', severity: 'severe' },
  57: { description: 'Dense freezing drizzle', icon: '🌧️', severity: 'severe' },
  61: { description: 'Slight rain', icon: '🌧️', severity: 'mild' },
  63: { description: 'Moderate rain', icon: '🌧️', severity: 'moderate' },
  65: { description: 'Heavy rain', icon: '🌧️', severity: 'severe' },
  66: { description: 'Light freezing rain', icon: '🌧️', severity: 'severe' },
  67: { description: 'Heavy freezing rain', icon: '🌧️', severity: 'severe' },
  71: { description: 'Slight snowfall', icon: '🌨️', severity: 'moderate' },
  73: { description: 'Moderate snowfall', icon: '🌨️', severity: 'moderate' },
  75: { description: 'Heavy snowfall', icon: '🌨️', severity: 'severe' },
  77: { description: 'Snow grains', icon: '🌨️', severity: 'moderate' },
  80: { description: 'Slight rain showers', icon: '🌦️', severity: 'mild' },
  81: { description: 'Moderate rain showers', icon: '🌧️', severity: 'moderate' },
  82: { description: 'Violent rain showers', icon: '🌧️', severity: 'severe' },
  85: { description: 'Slight snow showers', icon: '🌨️', severity: 'moderate' },
  86: { description: 'Heavy snow showers', icon: '🌨️', severity: 'severe' },
  95: { description: 'Thunderstorm', icon: '⛈️', severity: 'severe' },
  96: { description: 'Thunderstorm with slight hail', icon: '⛈️', severity: 'severe' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', severity: 'severe' },
};
```

---

### UI Layout

Single page, responsive (but desktop-first — operators use laptops/tablets).

#### Structure (top to bottom):

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: "DroneFly" logo + location display + donate btn │
├─────────────────────────────────────────────────────────┤
│ MAP (left 40%)          │ CURRENT CONDITIONS (right 60%)│
│ Leaflet, click to pick  │ Big weather summary card      │
│ location                │ Temp, wind, vis, precip, etc  │
│                         │                               │
├─────────────────────────┴───────────────────────────────┤
│ DRONE CARDS ROW                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │ FPV  │ │ DJI  │ │Heavy │ │Fixed │ │Large │          │
│ │  GO  │ │ WARN │ │  GO  │ │  GO  │ │  GO  │          │
│ │ 8km  │ │ ---  │ │ 12km │ │ 45km │ │110km │          │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
├─────────────────────────────────────────────────────────┤
│ SELECTED DRONE DETAIL PANEL                             │
│ Status reasons, thermal assessment, sensor assessment,  │
│ icing risk, adjusted range/endurance, all thresholds    │
├─────────────────────────────────────────────────────────┤
│ 48-HOUR TIMELINE                                        │
│ Horizontal scrollable bar, color-coded per drone type   │
│ Each hour: small cell, color = GO/CAUTION/NO_GO         │
│ Hover/click = shows detail for that hour                │
│ Toggle which drone type the timeline shows              │
├─────────────────────────────────────────────────────────┤
│ BEST WINDOWS PANEL                                      │
│ "Best launch windows in next 48h" — lists time ranges   │
│ where all conditions are GO for selected drone type     │
├─────────────────────────────────────────────────────────┤
│ FOOTER: Disclaimer, donate link, data source credits    │
└─────────────────────────────────────────────────────────┘
```

#### Visual design directives:

- **Background**: dark — `#0a0f1a` or similar deep navy/black
- **Cards**: dark cards with subtle borders, `#141b2d` background
- **GO**: green — `#00ff88` or similar bright tactical green
- **CAUTION**: amber/yellow — `#ffaa00`
- **NO_GO**: red — `#ff3344`
- **Text**: light gray `#c8d0e0` for body, white for headings
- **Accent**: cyan/blue `#00b4d8` for interactive elements
- **Font**: monospace for data values (JetBrains Mono or similar), clean sans-serif for labels (Exo 2, Rajdhani, or similar "tactical" font from Google Fonts)
- **Status indicators**: large, bold, unmistakable. A drone operator glancing at a screen in a trench should know GO/NO_GO in 0.5 seconds.
- **Wind direction**: show as arrow/compass indicator, not just degrees
- **No gradients, no shadows, no rounded corners** — flat, angular, HUD-style

---

### Donation Integration

#### NOWPayments Donation Widget

Add a "Support the project" button in the header and footer.

Option 1 — Simple donation link (easiest):
Create a donation link on NOWPayments dashboard and link to it.

Option 2 — Embedded widget:
```html
<!-- NOWPayments donation button -->
<a href="https://nowpayments.io/donation/YOUR_DONATION_ID" target="_blank" rel="noopener">
  Donate (Crypto)
</a>
```

Also add:
- Monobank jar link (for Ukrainian users — very common in UA)
- PayPal.me link (for international users)

Keep it unobtrusive. One small button in header, one section in footer. No popups, no nag screens.

---

### File Structure

```
dronefly/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Main page
│   ├── globals.css         # Tailwind + custom styles
│   └── favicon.ico
├── components/
│   ├── Map.tsx             # Leaflet map (dynamic import, no SSR)
│   ├── WeatherPanel.tsx    # Current conditions display
│   ├── DroneCards.tsx      # Row of drone status cards
│   ├── DroneDetail.tsx     # Expanded detail for selected drone
│   ├── Timeline.tsx        # 48h horizontal timeline
│   ├── BestWindows.tsx     # Optimal launch windows
│   ├── WindIndicator.tsx   # Wind direction arrow component
│   └── DonateButton.tsx    # Donation links
├── lib/
│   ├── weather.ts          # Open-Meteo API fetch
│   ├── droneProfiles.ts    # Drone configs (the profiles above)
│   ├── assessment.ts       # Flyability logic (the rules above)
│   ├── thermal.ts          # Thermal camera assessment
│   ├── range.ts            # Range/endurance adjustments
│   └── wmoCodes.ts         # WMO weather code mappings
├── types/
│   └── index.ts            # TypeScript interfaces
├── public/
│   └── (static assets)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

### Implementation Priority

If running low on session time, build in this order:

1. **Weather fetch + display** — get Open-Meteo data rendering
2. **Drone profiles + assessment engine** — the core logic
3. **Drone cards with GO/CAUTION/NO_GO** — the main value
4. **Map with location picker** — click to change location
5. **48h timeline** — color-coded hourly bars
6. **Drone detail panel** — reasons, thermal, sensor, range
7. **Best windows finder** — scan for optimal launch times
8. **Donation button** — simple link
9. **Polish: wind arrows, animations, responsive** — nice to have

Items 1-5 are the MVP. Items 6-9 are polish.

---

### Key Implementation Notes

- **Leaflet + Next.js**: Leaflet doesn't work with SSR. Use `dynamic(() => import('./Map'), { ssr: false })` to load it client-side only.
- **Geolocation**: Use `navigator.geolocation` to offer "use my location" but default to Kyiv coordinates.
- **Auto-refresh**: Refresh weather data every 15 minutes automatically.
- **No backend needed**: Everything runs client-side. Open-Meteo allows CORS.
- **Timezone**: Pass `timezone=auto` to Open-Meteo so times are local.
- **Units**: Always metric. Wind in m/s, temp in °C, visibility in meters, precipitation in mm.
- **Disclaimer in footer**: "This tool provides weather-based estimates only. Actual flyability depends on many factors not captured here including EW environment, airspace, terrain, specific drone condition, and operator skill. Always apply operational judgment. Data source: Open-Meteo.com (open-source weather API)."

---

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo to Vercel dashboard for auto-deploy
```

Free tier of Vercel is enough. Custom domain later if wanted.

---

### Future Enhancements (not for this session)

- Ukrainian language toggle
- Custom drone profiles (user-defined thresholds)
- Telegram bot integration (alerts when weather window opens)
- Multiple saved locations
- Wind at altitude (Open-Meteo provides 80m and 120m wind)
- Historical analysis (what % of last 30 days were flyable?)
- MGRS coordinate input (you already have the converter from the mapping project)
- Offline PWA mode (cache last forecast)
- EW/jamming layer (would need separate data source)
