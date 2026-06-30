# 🔮 Astraea — Astrology API

A **free, public, no-key REST API** for Western tropical astrology. Send a birth date, time and place; get back the **whole sky, fully interpreted** — natal birth charts, planetary positions, houses, aspects, plus transits, synastry, composite and solar-return charts, each with built-in plain-English interpretations.

Built with **Node + Express + TypeScript**, deployed as a single serverless function on **Vercel**. Interactive docs (Scalar) live at the root URL; the machine-readable OpenAPI spec is at `/openapi.json` — import it straight into Postman or Insomnia.

**🔗 Live API & docs:** **https://astraea-dev.vercel.app**
**📖 OpenAPI spec:** https://astraea-dev.vercel.app/openapi.json

> **Astraea** — every planet, house and aspect of a birth moment, in one clean API.

---

## 📑 Table of contents

- [What it is & who it's for](#-what-it-is--who-its-for)
- [How it works (the important part)](#-how-it-works-the-important-part)
- [Features](#-features)
- [Quick start](#-quick-start)
- [Endpoints](#-endpoints)
- [Request reference](#-request-reference)
- [What gets computed](#-what-gets-computed)
- [Accuracy & validation](#-accuracy--validation)
- [Architecture](#-architecture)
- [Tech stack](#-tech-stack)
- [Local development](#-local-development)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Credits, license & disclaimer](#-credits)

## 🌟 What it is & who it's for

Astraea turns a **birth moment** (date, time, place) into a complete astrological **birth chart** as JSON. The caller is a developer or product, not an end user:

- **Astrology / horoscope apps** that need accurate chart math without building an astronomy engine.
- **Dating / compatibility apps** (synastry between two charts).
- **Wellness & content sites** generating birth-chart readings and daily horoscopes.
- **Indie developers** who just want "birth details → chart."

Accurate chart computation (precise positions, house cusps, aspects) is genuinely hard, which is why most providers charge per request. Astraea computes it all from open-source astronomy and offers it free, no-key and documented.

## ⚙️ How it works (the important part)

**Astraea is a calculator, not a database.** There is **no stored data, no external API call, and no internet dependency** — every chart is *computed from the laws of orbital motion*, fresh, in milliseconds. Send the same birth details a decade from now and you get the identical chart. That's what makes it cheap to run, impossible to "go stale," and reliable on serverless forever.

The "data" is really **three ingredients**:

1. **Orbital mathematics** — [`astronomy-engine`](https://github.com/cosinekitty/astronomy) carries the mathematical model of the solar system in code (standard NASA/JPL-grade algorithms — VSOP planetary theory + an improved lunar theory, accurate to arcseconds). Give it an instant in time and it returns exactly where every body sits in the sky. *The physics is the data.*
2. **Timezone data** — `tz-lookup` + `luxon` convert a local birth time (with correct **historical** DST rules) into one absolute universal instant.
3. **Astrology rules & interpretation text** — the signs, houses, aspects, dignities and the written meanings. These are original to Astraea.

### The request pipeline (natal chart)

1. **Resolve the moment** — find the timezone from the coordinates, convert local birth time → an absolute UTC instant. *(`lib/timezone.ts`)*
2. **Locate every body** — feed that instant to `astronomy-engine`, get each body's geocentric ecliptic longitude (its position along the zodiac belt). *(`lib/ephemeris.ts`)*
3. **Angle → sign** — pure arithmetic: the zodiac is 360° in twelve 30° signs, so 295° → 25° Capricorn. *(`lib/zodiac.ts`)*
4. **Ascendant & Midheaven** — from the Earth's rotation angle (sidereal time) + birth latitude + axial tilt (obliquity), solved with spherical trigonometry. *(`lib/angles.ts`)*
5. **Houses** — divide the sky into 12 cusps (Placidus uses the iterative semi-arc method). *(`lib/houses.ts`)*
6. **Aspects** — compare every pair of bodies' angles; ~60° = sextile, ~90° = square, etc. *(`lib/aspects.ts`)*
7. **Interpret** — combine structured phrase data (planet × sign × house × aspect) into original text. *(`lib/interpret.ts`)*
8. **Package** — wrap in the `{ success, data, meta }` envelope and respond. *(`lib/format.ts`)*

## ✨ Features

- **Natal birth chart** — Sun, Moon, Mercury–Pluto, plus Mean Lunar Nodes, Lilith and Part of Fortune; each with sign, exact degree (DD°MM′SS″), house, retrograde and daily speed.
- **Houses** — Placidus (default), Whole-Sign and Equal, with all 12 cusps and the four angles (Ascendant, MC, Descendant, IC).
- **Aspects** — major by default (conjunction, sextile, square, trine, opposition); `"aspects":"all"` adds the minors. Exact orb + applying/separating.
- **Essential dignities** — domicile / exaltation / detriment / fall per planet.
- **Transits** — the current (or any-date) sky vs. a natal chart, with transit-to-natal aspects.
- **Synastry & composite** — relationship compatibility (inter-aspects) and the midpoint chart.
- **Solar return** — the chart for the moment the Sun returns to its natal longitude in any year.
- **Daily horoscope & reference** — a deterministic daily reading by sign, plus reference content for signs/planets/houses/aspects.
- **Interpretations included** — every placement, angle and aspect comes with original, plain-English meaning.
- **Robust edge cases** — unknown birth time → signs only (angles/houses omitted, Moon flagged); polar latitudes → automatic Whole-Sign fallback; invalid timezone, out-of-range year and malformed JSON all return clean `400`s.
- **Auto timezone** — resolved from the birth coordinates (or an explicit `tz`), with correct historical DST handling.

## 🚀 Quick start

```bash
# A full natal chart (POST with JSON)
curl -X POST https://astraea-dev.vercel.app/v1/natal \
  -H "content-type: application/json" \
  -d '{"date":"1995-03-15","time":"14:30","lat":23.81,"lng":90.41}'

# Where are the planets right now?
curl https://astraea-dev.vercel.app/v1/positions
```

```jsonc
{
  "success": true,
  "data": {
    "bodies": {
      "sun":  { "sign": "Pisces", "degree": "24°31'12\"", "house": 7, "retrograde": false,
                "interpretation": "Your core identity… expresses compassionately and imaginatively…" },
      "moon": { "sign": "Leo", "degree": "08°12'40\"", "house": 12 }
    },
    "angles":  { "ascendant": { "sign": "Virgo", "degree": "05°44'01\"" }, "midheaven": {} },
    "houses":  { "system": "placidus", "cusps": [] },
    "aspects": [ { "between": ["Sun","Moon"], "type": "trine", "orb": 1.5, "applying": true } ]
  },
  "meta": { "subject": { "date": "1995-03-15", "time": "14:30", "location": {} }, "houseSystem": "placidus" }
}
```

Every response uses the same envelope: `{ "success": true, "data": …, "meta": … }`, or `{ "success": false, "error": { "code", "message", "details" } }` on failure.

## 📚 Endpoints

| Method & path | Description |
|---|---|
| `POST /v1/natal` | Full natal birth chart (bodies, angles, houses, aspects, interpretations) |
| `GET  /v1/positions` | Planetary positions for any instant (no birth data needed) |
| `POST /v1/transits` | Transiting sky vs. a natal chart |
| `POST /v1/synastry` | Compatibility (inter-aspects) between two charts |
| `POST /v1/composite` | Midpoint relationship chart |
| `POST /v1/solar-return` | The Sun-return chart for a given year |
| `GET  /v1/horoscope` | Daily horoscope by sign |
| `GET  /v1/reference/{category}/{key}` | Reference content: `signs` / `planets` / `houses` / `aspects` |
| `GET  /v1/health` | Health check |
| `GET  /` · `GET /openapi.json` | Interactive Scalar docs · machine-readable spec |

## 🧾 Request reference

**Birth data fields** (used by natal / transits / synastry / composite / solar-return):

| Field | Required | Notes |
|---|---|---|
| `date` | ✅ | `YYYY-MM-DD`, year 1700–2200 |
| `time` | — | `HH:mm` (24h). Omit if unknown → no houses/angles, Moon flagged |
| `lat`, `lng` | — | −90..90 / −180..180 (east-positive). Needed for houses/angles |
| `tz` | — | IANA timezone override (else resolved from coordinates) |
| `houseSystem` | — | `placidus` (default) · `whole-sign` · `equal` |
| `aspects` | — | `major` (default) · `all` (adds minor aspects) |
| `orb` | — | optional hard cap on aspect orb, in degrees |

Empty-string optional fields are treated as "not provided" (so the docs "Try it" panel works out of the box).

## 🪐 What gets computed

- **Bodies (10):** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
- **Derived points:** North Node, South Node (mean), Lilith (mean lunar apogee), Part of Fortune (sect-aware).
- **Angles:** Ascendant, Midheaven (MC), Descendant, Imum Coeli (IC).
- **Houses:** 12 cusps via Placidus / Whole-Sign / Equal.
- **Aspects:** conjunction (0°), sextile (60°), square (90°), trine (120°), opposition (180°); optionally semisextile (30°), semisquare (45°), sesquiquadrate (135°), quincunx (150°).
- **Dignities:** domicile, exaltation, detriment, fall.

## 🎯 Accuracy & validation

Planetary positions come straight from `astronomy-engine` (arcsecond-level). The hand-written astrology math is covered by rigorous tests:

- **Angles** are verified by round-tripping the computed Ascendant/MC back through `astronomy-engine`'s own horizon math — the Ascendant lands on the horizon to within 0.05°, the MC on the meridian.
- **Placidus houses** are checked against their defining semi-arc condition to 3 decimal places.
- **Full API** integration tests cover every endpoint, the unknown-time and polar-latitude paths, validation errors, rate-limiting and malformed input.

39 unit + integration tests; `npm test`.

## 🗂️ Architecture

Single serverless function; clean separation between the computation engine (`src/lib`) and the HTTP layer (`src/routes`).

```
src/
  lib/            # the engine — pure, testable, no Express
    zodiac.ts        signs, degrees, dignities
    ephemeris.ts     geocentric body longitudes, speed, retrograde
    angles.ts        Ascendant / MC / obliquity / sidereal time
    houses.ts        Placidus (semi-arc) / Whole-Sign / Equal
    points.ts        nodes, Lilith, Part of Fortune
    aspects.ts       aspect detection + cross-chart aspects
    chart.ts         assembles a full chart from the above
    interpret.ts     structured interpretation builders
    format.ts        response shaping + envelope
    timezone.ts      tz resolution + birth-instant
  schemas/        # zod request validation
  routes/         # one file per endpoint
  middleware/     # error handling, rate limiting, validation
  openapi/        # OpenAPI 3.1 spec + docs route
  app.ts          # Express app
  server.ts       # local dev entry
  vercel.ts       # serverless bundle entry
public/           # static Scalar docs page
```

## 🛠️ Tech stack

| Concern | Choice | Why |
|---|---|---|
| Astronomy | **astronomy-engine** (MIT) | Arcsecond-accurate, pure-JS, no data feed |
| Server | **Express 5 + TypeScript** (CommonJS) | Reliable on Vercel serverless |
| Validation | **zod** | Typed request parsing with clean 400s |
| Timezone | **tz-lookup + luxon** | Coords → IANA zone, historical-DST-correct instants |
| Rate limiting | **Upstash Redis** (sliding window) + in-memory fallback | Distributed limits across serverless instances; fails open |
| Docs | **Scalar** + OpenAPI 3.1 | Interactive docs at `/`, spec at `/openapi.json` |
| Tests | **vitest + supertest** | Unit + HTTP integration |
| Bundle/deploy | **esbuild → Vercel** | One self-contained CJS function |

## 💻 Local development

```bash
npm install
npm run dev          # http://localhost:4000  (tsx watch, auto-reload)
npm test             # vitest — 39 unit + integration tests
npm run typecheck    # tsc --noEmit
npm run build        # esbuild bundle → api/index.js (what Vercel runs)
```

### Rate limiting

Open (no key) but rate-limited per IP. In production it uses **Upstash Redis** (sliding window) so limits hold across serverless instances; without the env vars it falls back to an in-memory limiter. The limiter **fails open** — an Upstash outage or exhausted quota lets requests through rather than erroring. See [`.env.example`](.env.example).

## ☁️ Deployment

Deploys to Vercel as a single serverless function: the `vercel-build` step bundles the app (entry `src/vercel.ts`) into one self-contained CommonJS file at `api/index.js` via esbuild. `vercel.json` redirects `/` to the static Scalar docs page and rewrites `/v1/*` + `/openapi.json` to the function. Set the two `UPSTASH_*` env vars in Vercel for production rate limiting (the API works without them).

## 🗺️ Roadmap

- **Chiron** and other centaurs/asteroids (require a dedicated ephemeris).
- True (osculating) Node & Lilith as options alongside the mean values.
- Secondary progressions; additional house systems (Koch, Campanus, Regiomontanus).

## 🙏 Credits

All planetary mathematics is computed by **[astronomy-engine](https://github.com/cosinekitty/astronomy)** (MIT) by Don Cross. Timezone resolution by **tz-lookup** + **[Luxon](https://moment.github.io/luxon/)**. Docs rendered by **[Scalar](https://github.com/scalar/scalar)**. Astraea is an independent project and is **not affiliated with or endorsed by** any of the above.

## 📄 License

MIT © Md. Latiful Kabir. Astrological results are computed astronomically and provided **for entertainment and self-reflection** — not professional advice.
