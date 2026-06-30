/** Hand-written OpenAPI 3.1 spec — rendered by Scalar at / and served at /openapi.json. */

const birthDataSchema = {
  type: "object",
  required: ["date"],
  properties: {
    date: { type: "string", example: "1995-03-15", description: "Birth date, YYYY-MM-DD." },
    time: { type: "string", example: "14:30", description: "Birth time, HH:mm (24h). Omit if unknown." },
    lat: { type: "number", example: 23.81, description: "Latitude (−90..90). Needed for houses/angles." },
    lng: { type: "number", example: 90.41, description: "Longitude (−180..180), east-positive." },
    tz: { type: "string", example: "Asia/Dhaka", description: "IANA timezone override (else resolved from coordinates)." },
    houseSystem: { type: "string", enum: ["placidus", "whole-sign", "equal"], default: "placidus" },
    aspects: { type: "string", enum: ["major", "all"], default: "major" },
    orb: { type: "number", example: 6, description: "Optional hard cap on aspect orb (degrees)." },
  },
};

const okEnvelope = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: { type: "object" },
    meta: { type: "object" },
  },
};

function jsonBody(schema: unknown) {
  return { required: true, content: { "application/json": { schema } } };
}
const okResponse = { description: "Success", content: { "application/json": { schema: okEnvelope } } };

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Astraea — Astrology API",
    version: "1.0.0",
    description:
      "A free, public, no-key REST API for Western tropical astrology: natal birth charts, planetary positions, houses, aspects, transits, synastry, composite and solar-return charts — each with built-in interpretations.\n\n" +
      "**House systems:** Placidus (default), Whole-Sign, Equal. **Bodies:** Sun, Moon, Mercury–Pluto, plus Mean Lunar Nodes, Lilith and Part of Fortune, with Ascendant/MC and the full house cusps. Chiron is planned for a future version.\n\n" +
      "Planetary mathematics by **[astronomy-engine](https://github.com/cosinekitty/astronomy)** (MIT) by Don Cross. Timezone resolution by tz-lookup + Luxon. Astraea is an independent project and is not affiliated with or endorsed by any of these. Astrology is provided for entertainment and self-reflection.",
  },
  servers: [{ url: "/", description: "This deployment" }],
  paths: {
    "/v1/natal": {
      post: {
        summary: "Natal birth chart",
        description: "Full birth chart: bodies, derived points, angles, house cusps, aspects and interpretations.",
        tags: ["Charts"],
        requestBody: jsonBody(birthDataSchema),
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/positions": {
      get: {
        summary: "Planetary positions",
        description: "Geocentric positions of the ten bodies for any instant (UTC). Omit date/time for now. No birth data required.",
        tags: ["Charts"],
        parameters: [
          { name: "date", in: "query", schema: { type: "string", example: "2026-06-21" } },
          { name: "time", in: "query", schema: { type: "string", example: "12:00" } },
        ],
        responses: { "200": okResponse },
      },
    },
    "/v1/transits": {
      post: {
        summary: "Transits to a natal chart",
        description: "Current or any-date sky compared to a natal chart, with transiting-to-natal aspects.",
        tags: ["Forecasting"],
        requestBody: jsonBody({
          type: "object",
          required: ["natal"],
          properties: {
            natal: birthDataSchema,
            transitDate: { type: "string", example: "2026-06-30" },
            transitTime: { type: "string", example: "09:00" },
            transitTz: { type: "string", example: "UTC" },
          },
        }),
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/synastry": {
      post: {
        summary: "Synastry (compatibility)",
        description: "Inter-aspects between two people's charts.",
        tags: ["Relationship"],
        requestBody: jsonBody({
          type: "object",
          required: ["personA", "personB"],
          properties: { personA: birthDataSchema, personB: birthDataSchema, aspects: { type: "string", enum: ["major", "all"] }, orb: { type: "number" } },
        }),
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/composite": {
      post: {
        summary: "Composite (midpoint) chart",
        description: "The relationship midpoint chart of two people (equal houses from the composite Ascendant).",
        tags: ["Relationship"],
        requestBody: jsonBody({
          type: "object",
          required: ["personA", "personB"],
          properties: { personA: birthDataSchema, personB: birthDataSchema, aspects: { type: "string", enum: ["major", "all"] }, orb: { type: "number" } },
        }),
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/solar-return": {
      post: {
        summary: "Solar return chart",
        description: "The chart for the moment the Sun returns to its natal longitude in a given year.",
        tags: ["Forecasting"],
        requestBody: jsonBody({
          type: "object",
          required: ["natal", "year"],
          properties: {
            natal: birthDataSchema,
            year: { type: "integer", example: 2026 },
            lat: { type: "number", description: "Return location (defaults to natal)." },
            lng: { type: "number" },
            tz: { type: "string" },
            houseSystem: { type: "string", enum: ["placidus", "whole-sign", "equal"] },
          },
        }),
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/horoscope": {
      get: {
        summary: "Daily horoscope by sign",
        description: "A deterministic daily reading for a sun sign, shaped by the day's Moon sign.",
        tags: ["Daily"],
        parameters: [
          { name: "sign", in: "query", required: true, schema: { type: "string", example: "aries" } },
          { name: "date", in: "query", schema: { type: "string", example: "2026-06-30" } },
        ],
        responses: { "200": okResponse, "400": { description: "Validation error" } },
      },
    },
    "/v1/reference/{category}/{key}": {
      get: {
        summary: "Reference content",
        description: "Static reference + interpretation content. Category: signs | planets | houses | aspects. Omit key to list all.",
        tags: ["Reference"],
        parameters: [
          { name: "category", in: "path", required: true, schema: { type: "string", example: "signs" } },
          { name: "key", in: "path", required: false, schema: { type: "string", example: "aries" } },
        ],
        responses: { "200": okResponse, "404": { description: "Unknown reference" } },
      },
    },
    "/v1/health": {
      get: { summary: "Health check", tags: ["Meta"], responses: { "200": okResponse } },
    },
  },
  tags: [
    { name: "Charts" },
    { name: "Forecasting" },
    { name: "Relationship" },
    { name: "Daily" },
    { name: "Reference" },
    { name: "Meta" },
  ],
};
