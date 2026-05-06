import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { google } from "@ai-sdk/google";
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  console.log(messages.map(message => JSON.stringify(message.parts, null, 2)));

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
    messages: await convertToModelMessages(messages),

    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);

          return {
            location,
            temperature,
          };
        },
      }),
    },


  });

  return result.toUIMessageStreamResponse();
}