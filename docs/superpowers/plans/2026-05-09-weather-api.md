# Weather API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock weather data with real 5-day forecasts from Open-Meteo, behind a swappable provider abstraction.

**Architecture:** A `WeatherProvider` interface lives in `app/lib/weather/types.ts`; `OpenMeteoProvider` in `app/lib/weather/open-meteo.ts` implements it with two sequential HTTP calls (geocoding → forecast); `app/lib/weather/index.ts` exports the active singleton. The AI route and the widget are updated to use the new types.

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict), Vercel AI SDK v6, Tailwind CSS v4, native `fetch`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/lib/weather/types.ts` | `WeatherDay`, `WeatherForecast`, `WeatherProvider` interface |
| Create | `app/lib/weather/open-meteo.ts` | `OpenMeteoProvider` — geocoding + forecast |
| Create | `app/lib/weather/index.ts` | Exports active `weatherProvider` singleton |
| Modify | `app/components/WeatherWidget.tsx` | 5-day grid, ISO date formatting, new types |
| Modify | `app/api/chat/route.ts` | Remove mocks, call `weatherProvider`, update system prompt |

`app/page.tsx` requires **no changes** — it imports `WeatherWidgetProps` from `WeatherWidget.tsx` which will be re-exported there.

---

## Task 1: Weather types

**Files:**
- Create: `app/lib/weather/types.ts`

- [ ] **Step 1: Create the file with all shared types**

```ts
// app/lib/weather/types.ts

export interface WeatherDay {
  date: string;       // ISO 8601 full: "2026-05-09T00:00:00Z"
  celsius: number;    // daily max temperature
  fahrenheit: number; // converted from celsius
}

export interface WeatherForecast {
  location: string;   // canonical name from geocoding (e.g. "Moscow")
  days: WeatherDay[]; // always 5 entries
}

export interface WeatherProvider {
  getForecast(location: string): Promise<WeatherForecast>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/ai-app && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/weather/types.ts
git commit -m "feat: add WeatherProvider interface and shared weather types"
```

---

## Task 2: Open-Meteo adapter

**Files:**
- Create: `app/lib/weather/open-meteo.ts`

- [ ] **Step 1: Create the adapter**

```ts
// app/lib/weather/open-meteo.ts
import type { WeatherDay, WeatherForecast, WeatherProvider } from './types';

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface ForecastResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
  };
}

export class OpenMeteoProvider implements WeatherProvider {
  async getForecast(location: string): Promise<WeatherForecast> {
    const { name, latitude, longitude } = await this.geocode(location);

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', String(latitude));
    forecastUrl.searchParams.set('longitude', String(longitude));
    forecastUrl.searchParams.set('daily', 'temperature_2m_max');
    forecastUrl.searchParams.set('temperature_unit', 'celsius');
    forecastUrl.searchParams.set('forecast_days', '5');
    forecastUrl.searchParams.set('timezone', 'auto');

    const res = await fetch(forecastUrl.toString());
    if (!res.ok) {
      throw new Error(`Open-Meteo forecast request failed: ${res.status}`);
    }
    const data = (await res.json()) as ForecastResponse;

    const days: WeatherDay[] = data.daily.time.map((date, i) => {
      const celsius = Math.round(data.daily.temperature_2m_max[i]);
      return {
        date: `${date}T00:00:00Z`,
        celsius,
        fahrenheit: Math.round((celsius * 9) / 5 + 32),
      };
    });

    return { location: name, days };
  }

  private async geocode(
    location: string,
  ): Promise<GeocodingResult> {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', location);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Open-Meteo geocoding request failed: ${res.status}`);
    }
    const data = (await res.json()) as GeocodingResponse;

    if (!data.results || data.results.length === 0) {
      throw new Error(`Location not found: ${location}`);
    }

