'use client'

import { useEffect, useRef } from 'react'

interface SideColumnProps {
  side: 'for' | 'against'
  text: string
  isStreaming: boolean
}

export function SideColumn({ side, text, isStreaming }: SideColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isFor = side === 'for'

  const accentColor = isFor ? 'text-blue-400' : 'text-red-400'
  const borderColor = isFor ? 'border-blue-900' : 'border-red-900'
  const headerBg = isFor ? 'bg-blue-950' : 'bg-red-950'
  const avatarBg = isFor ? 'bg-blue-700' : 'bg-red-800'
  const label = isFor ? 'FOR' : 'AGAINST'
  const initials = isFor ? 'PR' : 'OP'
  const personaName = isFor ? 'Pro Advocate' : 'Opposition'

  // Auto-scroll to bottom as tokens arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  return (
    <div className={`flex flex-col h-full border ${borderColor} rounded-xl overflow-hidden`}>
      {/* Column header */}
      <div className={`${headerBg} px-5 py-4 border-b ${borderColor} flex items-center gap-3 flex-shrink-0`}>
        <div className={`${avatarBg} rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className={`font-black text-xs ${accentColor} uppercase tracking-widest`}>
            {label}
          </div>
          <div className="text-white font-semibold text-sm truncate">{personaName}</div>
        </div>
        {isStreaming && (
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Scrollable text area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 bg-gray-900 text-gray-100 text-sm leading-7"
      >
        {text ? (
          <span>
            {text}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-300 ml-px align-middle animate-blink" />
            )}
          </span>
        ) : (
          <span className="text-gray-600 italic">
            {isStreaming ? 'Preparing argument…' : 'Waiting…'}
          </span>
        )}
      </div>
    </div>
  )
}
