export interface Debate {
  id: string
  topic: string
  slug: string
  topic_hash: string
  for_text: string | null
  against_text: string | null
  messages: ChatMessage[] | null
  for_votes: number
  against_votes: number
  category: string | null
  status: 'pending' | 'streaming' | 'done' | 'error'
  created_at: string
}

export interface Vote {
  id: string
  debate_id: string
  user_id: string
  side: 'for' | 'against'
  created_at: string
}

export interface ChatMessage {
  id: string
  side: 'for' | 'against'
  text: string
  conceded: boolean
  timestamp: string
}

export type DebateChatStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface CreateDebateResponse {
  debateId: string
  slug: string
  isExisting: boolean
}

export interface LeaderboardEntry {
  id: string
  topic: string
  slug: string
  for_votes: number
  against_votes: number
  created_at: string
}