    return data.results[0];
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/weather/open-meteo.ts
git commit -m "feat: add OpenMeteoProvider with geocoding and forecast requests"
```

---

## Task 3: Provider index

**Files:**
- Create: `app/lib/weather/index.ts`

- [ ] **Step 1: Create the entry point**

```ts
// app/lib/weather/index.ts
import { OpenMeteoProvider } from './open-meteo';

export const weatherProvider = new OpenMeteoProvider();
```

To swap providers in the future: add `app/lib/weather/other-provider.ts`, change the import here.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/weather/index.ts
git commit -m "feat: export weatherProvider singleton"
```

---

## Task 4: Update WeatherWidget

**Files:**
- Modify: `app/components/WeatherWidget.tsx`

The widget changes:
- Import `WeatherForecast` from types and re-export it as `WeatherWidgetProps` (so `page.tsx` needs no changes)
- Replace 3-column grid with 5-column grid
- Replace `label: 'Yesterday' | 'Today' | 'Tomorrow'` with `date: string` (ISO)
- Format date as `"9 мая"` using `toLocaleDateString`
- Detect today by comparing `day.date.slice(0, 10)` to `new Date().toISOString().slice(0, 10)`

- [ ] **Step 1: Replace the full file contents**

```tsx
// app/components/WeatherWidget.tsx
import type { WeatherForecast } from '@/app/lib/weather/types';

export type WeatherWidgetProps = WeatherForecast;
export type { WeatherForecast };

export function WeatherWidget({ location, days }: WeatherWidgetProps) {
  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-sky-200/80 bg-white shadow-lg ring-1 ring-sky-100/80 dark:border-sky-900/50 dark:bg-zinc-900 dark:ring-sky-950/80">
      <header className="flex items-center gap-2 bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 px-4 py-3 text-white shadow-inner">
        <span className="text-2xl" aria-hidden="true">
          ⛅
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-100/90">
            Weather
          </p>
          <p className="text-lg font-semibold leading-tight">{location}</p>
        </div>
      </header>

      <div className="grid grid-cols-5 divide-x divide-zinc-200/80 bg-zinc-50/80 dark:divide-zinc-700 dark:bg-zinc-950/50">
        {days.map((day) => {
          const isToday = day.date.slice(0, 10) === todayDate;
          const label = new Date(day.date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
          });
          return (
            <div
              key={day.date}
              className={
                isToday
                  ? 'bg-gradient-to-b from-sky-50 to-white px-2 py-4 dark:from-sky-950/40 dark:to-zinc-900'
                  : 'px-2 py-4'
              }
            >
              <p
                className={
                  isToday
                    ? 'text-center text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300'
                    : 'text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'
                }
              >
                {label}
              </p>
              <p className="mt-2 text-center text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {day.fahrenheit}°F
              </p>
              <p className="mt-1 text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                {day.celsius}°C
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/WeatherWidget.tsx
git commit -m "feat: update WeatherWidget to 5-day grid with ISO date formatting"
```

---

## Task 5: Update API route

**Files:**
- Modify: `app/api/chat/route.ts`

Remove the two mock helper functions (`randomFahrenheit`, `fahrenheitToCelsius`), import `weatherProvider`, update the tool description, and update the system prompt.

- [ ] **Step 1: Replace the full file contents**

```ts
// app/api/chat/route.ts
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { weatherProvider } from '@/app/lib/weather';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-3.1-flash-lite-preview'),
    system:
      'When the user asks about weather, temperature, or a forecast for a place, call the weather tool with that location. Before calling the tool, normalize the location to its canonical English name (e.g. "Питер" → "Saint Petersburg", "Москва" → "Moscow"). The tool returns a real 5-day forecast starting from today with Fahrenheit and Celsius already included—present both units to the user.',
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description:
          'Get a real 5-day weather forecast (today + 4 days) for a location. Pass the location as a canonical English name.',
        inputSchema: z.object({
          location: z
            .string()
            .describe(
              'The location in canonical English (e.g. "Moscow", "Saint Petersburg")',
            ),
        }),
        execute: async ({ location }) => weatherProvider.getForecast(location),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: wire weather route to real Open-Meteo provider"
```

---

## Task 6: Smoke test

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Ask for weather in English**

Type: `What's the weather in Tokyo?`

Expected: WeatherWidget appears with 5 columns, dates like "9 мая"/"10 мая", real temperatures (not random).

- [ ] **Step 3: Ask for weather using a Russian city name**

Type: `Какая погода в Москве?`

Expected: LLM normalizes "Москва" → "Moscow", widget shows Moscow forecast, location header reads "Moscow".

- [ ] **Step 4: Ask for an invalid location**

Type: `What's the weather in Xyznonexistentcity?`

Expected: LLM responds with a text message explaining the location wasn't found (no crash, no broken widget).
