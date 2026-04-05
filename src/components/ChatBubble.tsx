'use client'

import type { ChatMessage } from '@/lib/types'

interface ChatBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  streamText?: string
}

export function ChatBubble({ message, isStreaming = false, streamText }: ChatBubbleProps) {
  const isFor = message.side === 'for'
  const displayText = isStreaming && streamText !== undefined ? streamText : message.text

  return (
    <div className={`flex items-end gap-3 ${isFor ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shadow
          ${isFor ? 'bg-blue-700' : 'bg-red-800'}`}
      >
        {isFor ? 'FOR' : 'AGN'}
      </div>

      {/* Bubble + label */}
      <div className={`flex flex-col gap-1 max-w-lg ${isFor ? 'items-start' : 'items-end'}`}>
        <span
          className={`text-xs font-bold uppercase tracking-wider ${isFor ? 'text-blue-400' : 'text-red-400'}`}
        >
          {isFor ? 'For' : 'Against'}
        </span>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm
            ${isFor
              ? 'bg-blue-950 border border-blue-800 text-blue-50 rounded-bl-sm'
              : 'bg-red-950 border border-red-900 text-red-50 rounded-br-sm'
            }
            ${message.conceded ? 'opacity-75' : ''}
          `}
        >
          {displayText}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-current ml-px align-middle animate-blink opacity-70" />
          )}
        </div>

        {/* Concession badge — shown below the bubble */}
        {message.conceded && !isStreaming && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold
            ${isFor
              ? 'bg-red-950 border-red-700 text-red-300'
              : 'bg-red-950 border-red-700 text-red-300'
            }`}
          >
            <span>🏳</span>
            <span>{isFor ? 'FOR' : 'AGAINST'} concedes defeat</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Animated typing indicator shown while waiting for first tokens
export function TypingIndicator({ side }: { side: 'for' | 'against' }) {
  const isFor = side === 'for'
  return (
    <div className={`flex items-end gap-3 ${isFor ? 'flex-row' : 'flex-row-reverse'}`}>
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white
          ${isFor ? 'bg-blue-700' : 'bg-red-800'}`}
      >
        {isFor ? 'FOR' : 'AGN'}
      </div>
      <div
        className={`rounded-2xl px-4 py-3 flex items-center gap-1.5
          ${isFor
            ? 'bg-blue-950 border border-blue-800 rounded-bl-sm'
            : 'bg-red-950 border border-red-900 rounded-br-sm'
          }`}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
