import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { debateId: string; side: 'for' | 'against'; userId: string }
    const { debateId, side, userId } = body

    if (!debateId || !side || !userId) {
      return Response.json({ error: 'debateId, side, and userId are required' }, { status: 400 })
    }
    if (side !== 'for' && side !== 'against') {
      return Response.json({ error: 'side must be "for" or "against"' }, { status: 400 })
    }

    const supabase = createServerSupabase()

    // Check for duplicate vote — return silently so the UI can update state
    const { data: existing } = await supabase
      .from('votes')
      .select('id, side')
      .eq('debate_id', debateId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return Response.json({ alreadyVoted: true, side: existing.side })
    }

    // Insert vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({ debate_id: debateId, user_id: userId, side })

    if (voteError) {
      // Unique constraint race — treat as already voted
      if (voteError.code === '23505') {
        return Response.json({ alreadyVoted: true })
      }
      return Response.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    // Atomically increment the counter via stored procedure
    const { error: rpcError } = await supabase.rpc('vote_increment', {
      p_debate_id: debateId,
      p_side: side,
    })

    if (rpcError) {
      // Fallback read-modify-write (acceptable for portfolio scale)
      const { data: debate } = await supabase
        .from('debates')
        .select('for_votes, against_votes')
        .eq('id', debateId)
        .single()

      if (debate) {
        const update =
          side === 'for'
            ? { for_votes: debate.for_votes + 1 }
            : { against_votes: debate.against_votes + 1 }
        await supabase.from('debates').update(update).eq('id', debateId)
      }
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
