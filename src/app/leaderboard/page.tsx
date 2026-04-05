import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/lib/types'

export const revalidate = 60 // revalidate every 60 seconds

function VoteSplitBar({ forVotes, againstVotes }: { forVotes: number; againstVotes: number }) {
  const total = forVotes + againstVotes
  const forPct = total > 0 ? Math.round((forVotes / total) * 100) : 50
  const againstPct = 100 - forPct

  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded-full overflow-hidden bg-gray-800 flex">
        <div className="h-full bg-blue-600" style={{ width: `${forPct}%` }} />
        <div className="h-full bg-red-700" style={{ width: `${againstPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{forPct}% FOR</span>
        <span>{total} votes</span>
        <span>{againstPct}% AGAINST</span>
      </div>
    </div>
  )
}

function DebateCard({ debate }: { debate: LeaderboardEntry }) {
  const total = debate.for_votes + debate.against_votes
  return (
    <Link
      href={`/debate/${debate.slug}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors"
    >
      <p className="text-white font-semibold text-sm mb-3 leading-snug">{debate.topic}</p>
      <VoteSplitBar forVotes={debate.for_votes} againstVotes={debate.against_votes} />
      <p className="text-xs text-gray-600 mt-2">
        {new Date(debate.created_at).toLocaleDateString()}
        {total > 0 && ` · ${total} ${total === 1 ? 'vote' : 'votes'}`}
      </p>
    </Link>
  )
}

function Section({
  title,
  subtitle,
  debates,
  emptyMessage,
}: {
  title: string
  subtitle: string
  debates: LeaderboardEntry[]
  emptyMessage: string
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-white font-bold text-lg">{title}</h2>
        <p className="text-gray-500 text-sm">{subtitle}</p>
      </div>
      {debates.length === 0 ? (
        <p className="text-gray-600 text-sm italic">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {debates.map(d => (
            <DebateCard key={d.id} debate={d} />
          ))}
        </div>
      )}
    </section>
  )
}

export default async function LeaderboardPage() {
  const supabase = createServerSupabase()

  // Fetch up to 100 completed debates — all sorting done in JS
  const { data: allDebates } = await supabase
    .from('debates')
    .select('id, topic, slug, for_votes, against_votes, created_at')
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(100)

  const debates: LeaderboardEntry[] = allDebates ?? []

  // Most contested — smallest absolute vote difference, min 5 total votes
  const mostContested = [...debates]
    .filter(d => d.for_votes + d.against_votes >= 5)
    .sort(
      (a, b) =>
        Math.abs(a.for_votes - a.against_votes) - Math.abs(b.for_votes - b.against_votes)
    )
    .slice(0, 10)

  // Most popular — highest total vote count
  const mostPopular = [...debates]
    .sort((a, b) => b.for_votes + b.against_votes - (a.for_votes + a.against_votes))
    .slice(0, 10)

  // Recent — latest 10 (already ordered)
  const recent = debates.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Home
          </Link>
        </div>
        <h1 className="text-white font-black text-xl">Leaderboard</h1>
        <div className="w-16" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <Section
          title="Most Contested"
          subtitle="Debates where votes are split almost evenly (min 5 votes)"
          debates={mostContested}
          emptyMessage="No debates with enough votes yet — start one!"
        />

        <Section
          title="Most Popular"
          subtitle="Debates with the highest total vote count"
          debates={mostPopular}
          emptyMessage="No votes yet — be the first to vote!"
        />

        <Section
          title="Recent Debates"
          subtitle="Latest 10 completed debates"
          debates={recent}
          emptyMessage="No completed debates yet."
        />
      </div>
    </div>
  )
}
