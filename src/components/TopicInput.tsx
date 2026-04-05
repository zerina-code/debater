'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import type { CreateDebateResponse } from '@/lib/types'

export function TopicInput() {
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { isSignedIn } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = topic.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed }),
      })

      const data = await response.json() as CreateDebateResponse & {
        error?: string
        rateLimitExceeded?: boolean
      }

      if (!response.ok) {
        if (data.rateLimitExceeded) {
          setError("You've used all your debates today. Sign in for more.")
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      router.push(`/debate/${data.slug}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const examples = [
    'Remote work is better than office work',
    'AI will replace programmers',
    'Social media does more harm than good',
  ]

  return (
    <div className="w-full max-w-xl space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={topic}
          onChange={e => {
            setTopic(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Enter any topic to debate…"
          maxLength={200}
          disabled={isLoading}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base disabled:opacity-60 transition"
        />

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm px-1">
            <span className="mt-0.5 flex-shrink-0">&#9888;</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl text-base transition-all duration-200 active:scale-95"
        >
          {isLoading ? 'Preparing debate…' : 'Start Debate →'}
        </button>
      </form>

      {!isSignedIn && (
        <p className="text-center text-gray-600 text-xs">
          Sign in for 50 debates/day &middot; Anonymous users get 10/day
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-center text-gray-600 text-xs">Try one of these:</p>
        <div className="flex flex-col gap-1.5">
          {examples.map(ex => (
            <button
              key={ex}
              onClick={() => setTopic(ex)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-left px-1"
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
