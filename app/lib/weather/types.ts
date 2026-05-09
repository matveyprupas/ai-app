export interface WeatherDay {
  date: string;
  celsius: number;
  fahrenheit: number;
}

export interface WeatherForecast {
  location: string;
  days: WeatherDay[];
}

export interface WeatherProvider {
  getForecast(location: string): Promise<WeatherForecast>;
}
