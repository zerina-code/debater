'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { SideColumn } from './SideColumn'
import { VoteBar } from './VoteBar'
import { useDebateStream } from '@/hooks/useDebateStream'
import { useVotes } from '@/hooks/useVotes'
import type { Debate } from '@/lib/types'

interface DebateArenaProps {
  debate: Debate
  shouldStream: boolean
}

function getOrCreateAnonId(): string {
  try {
    let id = localStorage.getItem('debater_anon_id')
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('debater_anon_id', id)
    }
    return id
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2)
  }
}

export function DebateArena({ debate, shouldStream }: DebateArenaProps) {
  const { user } = useUser()
  const [userId, setUserId] = useState('')
  const streamStarted = useRef(false)

  const { forText, againstText, status, error, startStream } = useDebateStream()

  // Resolve userId — Clerk user ID takes priority, otherwise anonymous UUID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id)
    } else {
      setUserId(getOrCreateAnonId())
    }
  }, [user?.id])

  // Kick off streaming once for new debates
  useEffect(() => {
    if (shouldStream && !streamStarted.current && debate.id && debate.topic) {
      streamStarted.current = true
      startStream(debate.topic, debate.id)
    }
  }, [shouldStream, debate.id, debate.topic, startStream])

  // For existing completed debates, show stored text; otherwise show live stream
  const isExisting = debate.status === 'done' && !shouldStream
  const displayForText = isExisting ? (debate.for_text ?? '') : forText
  const displayAgainstText = isExisting ? (debate.against_text ?? '') : againstText

  const isStreaming = shouldStream && status === 'streaming'
  const isDone = isExisting || status === 'done'

  const votes = useVotes(debate.id, debate.for_votes, debate.against_votes, userId)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Progress banner */}
      {isStreaming && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 flex items-center gap-4 flex-shrink-0">
          <span className="text-yellow-400 font-semibold text-sm">Debate in progress…</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full animate-progress" />
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-5 py-3 text-red-300 text-sm flex-shrink-0">
          &#9888; Debate interrupted: {error}
        </div>
      )}

      {/* Reconnect hint on network error */}
      {status === 'error' && !error?.includes('interrupted') && (
        <div className="text-center">
          <button
            onClick={() => startStream(debate.topic, debate.id)}
            className="text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
          >
            Retry connection
          </button>
        </div>
      )}

      {/* Two-column arena */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <SideColumn side="for" text={displayForText} isStreaming={isStreaming} />
        </div>
        <div className="flex-1 min-w-0">
          <SideColumn side="against" text={displayAgainstText} isStreaming={isStreaming} />
        </div>
      </div>

      {/* Vote bar — only after both sides finish */}
      {isDone && userId && (
        <div className="flex-shrink-0 py-2">
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
  )
}
