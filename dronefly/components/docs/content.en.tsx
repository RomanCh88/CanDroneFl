import Figure from './Figure';
import { B, C, Callout, Formula, H3, Kbd, LI, MembersCTA, P, ProfilesTable, Status, Steps, Table, UL } from './blocks';
import { GUST_FACTOR, NO_RETURN_RATIO, WIND_RADIUS_CAUTION } from '@/lib/performance';
import type { Chapter } from './types';

const pct = (v: number) => `${Math.round(v * 100)} %`;

export const chaptersEn: Chapter[] = [
  // ───────────────────────────── FOR EVERYONE ─────────────────────────────
  {
    id: 'overview',
    part: 'basics',
    title: 'What DroneFly does',
    blurb: 'Ratings, forecast, who can use what',
    body: (
      <>
        <P>
          DroneFly takes the weather forecast for a point on the map and rates every drone class for it:{' '}
          <Status s="GO" /> <Status s="CAUTION" /> <Status s="NO_GO" />. It does this for <B>right now</B> and for each of the <B>next 48 hours</B>.
          Every rating comes with its reasons, so you can see <i>why</i> the drone should or should not fly.
        </P>
        <P>
          The dashboard is open to everyone and needs no account. Members also get their own drones with full specs,
          payload-aware calculations and the mission planner.
        </P>
        <Table
          head={['Feature', 'Everyone', 'Members']}
          rows={[
            ['Weather + GO / CAUTION / NO-GO for 5 drone classes', '✓', '✓'],
            ['48-hour timeline and best launch windows', '✓', '✓'],
            ['Search by coordinates, MGRS or place name', '✓', '✓'],
            ['Thermal / visual camera and icing assessment', '✓', '✓'],
            ['Your own drones (quick or from the spec sheet)', '—', '✓'],
            ['Payload-aware flight time, speed, radius, wind limit', '—', '✓'],
            ['Mission planner: route, wind at altitude, turn-back point, exports', '—', '✓'],
            ['Saved locations, default drone/location, synced settings', '—', '✓'],
            ['Invite other people', '—', '✓'],
          ]}
        />
        <MembersCTA />
      </>
    ),
  },
  {
    id: 'quick-start',
    part: 'basics',
    title: 'Quick start',
    blurb: 'From opening the site to a decision in 30 seconds',
    body: (
      <>
        <Steps
          items={[
            <>Open the dashboard. It starts in Kyiv; members can set their own default location.</>,
            <>Set the location: type coordinates, MGRS or a place name in the search box (<Kbd>/</Kbd> focuses it), press <B>USE MY LOCATION</B>, or click the map.</>,
            <>Look at the drone cards: each one shows the rating for <B>right now</B>. Click a card to see the reasons and details.</>,
            <>Scroll to the <B>48h timeline</B> to see when conditions improve, then check <B>Optimal launch windows</B> for that drone.</>,
          ]}
        />
        <Callout kind="tip" title="Works offline">
          Install DroneFly on your phone (browser menu → <i>Add to Home screen</i>). The last weather loaded is kept on the device
          and shown with a <C>CACHED</C> badge when there is no connection.
        </Callout>
      </>
    ),
  },
  {
    id: 'dashboard',
    part: 'basics',
    title: 'The dashboard',
    blurb: 'Header, map and current weather',
    body: (
      <>
        <P>The top of the dashboard is where you choose <B>where</B> and see <B>what the weather is there now</B>.</P>
        <Figure
          shot="dash-top"
          items={[
            { k: 'search', label: 'Location search', text: <>coordinates (decimal, DMS), MGRS or a place name. Press <Kbd>/</Kbd> to jump here.</> },
            { k: 'geo', label: 'Use my location', text: 'takes your position from the device GPS (the browser asks for permission).' },
            { k: 'lang', label: 'Language', text: 'switches between Ukrainian and English. Members get it synced to their account.' },
            { k: 'signin', label: 'Sign in', text: 'Google sign-in, needed for the member features.' },
            { k: 'map', label: 'Map', text: 'click anywhere, or drag the pin, to move the point.', side: 'in' },
            { k: 'coords', label: 'Point coordinates', text: 'WGS84 and MGRS of the selected point, ready to copy.', side: 'r' },
            { k: 'weather', label: 'Current weather', text: 'temperature, humidity, dew point, pressure, visibility, cloud, precipitation, snow and wind.', side: 'in' },
          ]}
          caption="Dashboard header, map and current-conditions panel"
        />
        <UL>
          <LI>The weather refreshes every 15 minutes while the tab is visible, and again when you come back to it or reconnect.</LI>
          <LI>The time next to <C>UPD</C> is when the data was loaded. A <C>CACHED</C> badge means you are looking at saved data while new data loads (or while you are offline).</LI>
          <LI>Shareable link: <C>/?lat=50.45&amp;lng=30.52&amp;name=Base</C> opens the dashboard at that point.</LI>
        </UL>
      </>
    ),
  },
  {
    id: 'search',
    part: 'basics',
    title: 'Finding a location',
    blurb: 'Coordinates, MGRS and place names',
    body: (
      <>
        <P>
          The search box understands coordinates in the common formats. Coordinates are parsed <B>on your device</B>: nothing is sent anywhere,
          so this also works offline. Anything that is not a coordinate is treated as a place name and searched online.
        </P>
        <Table
          head={['Format', 'Examples']}
          rows={[
            ['Decimal degrees', <><C>50.4501, 30.5234</C> · <C>50,4501 30,5234</C> · <C>N50.4501 E30.5234</C> · <C>50.4501N 30.5234E</C></>],
            ['Degrees-minutes-seconds', <C key="d">50°27&apos;00&quot;N 30°31&apos;24&quot;E</C>],
            ['Degrees + decimal minutes', <C key="m">50°27.006&apos;N 30°31.404&apos;E</C>],
            ['MGRS (any precision)', <><C>36U UA 24182 91607</C> · <C>36UUA2491</C> — the centre of the square is used</>],
            ['Place name', <><C>Бровари</C> · <C>Brovary</C> — searched via Open-Meteo Geocoding</>],
          ]}
        />
        <Callout title="Southern / western coordinates">
          Use <C>S</C>/<C>W</C> letters or a minus sign: <C>-33.86, 151.21</C> and <C>33.86S 151.21E</C> are the same point.
        </Callout>
      </>
    ),
  },
  {
    id: 'ratings',
    part: 'basics',
    title: 'Ratings and drone details',
    blurb: 'GO / CAUTION / NO-GO, reasons, sensors, range',
    body: (
      <>
        <P>Each card is one drone class. Click a card to open its details below.</P>
        <Table
          head={['Rating', 'Meaning']}
          rows={[
            [<Status key="g" s="GO" />, 'All parameters are well inside the drone’s limits.'],
            [<Status key="c" s="CAUTION" />, 'Flyable, but something is close to a limit or degrades the mission (icing possible, fog risk, high humidity…). Read the reasons.'],
            [<Status key="n" s="NO_GO" />, 'At least one limit is exceeded. Only the NO-GO reasons are listed, so you see what actually blocks the flight.'],
          ]}
        />
        <Figure
          shot="dash-cards"
          items={[
            { k: 'card', label: 'Drone card', text: 'the rating now, plus range and flight time adjusted for wind and cold. The selected card is highlighted.' },
            { k: 'status', label: 'Flight status', text: 'the rating with the drone’s notes.', side: 'in' },
            { k: 'reasons', label: 'Reasons', text: 'every rule that triggered, with the actual value and the limit.', side: 'r' },
            { k: 'consequences', label: 'Consequences', text: 'how much range, visual sensor quality and icing probability are affected.', side: 'r' },
            { k: 'sensor', label: 'Sensors & icing', text: 'visual camera, thermal camera (if fitted) and icing risk — see “How it’s calculated”.', side: 'in' },
            { k: 'thresholds', label: 'Thresholds', text: 'the drone’s limits next to the adjusted range and endurance.', side: 'in' },
            { k: 'rose', label: 'Wind range impact', text: 'range for 8 headings: green = best direction (tailwind), red = worst.', side: 't' },
          ]}
          caption="Drone cards and the detail panel of the selected drone"
        />
        <H3>Built-in drone classes</H3>
        <P>These limits are used for the five public profiles. Members can add drones with their own numbers.</P>
        <ProfilesTable />
      </>
    ),
  },
  {
    id: 'forecast',
    part: 'basics',
    title: '48-hour forecast and launch windows',
    blurb: 'Timeline, per-hour report, best windows',
    body: (
      <>
        <Figure
          shot="dash-timeline"
          items={[
            { k: 'tlTabs', label: 'Drone tabs', text: 'pick which drone the timeline is for.' },
            { k: 'tlBars', label: 'Hour bars', text: <>one bar per hour, coloured by rating, starting at the current hour <B>of the selected location</B>. Click a bar for the full report for that hour.</>, side: 'in' },
            { k: 'windows', label: 'Optimal launch windows', text: 'periods of at least 2 consecutive GO hours for the selected drone.', side: 'in' },
          ]}
          caption="Forecast timeline and launch windows"
        />
        <P>
          Clicking an hour opens the same detail panel as for “now”, but for that hour’s forecast. Use it to plan a sortie
          ahead of time or to see what exactly will change.
        </P>
      </>
    ),
  },

  // ───────────────────────────── MEMBERS ─────────────────────────────
  {
    id: 'access',
    part: 'members',
    members: true,
    title: 'Getting access',
    blurb: 'Google sign-in, invite code or request',
    body: (
      <>
        <P>Member features are invite-only. There are two ways in:</P>
        <Steps
          items={[
            <><B>Sign in with Google</B> (button at the top right).</>,
            <>If someone gave you an <B>invite link</B>, just open it. If you have a <B>code</B>, enter it in the <i>I have an invite</i> box.</>,
            <>No invite? Write a short note about who you are and press <B>Send request</B>. The administrator gets an e-mail and approves it. Your screen unlocks automatically when that happens.</>,
          ]}
        />
        <Figure
          shot="gate"
          items={[
            { k: 'invite', label: 'I have an invite', text: 'paste the code or the whole invite link.', side: 'b' },
            { k: 'request', label: 'Request access', text: 'optional note for the administrator.', side: 'b' },
          ]}
          caption="What a signed-in user without access sees"
        />
        <H3>Inviting others</H3>
        <UL>
          <LI>Every member can create invites in their profile: up to <B>10 per 24 hours</B>.</LI>
          <LI>An invite link works for <B>one person</B> and expires after <B>24 hours</B>. You can revoke it before it is used.</LI>
          <LI>Only send invites to people you trust: they get the same features you have.</LI>
        </UL>
        <MembersCTA compact />
      </>
    ),
  },
  {
    id: 'profile',
    part: 'members',
    members: true,
    title: 'Profile and saved locations',
    blurb: 'Defaults, saved points, synced settings',
    body: (
      <>
        <Figure
          shot="profile"
          items={[
            { k: 'prefs', label: 'Preferences', text: 'interface language, default location and default drone. The dashboard opens with them after you sign in.', side: 'in' },
            { k: 'locations', label: 'Saved locations', text: 'your points. They appear in the ★ menu in the dashboard header and in the mission planner.', side: 'in' },
            { k: 'addLoc', label: 'Add location', text: 'name + coordinates. Tip: you can also save the current point from the dashboard ★ menu.', side: 'l' },
            { k: 'droneRow', label: 'Your drones', text: 'open on the dashboard, edit or delete.', side: 'in' },
            { k: 'addDrone', label: 'Add drone', text: 'see the next chapter.', side: 'l' },
          ]}
          caption="Profile page"
        />
        <P>Settings, saved locations and drones are stored in your account, so you get them on every device you sign in with.</P>
      </>
    ),
  },
  {
    id: 'drones',
    part: 'members',
    members: true,
    title: 'Adding your own drone',
    blurb: 'Template, quick mode or spec sheet',
    body: (
      <>
        <P><B>Step 1 — pick a starting point.</B> Choose the type closest to your drone. Every value is filled in, so you only change what is different.</P>
        <Figure
          shot="drone-pick"
          items={[
            { k: 'tplFirst', label: 'Built-in type', text: 'starts with that class’s limits (quick mode).', side: 'b' },
            { k: 'tplSpecs', label: 'Spec-sheet example', text: <>a real 15 kg heavy multirotor described the way manufacturers do it. Marked <C>SPECS</C>.</>, side: 't' },
          ]}
          caption="Template picker"
        />
        <P><B>Step 2 — fill in the form.</B> It has four numbered sections. Mistakes are shown under the field itself, and <B>ADD DRONE</B> jumps to the first one.</P>
        <Figure
          shot="drone-form"
          items={[
            { k: 'based', label: 'Template', text: 'the one you started from; “Change template” goes back.', side: 'b' },
            { k: 'sec1', label: 'Basics', text: 'name, type and icon.', side: 'in' },
            { k: 'modes', label: 'Quick or spec sheet', text: 'how much data you have (see below).', side: 'b' },
            { k: 'groups', label: 'Spec-sheet values', text: 'payload, flight time, speed, radius and ceiling exactly as printed in the spec sheet.', side: 'in' },
            { k: 'sec3', label: 'Weather limits', text: 'wind, temperature, precipitation and visibility. Going beyond them means NO-GO.', side: 'in' },
            { k: 'sec4', label: 'Equipment', text: 'thermal camera, icing susceptibility, IP protection, notes.', side: 'in' },
            { k: 'footer', label: 'Save', text: 'stays visible at the bottom while you scroll.', side: 't' },
          ]}
          caption="The drone form in spec-sheet mode"
        />
        <H3>Quick vs. spec sheet</H3>
        <Table
          head={['', 'Quick', 'From spec sheet']}
          rows={[
            ['You enter', 'range, flight time, wind and gust limits', 'payload, flight time empty / at a payload, speed empty / full, radius empty / full, max range, ceiling, wind empty / full'],
            ['Payload', 'not taken into account', 'everything is recalculated for the payload you choose'],
            ['Mission planner', 'uses a typical speed for the drone type (marked “estimated”)', 'uses your drone’s real speed and endurance'],
          ]}
        />
        <Callout kind="tip" title="Ranges “from–to”">
          Spec sheets often give ranges like <C>37–45 min</C>. Enter both numbers; the <B>lower</B> one is used in calculations, so the result is on
          the safe side. If the sheet gives one value, leave “to” empty.
        </Callout>
      </>
    ),
  },
  {
    id: 'payload',
    part: 'members',
    members: true,
    title: 'Payload-aware ratings',
    blurb: 'How payload changes time, speed, radius and wind limit',
    body: (
      <>
        <P>
          When you select a drone that has spec-sheet values, a <B>payload</B> control appears on the dashboard. Every number below it is
          recalculated for that payload and the current weather.
        </P>
        <Figure
          shot="member-dash"
          items={[
            { k: 'payload', label: 'Payload', text: 'type a value, drag the slider or use the quick buttons (empty / reference / full). Remembered per drone on this device.', side: 'b' },
            { k: 'thresholdsM', label: 'Limits at this payload', text: <>wind and gust limits are marked <C>@ 10</C> — they are for 10 kg, not the empty drone.</>, side: 'in' },
            { k: 'perf', label: 'Performance at this payload', text: 'flight time, max speed, radius per specs → after cold → after wind, the wind limit and what set it.', side: 'in' },
            { k: 'roseM', label: 'Out-and-back radius by heading', text: 'how far you can go and come back in each direction with the current wind.', side: 't' },
          ]}
          caption="Dashboard with a spec-sheet drone selected (10 kg payload)"
        />
        <P>The exact formulas are in <a href="#calc-payload" className="text-[#00b4d8] underline underline-offset-2">How it&apos;s calculated → Payload model</a>, with this screen as a worked example.</P>
      </>
    ),
  },
  {
    id: 'mission',
    part: 'members',
    members: true,
    title: 'Mission planner',
    blurb: 'Route, wind at altitude, turn-back point, exports',
    body: (
      <>
        <P>
          The planner answers one question: <B>can this drone fly this route, with this payload, at this time, and get back?</B> It takes the wind
          forecast along the whole route at your flight altitude, not just at the launch point.
        </P>
        <Steps
          items={[
            <>Choose the <B>drone</B> and <B>payload</B>.</>,
            <>Click the map to place <B>A</B> (launch), then <B>B</B> (target). Further clicks add waypoints. Points can be dragged or typed (WGS84 or MGRS).</>,
            <>Choose <B>one-way</B> or <B>return</B>, the flight altitude, battery reserve and departure time (up to 47 h ahead).</>,
            <>Read the result. If the route is too long, the ✕ on the map shows where you must turn back.</>,
          ]}
        />
        <Figure
          shot="mission"
          items={[
            { k: 'missions', label: 'Missions', text: 'several routes; kept only in this browser (see Privacy).', side: 'in' },
            { k: 'droneP', label: 'Drone & payload', text: 'all calculations update immediately.', side: 'in' },
            { k: 'typeP', label: 'Mission settings', text: 'one-way / return, airspeed (AUTO = the speed with the largest margin), altitude, reserve, departure time.', side: 'in' },
            { k: 'toolbar', label: 'Click mode', text: 'what the next map click places: A, B or a waypoint.', side: 'b' },
            { k: 'wind', label: 'Wind at altitude', text: 'at the launch point, at your chosen altitude and time.', side: 'b' },
            { k: 'mA', label: 'A — launch', side: 'b' },
            { k: 'mWP', label: 'Waypoint', side: 'r' },
            { k: 'mB', label: 'B — target', side: 'r' },
            { k: 'turn', label: 'Turn-back point', text: 'beyond it the drone cannot get back with the reserve you set.', side: 'r' },
            { k: 'legend', label: 'Legend', text: 'green area = where you can fly and return; amber dashed = one-way reach; dotted circle = max range of the link.', side: 't' },
          ]}
          caption="Mission planner: a return mission with a 10 kg payload that is too long for the battery"
        />
        <P>
          Route colour: <span className="text-[#00b4d8]">cyan</span> = everything OK; <span className="text-[#ffaa00]">amber</span> = warning (not
          enough battery, wind over the drone&apos;s limit or beyond the link range); <span className="text-[#ff3344]">red</span> = a leg is physically
          impossible (wind stronger than the drone). The return leg is dashed.
        </P>
        <Figure
          shot="mission-result"
          items={[
            { k: 'route', label: 'Route points', text: 'edit coordinates, switch WGS84/MGRS, reverse, insert a saved location.', side: 'in' },
            { k: 'resultStatus', label: 'Result', text: 'FEASIBLE / NOT FEASIBLE with the reason, followed by distance, time, margin, battery used, turn-back point, weather at A and B and a per-leg table.', side: 'b' },
            { k: 'exportP', label: 'Export', text: 'PNG (map + summary), GPX and KML for maps and ground stations, CSV with the legs, JSON with everything.', side: 't' },
          ]}
          caption="Lower part of the planner panel"
        />
        <Callout kind="warn" title="Warnings vs. NOT FEASIBLE">
          The planner marks a route <B>NOT FEASIBLE</B> only for physics: not enough battery, or a leg where the wind is stronger than the drone.
          Wind above the drone&apos;s rated limits and points beyond the link range are <B>warnings</B> — the decision is yours.
        </Callout>
      </>
    ),
  },

  // ───────────────────────────── REFERENCE ─────────────────────────────
  {
    id: 'calc',
    part: 'reference',
    title: 'How it’s calculated',
    blurb: 'Every rule and formula used by the app',
    body: (
      <>
        <P>Everything runs in your browser. The rules below are the ones in the code, with the same thresholds.</P>

        <H3 id="calc-weather">1. Weather data</H3>
        <UL>
          <LI>Source: <B>Open-Meteo</B> forecast API. It picks the best available weather model for the location.</LI>
          <LI>Current conditions + <B>48 hourly steps</B> starting at the current hour <B>in the location&apos;s time zone</B>.</LI>
          <LI>Used: temperature, humidity, dew point, precipitation, rain, snowfall, weather code, cloud cover, visibility, wind at 10 m and 80 m, gusts at 10 m, pressure.</LI>
          <LI>Coordinates are rounded to <C>0.01°</C> (~1 km) before they are sent. Forecast cells are 1–11 km, so the result is the same.</LI>
        </UL>

        <H3 id="calc-rules">2. Rating rules</H3>
        <P>The checks run in order: if <B>any</B> NO-GO rule triggers, the rating is NO-GO and only those reasons are shown. Otherwise, any CAUTION rule gives CAUTION. Otherwise GO.</P>
        <Table
          head={['NO-GO when…', 'Detail']}
          rows={[
            ['Wind > limit', 'sustained wind at 10 m above the drone’s max wind'],
            ['Gusts > limit', 'gusts at 10 m above the drone’s max gusts'],
            ['Temperature outside range', 'below min or above max'],
            ['Precipitation', 'limit 0 → any precipitation; otherwise above the limit (mm/h)'],
            ['Snowfall', 'limit 0 → any snow; otherwise above the limit (cm/h)'],
            ['Visibility < minimum', 'in metres'],
            ['Icing (icing-prone drones)', <>−5…+2 °C <B>and</B> humidity &gt; 90 % <B>and</B> (rain or cloud &gt; 80 %)</>],
            ['No return (spec drones)', <>wind ≥ {pct(NO_RETURN_RATIO)} of the drone&apos;s airspeed at this payload</>],
          ]}
        />
        <Table
          head={['CAUTION when… (only if no NO-GO)', 'Detail']}
          rows={[
            ['Wind or gusts > 80 % of the limit', 'approaching the limit'],
            ['Temperature < min + 5 °C', 'battery and icing margin'],
            ['Any precipitation within the limit', ''],
            ['Visibility < 2 × minimum', ''],
            ['Humidity > 85 %', 'moisture risk for electronics'],
            ['−2…+5 °C with humidity > 80 %', 'potential icing'],
            ['Dew-point spread < 3 °C', 'fog may form'],
            ['Wind at 80 m > limit (spec drones flying ≥ 80 m)', 'stronger wind aloft'],
            ['Wind cuts the radius by > ' + pct(WIND_RADIUS_CAUTION), 'spec drones'],
          ]}
        />

        <H3 id="calc-sensors">3. Sensors and icing</H3>
        <Table
          head={['Indicator', 'BLIND / LIKELY', 'DEGRADED / POSSIBLE']}
          rows={[
            ['Visual camera', 'visibility < 300 m, or precipitation > 8 mm/h', 'visibility 300–1000 m, fog (WMO 45/48), precipitation > 0.5 mm/h, cloud > 90 %'],
            ['Thermal camera', 'precipitation > 4 mm/h, visibility < 200 m, or snow > 2 cm/h', 'precipitation 0.5–4 mm/h, visibility 200–1000 m, humidity > 95 %, light snow'],
            ['Icing risk', '−5…+2 °C, humidity > 90 %, precipitation or cloud > 80 %', '−8…+5 °C, humidity > 80 %, dew-point spread < 3 °C'],
          ]}
        />
        <Callout title="Not modelled yet">
          Thermal contrast between targets and the ground (day/night, sun) is not modelled. Treat “EFFECTIVE” as “the weather does not block the
          thermal camera”, not as a contrast guarantee.
        </Callout>

        <H3 id="calc-range">4. Range and endurance (quick-mode and built-in drones)</H3>
        <Formula
          lines={[
            ['range = nominal × max(0.3, 1 − wind × k)', 'k = 0.06 per m/s for multirotors and FPV, 0.03 for fixed-wing'],
            ['endurance = nominal × (1 − min(0.3, 0.01 × |T|))   when T < 0 °C', 'cold battery: −1 % per °C below zero, at most −30 %'],
            ['range on heading θ = range × (v + w·cos(θ − wind direction)) / v', 'wind rose; v = typical cruise speed: FPV 22, multirotor 12, fixed-wing 25 m/s'],
          ]}
        />

        <H3 id="calc-payload">5. Payload model (spec-sheet drones)</H3>
        <P>For a payload <C>p</C> with full payload <C>P</C> (t = p / P):</P>
        <Formula
          lines={[
            ['endurance(p) = empty + (loaded − empty) / p_ref × p', 'straight line through the two spec points (empty and at the reference payload); separately for the “from” and “to” values'],
            ['max speed(p) = lerp(speed empty, speed full, t)', 'airspeed v used for wind maths = the LOWER value'],
            ['radius(p) = min(lerp(radius empty, radius full, t), max range)', ''],
            ['cold: × (1 − min(0.3, 0.01 × |T|)) below 0 °C', 'applied to endurance and radius'],
            ['wind w = max(wind 10 m, wind 80 m)', 'the drone works up to its ceiling'],
            ['out-and-back radius factor = (s² − a²) / (v·s),  s = √(v² − c²)', 'a = along-track wind, c = crosswind. Worst case (along the wind) = 1 − (w/v)²; pure crosswind = √(1 − (w/v)²)'],
            [`sustained wind limit = min(spec(p), ${NO_RETURN_RATIO} × v)`, 'spec(p) = wind resistance interpolated from empty to full payload; the drone must be able to fly back'],
            [`gust limit = max(sustained, min(${GUST_FACTOR} × spec(p), v))`, 'gusts are brief, but never faster than the drone'],
          ]}
        />
        <Callout kind="tip" title="Worked example — the screenshot in “Payload-aware ratings”">
          Spec sheet: speed 80–100 km/h empty, 40 km/h full (15 kg); radius 15 km empty, 10 km full; wind 17 m/s empty, 12 m/s full. At{' '}
          <B>10 kg</B> (t = 0.667):
          <br />• max speed = 80 + (40 − 80) × 0.667 = <B>53 km/h</B> (14.8 m/s); upper value 60 km/h
          <br />• radius = 15 + (10 − 15) × 0.667 = <B>11.7 km</B>
          <br />• spec(p) = 17 + (12 − 17) × 0.667 = 13.7 m/s, but 0.85 × 14.8 = <B>12.6 m/s</B> → the wind limit is <i>set by drone speed</i>
          <br />• gust limit = min(1.25 × 13.7, 14.8) = <B>14.8 m/s</B>
          <br />• with 3.6 m/s of wind: 1 − (3.6 / 14.8)² = 0.94 → radius after wind ≈ <B>11 km</B>
        </Callout>

        <H3 id="calc-mission">6. Mission planner</H3>
        <Formula
          lines={[
            ['usable time = endurance(p, cold, lower value) × speed factor × (1 − reserve)', 'speed factor = 1 up to 80 % of max speed, falling linearly to 0.9 at max speed'],
            ['wind at altitude h: interpolated between 10, 80, 120 and 180 m', 'speed linearly, direction as a vector'],
            ['gust at altitude = wind(h) + (gust 10 m − wind 10 m)', 'the turbulent excess does not grow with height'],
            ['ground speed g = √(v² − c²) + a', 'per leg, with the vector-averaged wind of the route samples on that leg; impossible if c ≥ v or g ≤ 0.5 m/s'],
            ['leg time = distance / g', ''],
            ['one-way reach on heading θ = T · g(θ)', 'amber dashed area'],
            ['return reach on heading θ = T · g₁ · g₂ / (g₁ + g₂)', 'green area; g₁ outbound, g₂ back; 72 headings'],
          ]}
        />
        <UL>
          <LI>Weather is requested for every route point plus intermediate points about every 3 km (up to 30 points), in <B>one</B> request.</LI>
          <LI><B>Turn-back point</B> (return missions): the farthest point along the route from which out-and-back still fits in the usable time, found by binary search.</LI>
          <LI><B>Battery limit</B> (one-way): the point where the usable time runs out.</LI>
          <LI><B>AUTO airspeed</B>: every speed from 35 % to 100 % of max speed in 1 km/h steps is tried; the one with the largest time margin wins.</LI>
          <LI>Drones without spec-sheet values use a typical speed for their type and are marked <i>estimated</i>.</LI>
        </UL>

        <H3 id="calc-windows">7. Optimal launch windows</H3>
        <P>A window is a run of <B>at least 2 consecutive GO hours</B> in the 48-hour timeline for the selected drone.</P>
      </>
    ),
  },
  {
    id: 'privacy',
    part: 'reference',
    title: 'Privacy, offline and installing',
    blurb: 'What is sent where, what stays on your device',
    body: (
      <>
        <Table
          head={['Data', 'Where it goes']}
          rows={[
            ['Selected point', 'Open-Meteo, rounded to ~1 km. Requests go directly from your browser, not through our server.'],
            ['Place-name search', 'Only the text you typed, to Open-Meteo Geocoding. Coordinates and MGRS are parsed on the device.'],
            ['Missions', <>Never leave your browser. By default they disappear when the tab is closed; <i>Remember on this device</i> keeps them in this browser only.</>],
            ['Account (members)', 'Name, e-mail, settings, saved locations and custom drones — in our database, readable only by you.'],
          ]}
        />
        <H3>Install and offline use</H3>
        <UL>
          <LI>Android / Chrome: menu → <i>Install app</i> or <i>Add to Home screen</i>. iPhone / Safari: Share → <i>Add to Home Screen</i>.</LI>
          <LI>The app itself and the last weather loaded are cached. Offline you see the last data with a <C>CACHED</C> badge.</LI>
        </UL>
      </>
    ),
  },
  {
    id: 'limits',
    part: 'reference',
    title: 'Limitations',
    blurb: 'What the ratings do not know',
    body: (
      <>
        <Callout kind="warn" title="Weather estimate only">
          DroneFly rates the <B>weather</B>. It does not know about EW, airspace restrictions, terrain, obstacles, the state of your drone and
          batteries, or your experience. A forecast is a forecast: local conditions (valleys, forest edges, cities) can differ. Always apply
          your own operational judgment.
        </Callout>
        <UL>
          <LI>Not modelled: night and low sun glare, cloud base height, thermal contrast, battery ageing, terrain effects on wind.</LI>
          <LI>Wind at altitude comes from the model levels 10/80/120/180 m; above 180 m the 180 m value is used.</LI>
          <LI>Spec-sheet numbers are taken as given; real performance varies between units and batteries.</LI>
        </UL>
        <MembersCTA compact />
      </>
    ),
  },
];
