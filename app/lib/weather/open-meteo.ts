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

  private async geocode(location: string): Promise<GeocodingResult> {
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
