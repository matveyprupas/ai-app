import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

function randomFahrenheit(): number {
  return Math.round(Math.random() * (90 - 32) + 32);
}

function fahrenheitToCelsius(f: number): number {
  return Math.round((f - 32) * (5 / 9));
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-3.1-flash-lite-preview'),
    system:
      'When the user asks about weather, temperature, or a forecast for a place, call the weather tool with that location. The tool returns yesterday, today, and tomorrow with Fahrenheit and Celsius already included—present both units to the user.',
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description:
          'Get mock 3-day weather (yesterday, today, tomorrow) for a location with Fahrenheit and Celsius per day',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const yesterdayF = randomFahrenheit();
          const todayF = randomFahrenheit();
          const tomorrowF = randomFahrenheit();

          return {
            location,
            days: [
              {
                label: 'Yesterday' as const,
                fahrenheit: yesterdayF,
                celsius: fahrenheitToCelsius(yesterdayF),
              },
              {
                label: 'Today' as const,
                fahrenheit: todayF,
                celsius: fahrenheitToCelsius(todayF),
              },
              {
                label: 'Tomorrow' as const,
                fahrenheit: tomorrowF,
                celsius: fahrenheitToCelsius(tomorrowF),
              },
            ],
          };
        },
      }),
    },
    // onStepFinish: ({ toolResults }) => {
    //   console.log(toolResults);
    // },
  });

  return result.toUIMessageStreamResponse();
}
