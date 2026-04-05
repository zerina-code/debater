'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

interface VoteState {
  forVotes: number
  againstVotes: number
  userVote: 'for' | 'against' | null
  isLoading: boolean
}

interface UseVotesReturn extends VoteState {
  castVote: (side: 'for' | 'against') => Promise<void>
}

// Subscribes to Supabase Realtime for live vote counts.
// Checks if the current user has already voted.
export function useVotes(
  debateId: string,
  initialForVotes: number,
  initialAgainstVotes: number,
  userId: string
): UseVotesReturn {
  const [state, setState] = useState<VoteState>({
    forVotes: initialForVotes,
    againstVotes: initialAgainstVotes,
    userVote: null,
    isLoading: false,
  })

  // Check if user already voted on mount
  useEffect(() => {
    if (!debateId || !userId) return

    const supabase = getSupabase()
    supabase
      .from('votes')
      .select('side')
      .eq('debate_id', debateId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setState(prev => ({ ...prev, userVote: data.side as 'for' | 'against' }))
        }
      })
  }, [debateId, userId])

  // Realtime subscription — bar animates as other users vote
  useEffect(() => {
    if (!debateId) return

    const supabase = getSupabase()
    const channel = supabase
      .channel(`debate-votes-${debateId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'debates',
          filter: `id=eq.${debateId}`,
        },
        (payload) => {
          const row = payload.new as { for_votes: number; against_votes: number }
          setState(prev => ({
            ...prev,
            forVotes: row.for_votes,
            againstVotes: row.against_votes,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [debateId])

  const castVote = useCallback(
    async (side: 'for' | 'against') => {
      if (state.userVote || state.isLoading || !userId) return

      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const response = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ debateId, side, userId }),
        })

        const data = await response.json() as {
          success?: boolean
          alreadyVoted?: boolean
          side?: string
        }

        if (data.alreadyVoted) {
          setState(prev => ({
            ...prev,
            userVote: (data.side ?? side) as 'for' | 'against',
            isLoading: false,
          }))
          return
        }

        if (response.ok) {
          // Optimistic update — Realtime will confirm shortly
          setState(prev => ({
            ...prev,
            userVote: side,
            forVotes: side === 'for' ? prev.forVotes + 1 : prev.forVotes,
            againstVotes: side === 'against' ? prev.againstVotes + 1 : prev.againstVotes,
            isLoading: false,
          }))
        }
      } catch {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    },
    [debateId, userId, state.userVote, state.isLoading]
  )

  return { ...state, castVote }
}
