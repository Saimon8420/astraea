# 🔮 Astraea — Astrology API

A **free, public, no-key REST API** for Western tropical astrology: natal birth charts, planetary positions, houses, aspects — plus transits, synastry, composite and solar-return charts, each with **built-in interpretations**.

Built with **Node + Express + TypeScript**, deployed on **Vercel**. Interactive docs (Scalar) at the root URL; the machine-readable spec is at `/openapi.json` — import it straight into Postman or Insomnia.

> **Astraea** — send a birth date, time and place; get back the whole sky, interpreted.

---

## ✨ Features

- **Natal birth chart** — Sun, Moon, Mercury–Pluto, plus Mean Lunar Nodes, Lilith and Part of Fortune; each with sign, exact degree (DD°MM′SS″), house, retrograde and speed.
- **Houses** — Placidus (default), Whole-Sign and Equal, with all 12 cusps and the four angles (Ascendant, MC, Descendant, IC).
- **Aspects** — major by default (conjunction, sextile, square, trine, opposition); `"aspects": "all"` adds the minors. Exact orb + applying/separating.
- **Essential dignities** — domicile / exaltation / detriment / fall per planet.
- **Transits** — the current (or any-date) sky compared to a natal chart, with transit-to-natal aspects.
- **Synastry & composite** — relationship compatibility (inter-aspects) and the midpoint chart.
- **Solar return** — the chart for the moment the Sun returns to its natal longitude in any year.
- **Daily horoscope & reference** — a deterministic daily reading by sign, plus reference content for signs/planets/houses/aspects.
- **Interpretations included** — every placement, angle and aspect comes with original, plain-English meaning.
- **Smart edge cases** — unknown birth time → planetary signs only (angles/houses omitted, Moon flagged); polar latitudes → automatic Whole-Sign fallback for Placidus.
- **Auto timezone** — resolved from the birth coordinates (or an explicit `tz`), with correct historical DST handling.

## 🚀 Quick start

```bash
# A full natal chart
curl -X POST http://localhost:4000/v1/natal \
  -H "content-type: application/json" \
  -d '{"date":"1995-03-15","time":"14:30","lat":23.81,"lng":90.41}'

# Where are the planets right now?
curl http://localhost:4000/v1/positions
```

```jsonc
{
  "success": true,
  "data": {
    "bodies": {
      "sun":  { "sign": "Pisces", "degree": "24°31'12\"", "house": 7, "retrograde": false },
      "moon": { "sign": "Leo",    "degree": "08°12'40\"", "house": 12 }
    },
    "angles": { "ascendant": { "sign": "Virgo", "degree": "05°44'01\"" }, "midheaven": {} },
    "houses": { "system": "placidus", "cusps": [] },
    "aspects": [ { "between": ["Sun","Moon"], "type": "trine", "orb": 1.5, "applying": true } ]
  },
  "meta": { "subject": { "date": "1995-03-15", "time": "14:30", "location": {} }, "houseSystem": "placidus" }
}
```

## 📚 Endpoints

| Method & path | Description |
|---|---|
| `POST /v1/natal` | Full natal birth chart (bodies, angles, houses, aspects, interpretations) |
| `GET  /v1/positions` | Planetary positions for any instant (no birth data) |
| `POST /v1/transits` | Transiting sky vs. a natal chart |
| `POST /v1/synastry` | Compatibility (inter-aspects) between two charts |
| `POST /v1/composite` | Midpoint relationship chart |
| `POST /v1/solar-return` | The Sun-return chart for a given year |
| `GET  /v1/horoscope` | Daily horoscope by sign |
| `GET  /v1/reference/{category}/{key}` | Reference content: signs / planets / houses / aspects |
| `GET  /v1/health` | Health check |

**Birth data fields:** `date` (`YYYY-MM-DD`, required), `time` (`HH:mm`, optional), `lat`, `lng`, `tz` (IANA override), `houseSystem` (`placidus`\|`whole-sign`\|`equal`), `aspects` (`major`\|`all`), `orb` (max orb cap).

## 🛠️ Local development

```bash
npm install
npm run dev          # http://localhost:4000  (tsx watch)
npm test             # vitest — 34 unit + integration tests
npm run typecheck    # tsc --noEmit
```

### Rate limiting

Open (no key) but rate-limited per IP. In production it uses **Upstash Redis** (sliding window) so limits hold across serverless instances; without the env vars it falls back to an in-memory limiter. See [`.env.example`](.env.example).

## ☁️ Deployment

Deploys to Vercel as a single serverless function: the `vercel-build` step bundles the app (entry `src/vercel.ts`) into one self-contained CommonJS file at `api/index.js` via esbuild. `vercel.json` redirects `/` to the static Scalar docs page and rewrites `/v1/*` + `/openapi.json` to the function. Set the two `UPSTASH_*` env vars in Vercel for production rate limiting (the API works without them).

## 🗺️ Roadmap

- **Chiron** and other centaurs/asteroids (require a dedicated ephemeris).
- True (osculating) Node & Lilith as options alongside the mean values.
- Secondary progressions; additional house systems (Koch, Campanus, Regiomontanus).

## 🙏 Credits

All planetary mathematics is computed by **[astronomy-engine](https://github.com/cosinekitty/astronomy)** (MIT) by Don Cross. Timezone resolution by **tz-lookup** + **Luxon**. Docs rendered by **[Scalar](https://github.com/scalar/scalar)**. Astraea is an independent project and is **not affiliated with or endorsed by** any of the above.

## 📄 License

MIT © Md. Latiful Kabir. Astrological results are computed astronomically and provided **for entertainment and self-reflection** — not professional advice.
