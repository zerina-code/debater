import Link from 'next/link'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { TopicInput } from '@/components/TopicInput'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar */}
      <nav className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <span className="text-white font-black text-xl tracking-tight">Debater</span>
        <div className="flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Leaderboard
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-10 space-y-4 max-w-2xl">
          <div className="flex justify-center gap-3 mb-6">
            <span className="text-xs font-bold text-blue-400 bg-blue-950 border border-blue-800 rounded-full px-3 py-1">
              FOR
            </span>
            <span className="text-gray-600 text-xs self-center">vs</span>
            <span className="text-xs font-bold text-red-400 bg-red-950 border border-red-900 rounded-full px-3 py-1">
              AGAINST
            </span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight leading-tight">
            Watch AI Argue{' '}
            <span className="bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              Both Sides
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
            Enter any topic. Two AI debate champions argue simultaneously in real time.
            You decide who wins.
          </p>
        </div>

        <TopicInput />

        {/* Feature pills */}
        <div className="mt-12 flex flex-wrap gap-2 justify-center">
          {[
            'Real-time dual streaming',
            'Live vote counts',
            'Shareable permanent links',
            'Debate archive',
          ].map(f => (
            <span
              key={f}
              className="text-xs text-gray-500 border border-gray-800 rounded-full px-3 py-1"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
