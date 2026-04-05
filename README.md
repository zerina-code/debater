# Debater — AI Debate Arena

Enter any topic and watch two AI personas argue FOR and AGAINST in real time. The debate unfolds turn by turn, with each side responding directly to the other's arguments. When the debate ends, you vote on who made the stronger case.

## Features

- **Real-time AI debate** — FOR and AGAINST personas argue turn by turn using streaming tokens
- **Topic validation** — a lightweight model checks whether the topic is debatable before starting
- **Live vote bar** — vote updates in real time via Supabase Realtime
- **Shareable debates** — every debate gets a permanent URL
- **Leaderboard** — live ranking of the most-voted debates
- **Rate limiting** — anonymous users limited by hashed IP, authenticated users get higher limits via Clerk

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI / LLM | Groq — `llama-3.3-70b-versatile` (debate) · `llama-3.1-8b-instant` (topic validation) |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (live vote bar) |
| Auth | Clerk (optional sign-in for higher rate limits) |
| Rate Limiting | Upstash Redis |
| Streaming | Edge Runtime · `ReadableStream` with turn-based token streaming |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- [Groq API key](https://console.groq.com) (free)
- [Supabase](https://supabase.com) project (free)
- [Upstash Redis](https://upstash.com) database (free)
- [Clerk](https://clerk.com) application (optional, for auth)

### Setup

```bash
npm install
```

Create a `.env.local` file:

```env
GROQ_API_KEY=your_groq_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Run the database schema:

```bash
# Run schema.sql in your Supabase SQL editor
```

Start the development server:

```bash
npm run dev
```

App available at `http://localhost:3000`

## Project Structure

```
debater/
└── src/
    └── app/
        ├── page.tsx              # Home — topic input
        ├── layout.tsx
        ├── globals.css
        ├── debate/[id]/          # Debate view with streaming
        ├── leaderboard/          # Live leaderboard
        └── api/
            ├── debate/           # Streaming debate endpoint
            ├── validate-topic/   # Topic validation endpoint
            └── vote/             # Vote endpoint
```
