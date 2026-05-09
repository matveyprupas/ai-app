export type WeatherDay = {
  label: 'Yesterday' | 'Today' | 'Tomorrow';
  fahrenheit: number;
  celsius: number;
};

export type WeatherWidgetProps = {
  location: string;
  days: WeatherDay[];
};

export function WeatherWidget({ location, days }: WeatherWidgetProps) {
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

      <div className="grid grid-cols-3 divide-x divide-zinc-200/80 bg-zinc-50/80 dark:divide-zinc-700 dark:bg-zinc-950/50">
        {days.map((day) => {
          const isToday = day.label === 'Today';
          return (
            <div
              key={day.label}
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
                {day.label}
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
