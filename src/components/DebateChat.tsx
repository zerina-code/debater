'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { ChatBubble, TypingIndicator } from './ChatBubble'
import { VoteBar } from './VoteBar'
import { useDebateChat } from '@/hooks/useDebateChat'
import { useVotes } from '@/hooks/useVotes'
import type { Debate, ChatMessage } from '@/lib/types'

interface DebateChatProps {
  debate: Debate
  shouldStream: boolean
}

function getOrCreateAnonId(): string {
  try {
    let id = localStorage.getItem('debater_anon_id')
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('debater_anon_id', id)
    }
    return id
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2)
  }
}

export function DebateChat({ debate, shouldStream }: DebateChatProps) {
  const { user } = useUser()
  const [userId, setUserId] = useState('')
  const streamStarted = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    currentStreamText,
    currentTurn,
    status,
    winner,
    concededSide,
    error,
    startDebate,
    stopDebate,
  } = useDebateChat()

  useEffect(() => {
    setUserId(user?.id ?? getOrCreateAnonId())
  }, [user?.id])

  useEffect(() => {
    if (shouldStream && !streamStarted.current && debate.id && debate.topic) {
      streamStarted.current = true
      startDebate(debate.topic, debate.id)
    }
  }, [shouldStream, debate.id, debate.topic, startDebate])

  // Auto-scroll to bottom on every new token / message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentStreamText, currentTurn])

  const isExistingDone = !shouldStream && debate.status === 'done'
  const displayMessages: ChatMessage[] = isExistingDone ? (debate.messages ?? []) : messages
  const isStreaming = shouldStream && status === 'streaming'
  const isDone = isExistingDone || status === 'done'

  const votes = useVotes(debate.id, debate.for_votes, debate.against_votes, userId)

  return (
    <div className="flex flex-col h-full">

      {/* ── Debate header bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-blue-400 bg-blue-950 border border-blue-800 rounded-full px-2 py-0.5">FOR</span>
          <span className="text-gray-600">vs</span>
          <span className="font-bold text-red-400 bg-red-950 border border-red-900 rounded-full px-2 py-0.5">AGAINST</span>
          {isStreaming && (
            <span className="ml-2 flex items-center gap-1 text-green-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Stop button — always visible while streaming */}
        {isStreaming && (
          <button
            onClick={stopDebate}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
          >
            <span>⏹</span> Stop debate
          </button>
        )}
      </div>

      {/* ── Chat messages ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0"
      >
        {displayMessages.length === 0 && !currentTurn && (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-600 text-sm animate-pulse">Preparing the debate…</p>
          </div>
        )}

        {displayMessages.map((msg, idx) => (
          <div key={msg.id}>
            <ChatBubble message={msg} />
            {/* Separator between exchanges for readability */}
            {idx < displayMessages.length - 1 &&
              displayMessages[idx + 1]?.side !== msg.side && (
                <div className="flex items-center gap-2 my-3 px-2">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-gray-700 text-xs">↕</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}
          </div>
        ))}

        {/* Currently streaming response */}
        {currentTurn && currentStreamText && (
          <ChatBubble
            message={{
              id: 'streaming',
              side: currentTurn,
              text: currentStreamText,
              conceded: false,
              timestamp: new Date().toISOString(),
            }}
            isStreaming
            streamText={currentStreamText}
          />
        )}

        {/* Typing indicator before first tokens arrive */}
        {currentTurn && !currentStreamText && (
          <TypingIndicator side={currentTurn} />
        )}
      </div>

      {/* ── Bottom panel ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-800">

        {/* Concession result banner */}
        {concededSide && winner && (
          <div className="px-4 py-4 bg-gradient-to-r from-yellow-950 to-orange-950 border-b border-yellow-700 text-center space-y-1">
            <div className="text-2xl">🏆</div>
            <p className="text-yellow-300 font-black text-base">
              {winner === 'for' ? 'FOR' : 'AGAINST'} wins!
            </p>
            <p className="text-yellow-600 text-xs">
              {concededSide === 'for' ? 'FOR' : 'AGAINST'} side admitted defeat — their argument couldn&apos;t hold up.
            </p>
          </div>
        )}

        {/* Max turns / user-stopped notice */}
        {isDone && !concededSide && !isExistingDone && (
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-center">
            <span className="text-gray-500 text-xs">
              Debate ended — both sides argued their best. Cast your vote below.
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-950 border-b border-red-900 text-center">
            <p className="text-red-400 text-xs">⚠ {error}</p>
          </div>
        )}

        {/* Vote section */}
        {isDone && userId && (
          <div className="px-4 py-5">
            <VoteBar
              debateId={debate.id}
              forVotes={votes.forVotes}
              againstVotes={votes.againstVotes}
              userVote={votes.userVote}
              isLoading={votes.isLoading}
              onVote={votes.castVote}
            />
          </div>
        )}
      </div>
    </div>
  )
}
