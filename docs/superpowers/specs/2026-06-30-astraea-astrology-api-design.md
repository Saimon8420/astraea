# Astraea — Astrology / Natal Chart API — Design Spec

- **Date:** 2026-06-30
- **Status:** Approved design (pending user spec review) → next step: implementation plan
- **Project location (planned):** `D:\Web Practice\astraea`
- **Pipeline:** API product #3 in the "Miqaat formula" line, after Miqaat & Horizon. See memory `api-products-pipeline.md`.

---

## 1. What it is & who it serves

**Astraea turns a birth moment (date, time, place) into a complete, interpreted astrological birth chart, returned as clean JSON.**

The caller sends birth details; Astraea computes where every planet was, the houses/angles, the aspects between bodies, and attaches plain-English interpretations. It is the same conceptual shape as Horizon ("where is the sun/moon for this place & time") extended to the whole sky + astrological meaning.

**Audience (developers/businesses, not end users):**
- Astrology/horoscope apps (large, growing market) that need chart math without building an astronomy engine.
- Dating/compatibility apps (synastry between two charts).
- Wellness/content sites generating daily horoscopes and birth-chart readings.
- Indie devs who just want "birth details → chart."

**Why it's a gem:** Accurate chart computation (precise positions, house cusps, aspects) is genuinely hard, so incumbents (Prokerala, AstrologyAPI, etc.) **charge per request**. `astronomy-engine` does the hardest part for free, and we already have the Horizon astronomy/timezone muscle memory. Astraea offers the same thing **free, no-key, well-documented** — rare and CV-credible.

## 2. Scope decisions (locked with user)

- **Output:** Full feature — computed chart **plus** bundled interpretation text.
- **System:** Western tropical astrology. (Vedic/sidereal explicitly out of scope — rejected earlier in pipeline.)
- **House systems:** Placidus (default) + Whole-Sign + Equal, via `?houseSystem=`.
- **Chiron:** Included via a bundled approximation, flagged `approximate: true` (not in `astronomy-engine`).
- **Name:** **Astraea** (Greek star goddess).
- **Progressions:** Deferred to v2.

## 3. Engine & computation approach

- **`astronomy-engine`** (MIT, Don Cross, high precision) for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto — ecliptic longitude → sign + degree; speed/retrograde from longitude delta.
- **Hand-rolled, tested lib modules** (validated against known reference charts) for:
  - **Lunar Nodes** (North/South) — derived from the Moon's orbital elements.
  - **Lilith** (mean lunar apogee) — formula.
  - **Chart angles** (Ascendant, MC, Descendant, IC) — from Local Sidereal Time + latitude.
  - **House cusps** — Placidus (iterative/trig), Whole-Sign, Equal.
  - **Part of Fortune** — from Sun/Moon/Asc (day/night formula).
  - **Aspects** — angular separations vs. orb table; applying/separating.
  - **Dignities** — rulership / exaltation / detriment / fall lookup.
- **Chiron** — bundled compact approximation/ephemeris, flagged approximate.

## 4. Celestial bodies & points

Each returns: `sign`, `degree` (°′″ + decimal), `house`, `retrograde`, `speed`.

- 10 classic bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.
- Derived points: North Node, South Node, Lilith, Chiron (approx), Part of Fortune.
- Angles: Ascendant, Midheaven (MC), Descendant, IC.

## 5. Endpoints (`/v1`)

| Endpoint | Purpose |
|---|---|
| `POST /v1/natal` | **Flagship birth chart** — all bodies/points (sign+degree+house), 12 house cusps, angles, aspects, dignities, interpretations. |
| `GET /v1/positions` | Planetary positions for any date/time (sign, degree, retrograde). No birth data needed. |
| `POST /v1/transits` | Current (or any-date) sky vs. a natal chart — transiting bodies aspecting natal points. |
| `POST /v1/synastry` | Compatibility — inter-aspects between two charts. |
| `POST /v1/composite` | Relationship chart — midpoint chart of two people. |
| `POST /v1/solar-return` | Chart for the moment the Sun returns to its natal position (birthday-year chart). |
| `GET /v1/horoscope` | Daily horoscope by sign (interpretation-driven, lighter computation). |
| `GET /v1/reference/{sign\|planet\|house\|aspect}` | Static reference + interpretation content. |
| `GET /v1/health` | Health check. |
| `GET /` , `GET /openapi.json` | Scalar docs + spec. |

### Core input shape (natal / transits / etc.)
```jsonc
{
  "date": "1995-03-15",      // YYYY-MM-DD (required)
  "time": "14:30",           // HH:mm 24h (optional — see edge cases)
  "lat": 23.81,              // required for houses/angles
  "lng": 90.41,
  "houseSystem": "placidus", // placidus | whole-sign | equal (default placidus)
  "aspects": "major",        // major | all
  "tz": "Asia/Dhaka"         // optional override; else auto from coords
}
```

