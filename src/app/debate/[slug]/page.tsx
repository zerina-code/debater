import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SignInButton, SignedOut } from '@clerk/nextjs'
import { DebateChat } from '@/components/DebateChat'
import { createServerSupabase } from '@/lib/supabase'
import type { Debate } from '@/lib/types'

interface DebatePageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: DebatePageProps): Promise<Metadata> {
  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('debates')
    .select('topic, messages')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!data) return { title: 'Debate Not Found — Debater' }

  // Use first FOR message as OG description if available
  const msgs = (data.messages ?? []) as Array<{ side: string; text: string }>
  const firstFor = msgs.find(m => m.side === 'for')
  const description = firstFor
    ? firstFor.text.slice(0, 150) + '…'
    : 'Watch two AI champions argue this topic in a real-time chat debate.'

  return {
    title: `${data.topic} — Debater`,
    description,
    openGraph: {
      title: data.topic,
      description,
      type: 'article',
    },
  }
}

export default async function DebatePage({ params }: DebatePageProps) {
  const supabase = createServerSupabase()

  const { data: debate, error } = await supabase
    .from('debates')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (error || !debate) {
    notFound()
  }

  const shouldStream = debate.status !== 'done' && debate.status !== 'error'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors flex-shrink-0">
          ← Home
        </Link>
        <h1 className="text-white font-bold text-sm truncate flex-1">{debate.topic}</h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white text-xs transition-colors hidden sm:block"
          >
            Leaderboard
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      {/* Chat arena — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <DebateChat debate={debate as Debate} shouldStream={shouldStream} />
      </div>
    </div>
  )
}
