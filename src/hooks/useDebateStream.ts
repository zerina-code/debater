'use client'

import { useState, useCallback, useRef } from 'react'
import type { DebateStatus } from '@/lib/types'

interface UseDebateStreamReturn {
  forText: string
  againstText: string
  status: DebateStatus
  error: string | null
  startStream: (topic: string, debateId: string) => Promise<void>
}

// Consumes the multiplexed stream from /api/debate.
// Parses FOR: and AGN: prefixes and updates state token-by-token.
export function useDebateStream(): UseDebateStreamReturn {
  const [forText, setForText] = useState('')
  const [againstText, setAgainstText] = useState('')
  const [status, setStatus] = useState<DebateStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async (topic: string, debateId: string) => {
    // Cancel any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setForText('')
    setAgainstText('')
    setError(null)
    setStatus('streaming')

    let forDone = false
    let againstDone = false

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, debateId }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error ?? 'Stream request failed')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on newlines; keep incomplete last chunk in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line) continue

          if (line.startsWith('FOR:')) {
            const token = line.slice(4)
            if (token === '__DONE__') {
              forDone = true
            } else {
              setForText(prev => prev + token)
            }
          } else if (line.startsWith('AGN:')) {
            const token = line.slice(4)
            if (token === '__DONE__') {
              againstDone = true
            } else {
              setAgainstText(prev => prev + token)
            }
          } else if (line.startsWith('ERR:')) {
            const msg = line.slice(4)
            setError(msg || 'Stream error')
            setStatus('error')
            return
          }

          if (forDone && againstDone) {
            setStatus('done')
          }
        }
      }

      // Treat stream end as done if sentinels weren't received
      if (status !== 'error') {
        setStatus('done')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Network error — check your connection')
      setStatus('error')
    }
  }, [status])

  return { forText, againstText, status, error, startStream }
}