### Natal response sketch
```jsonc
{
  "success": true,
  "data": {
    "bodies": {
      "sun": { "sign": "Pisces", "degree": "24°31'", "decimal": 354.52, "house": 10, "retrograde": false, "speed": 0.99 },
      "moon": { "sign": "Leo", "degree": "08°12'", "house": 3 },
      "chiron": { "sign": "Virgo", "degree": "01°44'", "house": 4, "approximate": true }
    },
    "angles": { "ascendant": { "sign": "Cancer", "degree": "15°02'" }, "mc": { } },
    "houses": [ { "house": 1, "cusp": { "sign": "Cancer", "degree": "15°02'" } } ],
    "aspects": [ { "between": ["sun","moon"], "type": "trine", "orb": "2°19'", "applying": true } ],
    "dignities": { "mars": "detriment" },
    "interpretation": { "sun": "Sun in Pisces — ...", "ascendant": "Cancer rising — ..." }
  },
  "meta": { "location": { "latitude": 23.81, "longitude": 90.41, "timezone": "Asia/Dhaka" }, "houseSystem": "placidus" }
}
```

## 6. Houses, aspects & dignities

- **Houses:** Placidus (default) / Whole-Sign / Equal. Response includes 12 cusps + 4 angles.
- **Aspects:** major default (conjunction 0°, opposition 180°, trine 120°, square 90°, sextile 60°); `?aspects=all` adds minors (quincunx 150°, semisextile 30°, semisquare 45°, sesquiquadrate 135°). Each: bodies, type, exact orb, applying/separating.
- **Orbs:** default orb table (≈8° luminaries, tighter for minors), overridable via `?orb=`.
- **Dignities:** rulership / exaltation / detriment / fall per planet.

## 7. Edge cases (must-handle)

- **Unknown birth time** (`time` omitted): return planetary signs (planets barely move/day); **Ascendant, houses, angles = `null`** with a clear note; **Moon flagged** as possibly sign-uncertain. Most important real-world case.
- **Extreme latitude** (> ~66°): Placidus undefined → detect and return a note recommending Whole-Sign; do not emit garbage.
- **Historical dates:** luxon IANA data handles historical DST/offset; auto-tz from coords. Note `astronomy-engine` precision range.
- **Validation:** zod on all inputs (lat/lng bounds, date/time format, enum params) → 400 `VALIDATION_ERROR`.

## 8. Interpretation content

Bundled static JSON (no DB), keyed for annotation of any chart:
- Planet-in-sign (10 × 12 = 120)
- Planet-in-house (10 × 12 = 120)
- Rising/Ascendant sign (12) + sign basics (element, modality, ruler, traits)
- Aspect meanings by aspect type, themed by the two planets
- Original, concise, neutral tone. Largest writing effort — drafted then user-reviewed. Computation works fully without it; text layers on top.

## 9. Tech stack (Miqaat/Horizon template, verbatim)

- Express 5 + TypeScript (CommonJS) → esbuild bundle `src/vercel.ts` → `api/index.js`.
- Static Scalar docs (`public/index.html` + vendored `public/scalar.js`); `vercel.json` `/`→`/index.html` redirect + scoped `/v1/*` & `/openapi.json` rewrites.
- zod validation; **Upstash rate-limit with unique `prefix: "astra"`** (avoid shared-DB key collision) + in-memory fallback.
- tz-lookup + luxon for timezone; helmet (CSP off for docs); CORS open.
- vitest + supertest. Response envelope `{ success, data, meta }`. Credits in docs only.
- OpenAPI 3.1 hand-written; astronomy-engine attribution in info.description + README.

## 10. Testing strategy

- **Reference-chart tests:** validate natal output (positions, Asc/MC, house cusps, aspects) against 2–3 known charts from established sources, within tolerance.
- Unit tests per lib module (houses, aspects, dignities, nodes, Part of Fortune).
- Integration tests per endpoint (supertest): success, validation 400, unknown-time path, extreme-latitude path, rate-limit 429, docs/openapi/health.
- Target ≈30–40 tests (in line with Miqaat 40 / Horizon 31).

## 11. Non-goals (v2+)

- Secondary progressions, solar arc directions.
- Additional house systems (Koch, Campanus, Regiomontanus, Porphyry).
- Vedic/sidereal astrology, asteroids beyond Chiron, fixed stars.
- AI-generated/long-form interpretations (start with concise bundled text).

## 12. Risks / open items

- **Chiron accuracy** — bundled approximation; clearly flagged. Revisit if users need precision.
- **Placidus correctness** — highest implementation risk; mitigated by reference-chart tests.
- **Interpretation volume** — ~250+ text entries; phase the writing, ship computation first.
- **`astronomy-engine` valid range** — confirm and document supported date range.

## 13. Build phasing (within Astraea)

1. Scaffold from Horizon template (tsconfig, vercel.json, middleware, timezone, docs, server, vercel.ts), set `prefix: "astra"`.
2. Core lib: positions (astronomy-engine) → sign/degree/retrograde + tests.
3. Angles + house systems (Placidus/Whole-Sign/Equal) + tests.
4. Aspects + orbs + dignities + derived points (nodes, Lilith, Part of Fortune, Chiron) + tests.
5. `/v1/natal` + `/v1/positions` endpoints + integration tests.
6. `/v1/transits`, `/v1/synastry`, `/v1/composite`, `/v1/solar-return`.
7. Interpretation content + `/v1/horoscope` + `/v1/reference`.
8. OpenAPI spec + Scalar docs + README.
9. Vercel bundle verify (plain Node) → deploy (user-driven).

Commit per feature/phase (per user convention); author Saimon8420 `<latifulkabir567@gmail.com>`; NO Claude footer; repo PRIVATE with description+homepage; never push/deploy without explicit instruction.
