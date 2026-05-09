# Weather API Integration Design

**Date:** 2026-05-09  
**Status:** Approved

## Summary

Replace the mock weather data in `app/api/chat/route.ts` with real forecast data from Open-Meteo. Introduce a provider abstraction so the underlying weather service can be swapped with a single import change.

---

## Goals

- 5-day forecast starting from today (today + 4 days)
- Temperature only for now (°C and °F)
- Day labels as dates: "9 мая", "10 мая", etc. (formatted from ISO timestamps in the widget)
- All dates stored as full ISO 8601 strings: `YYYY-MM-DDThh:mm:ssZ`
- No API keys required (Open-Meteo is free and keyless)
- Easy to swap the weather provider in the future

---

## Architecture

### File structure

```
app/
  lib/
    weather/
      types.ts          ← WeatherProvider interface + shared data types
      open-meteo.ts     ← Open-Meteo adapter (implements WeatherProvider)
      index.ts          ← exports the active provider instance (swap point)
  api/
    chat/
      route.ts          ← updated: remove mock functions, call weatherProvider
  components/
    WeatherWidget.tsx   ← updated: 5 columns, date (ISO string) instead of label
```

**To swap providers in the future:** add `app/lib/weather/openweathermap.ts`, change one import in `index.ts`.

---

## Data contract

### `app/lib/weather/types.ts`

```ts
export interface WeatherDay {
  date: string;       // ISO 8601: "2026-05-09T00:00:00Z"
  celsius: number;    // daily max temperature
  fahrenheit: number; // converted from celsius
}

export interface WeatherForecast {
  location: string;   // canonical name returned by geocoding (e.g. "Moscow")
  days: WeatherDay[]; // always 5 entries
}

export interface WeatherProvider {
  getForecast(location: string): Promise<WeatherForecast>;
}
```

---

## Open-Meteo adapter

### `app/lib/weather/open-meteo.ts`

Two sequential HTTP requests (no API key required):

**Step 1 — Geocoding**

```
GET https://geocoding-api.open-meteo.com/v1/search
  ?name=<location>
  &count=1
  &language=en
```

Returns `{ results: [{ name, latitude, longitude }] }`.  
If `results` is empty → throw `Error("Location not found: <location>")`.

**Step 2 — Forecast**

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=<lat>
  &longitude=<lng>
  &daily=temperature_2m_max
  &temperature_unit=celsius
  &forecast_days=5
  &timezone=auto
```

Returns `{ daily: { time: string[], temperature_2m_max: number[] } }`.

**Mapping:**
- `time[i]` → `"${time[i]}T00:00:00Z"` (pad to full ISO 8601)
- `temperature_2m_max[i]` → `celsius`
- `celsius` → `fahrenheit` via `Math.round(celsius * 9/5 + 32)`
- `results[0].name` → `location`

### `app/lib/weather/index.ts`

```ts
import { OpenMeteoProvider } from './open-meteo';
export const weatherProvider = new OpenMeteoProvider();
```

---

## AI tool changes

### `app/api/chat/route.ts`

- Remove `randomFahrenheit()` and `fahrenheitToCelsius()` mock functions
- Import `weatherProvider` from `lib/weather`
- Tool `execute` becomes:

```ts
execute: async ({ location }) => weatherProvider.getForecast(location)
```

- Update system prompt to instruct the model to normalize location names to canonical English before calling the tool:

```
When the user mentions a location in any language, normalize it to its
canonical English name before calling the weather tool
(e.g. "Питер" → "Saint Petersburg", "Москва" → "Moscow").
```

---

## WeatherWidget changes

### `app/components/WeatherWidget.tsx`

- `WeatherDay.label` (`'Yesterday' | 'Today' | 'Tomorrow'`) replaced by `WeatherDay.date` (ISO string)
- Grid changes from 3 columns to 5 columns
- Date formatting inside the widget:

```ts
const label = new Date(day.date).toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'long',
});
// "9 мая", "10 мая", …
```

- Highlight logic: compare `day.date.slice(0, 10)` to today's ISO date instead of checking `label === 'Today'`

---

## Error handling

| Scenario | Behavior |
|---|---|
| City not found by geocoding | Tool returns error string; LLM relays it to the user |
| Open-Meteo network error | `execute` throws; AI SDK surfaces it as a tool error |
| Unexpected API shape | Adapter throws with a descriptive message |

---

## Out of scope (for now)

- Additional weather details (humidity, wind, precipitation)
- Caching / deduplication of API calls
- Fallback to a second provider
