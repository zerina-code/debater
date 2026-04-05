import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { createServerSupabase } from '@/lib/supabase'
import {
  getForSystemPrompt,
  getAgainstSystemPrompt,
  getForOpeningPrompt,
  getAgainstOpeningPrompt,
} from '@/lib/prompts'
import type { ChatMessage } from '@/lib/types'

export const runtime = 'edge'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// POST /api/debate
// Body: { topic, debateId, messages: ChatMessage[], turn: 'for' | 'against' }
// Returns: streaming text/plain
// Stream ends with one of: \n__DONE__\n  |  \n__CONCEDE__\n  |  \n__ERROR__\n
export async function POST(request: NextRequest) {
  const enc = new TextEncoder()

  try {
    const body = await request.json() as {
      topic: string
      debateId: string
      messages: ChatMessage[]
      turn: 'for' | 'against'
    }
    const { topic, debateId, messages, turn } = body

    if (!topic || !debateId || !turn) {
      return Response.json({ error: 'topic, debateId, and turn are required' }, { status: 400 })
    }

    const isOpening = messages.length === 0
    const opponent: 'for' | 'against' = turn === 'for' ? 'against' : 'for'

    // Build Groq messages array
    // Each AI sees its own prior turns as 'assistant' and opponent turns as 'user'
    type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string }
    const groqMessages: GroqMessage[] = []

    if (isOpening && turn === 'for') {
      // FOR opening — simple instruction, no history
      groqMessages.push({ role: 'system', content: getForOpeningPrompt(topic) })
      groqMessages.push({ role: 'user', content: `Make your opening argument for: ${topic}` })
    } else if (isOpening && turn === 'against') {
      // AGAINST opening — receives FOR's opening as the message to respond to
      const forOpening = messages.find(m => m.side === 'for')
      groqMessages.push({ role: 'system', content: getAgainstOpeningPrompt(topic) })
      groqMessages.push({
        role: 'user',
        content: forOpening
          ? `The FOR side just said:\n"${forOpening.text}"\n\nNow make your opening counter-argument against: ${topic}. Respond directly to what they said.`
          : `Make your opening argument against: ${topic}`,
      })
    } else {
      // Mid-debate turn — build full conversation history + explicit instruction to respond to last message
      groqMessages.push({
        role: 'system',
        content: turn === 'for' ? getForSystemPrompt(topic) : getAgainstSystemPrompt(topic),
      })

      // Interleave history: own messages = assistant, opponent messages = user
      for (const msg of messages) {
        groqMessages.push({
          role: msg.side === turn ? 'assistant' : 'user',
          content: msg.text,
        })
      }

      // The last message is always the opponent's — instruct the AI to respond to it specifically
      const lastOpponentMessage = [...messages].reverse().find(m => m.side === opponent)
      if (lastOpponentMessage) {
        groqMessages.push({
          role: 'user',
          content: `Their last point was: "${lastOpponentMessage.text}"\n\nRespond DIRECTLY to that argument now. If you cannot counter it, end with [CONCEDE].`,
        })
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = ''

        try {
          const groqStream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            stream: true,
            max_tokens: 300,
            temperature: 0.85,
          })

          for await (const chunk of groqStream) {
            const token = chunk.choices[0]?.delta?.content ?? ''
            if (token) {
              accumulated += token
              controller.enqueue(enc.encode(token))
            }
          }

          const conceded = accumulated.trimEnd().endsWith('[CONCEDE]')
          controller.enqueue(enc.encode(conceded ? '\n__CONCEDE__\n' : '\n__DONE__\n'))
          controller.close()
        } catch {
          try {
            controller.enqueue(enc.encode('\n__ERROR__\n'))
            controller.close()
          } catch {
            // already closed
          }
          const supabase = createServerSupabase()
          await supabase.from('debates').update({ status: 'error' }).eq('id', debateId)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/debate — persist messages and final status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as {
      debateId: string
      messages: ChatMessage[]
      status: 'done' | 'error'
    }
    const { debateId, messages, status } = body

    if (!debateId) {
      return Response.json({ error: 'debateId is required' }, { status: 400 })
    }

    const supabase = createServerSupabase()
    await supabase.from('debates').update({ messages, status }).eq('id', debateId)

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
