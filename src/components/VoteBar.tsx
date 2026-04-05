'use client'

interface VoteBarProps {
  debateId: string
  forVotes: number
  againstVotes: number
  userVote: 'for' | 'against' | null
  isLoading: boolean
  onVote: (side: 'for' | 'against') => void
}

export function VoteBar({
  debateId: _debateId,
  forVotes,
  againstVotes,
  userVote,
  isLoading,
  onVote,
}: VoteBarProps) {
  const total = forVotes + againstVotes
  const forPct = total > 0 ? Math.round((forVotes / total) * 100) : 50
  const againstPct = total > 0 ? 100 - forPct : 50
  const hasVoted = !!userVote
  const disabled = hasVoted || isLoading

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h2 className="text-center text-white font-bold text-lg">Who argued better?</h2>

      {/* Vote buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onVote('for')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${
            userVote === 'for'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950'
              : hasVoted
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-blue-900 hover:bg-blue-800 text-white active:scale-95 cursor-pointer'
          }`}
        >
          FOR won &middot; {forVotes} {forVotes === 1 ? 'vote' : 'votes'}
        </button>

        <button
          onClick={() => onVote('against')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${
            userVote === 'against'
              ? 'bg-red-700 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-gray-950'
              : hasVoted
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-red-900 hover:bg-red-800 text-white active:scale-95 cursor-pointer'
          }`}
        >
          AGAINST won &middot; {againstVotes} {againstVotes === 1 ? 'vote' : 'votes'}
        </button>
      </div>

      {/* Animated split bar */}
      <div className="w-full h-3 rounded-full overflow-hidden bg-gray-800 flex">
        <div
          className="h-full bg-blue-600 transition-all duration-700 ease-out"
          style={{ width: `${forPct}%` }}
        />
        <div
          className="h-full bg-red-700 transition-all duration-700 ease-out"
          style={{ width: `${againstPct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{forPct}% FOR</span>
        <span>{total} total {total === 1 ? 'vote' : 'votes'}</span>
        <span>{againstPct}% AGAINST</span>
      </div>

      {hasVoted && (
        <p className="text-center text-green-400 text-sm font-medium">
          You voted: <span className="font-bold">{userVote === 'for' ? 'FOR' : 'AGAINST'}</span> won
        </p>
      )}
    </div>
  )
}
