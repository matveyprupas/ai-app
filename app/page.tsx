'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

import classnames from 'classnames';

import {
  WeatherWidget,
  type WeatherWidgetProps,
} from './components/WeatherWidget';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="stretch mx-auto flex w-full max-w-md flex-col py-24">
      {messages.map((message) => {
        const isUser = message.role === 'user';

        return (
          <div
            key={message.id}
            className={classnames(
              'whitespace-pre-wrap',
              !isUser ? 'bg-blue-200' : ''
            )}
          >
            {isUser ? 'User: ' : 'AI: '}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <div key={`${message.id}-${i}`}>{part.text}</div>;
                case 'tool-weather': {
                  const key = `${message.id}-${i}`;
                  if (part.state !== 'output-available') {
                    return (
                      <p
                        key={key}
                        className="text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        Loading weather…
                      </p>
                    );
                  }
                  const props = part.output as WeatherWidgetProps;
                  return <WeatherWidget key={key} {...props} />;
                }
              }
            })}
          </div>
        );
      })}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed bottom-0 mb-8 w-full max-w-md rounded border border-zinc-300 p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
