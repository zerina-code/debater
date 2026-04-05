'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, DebateChatStatus } from '@/lib/types'

const MAX_TURNS = 12 // 6 exchanges per side

interface UseDebateChatReturn {
  messages: ChatMessage[]
  currentStreamText: string
  currentTurn: 'for' | 'against' | null
  status: DebateChatStatus
  winner: 'for' | 'against' | null
  concededSide: 'for' | 'against' | null
  error: string | null
  startDebate: (topic: string, debateId: string) => void
  stopDebate: () => void
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function cleanText(raw: string): string {
  return raw
    .replace(/\[CONCEDE\]/g, '')
    .replace(/\n__CONCEDE__\n?$/, '')
    .replace(/\n__DONE__\n?$/, '')
    .replace(/\n__ERROR__\n?$/, '')
    .trim()
}

export function useDebateChat(): UseDebateChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentStreamText, setCurrentStreamText] = useState('')
  const [currentTurn, setCurrentTurn] = useState<'for' | 'against' | null>(null)
  const [status, setStatus] = useState<DebateChatStatus>('idle')
  const [winner, setWinner] = useState<'for' | 'against' | null>(null)
  const [concededSide, setConcededSide] = useState<'for' | 'against' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const messagesRef = useRef<ChatMessage[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const topicRef = useRef('')
  const debateIdRef = useRef('')
  const stoppedRef = useRef(false)

  const saveToDB = useCallback(async (finalMessages: ChatMessage[], finalStatus: 'done' | 'error') => {
    try {
      await fetch('/api/debate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debateId: debateIdRef.current, messages: finalMessages, status: finalStatus }),
      })
    } catch {
      // non-critical
    }
  }, [])

  const runTurn = useCallback(async (turn: 'for' | 'against', currentMessages: ChatMessage[]) => {
    if (stoppedRef.current) return

    setCurrentTurn(turn)
    setCurrentStreamText('')

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicRef.current,
          debateId: debateIdRef.current,
          messages: currentMessages,
          turn,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) throw new Error('Stream request failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Show clean text while streaming — strip any partially-arrived sentinel
        const display = buffer
          .replace(/\[CONCEDE\]$/, '')
          .replace(/\n__\w+__\n?$/, '')
          .trimEnd()
        setCurrentStreamText(display)
      }

      if (stoppedRef.current) return

      const conceded = buffer.includes('__CONCEDE__')
      const errored = buffer.includes('__ERROR__')
      const text = cleanText(buffer)

      const winningSide: 'for' | 'against' = turn === 'for' ? 'against' : 'for'

      // Build the final message for this turn
      const newMessage: ChatMessage = {
        id: makeId(),
        side: turn,
        text: conceded
          ? `${text}\n\n— I can't counter that. You've made the stronger case. I concede.`
          : text,
        conceded,
        timestamp: new Date().toISOString(),
      }

      const updated = [...currentMessages, newMessage]
      messagesRef.current = updated
      setMessages(updated)
      setCurrentStreamText('')
      setCurrentTurn(null)

      if (errored) {
        setError('A response failed — debate stopped.')
        setStatus('error')
        await saveToDB(updated, 'error')
        return
      }

      if (conceded) {
        setConcededSide(turn)
        setWinner(winningSide)
        setStatus('done')
        await saveToDB(updated, 'done')
        return
      }

      if (updated.length >= MAX_TURNS) {
        setStatus('done')
        await saveToDB(updated, 'done')
        return
      }

      // Advance to opponent's turn
      const nextTurn: 'for' | 'against' = turn === 'for' ? 'against' : 'for'
      await runTurn(nextTurn, updated)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Network error — check your connection')
      setStatus('error')
      setCurrentTurn(null)
    }
  }, [saveToDB])

  const startDebate = useCallback((topic: string, debateId: string) => {
    stoppedRef.current = false
    messagesRef.current = []
    topicRef.current = topic
    debateIdRef.current = debateId

    setMessages([])
    setCurrentStreamText('')
    setCurrentTurn(null)
    setWinner(null)
    setConcededSide(null)
    setError(null)
    setStatus('streaming')

    runTurn('for', [])
  }, [runTurn])

  const stopDebate = useCallback(async () => {
    stoppedRef.current = true
    abortRef.current?.abort()
    setCurrentTurn(null)
    setCurrentStreamText('')
    setStatus('done')
    await saveToDB(messagesRef.current, 'done')
  }, [saveToDB])

  return {
    messages,
    currentStreamText,
    currentTurn,
    status,
    winner,
    concededSide,
    error,
    startDebate,
    stopDebate,
  }
}
